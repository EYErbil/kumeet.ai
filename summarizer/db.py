# db.py

import sqlite3
import json
import os
from config import DB_PATH

def init_db():
    """
    Creates required tables:
      transcripts -> store transcripts
      summaries -> store final text summary
      action_items -> store bullet items with importance + timestamp
      questions -> store custom Q&A
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # transcripts
    c.execute("""
    CREATE TABLE IF NOT EXISTS transcripts (
        session_id TEXT PRIMARY KEY,
        transcript_json TEXT
    )
    """)

    # summaries
    c.execute("""
    CREATE TABLE IF NOT EXISTS summaries (
        session_id TEXT PRIMARY KEY,
        summary_text TEXT
    )
    """)

    # action_items
    c.execute("""
    CREATE TABLE IF NOT EXISTS action_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        chunk_idx INTEGER,
        description TEXT,
        importance_score INTEGER,
        timestamp TEXT
    )
    """)

    # questions
    c.execute("""
    CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        question_text TEXT,
        answer_text TEXT
    )
    """)

    conn.commit()
    conn.close()

def save_transcript_in_db(session_id, transcript_data):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    transcript_json = json.dumps(transcript_data)
    c.execute("REPLACE INTO transcripts (session_id, transcript_json) VALUES (?, ?)",
              (session_id, transcript_json))
    conn.commit()
    conn.close()

def load_transcript_from_db(session_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT transcript_json FROM transcripts WHERE session_id=?",
              (session_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return json.loads(row[0])
    return None

def save_summary_in_db(session_id, summary_text):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("REPLACE INTO summaries (session_id, summary_text) VALUES (?, ?)",
              (session_id, summary_text))
    conn.commit()
    conn.close()

def load_summary_from_db(session_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT summary_text FROM summaries WHERE session_id=?",
              (session_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return row[0]
    return None

def save_action_items_in_db(session_id, chunk_idx, items):
    """
    items: list of dict
    each item has: description, importance_score, timestamp
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    for it in items:
        c.execute("""
        INSERT INTO action_items (session_id, chunk_idx, description, importance_score, timestamp)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            session_id,
            chunk_idx,
            it.get("description",""),
            it.get("importance_score", 5),
            it.get("timestamp","")
        ))
    conn.commit()
    conn.close()

def load_action_items_from_db(session_id):
    """
    Returns all action items for a given session_id
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
    SELECT chunk_idx, description, importance_score, timestamp
    FROM action_items
    WHERE session_id=?
    ORDER BY chunk_idx
    """, (session_id,))
    rows = c.fetchall()
    conn.close()
    items = []
    for r in rows:
        items.append({
            "chunk_idx": r[0],
            "description": r[1],
            "importance_score": r[2],
            "timestamp": r[3]
        })
    return items

def save_question_answer_in_db(session_id, question, answer):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO questions (session_id, question_text, answer_text) VALUES (?, ?, ?)",
              (session_id, question, answer))
    conn.commit()
    conn.close()

def load_questions_from_db(session_id):
    """
    Returns all Q&A for a session
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
    SELECT question_text, answer_text FROM questions
    WHERE session_id=?
    ORDER BY id
    """, (session_id,))
    rows = c.fetchall()
    conn.close()
    return [{"question": r[0], "answer": r[1]} for r in rows]


if __name__ == "__main__":
    init_db()
    print("DB initialized.")
