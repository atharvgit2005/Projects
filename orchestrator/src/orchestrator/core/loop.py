"""Central closed-loop orchestrator engine."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from orchestrator.antigravity.base import AgentExecutor
from orchestrator.config import OrchestratorConfig
from orchestrator.core.models import (
    AgentResult,
    AgentStatus,
    ReviewContext,
    ReviewDecision,
    ReviewResult,
    RunSummary,
    Task,
    TaskStatus,
    VerificationResult,
)
from orchestrator.core.state import StateStore
from orchestrator.core.task_manager import TaskManager
from orchestrator.logging.logger import OrchestratorLogger, default_logger
from orchestrator.reviewers.base import Reviewer
from orchestrator.verification.git_diff import GitInspector
from orchestrator.verification.runner import VerificationRunner


class OrchestratorLoop:
    """Coordinates the autonomous TASK -> IMPLEMENT -> VERIFY -> REVIEW -> FIX loop."""

    def __init__(
        self,
        config: OrchestratorConfig,
        task_manager: TaskManager,
        agent_executor: AgentExecutor,
        reviewer: Reviewer,
        verifier: Optional[VerificationRunner] = None,
        logger: Optional[OrchestratorLogger] = None,
    ):
        self.config = config
        self.task_manager = task_manager
        self.agent_executor = agent_executor
        self.reviewer = reviewer
        self.verifier = verifier or VerificationRunner(config.verification)
        self.store = task_manager.store
        self.logger = logger or default_logger
        self.git_inspector = GitInspector(config.project_dir)

    async def run_task(self, task: Task, dry_run: bool = False) -> Task:
        """Runs a single task through the closed feedback loop until completion, block, or retry exhaustion."""
        workspace = str(Path(self.config.project_dir).resolve())

        if dry_run or self.config.safety.dry_run:
            self.logger.log(task.id, "DRY_RUN", "SIMULATION", "Validating task specification", run_id="dry-run")
            self.task_manager.transition_state(task, TaskStatus.IMPLEMENTING, note="Dry run simulation")
            await asyncio.sleep(0.05)
            self.task_manager.transition_state(task, TaskStatus.VERIFYING, note="Dry run simulation")
            await asyncio.sleep(0.05)
            self.task_manager.transition_state(task, TaskStatus.REVIEWING, note="Dry run simulation")
            await asyncio.sleep(0.05)
            self.task_manager.transition_state(task, TaskStatus.COMPLETED, note="Dry run complete")
            self.logger.log(task.id, "DRY_RUN", "PASSED", "Simulation finished cleanly", run_id="dry-run")
            return task

        corrective_issues: Optional[List[Dict[str, Any]]] = None

        while task.attempt < task.max_attempts:
            run_id, run_path = self.store.create_run_directory(task)
            self.logger.log(task.id, "IMPLEMENTING", f"ATTEMPT_{task.attempt + 1}", run_id=run_id)

            # 1. Transition to IMPLEMENTING
            self.task_manager.transition_state(
                task, TaskStatus.IMPLEMENTING, note=f"Attempt {task.attempt + 1}"
            )

            # 2. Execute Agent
            agent_result = await self.agent_executor.execute(
                task=task,
                workspace_dir=workspace,
                corrective_issues=corrective_issues,
                timeout_seconds=self.config.agent.timeout_seconds,
            )
            self.store.save_agent_evidence(run_path, agent_result)

            if agent_result.status != AgentStatus.SUCCESS:
                self.logger.log(
                    task.id,
                    "IMPLEMENTING",
                    "AGENT_FAILED",
                    f"Status: {agent_result.status.value}",
                    run_id=run_id,
                    details=agent_result.agent_summary,
                )
                self.task_manager.record_attempt(task, error=agent_result.agent_summary)

                if not self.task_manager.can_retry(task):
                    self.task_manager.transition_state(
                        task, TaskStatus.BLOCKED, note="Agent failed and attempts exhausted"
                    )
                    self.logger.log(task.id, "BLOCKED", "MAX_ATTEMPTS", "Halting loop", run_id=run_id)
                    return task

                corrective_issues = [
                    {
                        "severity": "critical",
                        "category": "functional",
                        "description": f"Agent execution failed: {agent_result.agent_summary}",
                        "evidence": "\n".join(agent_result.errors) or "Execution error",
                        "required_fix": "Fix error and complete code implementation.",
                    }
                ]
                continue

            self.logger.log(task.id, "IMPLEMENTING", "ANTIGRAVITY_COMPLETED", run_id=run_id)

            # 3. Transition to VERIFYING
            self.task_manager.transition_state(task, TaskStatus.VERIFYING)
            self.logger.log(task.id, "VERIFYING", "RUNNING_CHECKS", run_id=run_id)

            verification_result = self.verifier.run_all(workspace)
            git_diff = self.git_inspector.get_diff()

            self.store.save_verification_evidence(run_path, verification_result)
            self.store.save_diff(run_path, git_diff)

            verif_summary = (
                f"{verification_result.status} "
                f"({verification_result.tests.get('passed', 0)} passed, "
                f"{verification_result.tests.get('failed', 0)} failed)"
            )
            self.logger.log(
                task.id,
                "VERIFYING",
                "VERIFICATION_RESULT",
                verif_summary,
                run_id=run_id,
            )

            # 4. Transition to REVIEWING
            self.task_manager.transition_state(task, TaskStatus.REVIEWING)
            self.logger.log(task.id, "REVIEWING", "SENDING_TO_REVIEWER", run_id=run_id)

            review_context = ReviewContext(
                specification=task.objective,
                task_id=task.id,
                title=task.title,
                objective=task.objective,
                acceptance_criteria=task.acceptance_criteria,
                files_changed=agent_result.files_changed,
                git_diff=git_diff,
                verification=verification_result,
                previous_attempts=task.history,
                agent_report=agent_result,
            )

            review_result = await self.reviewer.review(review_context)
            self.store.save_review_evidence(run_path, review_result)

            # Save full summary of this run attempt
            summary = RunSummary(
                run_id=run_id,
                task_id=task.id,
                attempt=task.attempt + 1,
                status=review_result.decision.value,
                agent_result=agent_result,
                verification_result=verification_result,
                review_result=review_result,
                git_diff=git_diff,
            )
            self.store.save_run_summary(run_path, summary)

            # 5. Handle Review Decision
            if review_result.decision == ReviewDecision.PASS:
                self.logger.log(
                    task.id,
                    "REVIEWING",
                    "REVIEW_PASS",
                    review_result.summary,
                    run_id=run_id,
                )
                self.task_manager.transition_state(task, TaskStatus.PASSED, note="Review approved")
                self.task_manager.transition_state(task, TaskStatus.COMPLETED, note="Task finished successfully")
                self.logger.log(task.id, "COMPLETED", "TASK_FINISHED", run_id=run_id)
                return task

            elif review_result.decision == ReviewDecision.BLOCKED:
                self.logger.log(
                    task.id,
                    "REVIEWING",
                    "REVIEW_BLOCKED",
                    review_result.summary,
                    run_id=run_id,
                )
                self.task_manager.transition_state(
                    task, TaskStatus.BLOCKED, note=f"Reviewer blocked: {review_result.summary}"
                )
                return task

            else:  # FAIL
                self.logger.log(
                    task.id,
                    "REVIEWING",
                    "REVIEW_FAIL",
                    f"{len(review_result.issues)} issue(s)",
                    run_id=run_id,
                    details=review_result.summary,
                )
                self.task_manager.record_attempt(task, error=review_result.summary)

                if not self.task_manager.can_retry(task):
                    self.task_manager.transition_state(
                        task,
                        TaskStatus.BLOCKED,
                        note=f"Max attempts ({task.max_attempts}) reached without passing review",
                    )
                    self.logger.log(
                        task.id, "BLOCKED", "ATTEMPTS_EXCEEDED", f"Max attempts ({task.max_attempts}) reached", run_id=run_id
                    )
                    return task

                # Prepare corrective prompt for next iteration
                corrective_issues = [i.model_dump() for i in review_result.issues]
                self.logger.log(
                    task.id,
                    "RETRY",
                    f"PREPARING_RETRY_{task.attempt + 1}",
                    run_id=run_id,
                )

        # Loop exhausted
        self.task_manager.transition_state(task, TaskStatus.BLOCKED, note="Task attempt bounds exhausted")
        return task

    async def run_all_tasks(self, dry_run: bool = False) -> List[Task]:
        """Runs all runnable tasks in the backlog sequentially."""
        completed_tasks: List[Task] = []
        count = 0

        while count < self.config.safety.max_tasks_per_run:
            task = self.task_manager.get_next_runnable_task()
            if not task:
                break

            count += 1
            res_task = await self.run_task(task, dry_run=dry_run)
            completed_tasks.append(res_task)

            if res_task.status == TaskStatus.BLOCKED:
                self.logger.log(
                    res_task.id,
                    "ORCHESTRATOR",
                    "HALTING",
                    "Task blocked; human intervention required",
                )
                break

        return completed_tasks
