"""Configuration models and loader for the orchestrator."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VerificationConfig(BaseModel):
    """Configuration for trusted verification commands."""
    test_command: Optional[str] = None
    build_command: Optional[str] = None
    lint_command: Optional[str] = None
    typecheck_command: Optional[str] = None
    custom_commands: List[str] = Field(default_factory=list)
    timeout_seconds: int = 180
    allow_shell_injection: bool = False


class AgentConfig(BaseModel):
    """Configuration for the Antigravity agent adapter."""
    mode: str = Field(default="mock", description="sdk | ipc | mock")
    model: str = "gemini-2.5-flash"
    timeout_seconds: int = 600
    workspace_dir: Optional[str] = None
    conversation_id: Optional[str] = None
    policies: List[str] = Field(default_factory=lambda: ["allow_all"])


class ReviewerConfig(BaseModel):
    """Configuration for the Senior Reviewer engine."""
    provider: str = Field(default="deterministic", description="claude | openai | deterministic | mock")
    model: Optional[str] = None
    cli_path: Optional[str] = "/Users/atharvpaharia100/.local/bin/claude"
    api_key: Optional[str] = None
    temperature: float = 0.0
    timeout_seconds: int = 180


class SafetyConfig(BaseModel):
    """Safety constraints and approval gates."""
    max_attempts_per_task: int = 3
    max_tasks_per_run: int = 10
    max_runtime_minutes: int = 60
    require_human_on_blocked: bool = True
    dry_run: bool = False


class OrchestratorConfig(BaseModel):
    """Global orchestrator configuration."""
    project_dir: str = Field(default=".")
    runs_dir: str = "runs"
    agent: AgentConfig = Field(default_factory=AgentConfig)
    verification: VerificationConfig = Field(default_factory=VerificationConfig)
    reviewer: ReviewerConfig = Field(default_factory=ReviewerConfig)
    safety: SafetyConfig = Field(default_factory=SafetyConfig)

    @classmethod
    def load(cls, config_path: str | Path, project_dir: Optional[str] = None) -> OrchestratorConfig:
        path = Path(config_path)
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                config = cls(**data)
            except Exception:
                config = cls()
        else:
            config = cls()

        if project_dir:
            config.project_dir = str(Path(project_dir).resolve())
        elif not os.path.isabs(config.project_dir):
            config.project_dir = str(Path(config.project_dir).resolve())

        return config

    def save(self, config_path: str | Path) -> None:
        path = Path(config_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.model_dump(mode="json"), f, indent=2)
