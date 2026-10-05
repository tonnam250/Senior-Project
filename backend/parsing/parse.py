import pymupdf

def parse_pdf(pdf_path: str) -> list[dict]:
    pages = []
    with pymupdf.open(pdf_path) as doc:
        for i, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            pages.append({"page_number": i, "text": text})
    return pages