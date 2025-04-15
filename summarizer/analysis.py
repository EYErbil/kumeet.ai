# analysis.py

import json
import sqlite3
import re

from summarizer.config import DB_PATH, GEMINI_API_KEY
import google.generativeai as genai
from summarizer.db import (
    load_transcript_from_db,
    save_action_items_in_db,
    save_question_answer_in_db
)

# Configure the Google Generative AI library with the API key
genai.configure(api_key=GEMINI_API_KEY)

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

    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
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
        return []

def save_extracted_items_in_db(session_id, chunk_idx, items):
    """
    items is a list of dict from extract_items_with_scores_gemini
    Add chunk_idx to each item, then store in action_items table
    """
    # pass chunk_idx to the db call
    save_action_items_in_db(session_id, chunk_idx, items)

def answer_user_question(session_id, question_text):
    """
    We do a Q&A with gemini about the entire transcript from DB.
    We'll store the question/answer in the db.
    """
    # Use the already imported functions instead of re-importing
    transcript_data = load_transcript_from_db(session_id)
    if not transcript_data:
        return None

    # Build a single text from the entire transcript
    lines = []
    for seg in transcript_data:
        lines.append(f"[{seg['start']:.2f}-{seg['end']:.2f}] {seg['speaker']}: {seg['text']}")
    entire_text = "\n".join(lines)

    prompt = (
        "Below is the entire meeting transcript.\n\n"
        f"User question: {question_text}\n\n"
        "Transcript:\n" + entire_text + "\n\n"
        "Please provide a concise answer."
    )

    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    answer = response.text

    # store Q&A
    save_question_answer_in_db(session_id, question_text, answer)

    return answer