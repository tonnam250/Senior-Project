import traceback

from chunking.chunker import chunk_pages
from embedding.embedder import embed_texts, MODEL_NAME
from summarization.summarizer import summarize_document
from database import (
    get_pages, save_chunks, get_chunk,get_chunks, save_embeddings, set_status,
)


def run_pipeline(document_id: int) -> None:
    try:
        # 1) chunk
        set_status(document_id, "chunking")
        pages = get_pages(document_id)
        chunks = chunk_pages(pages)
        if not chunks:
            raise ValueError("ไม่มีข้อความให้ทำ chunk (PDF อาจเป็นไฟล์สแกน)")
        save_chunks(document_id, chunks)

        # 2) embed
        set_status(document_id, "embedding")
        saved = get_chunks(document_id)
        vectors = embed_texts([c["text"] for c in saved])
        save_embeddings([c["id"] for c in saved], vectors, MODEL_NAME)

        # 3) summarize (ฟังก์ชันนี้ตั้ง status เป็น summarizing / done / failed เอง)
        summarize_document(document_id)
    except Exception:
        traceback.print_exc()
        set_status(document_id, "failed")