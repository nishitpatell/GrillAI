from pydantic import BaseModel, Field


class AgentAnalysis(BaseModel):
    clarity: int = Field(ge=1, le=10, description="How clear and articulate the answer was (1-10)")
    depth: int = Field(ge=1, le=10, description="How deep the technical understanding is (1-10)")
    confidence: int = Field(ge=1, le=10, description="How confident the candidate sounded (1-10)")
    flags: list[str] = Field(
        default_factory=list,
        description="Psychological flags observed, e.g. defensiveness, vagueness, buzzword-heavy, hedging",
    )


class InterviewState(BaseModel):
    session_id: str
    overall_score: float = 0.0
    analyses: list[AgentAnalysis] = Field(default_factory=list)

    def update(self, analysis: AgentAnalysis) -> None:
        self.analyses.append(analysis)
        total = len(self.analyses)
        self.overall_score = sum(
            (a.clarity + a.depth + a.confidence) / 3 for a in self.analyses
        ) / total
