import os
import numpy as np
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

LLM_MODEL = os.getenv("LLM_MODEL")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")
EMBEDDING_DIMENSION = os.getenv("EMBEDDING_DIMENSION")

client = AsyncOpenAI(
    base_url = os.getenv("OLLAMA_BASE_URL"),
    api_key = os.getenv("OLLAMA_API_KEY", "ollama")
)

def normalize_vector(vec: list[float]) -> np.ndarray:
    array = np.array(vec, dtype='float32').reshape(1, -1)
    from faiss import normalize_L2
    normalize_L2(array)
    return array

async def embed_text(text: str) -> np.ndarray | None:
    if not text.strip():
        return None
    try:
        resp = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text
        )
        if resp.data and len(resp.data) > 0:
            return normalize_vector(resp.data[0].embedding)
        return None
    except Exception:
        return None