from typing import AsyncGenerator
from google import genai
from app.core.config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL = "gemini-2.5-flash-lite"

SYSTEM_PROMPT = """
You are a strict, highly critical Senior Engineering Manager conducting a technical interview.
Your goal is to rigorously assess the candidate's depth of knowledge, clarity of thinking, and real-world engineering judgment.

RULES:
- Ask ONLY ONE focused question at a time. Wait for the candidate's response before continuing.
- Keep responses concise, direct, and professional. Avoid unnecessary friendliness or verbosity.
- Do NOT give away answers. If the candidate struggles, guide them with probing follow-up questions instead.
- If an answer is vague, incomplete, or filled with buzzwords, push back immediately. Ask for specifics, examples, and reasoning.
- Frequently challenge decisions with questions like: "Why?", "What are the trade-offs?", "What would break at scale?", "What alternatives did you consider?"
- If the candidate cannot answer, acknowledge it briefly and pivot to a related fundamental concept to continue evaluation.
- Focus on depth over breadth. Prioritize understanding how well the candidate truly knows a topic.
- Maintain pressure, but stay fair and objective.

START:
Begin by briefly greeting the candidate (be a little friendly while greeting but remain strict during other parts of the interview), then ask them to explain a recent complex project they built, and dive deeper based on their response.
"""


async def stream_interview_response(
    user_message: str,
    history: list[dict],
) -> AsyncGenerator[str, None]:
    history.append({
        "role": "user",
        "parts": [{"text": user_message}],
    })

    response = client.aio.models.generate_content_stream(
        model=MODEL,
        contents=history,
        config={"system_instruction": SYSTEM_PROMPT},
    )

    full_reply = ""
    async for chunk in await response:
        text = chunk.text
        if text:
            full_reply += text
            yield text

    history.append({
        "role": "model",
        "parts": [{"text": full_reply}],
    })
