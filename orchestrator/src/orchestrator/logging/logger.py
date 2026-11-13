"""Structured observability logger for orchestrator events."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from rich.console import Console


class OrchestratorLogger:
    """Logs lifecycle events in format: [TIMESTAMP] [RUN_ID] [TASK_ID] [STATE] [ACTION] [RESULT]."""

    def __init__(self, log_file: Optional[str | Path] = None, quiet: bool = False):
        self.console = Console(stderr=True)
        self.log_file = Path(log_file) if log_file else None
        self.quiet = quiet
        if self.log_file:
            self.log_file.parent.mkdir(parents=True, exist_ok=True)

    def log(
        self,
        task_id: str,
        state: str,
        action: str,
        result: str = "",
        run_id: str = "",
        details: str = "",
    ) -> str:
        timestamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
        run_part = f"[{run_id}] " if run_id else ""
        result_part = f" -> {result}" if result else ""
        line = f"[{timestamp}] {run_part}{task_id} {state} {action}{result_part}"
        if details:
            line += f" | {details}"

        if not self.quiet:
            color = "cyan"
            if "FAIL" in action or "FAIL" in result or "BLOCKED" in state or "ERROR" in result:
                color = "bold red"
            elif "PASS" in action or "PASS" in result or "COMPLETED" in state or "SUCCESS" in result:
                color = "bold green"
            elif "RETRY" in action or "RETRY" in result:
                color = "bold yellow"
            elif "IMPLEMENT" in action or "VERIFY" in action or "REVIEW" in action:
                color = "magenta"

            self.console.print(f"[{color}]{line}[/{color}]")

        if self.log_file:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(line + "\n")

        return line


# Global default logger instance
default_logger = OrchestratorLogger()
