import asyncio
import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.agents.roleplay_agent import stream_interview_response
from app.services.agents.analysis_agent import analyze_answer
from app.services.state_manager import get_or_create

router = APIRouter()


@router.websocket("/ws/interview")
async def interview_websocket(websocket: WebSocket):
    await websocket.accept()
    session_id = str(uuid.uuid4())
    state = get_or_create(session_id)
    history: list[dict] = []

    async def run_analysis(answer: str) -> None:
        try:
            analysis = await analyze_answer(answer)
            state.update(analysis)
            await websocket.send_text(json.dumps({
                "type": "analysis",
                "data": analysis.model_dump(),
            }))
        except Exception:
            pass

    try:
        while True:
            data = await websocket.receive_text()

            async for chunk in stream_interview_response(data, history):
                await websocket.send_text(json.dumps({
                    "type": "token",
                    "value": chunk,
                }))
            await websocket.send_text(json.dumps({"type": "end"}))

            asyncio.create_task(run_analysis(data))
    except WebSocketDisconnect:
        pass
