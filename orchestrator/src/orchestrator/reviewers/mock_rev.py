"""Mock Reviewer for testing review transitions, retries, and errors."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

from orchestrator.core.models import (
    ReviewContext,
    ReviewDecision,
    ReviewIssue,
    ReviewResult,
)
from orchestrator.reviewers.base import Reviewer


class MockReviewer(Reviewer):
    """Yields programmed review decisions or raw strings for testing."""

    def __init__(
        self,
        sequence: Optional[List[Union[ReviewResult, str]]] = None,
        default_decision: ReviewDecision = ReviewDecision.PASS,
        summary: str = "Mock review passed.",
    ):
        self.sequence = list(sequence) if sequence is not None else None
        self.default_decision = default_decision
        self.summary = summary
        self.invocations: List[ReviewContext] = []
        self._call_count = 0

    async def review(self, context: ReviewContext) -> ReviewResult:
        self.invocations.append(context)
        idx = self._call_count
        self._call_count += 1

        if self.sequence is not None:
            if idx < len(self.sequence):
                item = self.sequence[idx]
            else:
                item = self.sequence[-1]

            if isinstance(item, str):
                return self.parse_review_json(item)
            return item

        issues = []
        if self.default_decision == ReviewDecision.FAIL:
            issues.append(
                ReviewIssue(
                    severity="major",
                    category="functional",
                    description="Mock review rejection issue",
                    evidence="Simulated failure evidence",
                    required_fix="Fix simulated mock defect",
                )
            )

        return ReviewResult(
            decision=self.default_decision,
            confidence=1.0,
            summary=self.summary,
            issues=issues,
            next_prompt="Please fix the mock issue." if issues else None,
        )
