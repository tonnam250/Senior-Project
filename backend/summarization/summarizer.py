import math
import time
import traceback

from llm_client import generate, MODEL
from database import (
    get_chunk,get_chunks, clear_summaries, insert_summary, set_parent, set_status,
)

PROMPT_VERSION = "v1"
GROUP_SIZE = 5   # ยุบสรุปทีละกี่ก้อนในแต่ละระดับ

CHUNK_PROMPT = """คุณคือผู้ช่วยสรุปเอกสารวิชาการ
สรุปเนื้อหาด้านล่างให้กระชับ โดยยึดตามข้อความที่ให้เท่านั้น
- ห้ามเพิ่มข้อมูลที่ไม่มีอยู่ในข้อความ
- เก็บตัวเลข ชื่อเฉพาะ และข้อค้นพบสำคัญไว้
- เขียนด้วยภาษาเดียวกับเนื้อหาต้นฉบับ
- ตอบเฉพาะตัวสรุป ไม่ต้องมีคำนำหรือคำลงท้าย

เนื้อหา:
{text}

สรุป:"""

MERGE_PROMPT = """ต่อไปนี้คือสรุปย่อยของเอกสารเดียวกัน เรียงตามลำดับในเอกสาร
รวมให้เป็นสรุปเดียวที่ต่อเนื่อง กระชับ และไม่ซ้ำซ้อน โดยยึดตามสรุปย่อยเท่านั้น
- ห้ามเพิ่มข้อมูลที่ไม่มีอยู่ในสรุปย่อย
- เก็บตัวเลข ชื่อเฉพาะ และข้อค้นพบสำคัญไว้
- เขียนด้วยภาษาเดียวกับสรุปย่อย
- ตอบเฉพาะตัวสรุป ไม่ต้องมีคำนำหรือคำลงท้าย

สรุปย่อย:
{text}

สรุปรวม:"""


def balanced_groups(items: list, max_size: int) -> list[list]:
    """แบ่ง items เป็นกลุ่มขนาดใกล้เคียงกัน ไม่เกิน max_size และไม่เหลือกลุ่มที่มีตัวเดียว"""
    n = len(items)
    k = math.ceil(n / max_size)
    base, extra = divmod(n, k)
    groups, start = [], 0
    for i in range(k):
        size = base + (1 if i < extra else 0)
        groups.append(items[start:start + size])
        start += size
    return groups


def _timed_generate(prompt: str) -> tuple[str, int]:
    t0 = time.time()
    text = generate(prompt)
    return text, int((time.time() - t0) * 1000)


def summarize_document(document_id: int) -> None:
    try:
        chunks = get_chunks(document_id)
        if not chunks:
            raise ValueError("ยังไม่มี chunk")

        clear_summaries(document_id)
        set_status(document_id, "summarizing")

        # ระดับ 1: สรุปทีละ chunk
        nodes = []
        for i, c in enumerate(chunks):
            text, ms = _timed_generate(CHUNK_PROMPT.format(text=c["text"]))
            sid = insert_summary(
                document_id, 1, i, text, c["page_start"], c["page_end"],
                MODEL, PROMPT_VERSION, ms, chunk_id=c["id"],
            )
            nodes.append({"id": sid, "text": text,
                          "page_start": c["page_start"], "page_end": c["page_end"]})
            print(f"[doc {document_id}] ระดับ 1: {i + 1}/{len(chunks)} ({ms / 1000:.1f} วินาที)")

        # ระดับ 2 ขึ้นไป: ยุบทีละกลุ่มจนเหลือก้อนเดียว
        level = 1
        while len(nodes) > 1:
            level += 1
            next_nodes = []
            groups = balanced_groups(nodes, GROUP_SIZE)
            for i, group in enumerate(groups):
                joined = "\n\n".join(
                    f"[ส่วนที่ {j + 1}]\n{n['text']}" for j, n in enumerate(group)
                )
                text, ms = _timed_generate(MERGE_PROMPT.format(text=joined))
                page_start = min(n["page_start"] for n in group)
                page_end = max(n["page_end"] for n in group)
                sid = insert_summary(
                    document_id, level, i, text, page_start, page_end,
                    MODEL, PROMPT_VERSION, ms,
                )
                set_parent([n["id"] for n in group], sid)
                next_nodes.append({"id": sid, "text": text,
                                   "page_start": page_start, "page_end": page_end})
                print(f"[doc {document_id}] ระดับ {level}: {i + 1}/{len(groups)} ({ms / 1000:.1f} วินาที)")
            nodes = next_nodes

        set_status(document_id, "done")
    except Exception:
        traceback.print_exc()
        set_status(document_id, "failed")