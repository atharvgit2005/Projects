"""Core data models and schemas for the Antigravity Orchestrator."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class TaskStatus(str, Enum):
    """Explicit lifecycle states for tasks."""
    PLANNING = "PLANNING"
    READY = "READY"
    IMPLEMENTING = "IMPLEMENTING"
    VERIFYING = "VERIFYING"
    REVIEWING = "REVIEWING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"
    COMPLETED = "COMPLETED"


class AgentStatus(str, Enum):
    """Execution status of an Antigravity agent attempt."""
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    TIMEOUT = "TIMEOUT"


class ReviewDecision(str, Enum):
    """Review outcome produced by the senior reviewer."""
    PASS = "PASS"
    FAIL = "FAIL"
    BLOCKED = "BLOCKED"


class ReviewIssue(BaseModel):
    """An issue identified by the senior reviewer."""
    severity: str = Field(..., description="critical | major | minor")
    category: str = Field(
        ...,
        description="functional | visual | architecture | security | performance | testing",
    )
    description: str
    evidence: str = Field(..., description="Objective proof from diff/test output")
    required_fix: str = Field(..., description="Actionable instruction for the agent")


class ReviewResult(BaseModel):
    """Structured machine-readable result of a senior review."""
    decision: ReviewDecision
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    summary: str
    issues: List[ReviewIssue] = Field(default_factory=list)
    next_prompt: Optional[str] = Field(
        default=None, description="Corrective prompt if FAIL, or next instructions"
    )


class VerificationCheck(BaseModel):
    """Result of an individual verification command execution."""
    name: str
    command: str
    status: str = Field(..., description="PASSED | FAILED | SKIPPED")
    exit_code: int
    stdout: str = ""
    stderr: str = ""
    duration_ms: float = 0.0


class VerificationResult(BaseModel):
    """Aggregated machine-readable verification evidence."""
    status: str = Field(..., description="PASSED | FAILED")
    checks: List[VerificationCheck] = Field(default_factory=list)
    tests: Dict[str, int] = Field(default_factory=lambda: {"passed": 0, "failed": 0})
    build: str = "SKIPPED"
    lint: str = "SKIPPED"
    typecheck: str = "SKIPPED"
    browser: str = "SKIPPED"
    screenshots: List[str] = Field(default_factory=list)
    failures: List[str] = Field(default_factory=list)
    duration_ms: float = 0.0


class AgentResult(BaseModel):
    """Machine-readable output of an Antigravity agent execution attempt."""
    task_id: str
    status: AgentStatus
    start_time: str = Field(default_factory=_utc_now_iso)
    completion_time: str = Field(default_factory=_utc_now_iso)
    agent_summary: str = ""
    raw_output: str = ""
    files_changed: List[str] = Field(default_factory=list)
    commands_executed: List[str] = Field(default_factory=list)
    artifacts: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    git_info: Dict[str, Any] = Field(default_factory=dict)
    conversation_id: Optional[str] = None


class ReviewContext(BaseModel):
    """Full context packaged for the senior reviewer."""
    specification: str = ""
    task_id: str
    title: str
    objective: str
    acceptance_criteria: List[str] = Field(default_factory=list)
    files_changed: List[str] = Field(default_factory=list)
    git_diff: str = ""
    verification: Optional[VerificationResult] = None
    previous_attempts: List[Dict[str, Any]] = Field(default_factory=list)
    agent_report: Optional[AgentResult] = None


class Task(BaseModel):
    """A structured software development task."""
    id: str
    title: str
    objective: str
    requirements: List[str] = Field(default_factory=list)
    acceptance_criteria: List[str] = Field(default_factory=list)
    verification_requirements: List[str] = Field(default_factory=list)
    status: TaskStatus = TaskStatus.READY
    attempt: int = 0
    max_attempts: int = 3
    history: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: str = Field(default_factory=_utc_now_iso)
    updated_at: str = Field(default_factory=_utc_now_iso)
    last_error: Optional[str] = None


class RunSummary(BaseModel):
    """Persistent summary of a single execution attempt."""
    run_id: str
    task_id: str
    attempt: int
    status: str
    agent_result: Optional[AgentResult] = None
    verification_result: Optional[VerificationResult] = None
    review_result: Optional[ReviewResult] = None
    git_diff: str = ""
    created_at: str = Field(default_factory=_utc_now_iso)
