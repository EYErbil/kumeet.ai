import os
import pandas as pd
import json

import google.generativeai as genai

from config import (
    MAX_TOKENS_PER_CHUNK,
    MEETING_TYPE,
    FOCUS_REQUEST,
    GEMINI_API_KEY
)
from db import (
    load_transcript_from_db,
    save_summary_in_db,
    save_summary_items_in_db,
    save_decisions_in_db,
    save_action_items_in_db
)

# Configure the genai client with the API key
genai.configure(api_key=GEMINI_API_KEY)
import re, json

def safe_json_loads(raw: str):
    """
    Removes ```json fences or other backticks and tries to load JSON.
    Returns None on failure instead of raising.
    """
    # remove triple-backtick blocks
    cleaned = re.sub(r"```(?:json)?\s*([\s\S]*?)```", r"\1", raw).strip()
    # fall back: maybe the whole thing was fenced
    cleaned = cleaned.strip("` \n")
    try:
        return json.loads(cleaned)
    except Exception:
        return None

def _load_json_from_gemini(raw):
    data = safe_json_loads(raw)
    return data if isinstance(data, list) else []
def extract_decisions_gemini(text, chunk_idx, chunk_start, chunk_end):
    """
    Extract decisions from transcript chunk text.
    Returns a list of decisions, each with description and timestamp.
    """
    prompt = (
        "You are analyzing a meeting transcript chunk below. "
        "Extract only clear DECISIONS made in this section "
        "(explicit choices, agreements, commitments). "
        "Return a valid JSON array, each with: description, timestamp. "
        "If none found, return [].\n\n"
        f"CHUNK (approx {chunk_start:.2f}-{chunk_end:.2f} sec):\n{text}"
    )
    
    model = genai.GenerativeModel("gemini-2.0-flash",generation_config={"response_mime_type": "application/json"})
    response = model.generate_content(contents=prompt)
    
    raw = response.text
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            for item in data:
                if "timestamp" not in item:
                    item["timestamp"] = f"{chunk_start:.2f}-{chunk_end:.2f}"
            return data
        else:
            return []
    except:
        print(f"Failed to parse JSON from extract_decisions_gemini: {raw}")
        return []

def extract_action_items_gemini(text, chunk_idx, chunk_start, chunk_end):
    """
    Extract action items from transcript chunk text.
    Returns a list of action items, each with description and timestamp.
    """
    prompt = (
        "You are analyzing a meeting transcript chunk below. "
        "Extract only ACTION ITEMS (tasks or follow-ups assigned to someone, has to answer what should a person do watching this recording?) "
        "from this section. Return a valid JSON array, each with: "
        "description, timestamp. If none found, return [].\n\n"
        f"CHUNK (approx {chunk_start:.2f}-{chunk_end:.2f} sec):\n{text}"
    )
    
    model = genai.GenerativeModel("gemini-2.0-flash",generation_config={"response_mime_type": "application/json"})
    response = model.generate_content(contents=prompt)
    
    raw = response.text
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            for item in data:
                if "timestamp" not in item:
                    item["timestamp"] = f"{chunk_start:.2f}-{chunk_end:.2f}"
            return data
        else:
            return []
    except:
        print(f"Failed to parse JSON from extract_action_items_gemini: {raw}")
        return []

def extract_items_with_scores_gemini(text, chunk_idx, chunk_start, chunk_end):
    """
    Asks gemini to parse 'text' and produce an array of bullet items with:
      description, importance_score(1-10), timestamp
    If no items, return [].
    We'll fallback to the chunk range as the timestamp if the model doesn't provide one.
    """
    prompt = (
        "Below is a partial summary of a meeting chunk. "
        "I want a list of bullet items, each with: description, importance_score (1-10), and timestamp. "
        "Return them as valid JSON. If none found, return [].\n\n"
        f"CHUNK (approx {chunk_start:.2f}-{chunk_end:.2f} sec):\n"
        f"{text}"
    )

    model = genai.GenerativeModel("gemini-2.0-flash",generation_config={"response_mime_type": "application/json"})
    response = model.generate_content(contents=prompt)
    
    raw = response.text
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            for item in data:
                # if no timestamp, fallback
                if "timestamp" not in item:
                    item["timestamp"] = f"{chunk_start:.2f}-{chunk_end:.2f}"
            return data
        else:
            return []
    except:
        print(f"Failed to parse JSON from extract_items_with_scores_gemini: {raw}")
        return []

def chunk_transcript_data(transcript, max_tokens=800):
    """
    Chunk transcript data based on token count.
    We estimate that 1 token is approximately 4 characters.
    """
    chunks = []
    current_lines = []
    current_tokens = 0
    chunk_start = None
    chunk_end = None

    for entry in transcript:
        line_str = f"[{entry['start']:.2f}-{entry['end']:.2f}] {entry['speaker']}: {entry['text']}"
        line_tokens = len(line_str) // 4  # Rough estimate: 1 token ≈ 4 characters
        
        if chunk_start is None:
            chunk_start = entry["start"]
        chunk_end = entry["end"]
        
        # If adding this line would exceed max_tokens, start a new chunk
        if current_tokens + line_tokens > max_tokens and current_lines:
            chunk_text = "\n".join(current_lines)
            chunks.append({
                "chunk_text": chunk_text,
                "start": chunk_start,
                "end": chunk_end
            })
            current_lines = []
            current_tokens = 0
            chunk_start = None
            chunk_end = None
        
        current_lines.append(line_str)
        current_tokens += line_tokens

    # Add any remaining lines as the final chunk
    if current_lines:
        chunk_text = "\n".join(current_lines)
        s = chunk_start if chunk_start else 0.0
        e = chunk_end if chunk_end else 0.0
        chunks.append({
            "chunk_text": chunk_text,
            "start": s,
            "end": e
        })
    return chunks


def summarize_chunk(chunk_text: str, meeting_type: str, focus: str, focus_question: str = None) -> str:
    """
    Summarize a chunk using gemini-2.0-flash, providing a custom prompt.
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

    # Use GenerativeModel instead of client.models
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(contents=prompt)
    
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


def summarize_transcript(session_id, output_dir, meeting_type=None, min_importance=6, focus_question=None):
    """
    Summarize the transcript, chunk by chunk, then create a consolidated summary.
    Save outputs in multiple formats (TXT, JSON, CSV).
    
    Parameters:
    - session_id: The unique session identifier
    - output_dir: Directory to save output files
    - meeting_type: Type of meeting (default: from config)
    - min_importance: Minimum importance score for points in the final summary (default: 6)
    - focus_question: Optional specific question or topic to focus on
    """
    transcript = load_transcript_from_db(session_id)
    if not transcript:
        print("Transcript not found in DB for session:", session_id)
        return None
        
    # Use meeting_type from parameter if provided, otherwise use default
    if meeting_type is None:
        meeting_type = MEETING_TYPE

    chunks = chunk_transcript_data(transcript, max_tokens=800)
    final_data = []
    all_decisions = []
    all_actions = []

    print("Summarizing transcript, extracting bullet items, decisions, and actions...")
    for idx, ch in enumerate(chunks):
        # Use only Gemini for summarization
        summary = summarize_chunk(
            ch["chunk_text"], 
            meeting_type, 
            FOCUS_REQUEST,
            focus_question
        )

        # Parse bullet items with importance score
        items = extract_items_with_scores_gemini(summary, idx + 1, ch["start"], ch["end"])
        # store them in DB
        if items:
            save_summary_items_in_db(session_id, idx + 1, items)
            
        # Extract decisions from transcript chunk (not from summary)
        decisions = extract_decisions_gemini(ch["chunk_text"], idx + 1, ch["start"], ch["end"])
        if decisions:
            save_decisions_in_db(session_id, idx + 1, decisions)
            all_decisions.extend(decisions)
            print(f"Found {len(decisions)} decisions in chunk {idx+1}")

        # Extract action items from transcript chunk (not from summary)
        actions = extract_action_items_gemini(ch["chunk_text"], idx + 1, ch["start"], ch["end"])
        if actions:
            save_action_items_in_db(session_id, idx + 1, actions)
            all_actions.extend(actions)
            print(f"Found {len(actions)} action items in chunk {idx+1}")

        final_data.append({
            "idx": idx + 1,
            "start": ch["start"],
            "end": ch["end"],
            "start_formatted": format_timestamp(ch["start"]),
            "end_formatted": format_timestamp(ch["end"]),
            "summary": summary
        })

    # Create formatted chunk-by-chunk summary
    chunk_lines = []
    summary_items = []
    
    for fc in final_data:
        # Add chunk header with formatted timestamps
        chunk_header = f"CHUNK {fc['idx']} [{fc['start_formatted']}-{fc['end_formatted']}]:"
        chunk_lines.append(chunk_header)
        chunk_lines.append(fc['summary'])
        chunk_lines.append("")  # Empty line between chunks
        
        # Extract bullet points for JSON/CSV output
        for line in fc['summary'].split('\n'):
            line = line.strip()
            if line.startswith('*'):
                # Try to extract timestamp and score
                timestamp = f"{fc['start_formatted']}-{fc['end_formatted']}"  # Default timestamp
                score = 5  # Default score
                
                # Extract embedded timestamp if available
                if '(' in line and ')' in line:
                    try:
                        embedded_timestamp = line.split('(')[1].split(')')[0]
                        if '-' in embedded_timestamp and any(c.isdigit() for c in embedded_timestamp):
                            timestamp = embedded_timestamp
                    except:
                        pass
                
                # Extract score if available
                if '[score=' in line:
                    try:
                        score = int(line.split('[score=')[1].split(']')[0])
                    except:
                        pass
                
                # Clean up the text (remove timestamp and score annotations)
                text = line.replace(f"({timestamp})", "").replace(f"[score={score}]", "").strip()
                if text.startswith('*'):
                    text = text[1:].strip()
                
                summary_items.append({
                    "chunk": fc['idx'],
                    "timestamp": timestamp,
                    "text": text,
                    "importance": score
                })
    
    # Create the chunk-by-chunk summary text
    chunk_summary = "\n".join(chunk_lines)
    
    # Create the merged summary with most important points
    merged_summary = merge_summaries(final_data, min_importance=min_importance)
    
    # Build the final output
    final_output = ""
    if focus_question:
        final_output = f"FOCUS QUESTION: {focus_question}\n\n"
        
    # Add the merged summary
    final_output += merged_summary
    print("I will hopefully get action itemsinsahha")
    # Add decisions section if any were found
    final_output += "\n\n=== DECISIONS MADE ===\n"
    if all_decisions:
        for d in all_decisions:
            final_output += f"- {d['description']} [timestamp: {d['timestamp']}]\n"
    else:
        final_output += "No decisions recorded for this meeting.\n"
    
    # Add action items section if any were found
    final_output += "\n\n=== ACTION ITEMS ===\n"
    if all_actions:
        for a in all_actions:
            final_output += f"- {a['description']} [timestamp: {a['timestamp']}]\n"
    else:
        final_output += "No action items recorded for this meeting.\n"
    
    # Add the detailed chunk-by-chunk summary
    final_output += "\n\n=== DETAILED SUMMARY BY SECTION ===\n\n" + chunk_summary
    
    # Save to database
    save_summary_in_db(session_id, final_output)
    
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Save TXT output
        txt_path = os.path.join(output_dir, "summary.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(final_output)
        print(f"Saved summary text to: {txt_path}")
        
        # Save JSON output (summary items)
        json_path = os.path.join(output_dir, "summary.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(summary_items, f, ensure_ascii=False, indent=2)
        print(f"Saved summary points to: {json_path}")
        
        # Save CSV output
        csv_path = os.path.join(output_dir, "summary.csv")
        pd.DataFrame(summary_items).to_csv(csv_path, index=False, encoding="utf-8")
        print(f"Saved summary CSV to: {csv_path}")
        
        # Save decisions.json
        dec_path = os.path.join(output_dir, "decisions.json")
        with open(dec_path, "w", encoding="utf-8") as f:
            json.dump(all_decisions, f, ensure_ascii=False, indent=2)
        print(f"Saved {len(all_decisions)} decisions to: {dec_path}")
        
        # Save action_items.json
        act_path = os.path.join(output_dir, "action_items.json")
        with open(act_path, "w", encoding="utf-8") as f:
            json.dump(all_actions, f, ensure_ascii=False, indent=2)
        print(f"Saved {len(all_actions)} action items to: {act_path}")
        
        print(f"All outputs successfully saved to {output_dir}")
    except Exception as e:
        print(f"ERROR saving outputs: {str(e)}")
        import traceback
        print(traceback.format_exc())
    
    return final_output

