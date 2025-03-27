import os
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost:5432/postgres")

try:
    conn = psycopg2.connect(DATABASE_URL)
    print("PostgreSQL connection is successful!")
except Exception as e:
    print(f"PostgreSQL connection error: {e}")
