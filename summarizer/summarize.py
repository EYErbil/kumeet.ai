# summarize.py

import os
import pandas as pd
import json

from transformers import pipeline
# This import only works if you installed the correct library:
#   pip install google-genai
from google import genai

from config import (
    HF_SUMMARY_MODEL,
    MAX_LINES_PER_CHUNK,
    MEETING_TYPE,
    FOCUS_REQUEST
)
from db import load_transcript_from_db, save_summary_in_db

##############################################################################
# Initialize Summarizers
##############################################################################

# If you still want HF summarizer
hf_summarizer = pipeline("summarization", model=HF_SUMMARY_MODEL)

# "gemini-2.0-flash" model
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

##############################################################################
# Chunk Transcript
##############################################################################

def chunk_transcript_data(transcript, max_lines=10):
    """
    Splits the transcript (list of dicts) into chunk_text blocks, each up to `max_lines`.
    Returns a list of:
      [
        {"chunk_text": str, "start": float, "end": float},
        ...
      ]
    """
    chunks = []
    current_lines = []
    chunk_start = None
    chunk_end = None

    for entry in transcript:
        line_str = f"[{entry['start']:.2f}-{entry['end']:.2f}] {entry['speaker']}: {entry['text']}"
        if chunk_start is None:
            chunk_start = entry["start"]
        chunk_end = entry["end"]
        current_lines.append(line_str)

        if len(current_lines) >= max_lines:
            chunk_text = "\n".join(current_lines)
            chunks.append({
                "chunk_text": chunk_text,
                "start": chunk_start,
                "end": chunk_end
            })
            current_lines = []
            chunk_start = None
            chunk_end = None

    # leftover lines
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

##############################################################################
# Summarizer: Hugging Face
##############################################################################

def summarize_chunk_hf(chunk_text: str) -> str:
    """
    Summarize with Hugging Face pipeline
    """
    result = hf_summarizer(chunk_text, max_length=200, min_length=50, do_sample=False)
    return result[0]["summary_text"]

##############################################################################
# Summarizer: Gemini w/ Custom Prompt
##############################################################################

def summarize_chunk_gemini(chunk_text: str, meeting_type: str, focus: str) -> str:
    """
    Summarize a chunk using gemini-2.0-flash, providing a custom prompt.
    We'll embed `meeting_type` and `focus` instructions.
    """
    # Build your prompt
    prompt = (
        f"You are an AI assistant. This is a {meeting_type}.\n\n"
        f"Transcript Chunk:\n{chunk_text}\n\n"
        f"{focus}\n\n"
        "Please summarize the chunk into bullet points, highlighting tasks, decisions, deadlines, "
        "and referencing approximate timestamps if relevant."
    )

    # Call gemini
    response = gemini_client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt
    )
    return response.text

##############################################################################
# Combine Summaries
##############################################################################

def combine_summaries_simple(hf_summary: str, gemini_summary: str) -> str:
    """
    Simple merge of the two partial summaries.
    """
    merged = "HuggingFace Summary:\n" + hf_summary.strip()
    merged += "\n\nGemini Summary:\n" + gemini_summary.strip()
    return merged

##############################################################################
# Summarize Transcript
##############################################################################

def summarize_transcript(session_id, output_dir):
    """
    1) Load transcript from DB
    2) chunk
    3) Summarize each chunk with HF + gemini
    4) Combine partial summaries
    5) Save final bullet list referencing chunk times
    6) Store in DB + local file
    """
    transcript = load_transcript_from_db(session_id)
    if not transcript:
        return None

    chunks = chunk_transcript_data(transcript, MAX_LINES_PER_CHUNK)
    final_data = []

    for idx, ch in enumerate(chunks):
        # Summarize chunk with HF
        hf_sum = summarize_chunk_hf(ch["chunk_text"])

        # Summarize chunk with gemini, passing the meeting_type & focus from config
        gem_sum = summarize_chunk_gemini(ch["chunk_text"], MEETING_TYPE, FOCUS_REQUEST)

        # unify
        merged_summary = combine_summaries_simple(hf_sum, gem_sum)

        final_data.append({
            "idx": idx + 1,
            "start": ch["start"],
            "end": ch["end"],
            "summary": merged_summary
        })

    # produce final text
    lines = []
    for fc in final_data:
        lines.append(
            f"CHUNK {fc['idx']} [{fc['start']:.2f}-{fc['end']:.2f}]:\n{fc['summary']}\n"
        )
    final_summary = "\n".join(lines)

    # store in DB
    save_summary_in_db(session_id, final_summary)

    # store locally
    out_path = os.path.join(output_dir, "multimodel_summary.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(final_summary)

    return final_summary

##############################################################################
# End
##############################################################################

if __name__ == "__main__":
    pass
