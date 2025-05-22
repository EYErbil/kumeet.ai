# analysis.py

import json
import sqlite3

from config import DB_PATH, GEMINI_API_KEY
import google.generativeai as genai
from db import (
    load_transcript_from_db,
    save_action_items_in_db,
    save_question_answer_in_db
)

# Configure the genai client with the API key
genai.configure(api_key=GEMINI_API_KEY)
def extract_decisions_gemini(text, chunk_idx, chunk_start, chunk_end):
    """
    Extracts DECISIONS made in the chunk using Gemini.
    Returns a list of dicts with 'description' and 'timestamp'.
    """
    prompt = (
        "You are analyzing a meeting transcript chunk below. "
        "Extract only clear DECISIONS made in this section (explicit choices, agreements, commitments). "
        "Return a valid JSON array, each with: description, timestamp. If none found, return [].\n\n"
        f"CHUNK (approx {chunk_start:.2f}-{chunk_end:.2f} sec):\n{text}"
    )
    model = genai.GenerativeModel("gemini-2.0-flash")
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
        return []

def extract_action_items_gemini(text, chunk_idx, chunk_start, chunk_end):
    """
    Extracts ACTION ITEMS (tasks assigned) in the chunk using Gemini.
    Returns a list of dicts with 'description', 'who', and 'timestamp'.
    """
    prompt = (
        "You are analyzing a meeting transcript chunk below. "
        "Extract only ACTION ITEMS (tasks or follow-ups assigned to someone) from this section. "
        "Return a valid JSON array, each with: description, who, timestamp. If none found, return [].\n\n"
        f"CHUNK (approx {chunk_start:.2f}-{chunk_end:.2f} sec):\n{text}"
    )
    model = genai.GenerativeModel("gemini-2.0-flash")
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

    # Use GenerativeModel instead of client.models
    model = genai.GenerativeModel("gemini-2.0-flash")
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
        return []

def save_extracted_items_in_db(session_id, chunk_idx, items):
    """
    items is a list of dict from extract_items_with_scores_gemini
    Add chunk_idx to each item, then store in action_items table
    """
    from db import save_action_items_in_db
    # pass chunk_idx to the db call
    save_action_items_in_db(session_id, chunk_idx, items)

def answer_user_question(session_id, question_text):
    """
    We do a Q&A with gemini about the entire transcript from DB.
    We'll store the question/answer in the db.
    """
    from db import load_transcript_from_db, save_question_answer_in_db

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

    # Use GenerativeModel instead of client.models
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(contents=prompt)
    
    answer = response.text

    # store Q&A
    save_question_answer_in_db(session_id, question_text, answer)

    return answer