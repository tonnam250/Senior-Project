import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

def get_pages(document_id: int) -> list[dict]:
    with psycopg.connect(os.environ["POSTGRES_URL"]) as conn:
        rows = conn.execute(
            "SELECT page_number, text FROM pages WHERE document_id = %s ORDER BY page_number",
            (document_id,),
        ).fetchall()
    return [{"page_number": r[0], "text": r[1]} for r in rows]


def save_chunks(document_id: int, chunks: list[dict]) -> None:
    with psycopg.connect(os.environ["POSTGRES_URL"]) as conn:
        with conn.cursor() as cur:
            # ลบของเก่าก่อน เพื่อให้สั่ง chunk ซ้ำได้โดยไม่ซ้อนกัน
            cur.execute("DELETE FROM chunks WHERE document_id = %s", (document_id,))
            cur.executemany(
                "INSERT INTO chunks (document_id, chunk_index, text, page_start, page_end) "
                "VALUES (%s, %s, %s, %s, %s)",
                [
                    (document_id, c["chunk_index"], c["text"], c["page_start"], c["page_end"])
                    for c in chunks
                ],
            )

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