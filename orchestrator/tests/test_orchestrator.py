"""Comprehensive test suite for Google Antigravity Orchestrator."""

import asyncio
from pathlib import Path
import pytest

from orchestrator.antigravity.mock_executor import MockAgentExecutor
from orchestrator.config import OrchestratorConfig, VerificationConfig
from orchestrator.core.loop import OrchestratorLoop
from orchestrator.core.models import (
    AgentResult,
    AgentStatus,
    ReviewContext,
    ReviewDecision,
    ReviewIssue,
    ReviewResult,
    Task,
    TaskStatus,
    VerificationResult,
)
from orchestrator.core.state import StateStore
from orchestrator.core.task_manager import TaskManager
from orchestrator.reviewers.base import Reviewer
from orchestrator.reviewers.deterministic import DeterministicRuleReviewer
from orchestrator.reviewers.mock_rev import MockReviewer
from orchestrator.verification.runner import VerificationRunner


@pytest.fixture
def temp_project(tmp_path):
    """Initializes a temporary project directory with git."""
    proj = tmp_path / "test_app"
    proj.mkdir()
    (proj / ".orchestrator").mkdir()
    return proj


@pytest.fixture
def task_manager(temp_project):
    store = StateStore(temp_project)
    return TaskManager(store)


# ---------------------------------------------------------------------------
# TEST 1: Antigravity Success
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_antigravity_success(temp_project, task_manager):
    task = task_manager.add_task(
        task_id="task-001",
        title="Create greet module",
        objective="Create greet.py that prints hello",
    )
    mock_agent = MockAgentExecutor(
        default_status=AgentStatus.SUCCESS,
        files_to_modify={"greet.py": "def greet(): return 'hello'\n"},
    )
    mock_reviewer = MockReviewer(default_decision=ReviewDecision.PASS)
    config = OrchestratorConfig(project_dir=str(temp_project))
    loop = OrchestratorLoop(
        config=config,
        task_manager=task_manager,
        agent_executor=mock_agent,
        reviewer=mock_reviewer,
    )

    result_task = await loop.run_task(task)
    assert result_task.status == TaskStatus.COMPLETED
    assert (temp_project / "greet.py").exists()
    assert (temp_project / "greet.py").read_text() == "def greet(): return 'hello'\n"


# ---------------------------------------------------------------------------
# TEST 2: Antigravity Failure
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_antigravity_failure(temp_project, task_manager):
    task = task_manager.add_task(
        task_id="task-002",
        title="Failing task",
        objective="Simulate agent failure",
        max_attempts=2,
    )
    mock_agent = MockAgentExecutor(default_status=AgentStatus.FAILURE)
    mock_reviewer = MockReviewer()
    config = OrchestratorConfig(project_dir=str(temp_project))
    loop = OrchestratorLoop(
        config=config,
        task_manager=task_manager,
        agent_executor=mock_agent,
        reviewer=mock_reviewer,
    )

    result_task = await loop.run_task(task)
    assert result_task.status == TaskStatus.BLOCKED
    assert result_task.attempt == 2
    assert len(mock_agent.invocations) == 2


# ---------------------------------------------------------------------------
# TEST 3: Timeout Handling
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_antigravity_timeout(temp_project, task_manager):
    task = task_manager.add_task(
        task_id="task-003",
        title="Timeout task",
        objective="Simulate agent timeout",
        max_attempts=1,
    )
    mock_agent = MockAgentExecutor(delay_seconds=0.5)
    config = OrchestratorConfig(project_dir=str(temp_project))
    config.agent.timeout_seconds = 1  # will trigger mock's internal timeout if delay > timeout
    # Test direct executor timeout
    res = await mock_agent.execute(task, str(temp_project), timeout_seconds=0)
    assert res.status == AgentStatus.TIMEOUT
    assert "timed out" in res.agent_summary.lower()


# ---------------------------------------------------------------------------
# TEST 4: Verification Success
# ---------------------------------------------------------------------------
def test_verification_success(temp_project):
    cfg = VerificationConfig(test_command="python3 -c 'print(\"1 passed in 0.01s\")'")
    runner = VerificationRunner(cfg)
    res = runner.run_all(str(temp_project))
    assert res.status == "PASSED"
    assert res.tests["passed"] == 1
    assert len(res.failures) == 0


# ---------------------------------------------------------------------------
# TEST 5: Verification Failure
# ---------------------------------------------------------------------------
def test_verification_failure(temp_project):
    cfg = VerificationConfig(test_command="python3 -c 'import sys; sys.stderr.write(\"AssertionError\"); sys.exit(1)'")
    runner = VerificationRunner(cfg)
    res = runner.run_all(str(temp_project))
    assert res.status == "FAILED"
    assert len(res.failures) > 0
    assert "AssertionError" in res.checks[0].stderr


# ---------------------------------------------------------------------------
# TEST 6: Reviewer PASS
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_reviewer_pass(temp_project):
    reviewer = DeterministicRuleReviewer()
    context = ReviewContext(
        task_id="task-006",
        title="Implement feature",
        objective="Add feature",
        files_changed=["main.py"],
        git_diff="diff --git a/main.py b/main.py\n+print('hello')",
        verification=VerificationResult(status="PASSED"),
    )
    res = await reviewer.review(context)
    assert res.decision == ReviewDecision.PASS
    assert res.confidence >= 0.9
    assert len(res.issues) == 0


# ---------------------------------------------------------------------------
# TEST 7: Reviewer FAIL
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_reviewer_fail(temp_project):
    reviewer = DeterministicRuleReviewer()
    context = ReviewContext(
        task_id="task-007",
        title="Implement feature",
        objective="Add feature",
        files_changed=["main.py"],
        git_diff="",  # Empty diff with failed tests
        verification=VerificationResult(
            status="FAILED",
            failures=["Test failed"],
        ),
    )
    res = await reviewer.review(context)
    assert res.decision == ReviewDecision.FAIL
    assert len(res.issues) > 0
    assert res.next_prompt is not None


# ---------------------------------------------------------------------------
# TEST 8: Reviewer BLOCKED
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_reviewer_blocked(temp_project, task_manager):
    task = task_manager.add_task(
        task_id="task-008",
        title="Blocked task",
        objective="Task with missing external secret",
    )
    mock_agent = MockAgentExecutor(default_status=AgentStatus.SUCCESS)
    mock_reviewer = MockReviewer(
        default_decision=ReviewDecision.BLOCKED,
        summary="Task requires missing external credentials.",
    )
    config = OrchestratorConfig(project_dir=str(temp_project))
    loop = OrchestratorLoop(
        config=config,
        task_manager=task_manager,
        agent_executor=mock_agent,
        reviewer=mock_reviewer,
    )

    result_task = await loop.run_task(task)
    assert result_task.status == TaskStatus.BLOCKED
    assert "blocked" in task.history[-1]["note"].lower()


# ---------------------------------------------------------------------------
# TEST 9: Malformed Reviewer Response
# ---------------------------------------------------------------------------
def test_malformed_reviewer_response():
    raw_garbage = "I am a language model and here is what I think without any JSON: it works!"
    result = Reviewer.parse_review_json(raw_garbage)
    assert result.decision == ReviewDecision.FAIL
    assert "malformed" in result.summary.lower()
    assert len(result.issues) > 0


# ---------------------------------------------------------------------------
# TEST 10: Retry Limit Enforced
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_retry_limit_enforced(temp_project, task_manager):
    task = task_manager.add_task(
        task_id="task-010",
        title="Persistent failure",
        objective="Tests fail every attempt",
        max_attempts=3,
    )
    mock_agent = MockAgentExecutor(default_status=AgentStatus.SUCCESS)
    # Reviewer rejects 3 times
    mock_reviewer = MockReviewer(default_decision=ReviewDecision.FAIL)
    config = OrchestratorConfig(project_dir=str(temp_project))
    loop = OrchestratorLoop(
        config=config,
        task_manager=task_manager,
        agent_executor=mock_agent,
        reviewer=mock_reviewer,
    )

    result_task = await loop.run_task(task)
    assert result_task.status == TaskStatus.BLOCKED
    assert result_task.attempt == 3
    assert len(mock_reviewer.invocations) == 3


# ---------------------------------------------------------------------------
# TEST 11: Interruption and Resume
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_interruption_and_resume(temp_project):
    store = StateStore(temp_project)
    tm1 = TaskManager(store)
    task = tm1.add_task(task_id="task-011", title="Interrupted task", objective="Resume me")

    # Simulate crash during IMPLEMENTING
    tm1.transition_state(task, TaskStatus.IMPLEMENTING, note="Crash before verification")

    # New session: TaskManager loads from disk
    tm2 = TaskManager(store)
    resumed_task = tm2.get_in_progress_task()
    assert resumed_task is not None
    assert resumed_task.id == "task-011"
    assert resumed_task.status == TaskStatus.IMPLEMENTING

    # Run resumed task to completion
    mock_agent = MockAgentExecutor(default_status=AgentStatus.SUCCESS)
    mock_reviewer = MockReviewer(default_decision=ReviewDecision.PASS)
    config = OrchestratorConfig(project_dir=str(temp_project))
    loop = OrchestratorLoop(
        config=config,
        task_manager=tm2,
        agent_executor=mock_agent,
        reviewer=mock_reviewer,
    )
    finished = await loop.run_task(resumed_task)
    assert finished.status == TaskStatus.COMPLETED


# ---------------------------------------------------------------------------
# TEST 12: State Corruption Handling
# ---------------------------------------------------------------------------
def test_state_corruption_handling(temp_project):
    store = StateStore(temp_project)
    tm = TaskManager(store)
    tm.add_task(task_id="task-012", title="Pre-corruption task", objective="Test recovery")

    # Deliberately corrupt the tasks.json file with invalid content
    with open(store.tasks_file, "w", encoding="utf-8") as f:
        f.write("{invalid_json: true, trailing_garbage")

    # Loading should not crash; it should archive corrupted file and return empty safe list
    corrupted_loaded = store.load_tasks()
    assert corrupted_loaded == []

    # Verify backup exists
    backups = list(store.orchestrator_dir.glob("tasks.corrupt.*.json"))
    assert len(backups) == 1
