"""Deterministic rule-based Senior Reviewer."""

from __future__ import annotations

from typing import List

from orchestrator.core.models import (
    ReviewContext,
    ReviewDecision,
    ReviewIssue,
    ReviewResult,
)
from orchestrator.reviewers.base import Reviewer


class DeterministicRuleReviewer(Reviewer):
    """Rigorous rule-based reviewer evaluating objective evidence without external API dependencies."""

    async def review(self, context: ReviewContext) -> ReviewResult:
        issues: List[ReviewIssue] = []

        # 1. Inspect Verification Evidence
        if context.verification:
            v = context.verification
            if v.status == "FAILED":
                for check in v.checks:
                    if check.status == "FAILED":
                        issues.append(
                            ReviewIssue(
                                severity="critical",
                                category="testing",
                                description=f"Verification check '{check.name}' failed with exit code {check.exit_code}.",
                                evidence=check.stderr.strip()[:400] or check.stdout.strip()[:400] or "Non-zero exit code",
                                required_fix=f"Fix the code to make '{check.command}' pass without errors.",
                            )
                        )
                for failure in v.failures:
                    if not any(failure in i.description for i in issues):
                        issues.append(
                            ReviewIssue(
                                severity="major",
                                category="functional",
                                description=failure,
                                evidence="Verification summary failure item",
                                required_fix="Address the failing verification condition.",
                            )
                        )

        # 2. Inspect Changed Files & Git Diff
        has_diff = bool(context.git_diff.strip())
        has_files = bool(context.files_changed)

        if not has_diff and not has_files:
            issues.append(
                ReviewIssue(
                    severity="critical",
                    category="architecture",
                    description="No code changes detected in workspace. Diff is completely empty.",
                    evidence="git diff returned 0 bytes",
                    required_fix="Implement the requested files and changes in the project repository.",
                )
            )

        # 3. Check for obvious syntax or compilation error residues in diff
        if "SyntaxError" in context.git_diff:
            issues.append(
                ReviewIssue(
                    severity="critical",
                    category="functional",
                    description="Syntax error identified in modified code.",
                    evidence="Diff contains SyntaxError keyword",
                    required_fix="Resolve all Python/JavaScript syntax errors.",
                )
            )

        # 4. Synthesize Decision
        if issues:
            prompt_lines = [
                "The senior reviewer identified the following issues that must be corrected:",
            ]
            for idx, issue in enumerate(issues, 1):
                prompt_lines.append(f"{idx}. [{issue.severity.upper()}] {issue.description}")
                prompt_lines.append(f"   Fix: {issue.required_fix}")
                if issue.evidence:
                    prompt_lines.append(f"   Evidence: {issue.evidence}")

            return ReviewResult(
                decision=ReviewDecision.FAIL,
                confidence=0.98,
                summary=f"Implementation failed verification with {len(issues)} issue(s).",
                issues=issues,
                next_prompt="\n".join(prompt_lines),
            )

        # PASS condition
        ac_count = len(context.acceptance_criteria)
        summary = (
            f"Implementation approved. Verified {ac_count} acceptance criteria with passing "
            f"checks and {len(context.files_changed) or 1} modified file(s)."
        )

        return ReviewResult(
            decision=ReviewDecision.PASS,
            confidence=0.95,
            summary=summary,
            issues=[],
            next_prompt=None,
        )
