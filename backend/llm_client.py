import ollama

MODEL = "qwen2.5:7b"
EMBED_MODEL = "bge-m3"
NUM_CTX = 8192


def generate(prompt: str) -> str:
    resp = ollama.chat(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        options={"num_ctx": NUM_CTX, "temperature": 0.2},
    )
    used = getattr(resp, "prompt_eval_count", None)
    if used and used >= NUM_CTX - 50:
        print(f"คำเตือน: prompt ใช้ {used} token เกือบเต็ม context ข้อความอาจถูกตัด")
    return resp["message"]["content"].strip()


def embed(texts: list[str]) -> list[list[float]]:
    resp = ollama.embed(model=EMBED_MODEL, input=texts)
    return resp["embeddings"]