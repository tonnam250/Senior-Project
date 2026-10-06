import re

TARGET_CHARS = 3000   # ปิด chunk เมื่อยาวถึงค่านี้
MAX_CHARS = 4000      # จำนวนสูงสุดของ chunk


def _split_long(text: str, limit: int) -> list[str]:
    # ตัดย่อหน้าที่ยาวเกิน limit: แบ่งตามบรรทัดก่อน
    parts, buf = [], ""
    for line in text.split("\n"):
        while len(line) > limit:
            if buf:
                parts.append(buf)
                buf = ""
            parts.append(line[:limit])
            line = line[limit:]
        if buf and len(buf) + len(line) + 1 > limit:
            parts.append(buf)
            buf = line
        else:
            buf = f"{buf}\n{line}" if buf else line
    if buf:
        parts.append(buf)
    return parts


def chunk_pages(
    pages: list[dict],
    target_chars: int = TARGET_CHARS,
    max_chars: int = MAX_CHARS,
) -> list[dict]:
    """
    รับ [{"page_number": 1, "text": "..."}, ...]
    คืน [{"chunk_index", "text", "page_start", "page_end"}, ...]
    """
    # แตกเป็นย่อหน้าโดยจำหมายเลขหน้าไว้กับทุกหน่วย
    units: list[tuple[int, str]] = []
    for page in pages:
        text = page["text"].strip()
        if not text:
            continue
        for para in re.split(r"\n\s*\n", text):
            para = para.strip()
            if not para:
                continue
            if len(para) > max_chars:
                units.extend((page["page_number"], part) for part in _split_long(para, max_chars))
            else:
                units.append((page["page_number"], para))

    # รวมหน่วยติดกันเป็น chunk
    chunks: list[dict] = []
    current: list[tuple[int, str]] = []
    current_len = 0

    def flush():
        nonlocal current, current_len
        if not current:
            return
        chunks.append({
            "chunk_index": len(chunks),
            "text": "\n\n".join(t for _, t in current),
            "page_start": min(p for p, _ in current),
            "page_end": max(p for p, _ in current),
        })
        current, current_len = [], 0

    for page_number, text in units:
        add_len = len(text) + 2
        if current and current_len + add_len > max_chars:
            flush()                        # เพิ่มแล้วเกินเพดาน ปิด chunk ก่อน
        current.append((page_number, text))
        current_len += add_len
        if current_len >= target_chars:
            flush()
    flush()

    return chunks