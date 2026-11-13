"""Base interface for Antigravity Agent Executors."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from orchestrator.core.models import AgentResult, Task


class AgentExecutor(ABC):
    """Abstract base executor for Antigravity coding agents."""

    @abstractmethod
    async def execute(
        self,
        task: Task,
        workspace_dir: str,
        corrective_issues: Optional[List[Dict[str, Any]]] = None,
        timeout_seconds: int = 600,
    ) -> AgentResult:
        """Executes a coding task in the specified workspace and returns structured evidence."""
        pass

    def build_prompt(
        self,
        task: Task,
        corrective_issues: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Constructs a structured prompt for Antigravity."""
        lines = [
            f"# TASK: {task.title} (ID: {task.id})",
            f"**Attempt:** {task.attempt + 1} of {task.max_attempts}",
            "",
            "## OBJECTIVE",
            task.objective,
            "",
        ]

        if task.requirements:
            lines.append("## REQUIREMENTS")
            for req in task.requirements:
                lines.append(f"- {req}")
            lines.append("")

        if task.acceptance_criteria:
            lines.append("## ACCEPTANCE CRITERIA")
            for ac in task.acceptance_criteria:
                lines.append(f"- [ ] {ac}")
            lines.append("")

        if task.verification_requirements:
            lines.append("## VERIFICATION EXPECTATIONS")
            for vr in task.verification_requirements:
                lines.append(f"- {vr}")
            lines.append("")

        if corrective_issues:
            lines.append("## PREVIOUS ATTEMPT REVIEW FEEDBACK (REQUIRED FIXES)")
            lines.append("The senior reviewer analyzed your previous attempt and found the following issues:")
            for idx, issue in enumerate(corrective_issues, 1):
                severity = issue.get("severity", "major").upper()
                category = issue.get("category", "functional")
                desc = issue.get("description", "")
                evidence = issue.get("evidence", "")
                fix = issue.get("required_fix", "")
                lines.append(f"### Issue {idx} [{severity}] ({category})")
                lines.append(f"- **Problem:** {desc}")
                if evidence:
                    lines.append(f"- **Evidence:** {evidence}")
                if fix:
                    lines.append(f"- **Required Fix:** {fix}")
            lines.append("")
            lines.append("Please carefully correct these issues in the workspace.")

        lines.extend([
            "## INSTRUCTIONS",
            "1. Implement the requested code changes directly in the workspace.",
            "2. Ensure all relevant files are edited or created.",
            "3. Run appropriate terminal commands to build or test your work if needed.",
            "4. Provide a clear, concise summary of what was accomplished when finished.",
        ])

        return "\n".join(lines)
