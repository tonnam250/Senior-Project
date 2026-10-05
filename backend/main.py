import os
import shutil
import tempfile

from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from parsing.parse import parse_pdf
from database import save_parsed

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