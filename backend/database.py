import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

def save_parsed(filename: str, pages: list[dict]) -> int:
    with psycopg.connect(os.environ["POSTGRES_URL"]) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO documents (filename, page_count, status) "
                "VALUES (%s, %s, 'parsed') RETURNING id",
                (filename, len(pages)),
            )
            doc_id = cur.fetchone()[0]
            cur.executemany(
                "INSERT INTO pages (document_id, page_number, text) VALUES (%s, %s, %s)",
                [(doc_id, p["page_number"], p["text"]) for p in pages],
            )
        return doc_id