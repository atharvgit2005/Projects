"""Milestone 1 End-to-End Demonstration:

1. Wrapper receives a simple task.
2. Wrapper sends it to Antigravity.
3. Antigravity modifies a test project.
4. Wrapper detects completion.
5. Wrapper runs verification.
6. Wrapper collects evidence.
7. Reviewer receives the evidence.
8. Reviewer returns FAIL on first attempt.
9. Wrapper sends the corrective prompt back to Antigravity.
10. Antigravity fixes the issue.
11. Verification runs again.
12. Reviewer returns PASS.
13. Wrapper records the completed task.
"""

from pathlib import Path
import subprocess
import pytest

from orchestrator.antigravity.mock_executor import MockAgentExecutor
from orchestrator.config import OrchestratorConfig, VerificationConfig
from orchestrator.core.loop import OrchestratorLoop
from orchestrator.core.models import (
    AgentResult,
    AgentStatus,
    ReviewDecision,
    Task,
    TaskStatus,
)
from orchestrator.core.state import StateStore
from orchestrator.core.task_manager import TaskManager
from orchestrator.reviewers.deterministic import DeterministicRuleReviewer
from orchestrator.verification.runner import VerificationRunner


@pytest.mark.asyncio
async def test_milestone_closed_loop_demonstration(tmp_path):
    # 1. Setup target demo project with Git and initial test
    demo_dir = tmp_path / "calc_app"
    demo_dir.mkdir()
    subprocess.run(["git", "init", "-b", "main"], cwd=str(demo_dir), check=True, capture_output=True)

    # Initial test file requiring safe divide function
    test_code = """import unittest
from calc import divide

class TestCalc(unittest.TestCase):
    def test_divide_valid(self):
        self.assertEqual(divide(10, 2), 5)

    def test_divide_zero(self):
        self.assertIsNone(divide(10, 0))

if __name__ == '__main__':
    unittest.main()
"""
    (demo_dir / "test_calc.py").write_text(test_code, encoding="utf-8")
    subprocess.run(["git", "add", "test_calc.py"], cwd=str(demo_dir), check=True)
    subprocess.run(["git", "commit", "-m", "initial test commit"], cwd=str(demo_dir), check=True)

    # 2. Configure Orchestrator
    store = StateStore(demo_dir)
    task_manager = TaskManager(store)
    task = task_manager.add_task(
        task_id="task-calc-001",
        title="Implement safe division",
        objective="Create calc.py with divide(a, b) returning None on zero denominator",
        acceptance_criteria=[
            "divide(10, 2) returns 5",
            "divide(10, 0) returns None",
        ],
        max_attempts=3,
    )

    # 3. Simulate Antigravity Behavior across attempts
    # Attempt 0: produces buggy code (missing zero check) -> tests fail -> Reviewer FAIL
    # Attempt 1: receives corrective prompt -> produces fixed code -> tests pass -> Reviewer PASS
    def dynamic_agent_behavior(t: Task, workspace: str, corrective_issues=None) -> AgentResult:
        calc_path = Path(workspace) / "calc.py"
        if t.attempt == 0:
            # Buggy implementation
            calc_path.write_text("def divide(a, b):\n    return a / b\n", encoding="utf-8")
            return AgentResult(
                task_id=t.id,
                status=AgentStatus.SUCCESS,
                agent_summary="Implemented basic divide function",
                files_changed=[str(calc_path)],
            )
        else:
            # Fixed implementation based on reviewer feedback
            calc_path.write_text(
                "def divide(a, b):\n    if b == 0:\n        return None\n    return a / b\n",
                encoding="utf-8",
            )
            return AgentResult(
                task_id=t.id,
                status=AgentStatus.SUCCESS,
                agent_summary="Fixed divide function to safely return None on division by zero",
                files_changed=[str(calc_path)],
            )

    mock_agent = MockAgentExecutor(behavior_fn=dynamic_agent_behavior)
    reviewer = DeterministicRuleReviewer()
    verifier = VerificationRunner(
        VerificationConfig(test_command="python3 -m unittest test_calc.py")
    )

    config = OrchestratorConfig(
        project_dir=str(demo_dir),
        verification=VerificationConfig(test_command="python3 -m unittest test_calc.py"),
    )
    loop = OrchestratorLoop(
        config=config,
        task_manager=task_manager,
        agent_executor=mock_agent,
        reviewer=reviewer,
        verifier=verifier,
    )

    # 4. Execute the autonomous closed-loop
    completed_task = await loop.run_task(task)

    # 5. Assertions verifying the complete 13-step lifecycle
    assert completed_task.status == TaskStatus.COMPLETED
    assert completed_task.attempt == 1  # 2 attempts: 0 and 1

    # Verify run artifacts exist on disk
    runs = list(store.runs_dir.iterdir())
    assert len(runs) == 2  # One run directory per attempt

    # Sort runs by name/creation
    runs.sort(key=lambda p: p.name)
    run_1, run_2 = runs[0], runs[1]

    # Inspect Run 1 (Failed attempt)
    assert (run_1 / "task.json").exists()
    assert (run_1 / "verification" / "result.json").exists()
    assert (run_1 / "review" / "result.json").exists()
    assert (run_1 / "diff.patch").exists()

    # Inspect Run 2 (Passed attempt)
    assert (run_2 / "verification" / "result.json").exists()
    assert (run_2 / "review" / "result.json").exists()
    assert (run_2 / "run_summary.json").exists()

    # Check that calc.py now exists and has the fix
    final_code = (demo_dir / "calc.py").read_text()
    assert "if b == 0:" in final_code
    assert "return None" in final_code
