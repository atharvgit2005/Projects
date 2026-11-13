"""Antigravity Live Session IPC Agent Executor."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
from typing import Any, Dict, List, Optional

from orchestrator.antigravity.base import AgentExecutor
from orchestrator.core.models import AgentResult, AgentStatus, Task


class LiveSessionExecutor(AgentExecutor):
    """Executes tasks by sending messages into an active Antigravity session and monitoring transcript.jsonl."""

    def __init__(
        self,
        conversation_id: str,
        app_data_dir: str = "~/.gemini/antigravity-ide",
        agentapi_path: str = "~/.gemini/antigravity/bin/agentapi",
    ):
        self.conversation_id = conversation_id
        self.app_data_dir = Path(app_data_dir).expanduser().resolve()
        self.agentapi_path = Path(agentapi_path).expanduser().resolve()
        self.transcript_path = (
            self.app_data_dir
            / "brain"
            / conversation_id
            / ".system_generated"
            / "logs"
            / "transcript.jsonl"
        )

    async def execute(
        self,
        task: Task,
        workspace_dir: str,
        corrective_issues: Optional[List[Dict[str, Any]]] = None,
        timeout_seconds: int = 600,
    ) -> AgentResult:
        start_time = datetime.now(timezone.utc).isoformat()
        prompt = self.build_prompt(task, corrective_issues)

        # 1. Determine baseline line count of transcript
        initial_lines = 0
        if self.transcript_path.exists():
            with open(self.transcript_path, "r", encoding="utf-8") as f:
                initial_lines = sum(1 for _ in f)

        # 2. Dispatch prompt via agentapi send-message
        try:
            res = subprocess.run(
                [str(self.agentapi_path), "send-message", self.conversation_id, prompt],
                capture_output=True,
                text=True,
                check=False,
            )
            if res.returncode != 0:
                return AgentResult(
                    task_id=task.id,
                    status=AgentStatus.FAILURE,
                    start_time=start_time,
                    completion_time=datetime.now(timezone.utc).isoformat(),
                    agent_summary=f"agentapi send-message failed: {res.stderr or res.stdout}",
                    errors=[res.stderr or res.stdout],
                    conversation_id=self.conversation_id,
                )
        except Exception as e:
            return AgentResult(
                task_id=task.id,
                status=AgentStatus.FAILURE,
                start_time=start_time,
                completion_time=datetime.now(timezone.utc).isoformat(),
                agent_summary=f"Failed to invoke agentapi: {e}",
                errors=[str(e)],
                conversation_id=self.conversation_id,
            )

        # 3. Poll transcript.jsonl until PLANNER_RESPONSE with status "DONE"
        files_changed: List[str] = []
        commands_executed: List[str] = []
        final_summary = ""
        poll_interval = 2.0
        elapsed = 0.0

        while elapsed < timeout_seconds:
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

            if not self.transcript_path.exists():
                continue

            with open(self.transcript_path, "r", encoding="utf-8") as f:
                all_lines = f.readlines()

            if len(all_lines) <= initial_lines:
                continue

            # Process new steps
            new_steps = all_lines[initial_lines:]
            for line in new_steps:
                line = line.strip()
                if not line:
                    continue
                try:
                    step = json.loads(line)
                except Exception:
                    continue

                tool_calls = step.get("tool_calls") or []
                for tc in tool_calls:
                    name = tc.get("name", "")
                    args = tc.get("args", {})
                    if name == "run_command":
                        cmd = args.get("CommandLine")
                        if cmd and cmd not in commands_executed:
                            commands_executed.append(cmd)
                    elif name in (
                        "write_to_file",
                        "edit_file",
                        "replace_file_content",
                        "multi_replace_file_content",
                    ):
                        target = args.get("TargetFile") or args.get("path")
                        if target and target not in files_changed:
                            files_changed.append(target)

                # Check if the final planner response has completed
                if (
                    step.get("source") == "MODEL"
                    and step.get("type") == "PLANNER_RESPONSE"
                    and step.get("status") == "DONE"
                ):
                    final_summary = step.get("content", "")
                    return AgentResult(
                        task_id=task.id,
                        status=AgentStatus.SUCCESS,
                        start_time=start_time,
                        completion_time=datetime.now(timezone.utc).isoformat(),
                        agent_summary=final_summary,
                        raw_output=final_summary,
                        files_changed=files_changed,
                        commands_executed=commands_executed,
                        conversation_id=self.conversation_id,
                    )

        # Timeout reached
        return AgentResult(
            task_id=task.id,
            status=AgentStatus.TIMEOUT,
            start_time=start_time,
            completion_time=datetime.now(timezone.utc).isoformat(),
            agent_summary=f"Timed out after {timeout_seconds}s waiting for session completion",
            files_changed=files_changed,
            commands_executed=commands_executed,
            conversation_id=self.conversation_id,
            errors=["Timeout waiting for Antigravity live session"],
        )
