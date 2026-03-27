from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.agents.roleplay_agent import stream_interview_response

router = APIRouter()


@router.websocket("/ws/interview")
async def interview_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            async for chunk in stream_interview_response(data):
                await websocket.send_text(chunk)
            await websocket.send_text("[END]")
    except WebSocketDisconnect:
        pass
