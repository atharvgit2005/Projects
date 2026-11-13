"""Tests for orchestrator web dashboard server."""

import pytest
from starlette.testclient import TestClient

from orchestrator.web.server import create_app


def test_web_server_endpoints(tmp_path):
    # Initialize workspace with orchestrator config
    from orchestrator.config import OrchestratorConfig
    orch_dir = tmp_path / ".orchestrator"
    orch_dir.mkdir(parents=True)
    cfg = OrchestratorConfig(project_dir=str(tmp_path))
    cfg.save(orch_dir / "config.json")

    app = create_app(str(tmp_path))
    client = TestClient(app)

    # 1. Index page
    res = client.get("/")
    assert res.status_code == 200
    assert "Antigravity Orchestrator" in res.text

    # 2. Status
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert "project_dir" in data
    assert data["is_running"] is False

    # 3. Create task
    task_payload = {
        "task_id": "test-task-1",
        "title": "Test Task",
        "objective": "A test objective",
        "requirements": ["req1"],
        "acceptance_criteria": ["crit1"],
        "max_attempts": 3,
    }
    res = client.post("/api/tasks", json=task_payload)
    assert res.status_code == 200
    assert res.json()["success"] is True

    # 4. List tasks
    res = client.get("/api/tasks")
    assert res.status_code == 200
    tasks = res.json()["tasks"]
    assert len(tasks) == 1
    assert tasks[0]["id"] == "test-task-1"

    # 5. List runs
    res = client.get("/api/runs")
    assert res.status_code == 200
    assert "runs" in res.json()

    # 6. Logs
    res = client.get("/api/logs")
    assert res.status_code == 200
    assert "lines" in res.json()
