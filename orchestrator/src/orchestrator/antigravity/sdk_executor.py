"""Antigravity Python SDK Agent Executor."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import os
from typing import Any, Dict, List, Optional

from orchestrator.antigravity.base import AgentExecutor
from orchestrator.core.models import AgentResult, AgentStatus, Task


class HeadlessSdkExecutor(AgentExecutor):
    """Executes tasks using the official google-antigravity Python SDK."""

    def __init__(
        self,
        model: str = "gemini-2.5-flash",
        api_key: Optional[str] = None,
        vertex: bool = False,
        project: Optional[str] = None,
        location: Optional[str] = None,
    ):
        self.model = model
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.vertex = vertex
        self.project = project
        self.location = location

    async def execute(
        self,
        task: Task,
        workspace_dir: str,
        corrective_issues: Optional[List[Dict[str, Any]]] = None,
        timeout_seconds: int = 600,
    ) -> AgentResult:
        start_time = datetime.now(timezone.utc).isoformat()
        prompt = self.build_prompt(task, corrective_issues)

        # Import SDK dynamically
        try:
            from google.antigravity import Agent, CapabilitiesConfig, LocalAgentConfig
            from google.antigravity.hooks import policy
        except ImportError as e:
            return AgentResult(
                task_id=task.id,
                status=AgentStatus.FAILURE,
                start_time=start_time,
                completion_time=datetime.now(timezone.utc).isoformat(),
                agent_summary=f"Failed to import google-antigravity SDK: {e}",
                errors=[str(e)],
            )

        # Build config
        try:
            config_kwargs: Dict[str, Any] = {
                "workspaces": [workspace_dir],
                "capabilities": CapabilitiesConfig(),
                "policies": [policy.allow_all()],
            }
            if self.api_key:
                config_kwargs["api_key"] = self.api_key
            if self.vertex:
                config_kwargs["vertex"] = True
                if self.project:
                    config_kwargs["project"] = self.project
                if self.location:
                    config_kwargs["location"] = self.location

            config = LocalAgentConfig(**config_kwargs)
        except Exception as e:
            return AgentResult(
                task_id=task.id,
                status=AgentStatus.FAILURE,
                start_time=start_time,
                completion_time=datetime.now(timezone.utc).isoformat(),
                agent_summary=f"Failed to configure LocalAgentConfig: {e}",
                errors=[str(e)],
            )

        files_changed: List[str] = []
        commands_executed: List[str] = []
        full_text: List[str] = []

        try:
            async with asyncio.timeout(timeout_seconds):
                async with Agent(config) as agent:
                    response = await agent.chat(prompt)

                    # Stream/inspect tool calls if available
                    if hasattr(response, "tool_calls"):
                        async for call in response.tool_calls:
                            call_name = getattr(call, "name", "")
                            call_args = getattr(call, "args", {})
                            if call_name == "run_command":
                                cmd = call_args.get("CommandLine", "")
                                if cmd:
                                    commands_executed.append(cmd)
                            elif call_name in (
                                "write_to_file",
                                "edit_file",
                                "replace_file_content",
                                "multi_replace_file_content",
                            ):
                                path = call_args.get("TargetFile") or call_args.get("path")
                                if path and path not in files_changed:
                                    files_changed.append(path)

                    # Collect full response text
                    if hasattr(response, "text"):
                        summary = response.text
                    else:
                        summary = "".join(full_text)

                    return AgentResult(
                        task_id=task.id,
                        status=AgentStatus.SUCCESS,
                        start_time=start_time,
                        completion_time=datetime.now(timezone.utc).isoformat(),
                        agent_summary=summary,
                        raw_output=summary,
                        files_changed=files_changed,
                        commands_executed=commands_executed,
                    )

        except asyncio.TimeoutError:
            return AgentResult(
                task_id=task.id,
                status=AgentStatus.TIMEOUT,
                start_time=start_time,
                completion_time=datetime.now(timezone.utc).isoformat(),
                agent_summary=f"Execution timed out after {timeout_seconds} seconds",
                errors=["Agent execution timed out"],
            )
        except Exception as e:
            return AgentResult(
                task_id=task.id,
                status=AgentStatus.FAILURE,
                start_time=start_time,
                completion_time=datetime.now(timezone.utc).isoformat(),
                agent_summary=f"Agent execution encountered an error: {e}",
                errors=[str(e)],
            )
