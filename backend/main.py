import os
import shutil
import tempfile

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from parsing.parse import parse_pdf
from database import save_parsed, get_pages, save_chunks, get_chunks, save_embeddings
from chunking.chunker import chunk_pages
from embedding.embedder import embed_texts, MODEL_NAME

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/parsing")
def parse_pdf_end(file: UploadFile):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        temp_path = tmp.name

    try:
        pages = parse_pdf(temp_path)
    finally:
        os.remove(temp_path)

    document_id = save_parsed(file.filename, pages)

    return {"document_id": document_id, "pages": pages}

@app.post("/documents/{document_id}/chunk")
def chunk_document(document_id: int):
    pages = get_pages(document_id)
    if not pages:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสารหรือยังไม่มีหน้า")
    chunks = chunk_pages(pages)
    save_chunks(document_id, chunks)
    return {"document_id": document_id, "chunk_count": len(chunks)}

@app.post("/documents/{document_id}/embed")
def embed_document(document_id: int):
    chunks = get_chunks(document_id)
    if not chunks:
        raise HTTPException(status_code=404, detail="ยังไม่มี chunk ให้ทำ chunking ก่อน")
    vectors = embed_texts([c["text"] for c in chunks])
    save_embeddings([c["id"] for c in chunks], vectors, MODEL_NAME)
    return {"document_id": document_id, "embedded": len(vectors), "dimension": len(vectors[0])}