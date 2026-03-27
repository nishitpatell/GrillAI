from app.models.state import InterviewState

_sessions: dict[str, InterviewState] = {}


def get_or_create(session_id: str) -> InterviewState:
    if session_id not in _sessions:
        _sessions[session_id] = InterviewState(session_id=session_id)
    return _sessions[session_id]
