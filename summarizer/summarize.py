# summarize.py

import os
import pandas as pd
import json

from transformers import pipeline
from google import genai

from config import (
    HF_SUMMARY_MODEL,
    MAX_LINES_PER_CHUNK,
    MEETING_TYPE,
    FOCUS_REQUEST
)
from db import load_transcript_from_db, save_summary_in_db
from analysis import extract_items_with_scores_gemini, save_extracted_items_in_db

##############################################################################
# Summarizer: Hugging Face
##############################################################################
hf_summarizer = pipeline("summarization", model=HF_SUMMARY_MODEL)

# gemini is used for second partial summary
GEMINI_API_KEY = "AIzaSyBcizqje0iym5bPHx-OoepPbGqGcuLADKM"
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

def chunk_transcript_data(transcript, max_lines=10):
    chunks = []
    current_lines = []
    chunk_start = None
    chunk_end   = None

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
            chunk_end   = None

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

def summarize_chunk_hf(chunk_text: str) -> str:
    result = hf_summarizer(chunk_text, max_length=200, min_length=50, do_sample=False)
    return result[0]["summary_text"]

def summarize_chunk_gemini(chunk_text: str, meeting_type: str, focus: str) -> str:
    """
    Summarize a chunk using gemini-2.0-flash, providing a custom prompt.
    We'll embed `meeting_type` and `focus` instructions, and also
    demand an importance_score for each bullet item.
    We instruct gemini to keep all major details from the chunk.
    """

    prompt = (
        f"You are an AI assistant. This is a {meeting_type}.\n\n"
        "IMPORTANT:\n"
        "1) Keep every major detail from the transcript below. Do NOT omit or rephrase crucial facts.\n"
        "2) Highlight tasks, decisions, deadlines, referencing approximate timestamps.\n"
        "3) Assign an importance_score (1–10) to each bullet, indicating how critical it is.\n"
        "4) Output bullet points in the format:\n\n"
        "   * Bullet text (timestamp range) [score=X]\n"
        "   Possibly multiple bullets.\n"
        "5) If there's a single bullet, it must still follow the format.\n"
        "6) None of the chunk's important details should be lost.\n\n"
        f"Transcript Chunk:\n{chunk_text}\n\n"
        f"Additional Focus: {focus}\n\n"
        "Now produce bullet points per the instructions above."
    )

    response = gemini_client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt
    )
    return response.text


def combine_summaries_simple(hf_summary: str, gemini_summary: str) -> str:
    merged = "HuggingFace Summary:\n" + hf_summary.strip()
    merged += "\n\nGemini Summary:\n" + gemini_summary.strip()
    return merged

def summarize_transcript(session_id, output_dir):
    transcript = load_transcript_from_db(session_id)
    if not transcript:
        return None

    chunks = chunk_transcript_data(transcript, MAX_LINES_PER_CHUNK)
    final_data = []

    for idx, ch in enumerate(chunks):
        hf_sum  = summarize_chunk_hf(ch["chunk_text"])
        gem_sum = summarize_chunk_gemini(ch["chunk_text"], MEETING_TYPE, FOCUS_REQUEST)

        # unify HF + gemini
        merged_summary = combine_summaries_simple(hf_sum, gem_sum)

        # next, parse bullet items with importance score
        items = extract_items_with_scores_gemini(merged_summary, idx+1, ch["start"], ch["end"])
        # store them in DB
        if items:
            save_extracted_items_in_db(session_id, idx+1, items)

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

    save_summary_in_db(session_id, final_summary)

    out_path = os.path.join(output_dir, "multimodel_summary.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(final_summary)

    return final_summary
