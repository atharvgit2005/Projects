"""Claude Senior Reviewer Adapter."""

from __future__ import annotations

import asyncio
from pathlib import Path
import subprocess
from typing import Optional

from orchestrator.core.models import (
    ReviewContext,
    ReviewDecision,
    ReviewIssue,
    ReviewResult,
)
from orchestrator.reviewers.base import Reviewer


class ClaudeReviewer(Reviewer):
    """Reviews code changes using Claude via CLI or Anthropic API."""

    def __init__(
        self,
        cli_path: str = "/Users/atharvpaharia100/.local/bin/claude",
        model: Optional[str] = None,
        timeout_seconds: int = 180,
    ):
        self.cli_path = Path(cli_path).expanduser().resolve()
        self.model = model
        self.timeout_seconds = timeout_seconds

    async def review(self, context: ReviewContext) -> ReviewResult:
        prompt = self.build_review_prompt(context)

        # 1. Check if CLI exists
        if not self.cli_path.exists():
            return ReviewResult(
                decision=ReviewDecision.BLOCKED,
                confidence=1.0,
                summary=f"Claude CLI not found at {self.cli_path}",
                issues=[
                    ReviewIssue(
                        severity="critical",
                        category="testing",
                        description="Claude CLI binary is missing",
                        evidence=str(self.cli_path),
                        required_fix="Install or configure valid path for Claude CLI",
                    )
                ],
            )

        cmd = [str(self.cli_path), "-p", prompt]
        if self.model:
            cmd.extend(["--model", self.model])

        try:
            # Run in thread to not block async event loop
            proc = await asyncio.to_thread(
                subprocess.run,
                cmd,
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds,
            )

            stdout = proc.stdout.strip()
            stderr = proc.stderr.strip()

            if proc.returncode != 0 or not stdout:
                if "Budget pool quota has been exhausted" in stderr or "Budget pool" in stdout:
                    return ReviewResult(
                        decision=ReviewDecision.BLOCKED,
                        confidence=1.0,
                        summary="Claude API budget exhausted. Escalating for quota increase or alternative reviewer.",
                        issues=[
                            ReviewIssue(
                                severity="critical",
                                category="architecture",
                                description="Claude budget pool exhausted",
                                evidence=stderr or stdout,
                                required_fix="Top up Anthropic API quota or switch orchestrator to --reviewer openai or deterministic.",
                            )
                        ],
                    )

                return ReviewResult(
                    decision=ReviewDecision.FAIL,
                    confidence=0.0,
                    summary=f"Claude review invocation failed (exit code {proc.returncode}): {stderr}",
                    issues=[
                        ReviewIssue(
                            severity="major",
                            category="testing",
                            description="Reviewer invocation error",
                            evidence=stderr[:300],
                            required_fix="Re-run review with a valid provider.",
                        )
                    ],
                )

            return self.parse_review_json(stdout)

        except subprocess.TimeoutExpired:
            return ReviewResult(
                decision=ReviewDecision.FAIL,
                confidence=0.0,
                summary=f"Claude reviewer timed out after {self.timeout_seconds}s",
                issues=[
                    ReviewIssue(
                        severity="major",
                        category="testing",
                        description="Review timeout",
                        evidence=f"Exceeded {self.timeout_seconds}s limit",
                        required_fix="Optimize review prompt or increase timeout.",
                    )
                ],
            )
        except Exception as e:
            return ReviewResult(
                decision=ReviewDecision.FAIL,
                confidence=0.0,
                summary=f"Unexpected error running Claude reviewer: {e}",
                issues=[
                    ReviewIssue(
                        severity="critical",
                        category="testing",
                        description="Review execution exception",
                        evidence=str(e),
                        required_fix="Check Claude CLI configuration.",
                    )
                ],
            )
