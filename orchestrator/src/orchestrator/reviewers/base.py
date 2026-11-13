"""Base Reviewer interface and prompt builders."""

from __future__ import annotations

from abc import ABC, abstractmethod
import json
import re
from typing import Any, Dict, Optional

from orchestrator.core.models import (
    ReviewContext,
    ReviewDecision,
    ReviewIssue,
    ReviewResult,
)


class Reviewer(ABC):
    """Abstract senior engineer reviewer evaluating implementation evidence."""

    @abstractmethod
    async def review(self, context: ReviewContext) -> ReviewResult:
        """Evaluates implementation and verification evidence and produces a ReviewResult."""
        pass

    def build_review_prompt(self, context: ReviewContext) -> str:
        """Constructs a comprehensive, evidence-focused review prompt."""
        lines = [
            "# SENIOR ENGINEER CODE REVIEW",
            "",
            "You are acting as an external Senior Staff Engineer conducting a rigorous code review.",
            "Antigravity (the coding agent) was tasked with implementing a feature or fix.",
            "Your job is to examine the OBJECTIVE EVIDENCE (git diff, test runs, build logs) and decide whether the task is truly complete.",
            "",
            "## CRITICAL REVIEW RULES",
            "1. NEVER accept 'It should work' or conversational assertions.",
            "2. A task CANNOT PASS without evidence: if tests failed, or if no files were changed, it must FAIL.",
            "3. If the task is blocked by external constraints, missing secrets, or fundamentally invalid requirements, return BLOCKED.",
            "4. If returning FAIL, you MUST provide actionable issues with specific required fixes in 'next_prompt'.",
            "",
            f"## TASK: {context.title} (ID: {context.task_id})",
            f"**Objective:** {context.objective}",
            "",
        ]

        if context.acceptance_criteria:
            lines.append("## ACCEPTANCE CRITERIA")
            for ac in context.acceptance_criteria:
                lines.append(f"- [ ] {ac}")
            lines.append("")

        if context.agent_report:
            lines.append("## AGENT SELF-REPORT")
            lines.append(context.agent_report.agent_summary or "(No summary provided)")
            lines.append("")

        lines.append("## FILES CHANGED")
        if context.files_changed:
            for f in context.files_changed:
                lines.append(f"- {f}")
        else:
            lines.append("(No files reported changed)")
        lines.append("")

        lines.append("## GIT DIFF / PATCH")
        if context.git_diff.strip():
            lines.append("```diff")
            lines.append(context.git_diff)
            lines.append("```")
        else:
            lines.append("(Diff is empty)")
        lines.append("")

        lines.append("## VERIFICATION EVIDENCE")
        if context.verification:
            v = context.verification
            lines.append(f"- **Overall Status:** {v.status}")
            lines.append(f"- **Tests:** {v.tests.get('passed', 0)} passed, {v.tests.get('failed', 0)} failed")
            lines.append(f"- **Build:** {v.build} | **Lint:** {v.lint} | **Typecheck:** {v.typecheck}")
            if v.failures:
                lines.append("- **Failures:**")
                for f in v.failures:
                    lines.append(f"  * {f}")
            for check in v.checks:
                lines.append(f"### Check: {check.name} ({check.status}, exit {check.exit_code})")
                if check.stderr:
                    lines.append("Stderr:")
                    lines.append("```")
                    lines.append(check.stderr.strip()[:2000])
                    lines.append("```")
                if check.stdout:
                    lines.append("Stdout snippet:")
                    lines.append("```")
                    lines.append(check.stdout.strip()[:2000])
                    lines.append("```")
        else:
            lines.append("(No verification evidence available)")
        lines.append("")

        lines.append("## REQUIRED OUTPUT FORMAT")
        lines.append("You MUST respond with a single valid JSON object adhering exactly to this schema:")
        lines.append("```json")
        lines.append(json.dumps({
            "decision": "PASS | FAIL | BLOCKED",
            "confidence": 0.95,
            "summary": "Concise high-level rationale for the decision",
            "issues": [
                {
                    "severity": "critical | major | minor",
                    "category": "functional | visual | architecture | security | performance | testing",
                    "description": "Clear explanation of what is wrong",
                    "evidence": "Exact file line or test failure snippet proving the bug",
                    "required_fix": "Precise instruction for the agent to fix it"
                }
            ],
            "next_prompt": "Corrective instructions to send to Antigravity if FAIL"
        }, indent=2))
        lines.append("```")

        return "\n".join(lines)

    @staticmethod
    def parse_review_json(raw_response: str) -> ReviewResult:
        """Robustly extracts and validates JSON ReviewResult from LLM output."""
        cleaned = raw_response.strip()

        # Strip markdown fences if present
        if "```json" in cleaned:
            match = re.search(r"```json\s*(.*?)\s*```", cleaned, re.DOTALL)
            if match:
                cleaned = match.group(1).strip()
        elif "```" in cleaned:
            match = re.search(r"```\s*(.*?)\s*```", cleaned, re.DOTALL)
            if match:
                cleaned = match.group(1).strip()

        # Find first { and last }
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            cleaned = cleaned[start_idx : end_idx + 1]

        try:
            data = json.loads(cleaned)
            # Normalize decision
            decision_raw = str(data.get("decision", "FAIL")).upper()
            if decision_raw not in ("PASS", "FAIL", "BLOCKED"):
                decision_raw = "FAIL"
            data["decision"] = decision_raw

            # Ensure issues list
            if "issues" not in data or not isinstance(data["issues"], list):
                data["issues"] = []

            return ReviewResult(**data)
        except Exception as e:
            # Return safe fallback failure on malformed output
            return ReviewResult(
                decision=ReviewDecision.FAIL,
                confidence=0.0,
                summary=f"Malformed reviewer response: {e}. Raw response could not be parsed as JSON.",
                issues=[
                    ReviewIssue(
                        severity="major",
                        category="testing",
                        description=f"Reviewer output parsing error: {e}",
                        evidence=raw_response[:300],
                        required_fix="Ensure all requirements are tested and re-verify.",
                    )
                ],
                next_prompt="The previous review could not be parsed. Please verify your implementation against the acceptance criteria.",
            )
