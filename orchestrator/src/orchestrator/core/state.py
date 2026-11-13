"""State management and persistence across orchestrator runs."""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from orchestrator.core.models import (
    AgentResult,
    ReviewResult,
    RunSummary,
    Task,
    TaskStatus,
    VerificationResult,
)


class StateStore:
    """Manages persistence of tasks, run directories, and system state."""

    def __init__(self, project_dir: str | Path, runs_dir_name: str = "runs"):
        self.project_dir = Path(project_dir).resolve()
        self.orchestrator_dir = self.project_dir / ".orchestrator"
        self.runs_dir = self.project_dir / runs_dir_name
        self.state_file = self.orchestrator_dir / "state.json"
        self.tasks_file = self.orchestrator_dir / "tasks.json"

        self.orchestrator_dir.mkdir(parents=True, exist_ok=True)
        self.runs_dir.mkdir(parents=True, exist_ok=True)

    # ------------------ Run Directory Structure ------------------

    def create_run_directory(self, task: Task) -> tuple[str, Path]:
        """Creates runs/<run_id>/ with task.json, agent/, verification/, review/, artifacts/, logs/."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        run_id = f"run_{task.id}_{task.attempt}_{timestamp}_{uuid.uuid4().hex[:6]}"
        run_path = self.runs_dir / run_id

        (run_path / "agent").mkdir(parents=True, exist_ok=True)
        (run_path / "verification").mkdir(parents=True, exist_ok=True)
        (run_path / "review").mkdir(parents=True, exist_ok=True)
        (run_path / "artifacts").mkdir(parents=True, exist_ok=True)
        (run_path / "logs").mkdir(parents=True, exist_ok=True)

        self._atomic_write_json(run_path / "task.json", task.model_dump(mode="json"))
        return run_id, run_path

    def save_agent_evidence(self, run_path: Path, result: AgentResult) -> None:
        """Stores agent results and outputs in runs/<run_id>/agent/."""
        agent_dir = run_path / "agent"
        agent_dir.mkdir(parents=True, exist_ok=True)
        self._atomic_write_json(agent_dir / "result.json", result.model_dump(mode="json"))
        if result.raw_output:
            with open(agent_dir / "agent_output.txt", "w", encoding="utf-8") as f:
                f.write(result.raw_output)

    def save_verification_evidence(self, run_path: Path, result: VerificationResult) -> None:
        """Stores verification evidence in runs/<run_id>/verification/."""
        verif_dir = run_path / "verification"
        verif_dir.mkdir(parents=True, exist_ok=True)
        self._atomic_write_json(verif_dir / "result.json", result.model_dump(mode="json"))
        for check in result.checks:
            safe_name = check.name.replace(" ", "_").lower()
            with open(verif_dir / f"{safe_name}.log", "w", encoding="utf-8") as f:
                f.write(f"COMMAND: {check.command}\n")
                f.write(f"EXIT CODE: {check.exit_code}\n")
                f.write(f"DURATION: {check.duration_ms}ms\n")
                f.write("--- STDOUT ---\n")
                f.write(check.stdout)
                f.write("\n--- STDERR ---\n")
                f.write(check.stderr)

    def save_review_evidence(self, run_path: Path, result: ReviewResult) -> None:
        """Stores senior review decision in runs/<run_id>/review/."""
        review_dir = run_path / "review"
        review_dir.mkdir(parents=True, exist_ok=True)
        self._atomic_write_json(review_dir / "result.json", result.model_dump(mode="json"))

    def save_diff(self, run_path: Path, git_diff: str) -> None:
        """Saves diff.patch at the run root."""
        with open(run_path / "diff.patch", "w", encoding="utf-8") as f:
            f.write(git_diff or "")

    def save_run_summary(self, run_path: Path, summary: RunSummary) -> None:
        """Saves run_summary.json at the run root."""
        self._atomic_write_json(run_path / "run_summary.json", summary.model_dump(mode="json"))

    # ------------------ Workspace State & Tasks Persistence ------------------

    def load_tasks(self) -> List[Task]:
        """Loads task list from .orchestrator/tasks.json with corruption handling."""
        if not self.tasks_file.exists():
            return []
        try:
            with open(self.tasks_file, "r", encoding="utf-8") as f:
                raw = json.load(f)
            if not isinstance(raw, list):
                raise ValueError("Tasks file must be a JSON list")
            return [Task(**item) for item in raw]
        except Exception as e:
            # Handle corruption safely by archiving corrupt file
            backup = self.orchestrator_dir / f"tasks.corrupt.{int(datetime.now().timestamp())}.json"
            shutil.copyfile(self.tasks_file, backup)
            return []

    def save_tasks(self, tasks: List[Task]) -> None:
        """Atomically saves tasks list to .orchestrator/tasks.json."""
        data = [t.model_dump(mode="json") for t in tasks]
        self._atomic_write_json(self.tasks_file, data)

    def load_state(self) -> Dict[str, Any]:
        """Loads workspace orchestrator state."""
        if not self.state_file.exists():
            return {"active_run_id": None, "current_task_id": None, "updated_at": None}
        try:
            with open(self.state_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            backup = self.orchestrator_dir / f"state.corrupt.{int(datetime.now().timestamp())}.json"
            shutil.copyfile(self.state_file, backup)
            return {"active_run_id": None, "current_task_id": None, "updated_at": None}

    def update_state(self, **kwargs: Any) -> None:
        """Updates persistent state with given key-value pairs."""
        state = self.load_state()
        state.update(kwargs)
        state["updated_at"] = datetime.now(timezone.utc).isoformat()
        self._atomic_write_json(self.state_file, state)

    # ------------------ Utilities ------------------

    def _atomic_write_json(self, target_path: Path, data: Any) -> None:
        target_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = target_path.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        tmp_path.replace(target_path)
