from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.ws_interview import router as ws_interview_router
from app.api.ws_audio import router as ws_audio_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_interview_router)
app.include_router(ws_audio_router)


@app.get("/health")
def health():
    return {"status": "ok"}
