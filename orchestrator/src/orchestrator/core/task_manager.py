"""Task lifecycle and backlog management."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from orchestrator.core.models import Task, TaskStatus
from orchestrator.core.state import StateStore


class TaskManager:
    """Manages the task queue, lifecycle transitions, and persistence."""

    def __init__(self, state_store: StateStore):
        self.store = state_store
        self._tasks: List[Task] = self.store.load_tasks()

    @property
    def tasks(self) -> List[Task]:
        return self._tasks

    def add_task(
        self,
        task_id: str,
        title: str,
        objective: str,
        requirements: Optional[List[str]] = None,
        acceptance_criteria: Optional[List[str]] = None,
        verification_requirements: Optional[List[str]] = None,
        max_attempts: int = 3,
    ) -> Task:
        """Adds a new task to the backlog."""
        for t in self._tasks:
            if t.id == task_id:
                raise ValueError(f"Task with ID '{task_id}' already exists")

        task = Task(
            id=task_id,
            title=title,
            objective=objective,
            requirements=requirements or [],
            acceptance_criteria=acceptance_criteria or [],
            verification_requirements=verification_requirements or [],
            status=TaskStatus.READY,
            max_attempts=max_attempts,
        )
        self._tasks.append(task)
        self.store.save_tasks(self._tasks)
        return task

    def get_task(self, task_id: str) -> Optional[Task]:
        for t in self._tasks:
            if t.id == task_id:
                return t
        return None

    def get_next_runnable_task(self) -> Optional[Task]:
        """Returns the first task ready to be implemented."""
        for t in self._tasks:
            if t.status in (TaskStatus.READY, TaskStatus.PLANNING):
                return t
        return None

    def get_in_progress_task(self) -> Optional[Task]:
        """Returns any task currently in progress for resumption."""
        for t in self._tasks:
            if t.status in (
                TaskStatus.IMPLEMENTING,
                TaskStatus.VERIFYING,
                TaskStatus.REVIEWING,
            ):
                return t
        return None

    def transition_state(
        self, task: Task, new_status: TaskStatus, note: str = ""
    ) -> None:
        """Executes an explicit state transition with history tracking."""
        old_status = task.status
        task.status = new_status
        task.updated_at = datetime.now(timezone.utc).isoformat()
        task.history.append(
            {
                "timestamp": task.updated_at,
                "from_state": old_status.value,
                "to_state": new_status.value,
                "attempt": task.attempt,
                "note": note,
            }
        )
        self.store.save_tasks(self._tasks)
        self.store.update_state(current_task_id=task.id, current_status=new_status.value)

    def record_attempt(self, task: Task, error: Optional[str] = None) -> None:
        task.attempt += 1
        task.last_error = error
        task.updated_at = datetime.now(timezone.utc).isoformat()
        self.store.save_tasks(self._tasks)

    def can_retry(self, task: Task) -> bool:
        return task.attempt < task.max_attempts
