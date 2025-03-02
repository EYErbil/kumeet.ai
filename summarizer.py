import os
import json
import csv
import openai
import pandas as pd
from typing import List, Dict

############################
#  CONFIG
############################

# If you have GPT-4 access, set LLM_MODEL = "gpt-4"
# Otherwise, "gpt-3.5-turbo"
LLM_MODEL = "gpt-3.5-turbo"

OPENAI_API_KEY = "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"  # or read from environment
if not OPENAI_API_KEY:
    raise ValueError("Please set OPENAI_API_KEY environment variable or specify it here.")
openai.api_key = OPENAI_API_KEY

MEETING_TYPE = "generic meeting"
FOCUS_REQUEST = "Please focus on tasks, decisions, and important deadlines."
MAX_LINES_PER_CHUNK = 10

############################
#  HELPER FUNCTIONS
############################

def load_transcript_csv(csv_path: str) -> List[Dict]:
    df = pd.read_csv(csv_path)
    df['start'] = df['start'].astype(float)
    df['end'] = df['end'].astype(float)
    records = df.to_dict(orient='records')
    return records

def load_transcript_json(json_path: str) -> List[Dict]:
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def chunk_transcript(transcript: List[Dict], max_lines=10) -> List[str]:
    """
    Groups the transcript into chunks. Each chunk is up to 'max_lines' entries.
    Returns a list of chunk strings to feed the LLM.
    """
    chunks = []
    current_chunk = []

    for entry in transcript:
        segment_str = (
            f"[{entry['start']:.2f}-{entry['end']:.2f}] {entry['speaker']}: {entry['text']}"
        )
        current_chunk.append(segment_str)

        if len(current_chunk) >= max_lines:
            chunk_text = "\n".join(current_chunk)
            chunks.append(chunk_text)
            current_chunk = []

    if current_chunk:
        chunk_text = "\n".join(current_chunk)
        chunks.append(chunk_text)

    return chunks

def summarize_chunk(chunk_text: str, meeting_type: str, focus: str) -> str:
    """
    Calls the OpenAI API (GPT-3.5 or GPT-4) to summarize the provided chunk of transcript,
    using the new openai>=1.0.0 call: openai.chat.completions.create().
    """
    prompt = f"""
You are an AI assistant. This is a {meeting_type}.
Transcript Chunk:
{chunk_text}

{focus}

Summarize the chunk into bullet points,
highlighting key tasks, decisions, or important announcements.
Include approximate timestamps if relevant.
"""

    # Instead of openai.ChatCompletion.create, use the new 1.0.0 method:
    response = openai.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=600,
        temperature=0.3
    )
    # The rest remains the same: access the content from response
    return response.choices[0].message.content.strip()

def combine_summaries(chunk_summaries: List[str], meeting_type: str, focus: str) -> str:
    combined_text = "\n\n".join(
        [f"CHUNK {i} SUMMARY:\n{s}" for i, s in enumerate(chunk_summaries)]
    )

    final_prompt = f"""
We have several partial summaries from a {meeting_type}.
Please combine them into a single, coherent overall summary in bullet points.
Focus on tasks, decisions, deadlines, or any critical points.

PARTIAL SUMMARIES:
{combined_text}
"""

    response = openai.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": final_prompt}],
        max_tokens=1000,
        temperature=0.3
    )
    return response.choices[0].message.content.strip()

############################
# MAIN SUMMARIZER
############################

def main():
    use_csv = True
    transcript_path = "transcript.csv"

    # Load the transcript
    if use_csv:
        transcript = load_transcript_csv(transcript_path)
    else:
        transcript = load_transcript_json(transcript_path)

    # Sort by start time
    transcript.sort(key=lambda x: x['start'])

    # Break transcript into manageable chunks
    chunks = chunk_transcript(transcript, max_lines=MAX_LINES_PER_CHUNK)

    # Summarize each chunk
    chunk_summaries = []
    for chunk_text in chunks:
        chunk_summary = summarize_chunk(chunk_text, MEETING_TYPE, FOCUS_REQUEST)
        chunk_summaries.append(chunk_summary)

    # If there's only one chunk, no need to combine
    if len(chunk_summaries) == 1:
        final_summary = chunk_summaries[0]
    else:
        final_summary = combine_summaries(chunk_summaries, MEETING_TYPE, FOCUS_REQUEST)

    # Write final summary to file
    output_file = "final_summary.txt"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(final_summary)

    print(f"Summary complete! Saved to {output_file}")

if __name__ == "__main__":
    main()
