from typing import AsyncGenerator
from google import genai
from app.core.config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL = "gemini-3.1-flash-lite-preview"

SYSTEM_PROMPT = (
    "You are a strict technical interviewer. Your job is to assess the candidate's "
    "depth of knowledge through focused, probing questions. Follow these rules:\n"
    "- Ask one question at a time. Wait for the candidate's answer before moving on.\n"
    "- If an answer is vague or incomplete, push back and ask for specifics.\n"
    "- Do not give away the answer. Guide the candidate with follow-up questions instead.\n"
    "- Keep responses concise and professional.\n"
    "- Start by greeting the candidate briefly and asking your first technical question."
)

conversation_history: list[dict] = []


async def stream_interview_response(user_message: str) -> AsyncGenerator[str, None]:
    conversation_history.append({
        "role": "user",
        "parts": [{"text": user_message}],
    })

    response = client.models.generate_content_stream(
        model=MODEL,
        contents=conversation_history,
        config={"system_instruction": SYSTEM_PROMPT},
    )

    full_reply = ""
    for chunk in response:
        text = chunk.text
        if text:
            full_reply += text
            yield text

    conversation_history.append({
        "role": "model",
        "parts": [{"text": full_reply}],
    })
