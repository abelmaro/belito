# Belito RAG API

A Chrome extension that generates professional job application messages (in Markdown) by combining your uploaded resume and the job description from a LinkedIn job page. Uses a local RAG (Retrieval-Augmented Generation) backend powered by FAISS and any LLM available via Ollama.

---

## Features

- Upload and chunk `.txt` documents for indexing
- Store vector embeddings using FAISS
- Ask questions based on uploaded content (RAG)
- Persistent index between restarts
- Ollama-compatible LLM integration (e.g. Qwen, Mistral)
- Endpoint to reset the index (`/reset`)
- Uses environment variables for configuration

---

## Requirements

- Python 3.10+
- FAISS
- Ollama running locally with supported models

---

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/belito-rag-api.git
cd belito-rag-api

# Option 1: pip
pip install -r requirements.txt

# Option 2: conda
conda env create -f environment.yml
conda activate belito
```

---

## Configuration

Create a `.env` file based on the provided `env.example`:

```env
OLLAMA_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen3:1.7b
EMBEDDING_MODEL=nomic-embed-text:latest
OLLAMA_API_KEY=ollama
```

---

## Usage

Run the server locally:

```bash
uvicorn api.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` for interactive API documentation (Swagger UI).

---

## Endpoints

| Method | Route     | Description                                |
|--------|-----------|--------------------------------------------|
| POST   | /upload   | Upload a `.txt` file to be embedded/indexed |
| POST   | /ask      | Ask a question based on uploaded context   |
| POST   | /reset    | Clear the FAISS index and stored texts     |

---

## Folder Structure

```
api/
├── main.py
├── startup.py
├── routes/
│   └── rag.py
├── services/
│   ├── embedding.py
│   └── indexing.py
data/
.env.example
requirements.txt
environment.yml
```

---

## Notes

- This project uses `python-dotenv` to load environment variables.
- FAISS index and texts are persisted in the `data/` folder.
- Ensure Ollama is running and the required models are pulled.

---

## License

MIT
