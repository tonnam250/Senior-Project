from llm_client import embed, EMBED_MODEL

BATCH_SIZE = 16


def embed_texts(texts: list[str]) -> list[list[float]]:
    vectors: list[list[float]] = []
    for i in range(0, len(texts), BATCH_SIZE):
        vectors.extend(embed(texts[i:i + BATCH_SIZE]))
    return vectors


MODEL_NAME = EMBED_MODEL