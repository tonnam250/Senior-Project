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
            cur.execute("DELETE FROM summaries WHERE document_id = %s", (document_id,))
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
    
# Chunk เดียว
def get_chunk(document_id: int, chunk_id: int) -> dict | None:
    with psycopg.connect(os.environ["POSTGRES_URL"]) as conn:
        row = conn.execute(
            "SELECT id, chunk_index, text, page_start, page_end "
            "FROM chunks WHERE id = %s AND document_id = %s",
            (chunk_id, document_id),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "chunk_index": row[1],
        "text": row[2],
        "page_start": row[3],
        "page_end": row[4],
    }

# Chunk ทั้งหมด
def get_chunks(document_id: int) -> list[dict]:
    with psycopg.connect(os.environ["POSTGRES_URL"]) as conn:
        rows = conn.execute(
            """
            SELECT id, chunk_index, text, page_start, page_end
            FROM chunks
            WHERE document_id = %s
            ORDER BY chunk_index
            """,
            (document_id,),
        ).fetchall()

    return [
        {
            "id": row[0],
            "chunk_index": row[1],
            "text": row[2],
            "page_start": row[3],
            "page_end": row[4],
        }
        for row in rows
    ]


def save_embeddings(chunk_ids: list[int], vectors: list[list[float]], model: str) -> None:
    with psycopg.connect(os.environ["POSTGRES_URL"]) as conn:
        with conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO chunk_embeddings (chunk_id, model, embedding) "
                "VALUES (%s, %s, %s::vector) "
                "ON CONFLICT (chunk_id) DO UPDATE "
                "SET model = EXCLUDED.model, embedding = EXCLUDED.embedding",
                [(cid, model, str(vec)) for cid, vec in zip(chunk_ids, vectors)],
            )

def set_status(document_id: int, status: str) -> None:
    with psycopg.connect(os.environ["POSTGRES_URL"]) as conn:
        conn.execute("UPDATE documents SET status = %s WHERE id = %s", (status, document_id))


def get_status(document_id: int) -> str | None:
    with psycopg.connect(os.environ["POSTGRES_URL"]) as conn:
        row = conn.execute("SELECT status FROM documents WHERE id = %s", (document_id,)).fetchone()
    return row[0] if row else None


def clear_summaries(document_id: int) -> None:
    with psycopg.connect(os.environ["POSTGRES_URL"]) as conn:
        conn.execute("DELETE FROM summaries WHERE document_id = %s", (document_id,))


def insert_summary(document_id, level, node_index, text, page_start, page_end,
                   model, prompt_version, elapsed_ms, chunk_id=None) -> int:
    with psycopg.connect(os.environ["POSTGRES_URL"]) as conn:
        row = conn.execute(
            "INSERT INTO summaries (document_id, level, node_index, text, page_start, page_end, "
            "chunk_id, model, prompt_version, elapsed_ms) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (document_id, level, node_index, text, page_start, page_end,
             chunk_id, model, prompt_version, elapsed_ms),
        ).fetchone()
    return row[0]


def set_parent(child_ids: list[int], parent_id: int) -> None:
    with psycopg.connect(os.environ["POSTGRES_URL"]) as conn:
        conn.execute("UPDATE summaries SET parent_id = %s WHERE id = ANY(%s)", (parent_id, child_ids))


def get_summaries(document_id: int) -> list[dict]:
    with psycopg.connect(os.environ["POSTGRES_URL"]) as conn:
        rows = conn.execute(
            "SELECT id, level, node_index, text, page_start, page_end, parent_id, "
            "chunk_id, model, prompt_version, elapsed_ms "
            "FROM summaries WHERE document_id = %s ORDER BY level, node_index",
            (document_id,),
        ).fetchall()
    keys = ["id", "level", "node_index", "text", "page_start", "page_end",
            "parent_id", "chunk_id", "model", "prompt_version", "elapsed_ms"]
    return [dict(zip(keys, r)) for r in rows]

def get_document_info(document_id: int) -> dict | None:
    with psycopg.connect(os.environ["POSTGRES_URL"]) as conn:
        row = conn.execute(
            "SELECT d.filename, d.status, d.page_count, "
            "       (SELECT COUNT(*) FROM chunks c WHERE c.document_id = d.id) "
            "FROM documents d WHERE d.id = %s",
            (document_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "document_id": document_id,
        "filename": row[0],
        "status": row[1],
        "page_count": row[2],
        "chunk_count": row[3],
    }