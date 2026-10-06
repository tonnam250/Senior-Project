import ollama

MODEL = "qwen2.5:7b"
EMBED_MODEL = "bge-m3"


def generate(prompt: str) -> str:
    resp = ollama.chat(model=MODEL, messages=[{"role": "user", "content": prompt}])
    return resp["message"]["content"].strip()


def embed(texts: list[str]) -> list[list[float]]:
    resp = ollama.embed(model=EMBED_MODEL, input=texts)
    return resp["embeddings"]