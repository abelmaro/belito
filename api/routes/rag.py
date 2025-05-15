from fastapi import APIRouter, UploadFile, File, Form, Response
from fastapi.responses import JSONResponse
from api.services.embedding import embed_text, LLM_MODEL, client
from api.services.indexing import index_manager
import numpy as np
import asyncio
import re
import os

router = APIRouter()

@router.post("/upload", summary="Upload a resume in TXT format and process it for RAG")
async def upload_file(file: UploadFile = File(..., description=".txt file to be processed")):
    if not file.filename.lower().endswith(".txt"):
        return JSONResponse({"error": "File format not allowed. Upload a .txt file."}, status_code=400)

    try:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8")
        chunks = [chunk for chunk in content.split("\n\n") if chunk.strip()]

        if not chunks:
            return JSONResponse({"message": f"File '{file.filename}' is empty or does not have valid content."}, status_code=400)

        vectors_to_add, texts_to_add = [], []
        for chunk in chunks:
            vec = await embed_text(chunk)
            if vec is not None:
                vectors_to_add.append(vec)
                texts_to_add.append(chunk)

        if vectors_to_add:
            all_vectors = np.vstack(vectors_to_add)
            index_manager.add(all_vectors, texts_to_add)
            return JSONResponse({"status": "ok", "message": f"File '{file.filename}' loaded with {len(vectors_to_add)} valid chunks."})
        else:
            return JSONResponse({"message": f"No valid embeddings were generated."}, status_code=400)

    except UnicodeDecodeError:
        return JSONResponse({"error": f"The file '{file.filename}' could not be decoded as UTF-8."}, status_code=400)
    except Exception as e:
        return JSONResponse({"error": f"Internal error processing file: {e}"}, status_code=500)
    finally:
        await file.close()


@router.post("/ask", summary="Ask a question based on the uploaded documents")
async def ask_question(prompt: str = Form(..., description="The resume")):
    if index_manager.index.ntotal == 0:
        return JSONResponse({"error": "There are no documents uploaded. Please upload a file first."}, status_code=400)

    if not prompt.strip():
        return JSONResponse({"error": "The question cannot be empty."}, status_code=400)

    q_vec = await embed_text(prompt)
    if q_vec is None:
        return JSONResponse({"error": "The question could not be processed (embedding failed)."}, status_code=500)

    context_chunks = index_manager.search(q_vec, k=3)

    if not context_chunks:
        return JSONResponse({"error": "No relevant fragments were found."}, status_code=404)

    context = "\n\n---\n\n".join(context_chunks)
    full_prompt = f"""**Instrucción:** Responde solo con el contexto. Si no hay info, dilo.

**Contexto:**
{context}

**Pregunta:** {prompt}

**Respuesta:**"""

    try:
        chat_response = await asyncio.wait_for(
            client.chat.completions.create(
                model=LLM_MODEL,
                messages=[{"role": "user", "content": full_prompt}],
            ),
            timeout=180
        )
        final_answer = chat_response.choices[0].message.content.strip()
        final_answer = re.sub(r"<think>.*?</think>\s*", "", final_answer, flags=re.S)
        return Response(content=final_answer, media_type="text/markdown")
    except Exception as e:
        return JSONResponse({"error": f"Internal error processing the question: {e}"}, status_code=500)


@router.post("/reset", summary="Resets the FAISS index and deletes saved data")
async def reset_index():
    try:
        from api.services.indexing import IndexManager
        index_manager.index = IndexManager().index
        index_manager.texts = []

        if os.path.exists("data/index.faiss"):
            os.remove("data/index.faiss")
        if os.path.exists("data/texts.pkl"):
            os.remove("data/texts.pkl")

        return JSONResponse({"status": "ok", "message": "Index and texts successfully removed."})
    except Exception as e:
        return JSONResponse({"error": f"The index could not be reset.: {e}"}, status_code=500)