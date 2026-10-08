import os
import shutil
import tempfile

from fastapi import FastAPI, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from parsing.parse import parse_pdf
from database import save_parsed, get_pages, save_chunks, get_chunks, save_embeddings, get_summaries, get_status, set_status, get_document_info
from chunking.chunker import chunk_pages
from embedding.embedder import embed_texts, MODEL_NAME
from summarization.summarizer import summarize_document
from process_pipeline import run_pipeline

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

@app.post("/documents/{document_id}/summarize")
def start_summarize(document_id: int, background_tasks: BackgroundTasks):
    if not get_chunks(document_id):
        raise HTTPException(status_code=404, detail="ยังไม่มี chunk ให้ทำ chunking ก่อน")
    set_status(document_id, "summarizing")
    background_tasks.add_task(summarize_document, document_id)
    return {"document_id": document_id, "status": "summarizing"}


@app.get("/documents/{document_id}/summary")
def read_summary(document_id: int):
    status = get_status(document_id)
    if status is None:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")
    rows = get_summaries(document_id)
    levels: dict[int, int] = {}
    for r in rows:
        levels[r["level"]] = levels.get(r["level"], 0) + 1
    final = rows[-1] if rows and status == "done" else None
    return {
        "document_id": document_id,
        "status": status,
        "levels": levels,
        "final_summary": final,
        "summaries": rows,
    }

@app.post("/process")
def process(file: UploadFile, background_tasks: BackgroundTasks):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        temp_path = tmp.name
    try:
        pages = parse_pdf(temp_path)
    finally:
        os.remove(temp_path)

    document_id = save_parsed(file.filename, pages)
    background_tasks.add_task(run_pipeline, document_id)
    return {"document_id": document_id, "page_count": len(pages)}


@app.get("/documents/{document_id}/status")
def document_status(document_id: int):
    info = get_document_info(document_id)
    if info is None:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")
    return info