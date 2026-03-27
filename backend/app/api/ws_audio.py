import asyncio
import base64
import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.agents.audio_agent import connect_live_session
from app.services.agents.analysis_agent import analyze_answer
from app.services.state_manager import get_or_create

router = APIRouter()


@router.websocket("/ws/audio-interview")
async def audio_interview(websocket: WebSocket):
    await websocket.accept()
    session_id = str(uuid.uuid4())
    state = get_or_create(session_id)
    done = asyncio.Event()

    async def run_analysis(text: str) -> None:
        try:
            analysis = await analyze_answer(text)
            state.update(analysis)
            await websocket.send_text(json.dumps({
                "type": "analysis",
                "data": analysis.model_dump(),
            }))
        except Exception:
            pass

    async with connect_live_session() as session:

        async def client_to_gemini():
            """Read audio/control messages from WebSocket, forward to Gemini Live session."""
            try:
                while not done.is_set():
                    raw = await websocket.receive_text()
                    msg = json.loads(raw)
                    if msg["type"] == "audio":
                        audio_bytes = base64.b64decode(msg["data"])
                        await session.send(
                            input={
                                "data": audio_bytes,
                                "mime_type": "audio/pcm;rate=16000",
                            },
                        )
                    elif msg["type"] == "control" and msg.get("action") == "turn_complete":
                        await session.send(input=None, end_of_turn=True)
            except WebSocketDisconnect:
                done.set()

        async def gemini_to_client():
            """Read audio/text from Gemini, forward to WebSocket client."""
            try:
                transcript_buffer = ""
                async for response in session.receive():
                    if done.is_set():
                        break
                    sc = response.server_content
                    if not sc:
                        continue
                    if sc.model_turn:
                        for part in sc.model_turn.parts:
                            if part.inline_data and part.inline_data.data:
                                b64 = base64.b64encode(part.inline_data.data).decode()
                                await websocket.send_text(json.dumps({
                                    "type": "audio",
                                    "data": b64,
                                }))
                            if part.text:
                                transcript_buffer += part.text
                                await websocket.send_text(json.dumps({
                                    "type": "transcript",
                                    "role": "model",
                                    "text": part.text,
                                }))
                    if sc.input_transcription and sc.input_transcription.text:
                        user_text = sc.input_transcription.text
                        await websocket.send_text(json.dumps({
                            "type": "transcript",
                            "role": "user",
                            "text": user_text,
                        }))
                        asyncio.create_task(run_analysis(user_text))
                    if sc.turn_complete:
                        await websocket.send_text(json.dumps({
                            "type": "turn_complete",
                        }))
                        if transcript_buffer:
                            transcript_buffer = ""
            except Exception:
                done.set()

        try:
            await asyncio.gather(client_to_gemini(), gemini_to_client())
        except Exception:
            pass
