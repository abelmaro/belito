# Belito: AI-powered Job Application Generator

Belito is a local, privacy-first Chrome extension + backend that helps you generate tailored job application messages using your uploaded resume and the job description from any LinkedIn job page.

It works by combining:

- A **FastAPI backend** with a FAISS-based RAG system powered by any LLM served through **Ollama**
- A **Chrome extension** that reads the job post from LinkedIn and renders a personalized message in real time

---

## Features

- Upload a `.txt` version of your resume
- Local vector search with FAISS and semantic embeddings
- Answers generated using any Ollama-compatible model (e.g. Qwen, Mistral)
- Message is structured in Markdown
- Persisted state (you only need to upload your resume once)
- No API keys required, no data sent to the cloud

---

## Requirements

- Python 3.10+
- Ollama installed and running locally
- Chrome (to run the extension)

---

## 1. Backend API

### Setup

```bash
git clone https://github.com/abelmaro/belito.git
cd belito/api

# Install dependencies
pip install -r requirements.txt

# Or with Conda
conda env create -f environment.yml
conda activate belito
```

### Configuration

Create a `.env` file based on the provided example:

```env
OLLAMA_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen3:1.7b # Very small model, for faster testing. For better results use a 14b+ model
EMBEDDING_MODEL=nomic-embed-text:latest
OLLAMA_API_KEY=ollama
```

### Run

```bash
uvicorn api.main:app --reload --port 8000
```

Then open `http://localhost:8000/docs` to test the endpoints.

---

### API Endpoints

| Method | Route     | Description                                |
|--------|-----------|--------------------------------------------|
| POST   | /upload   | Upload a `.txt` resume to embed and index  |
| POST   | /ask      | Ask the model to generate a message        |
| POST   | /reset    | Clear stored embeddings and resume content |

---

## 2. Chrome Extension

### Install locally

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder

### Usage

1. Open a LinkedIn job page
2. Upload your resume as `.txt`
3. Click **Generate proposal**
4. The extension will extract the job post, match it with your resume, and show a custom Markdown message

---

## Folder Structure

```
belito/
├── api/
│   ├── main.py
│   ├── startup.py
│   ├── routes/
│   └── services/
├── extension/
│   ├── popup.html
│   ├── popup.js
│   ├── content.js
│   ├── manifest.json
│   └── marked.min.js
├── data/
├── .env.example
├── requirements.txt
├── environment.yml
└── README.md
```

---

## License

MIT
