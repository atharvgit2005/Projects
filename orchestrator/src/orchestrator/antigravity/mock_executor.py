"""Configurable Mock Agent Executor for testing and dry-run operations."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from orchestrator.antigravity.base import AgentExecutor
from orchestrator.core.models import AgentResult, AgentStatus, Task


class MockAgentExecutor(AgentExecutor):
    """Simulates Antigravity agent behavior for automated testing and offline development."""

    def __init__(
        self,
        default_status: AgentStatus = AgentStatus.SUCCESS,
        summary: str = "Mock implementation completed successfully.",
        files_to_modify: Optional[Dict[str, str]] = None,
        commands_to_run: Optional[List[str]] = None,
        behavior_fn: Optional[
            Callable[[Task, str, Optional[List[Dict[str, Any]]]], AgentResult]
        ] = None,
        delay_seconds: float = 0.0,
    ):
        self.default_status = default_status
        self.summary = summary
        self.files_to_modify = files_to_modify or {}
        self.commands_to_run = commands_to_run or []
        self.behavior_fn = behavior_fn
        self.delay_seconds = delay_seconds
        self.invocations: List[Dict[str, Any]] = []

    async def execute(
        self,
        task: Task,
        workspace_dir: str,
        corrective_issues: Optional[List[Dict[str, Any]]] = None,
        timeout_seconds: int = 600,
    ) -> AgentResult:
        start_time = datetime.now(timezone.utc).isoformat()
        self.invocations.append({
            "task_id": task.id,
            "attempt": task.attempt,
            "corrective_issues": corrective_issues,
            "workspace_dir": workspace_dir,
        })

        if self.delay_seconds > 0:
            if self.delay_seconds > timeout_seconds:
                await asyncio.sleep(timeout_seconds)
                return AgentResult(
                    task_id=task.id,
                    status=AgentStatus.TIMEOUT,
                    start_time=start_time,
                    completion_time=datetime.now(timezone.utc).isoformat(),
                    agent_summary=f"Mock timed out after {timeout_seconds}s",
                    errors=["Mock timeout"],
                )
            await asyncio.sleep(self.delay_seconds)

        if self.behavior_fn:
            return self.behavior_fn(task, workspace_dir, corrective_issues)

        # Apply simulated file modifications
        workspace_path = Path(workspace_dir).resolve()
        changed_files: List[str] = []
        if self.default_status == AgentStatus.SUCCESS:
            for rel_path, content in self.files_to_modify.items():
                target = workspace_path / rel_path
                target.parent.mkdir(parents=True, exist_ok=True)
                with open(target, "w", encoding="utf-8") as f:
                    f.write(content)
                changed_files.append(str(target))

        errors = ["Mock agent deliberate failure"] if self.default_status == AgentStatus.FAILURE else []

        return AgentResult(
            task_id=task.id,
            status=self.default_status,
            start_time=start_time,
            completion_time=datetime.now(timezone.utc).isoformat(),
            agent_summary=self.summary,
            raw_output=self.summary,
            files_changed=changed_files,
            commands_executed=list(self.commands_to_run),
            errors=errors,
        )
