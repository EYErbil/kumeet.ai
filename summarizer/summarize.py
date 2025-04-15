# summarize.py

import os
import re
import json
import time
import datetime
import pandas as pd

import google.generativeai as genai
# Imports not needed with newer API
# from google.generativeai.types import HarmCategory, HarmBlockThreshold

from summarizer.config import (
    GEMINI_API_KEY,
    MAX_TOKENS_PER_CHUNK,
    MEETING_TYPE,
    FOCUS_REQUEST
)
from summarizer.db import (
    load_transcript_from_db,
    save_summary_in_db,
    save_action_items_in_db
)
from summarizer.analysis import extract_items_with_scores_gemini, save_extracted_items_in_db

# Configure the Google Generative AI library with the API key
genai.configure(api_key=GEMINI_API_KEY)


def chunk_transcript_data(transcript_data, max_tokens=800):
    """
    Split transcript data into chunks that fit within the model's context window.
    
    Args:
        transcript_data: List of transcript segments
        max_tokens: Maximum tokens per chunk
        
    Returns:
        List of chunks, each with start/end timestamps and combined text
    """
    chunks = []
    current_chunk = {"text": "", "start": 0, "end": 0}
    current_token_count = 0
    segment_idx = 0
    
    # Convert transcript data format if needed
    segments = []
    if isinstance(transcript_data, list) and transcript_data and isinstance(transcript_data[0], dict):
        # Check if this is already in the expected format with speaker, start, end, text
        if all(k in transcript_data[0] for k in ["speaker", "start", "end", "text"]):
            segments = transcript_data
    
    # If no segments were extracted, format may be different
    if not segments:
        print("Warning: Transcript data not in expected format, attempting conversion")
        # Try to detect format and convert
        try:
            # This is a simple conversion assuming basic format
            for segment in transcript_data:
                if isinstance(segment, dict):
                    segments.append({
                        "speaker": segment.get("speaker", "SPEAKER_0"),
                        "start": segment.get("start", 0),
                        "end": segment.get("end", 0),
                        "text": segment.get("text", "")
                    })
        except Exception as e:
            print(f"Error converting transcript format: {e}")
            return []
    
    # If still no segments, return empty list
    if not segments:
        print("Error: Could not parse transcript data")
        return []
    
    # Sort segments by start time
    segments.sort(key=lambda x: x["start"])
    
    # Track the first segment's start time for the chunk
    if segments:
        current_chunk["start"] = segments[0]["start"]
    
    # Process segments into chunks
    for segment in segments:
        # Estimate token count (rough approximation)
        text = segment["text"]
        token_count = len(text.split())
        
        # If adding this segment would exceed max_tokens, start a new chunk
        if current_token_count + token_count > max_tokens and current_token_count > 0:
            # Set the end time of the current chunk
            current_chunk["end"] = segments[segment_idx - 1]["end"]
            chunks.append(current_chunk)
            
            # Start a new chunk
            current_chunk = {"text": "", "start": segment["start"], "end": 0}
            current_token_count = 0
        
        # Add this segment to the current chunk
        if current_token_count > 0:
            current_chunk["text"] += " "
        current_chunk["text"] += f"[{segment['speaker']}]: {text}"
        current_token_count += token_count
        segment_idx += 1
    
    # Add the last chunk if there's anything left
    if current_token_count > 0:
        current_chunk["end"] = segments[-1]["end"]
        chunks.append(current_chunk)
    
    return chunks


def summarize_chunk(chunk_text: str, meeting_type: str, focus: str, focus_question: str = None) -> str:
    """
    Summarize a chunk using gemini-1.5-flash, providing a custom prompt.
    We embed `meeting_type` and `focus` instructions along with any specific focus_question.
    
    Parameters:
    - chunk_text: Text from the transcript chunk to summarize
    - meeting_type: Type of meeting/content for context
    - focus: General focus for the summary
    - focus_question: Optional specific question or topic to focus on
    """
    # Build the prompt
    prompt_parts = [
        f"You are an AI assistant. This is a {meeting_type}.\n\n",
        "IMPORTANT:\n",
        "1) Create a concise summary of the most important points only.\n",
        "2) Be extremely selective - only include truly significant information.\n",
        "3) Assign an importance_score (1–10) to each bullet, using the full range:\n",
        "   - 9-10: Critical information, major decisions, key insights\n",
        "   - 7-8: Important but not critical\n",
        "   - 5-6: Moderately important details\n",
        "   - 1-4: Minor details\n",
        "4) Output bullet points in the format:\n",
        "   * Bullet text (timestamp range) [score=X]\n",
        "5) Aim for 3-5 bullet points maximum per chunk.\n",
        "6) If there's truly nothing important, create fewer or no bullet points.\n\n"
    ]
    
    # Add focus question if provided
    if focus_question:
        prompt_parts.append(f"SPECIFIC FOCUS QUESTION: {focus_question}\n")
        prompt_parts.append("Give special attention to information that helps answer this question.\n\n")
    
    # Add general focus and transcript
    prompt_parts.append(f"General Focus: {focus}\n\n")
    prompt_parts.append(f"Transcript Chunk:\n{chunk_text}\n\n")
    
    # Final instruction
    if focus_question:
        prompt_parts.append(f"Now produce bullet points that address the focus question and cover key points.")
    else:
        prompt_parts.append("Now produce bullet points per the instructions above.")
    
    # Combine all parts into the final prompt
    prompt = "".join(prompt_parts)

    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    return response.text


def format_timestamp(seconds):
    """Convert seconds to HH:MM:SS format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    else:
        return f"{minutes:02d}:{secs:02d}"

def merge_summaries(final_data, min_importance=7):
    """
    Merge all chunk summaries into one consolidated summary
    Filter by minimum importance score to reduce noise
    """
    # Collect all bullet points from all chunks
    all_bullets = []
    
    for chunk in final_data:
        summary_text = chunk["summary"]
        # Extract bullet points (lines starting with *)
        for line in summary_text.split('\n'):
            line = line.strip()
            if line.startswith('*'):
                # Extract score if available
                score = 5  # Default score
                if '[score=' in line:
                    try:
                        score = int(line.split('[score=')[1].split(']')[0])
                    except:
                        pass
                
                # Only include high-importance items
                if score >= min_importance:
                    all_bullets.append({
                        "text": line, 
                        "score": score,
                        "start": chunk["start"],
                        "end": chunk["end"],
                        "start_formatted": chunk["start_formatted"],
                        "end_formatted": chunk["end_formatted"]
                    })
    
    # Sort bullets by importance score (descending)
    all_bullets.sort(key=lambda x: x["score"], reverse=True)
    
    # Create the merged summary with the most important points
    # Limit to top 7 points or fewer if there are fewer bullets
    top_bullets = all_bullets[:min(7, len(all_bullets))]
    
    merged_summary = "# FINAL SUMMARY\n\nKey points from the conversation (sorted by importance):\n\n"
    for bullet in top_bullets:
        # Add formatted timestamp to the bullet point
        merged_summary += f"{bullet['text']} [timestamp: {bullet['start_formatted']}-{bullet['end_formatted']}]\n\n"
    
    # If no important points were found, add a note
    if not top_bullets:
        merged_summary += "No high-importance points were identified in this conversation.\n\n"
    
    return merged_summary


def summarize_transcript(
    session_id, 
    output_dir, 
    meeting_type=None,
    min_importance=6,
    focus_question=None,
    input_transcript=None
):
    """
    Summarize the transcript, chunk by chunk, then create a consolidated summary.
    
    Args:
        session_id: Unique ID for this session
        output_dir: Output directory for summary files
        meeting_type: Type of meeting for context (optional)
        min_importance: Minimum importance score for points in the final summary (default: 6)
        focus_question: Specific question to focus on (optional)
        input_transcript: List of transcript segments (optional, if already available)
        
    Returns:
        String containing full summary output
    """
    start_time = time.time()
    
    # Load the transcript
    if input_transcript:
        # Use the provided transcript
        transcript_segments = input_transcript
        print(f"Using provided transcript with {len(transcript_segments)} segments")
    else:
        # Load from DB
        transcript_segments = load_transcript_from_db(session_id)
        if not transcript_segments:
            print(f"No transcript found for session: {session_id}")
            return None
    
    # Process the transcript (for logging/display only)
    transcript_text = []
    for seg in transcript_segments:
        start_min = int(seg["start"] / 60)
        start_sec = int(seg["start"] % 60)
        text_with_speaker = f"[{seg['speaker']}] ({start_min:02d}:{start_sec:02d}): {seg['text'].strip()}"
        transcript_text.append(text_with_speaker)
    
    # Use meeting_type from parameter if provided, otherwise use default
    if meeting_type is None:
        meeting_type = MEETING_TYPE

    chunks = chunk_transcript_data(transcript_segments, max_tokens=800)
    final_data = []

    # Log the chunks
    print(f"Split transcript into {len(chunks)} chunks")
    
    # Process each chunk
    for idx, ch in enumerate(chunks):
        print(f"Processing chunk {idx+1} / {len(chunks)}...")
        
        # Use only Gemini for summarization
        summary = summarize_chunk(
            ch["text"], 
            meeting_type, 
            FOCUS_REQUEST,
            focus_question
        )
        
        # Extract bullet points with importance scores
        items = extract_items_with_scores_gemini(summary, idx + 1, ch["start"], ch["end"])
        
        # Add to final data
        final_data.extend(items)
        
        # Save chunk data
        final_data.append({
            "chunk_idx": idx + 1,
            "start_time": ch["start"],
            "end_time": ch["end"],
            "start_formatted": format_timestamp(ch["start"]),
            "end_formatted": format_timestamp(ch["end"]),
            "summary": summary
        })
    
    # Create formatted chunk-by-chunk summary
    chunk_lines = []
    summary_items = []
    
    for idx, fc in enumerate(final_data):
        chunk_lines.append(f"\n### CHUNK {idx + 1}: {fc['start_formatted']} - {fc['end_formatted']}\n")
        chunk_lines.append(fc['summary'])
        
        # Extract items from the summaries
        for line in fc['summary'].split('\n'):
            line = line.strip()
            
            # Skip empty lines or headers
            if not line or line.startswith('#'):
                continue
            
            # If it looks like a bullet point
            if line.startswith('-') or line.startswith('•') or (line[0].isdigit() and '. ' in line[:5]):
                # Remove bullet formatting
                if line.startswith('-') or line.startswith('•'):
                    line = line[1:].strip()
                elif line[0].isdigit() and '. ' in line[:5]:
                    line = line.split('. ', 1)[1].strip()
                
                # Add to summary items
                summary_items.append({
                    "chunk": idx + 1,
                    "start_time": fc["start_time"],
                    "end_time": fc["end_time"],
                    "timestamp": f"{fc['start_formatted']} - {fc['end_formatted']}",
                    "text": line,
                    "importance": "medium"  # Default importance level
                })
    
    # Create the chunk-by-chunk summary text
    chunk_summary = "\n".join(chunk_lines)
    
    # Create the merged summary with most important points
    merged_summary = merge_summaries(final_data, min_importance=min_importance)
    
    # Build the complete output
    final_output = f"SESSION: {session_id}\n\n"
    if focus_question:
        final_output += f"FOCUS QUESTION: {focus_question}\n\n"
    
    final_output += merged_summary + "\n\n=== DETAILED SUMMARY BY SECTION ===\n\n" + chunk_summary
    
    # Save to database
    save_summary_in_db(session_id, final_output)
    
    # Save to files in different formats
    txt_path = os.path.join(output_dir, "summary.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(final_output)
    
    json_path = os.path.join(output_dir, "summary.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary_items, f, ensure_ascii=False, indent=2)
    
    csv_path = os.path.join(output_dir, "summary.csv")
    pd.DataFrame(summary_items).to_csv(csv_path, index=False, encoding="utf-8")
    
    print(f"Summary saved to {txt_path}, {json_path}, and {csv_path}")
    return final_output