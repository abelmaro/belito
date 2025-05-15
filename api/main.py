from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import rag
from api.startup import wait_until_model_is_ready, save_index_on_shutdown

app = FastAPI(
    title="Belito",
    description="API to upload your resume and generate an email proposal using Ollama and FAISS"
)

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rag.router)

@app.on_event("startup")
async def startup_event():
    await wait_until_model_is_ready()
    
@app.on_event("shutdown")
async def shutdown_event():
    save_index_on_shutdown()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)