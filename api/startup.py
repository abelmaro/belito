import os
import time
import httpx
import asyncio
from dotenv import load_dotenv
from api.services.embedding import LLM_MODEL, EMBEDDING_MODEL, client
from api.services.indexing import index_manager

load_dotenv()

INDEX_PATH = "data/index.faiss"
TEXTS_PATH = "data/texts.pkl"

async def wait_until_model_is_ready():
    try:
        os.makedirs("data", exist_ok=True)
        index_manager.load(INDEX_PATH, TEXTS_PATH)
        print(f"Index loaded from disk. Vectors: {index_manager.index.ntotal}, Texts: {len(index_manager.texts)}")
    except Exception as e:
        print(f"Could not load index from disk: {e}")

    ollama_api_tags_url = f"{client.base_url}".replace("/v1", "/api/tags")
    max_wait_secs = 120
    poll_interval = 5
    start_time = time.time()

    required_models = {LLM_MODEL, EMBEDDING_MODEL}
    models_ready = set()

    async with httpx.AsyncClient(timeout=10.0) as http_client:
        while time.time() - start_time < max_wait_secs:
            try:
                res = await http_client.get(ollama_api_tags_url, follow_redirects=True)
                res.raise_for_status()
                data = res.json()
                available_models = {m.get("name") for m in data.get("models", []) if m.get("name")}
                models_ready = required_models.intersection(available_models)
                missing_models = required_models - models_ready

                if not missing_models:
                    for model in models_ready:
                        print(f"Model '{model}' ready.")
                    print("FastAPI server ready to receive requests.")
                    return

                print(f"   Waiting for: {', '.join(missing_models)}. Retrying in {poll_interval}s...")

            except Exception as e:
                print(f"Error verifying models: {e}. Retrying in {poll_interval}s...")

            await asyncio.sleep(poll_interval)

    print("The following required models are NOT available:")
    for model in (required_models - models_ready):
        print(f"   - {model}")
    print("The application will start, but may fail without those models.")


def save_index_on_shutdown():
    try:
        index_manager.save(INDEX_PATH, TEXTS_PATH)
        print(f"Index saved successfully. Vectors: {index_manager.index.ntotal}, Texts: {len(index_manager.texts)}")
    except Exception as e:
        print(f"Error saving index to disk: {e}")
