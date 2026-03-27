from google import genai
from app.core.config import GEMINI_API_KEY
from app.models.state import AgentAnalysis

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL = "gemini-2.0-flash"

ANALYSIS_PROMPT = """
You are an expert interview analyst. Given a candidate's answer during a technical interview,
evaluate it on the following dimensions:

- clarity (1-10): How clear, structured, and articulate the answer is.
- depth (1-10): How deep the technical understanding demonstrated is.
- confidence (1-10): How confident and assured the candidate sounds.
- flags: A list of psychological or communication flags observed.
  Examples: "defensiveness", "vagueness", "buzzword-heavy", "hedging", "over-confident", "rambling".
  Return an empty list if none are observed.

Be strict and objective. Base your assessment only on the provided answer.
"""


async def analyze_answer(user_answer: str) -> AgentAnalysis:
    response = await client.aio.models.generate_content(
        model=MODEL,
        contents=user_answer,
        config={
            "system_instruction": ANALYSIS_PROMPT,
            "response_mime_type": "application/json",
            "response_schema": AgentAnalysis,
        },
    )
    return AgentAnalysis.model_validate_json(response.text)
