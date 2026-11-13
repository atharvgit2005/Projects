"""OpenAI Senior Reviewer Adapter."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Optional

from orchestrator.core.models import (
    ReviewContext,
    ReviewDecision,
    ReviewIssue,
    ReviewResult,
)
from orchestrator.reviewers.base import Reviewer


class OpenAIReviewer(Reviewer):
    """Reviews code changes using OpenAI ChatGPT (e.g. gpt-4o)."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4o",
        timeout_seconds: int = 120,
    ):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model
        self.timeout_seconds = timeout_seconds

    async def review(self, context: ReviewContext) -> ReviewResult:
        if not self.api_key:
            return ReviewResult(
                decision=ReviewDecision.BLOCKED,
                confidence=1.0,
                summary="OPENAI_API_KEY is not configured.",
                issues=[
                    ReviewIssue(
                        severity="critical",
                        category="architecture",
                        description="Missing OpenAI API key",
                        evidence="OPENAI_API_KEY env var is empty",
                        required_fix="Set OPENAI_API_KEY environment variable or pass --api-key",
                    )
                ],
            )

        prompt = self.build_review_prompt(context)

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a senior staff engineer performing a rigorous code review. Output only valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.0,
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as response:
                body = response.read().decode("utf-8")
            res_json = json.loads(body)
            content = res_json["choices"][0]["message"]["content"]
            return self.parse_review_json(content)
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8")
            return ReviewResult(
                decision=ReviewDecision.FAIL,
                confidence=0.0,
                summary=f"OpenAI API error {e.code}: {err_msg}",
                issues=[
                    ReviewIssue(
                        severity="major",
                        category="testing",
                        description="OpenAI API call failed",
                        evidence=err_msg[:300],
                        required_fix="Verify API key and quota status.",
                    )
                ],
            )
        except Exception as e:
            return ReviewResult(
                decision=ReviewDecision.FAIL,
                confidence=0.0,
                summary=f"Failed to communicate with OpenAI: {e}",
                issues=[
                    ReviewIssue(
                        severity="major",
                        category="testing",
                        description="OpenAI client exception",
                        evidence=str(e),
                        required_fix="Check network connectivity and endpoint availability.",
                    )
                ],
            )
