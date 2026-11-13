"""Web dashboard backend server for Google Antigravity Orchestrator."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import HTMLResponse, JSONResponse, Response
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

from orchestrator.cli.main import get_components
from orchestrator.core.models import Task, TaskStatus
from orchestrator.verification.git_diff import GitInspector


class OrchestratorWebServer:
    def __init__(self, project_dir: str):
        self.project_path = Path(project_dir).resolve()
        self.is_running = False
        self.current_running_task_id: Optional[str] = None
        self.last_run_error: Optional[str] = None
        self._background_task: Optional[asyncio.Task] = None

    def get_app(self) -> Starlette:
        static_dir = Path(__file__).parent / "static"
        static_dir.mkdir(parents=True, exist_ok=True)

        routes = [
            Route("/", self.index_endpoint, methods=["GET"]),
            Route("/api/status", self.status_endpoint, methods=["GET"]),
            Route("/api/tasks", self.list_tasks_endpoint, methods=["GET"]),
            Route("/api/tasks", self.create_task_endpoint, methods=["POST"]),
            Route("/api/run", self.run_endpoint, methods=["POST"]),
            Route("/api/stop", self.stop_endpoint, methods=["POST"]),
            Route("/api/approve", self.approve_endpoint, methods=["POST"]),
            Route("/api/verify", self.verify_endpoint, methods=["POST"]),
            Route("/api/runs", self.list_runs_endpoint, methods=["GET"]),
            Route("/api/runs/{run_id}", self.get_run_endpoint, methods=["GET"]),
            Route("/api/review-prompt", self.get_review_prompt_endpoint, methods=["GET"]),
            Route("/api/submit-review", self.submit_review_endpoint, methods=["POST"]),
            Route("/api/logs", self.logs_endpoint, methods=["GET"]),
            Mount("/static", StaticFiles(directory=str(static_dir)), name="static"),
        ]

        middleware = [
            Middleware(
                CORSMiddleware,
                allow_origins=["*"],
                allow_methods=["*"],
                allow_headers=["*"],
            )
        ]

        return Starlette(routes=routes, middleware=middleware)

    async def index_endpoint(self, request: Request) -> Response:
        html_file = Path(__file__).parent / "static" / "index.html"
        if not html_file.exists():
            return HTMLResponse("<h1>Antigravity Orchestrator Dashboard</h1><p>Static index.html not found.</p>")
        return HTMLResponse(html_file.read_text(encoding="utf-8"))

    async def status_endpoint(self, request: Request) -> JSONResponse:
        _, store, task_manager, _, _, _ = get_components(str(self.project_path))
        state = store.load_state()
        tasks = task_manager.tasks

        return JSONResponse({
            "project_dir": str(self.project_path),
            "state": state,
            "is_running": self.is_running,
            "running_task_id": self.current_running_task_id,
            "last_error": self.last_run_error,
            "task_counts": {
                "total": len(tasks),
                "completed": sum(1 for t in tasks if t.status == TaskStatus.COMPLETED),
                "blocked": sum(1 for t in tasks if t.status == TaskStatus.BLOCKED),
                "in_progress": sum(1 for t in tasks if t.status in [TaskStatus.IMPLEMENTING, TaskStatus.VERIFYING, TaskStatus.REVIEWING]),
                "pending": sum(1 for t in tasks if t.status in [TaskStatus.READY, TaskStatus.PLANNING]),
            }
        })

    async def list_tasks_endpoint(self, request: Request) -> JSONResponse:
        _, _, task_manager, _, _, _ = get_components(str(self.project_path))
        return JSONResponse({
            "tasks": [t.model_dump() for t in task_manager.tasks]
        })

    async def create_task_endpoint(self, request: Request) -> JSONResponse:
        try:
            body = await request.json()
            task_id = body.get("task_id", "").strip()
            title = body.get("title", "").strip()
            objective = body.get("objective", "").strip()
            requirements = body.get("requirements", [])
            acceptance_criteria = body.get("acceptance_criteria", [])
            max_attempts = int(body.get("max_attempts", 3))

            if not task_id or not title or not objective:
                return JSONResponse({"error": "task_id, title, and objective are required"}, status_code=400)

            _, _, task_manager, _, _, _ = get_components(str(self.project_path))
            task = task_manager.add_task(
                task_id=task_id,
                title=title,
                objective=objective,
                requirements=requirements if isinstance(requirements, list) else [requirements],
                acceptance_criteria=acceptance_criteria if isinstance(acceptance_criteria, list) else [acceptance_criteria],
                max_attempts=max_attempts,
            )
            return JSONResponse({"success": True, "task": task.model_dump()})
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=500)

    async def run_endpoint(self, request: Request) -> JSONResponse:
        if self.is_running:
            return JSONResponse({"error": "Orchestrator is already executing a task"}, status_code=409)

        try:
            body = await request.json() if request.headers.get("content-length", "0") != "0" else {}
        except Exception:
            body = {}

        task_id = body.get("task_id")
        dry_run = bool(body.get("dry_run", False))

        # Launch background execution task
        self.is_running = True
        self.current_running_task_id = task_id or "all"
        self.last_run_error = None

        async def _execute():
            try:
                _, _, task_manager, loop, _, _ = get_components(str(self.project_path))
                if task_id:
                    t = task_manager.get_task(task_id)
                    if t:
                        await loop.run_task(t, dry_run=dry_run)
                else:
                    await loop.run_all_tasks(dry_run=dry_run)
            except Exception as exc:
                self.last_run_error = str(exc)
            finally:
                self.is_running = False
                self.current_running_task_id = None

        self._background_task = asyncio.create_task(_execute())
        return JSONResponse({"success": True, "message": "Execution started", "task_id": task_id})

    async def stop_endpoint(self, request: Request) -> JSONResponse:
        _, _, task_manager, _, _, _ = get_components(str(self.project_path))
        task = task_manager.get_in_progress_task()
        if task:
            task_manager.transition_state(task, TaskStatus.BLOCKED, note="Stopped from Web UI")
            self.is_running = False
            self.current_running_task_id = None
            if self._background_task and not self._background_task.done():
                self._background_task.cancel()
            return JSONResponse({"success": True, "message": f"Task {task.id} halted and marked BLOCKED"})
        self.is_running = False
        return JSONResponse({"success": True, "message": "No in-progress task found"})

    async def approve_endpoint(self, request: Request) -> JSONResponse:
        try:
            body = await request.json()
            task_id = body.get("task_id")
            if not task_id:
                return JSONResponse({"error": "task_id is required"}, status_code=400)

            _, _, task_manager, _, _, _ = get_components(str(self.project_path))
            task = task_manager.get_task(task_id)
            if not task:
                return JSONResponse({"error": f"Task '{task_id}' not found"}, status_code=404)

            task_manager.transition_state(task, TaskStatus.COMPLETED, note="Manually approved by human operator in Web UI")
            return JSONResponse({"success": True, "message": f"Task '{task_id}' marked as COMPLETED"})
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=500)

    async def verify_endpoint(self, request: Request) -> JSONResponse:
        config, _, _, _, verifier, _ = get_components(str(self.project_path))
        result = verifier.run_all(config.project_dir)
        return JSONResponse(result.model_dump())

    async def list_runs_endpoint(self, request: Request) -> JSONResponse:
        config, store, _, _, _, _ = get_components(str(self.project_path))
        runs_dir = store.runs_dir
        if not runs_dir.exists():
            return JSONResponse({"runs": []})

        runs_info = []
        for r_dir in sorted(runs_dir.iterdir(), reverse=True):
            if not r_dir.is_dir():
                continue
            summary_path = r_dir / "run_summary.json"
            if summary_path.exists():
                try:
                    data = json.loads(summary_path.read_text(encoding="utf-8"))
                    runs_info.append(data)
                except Exception:
                    runs_info.append({"run_id": r_dir.name, "status": "MALFORMED"})
            else:
                runs_info.append({"run_id": r_dir.name, "status": "INCOMPLETE"})

        return JSONResponse({"runs": runs_info})

    async def get_run_endpoint(self, request: Request) -> JSONResponse:
        run_id = request.path_params["run_id"]
        config, store, _, _, _, _ = get_components(str(self.project_path))
        run_path = store.runs_dir / run_id
        if not run_path.exists():
            return JSONResponse({"error": f"Run '{run_id}' not found"}, status_code=404)

        data: Dict[str, Any] = {"run_id": run_id}

        summary_file = run_path / "run_summary.json"
        if summary_file.exists():
            try:
                data["summary"] = json.loads(summary_file.read_text(encoding="utf-8"))
            except Exception:
                data["summary"] = None

        diff_file = run_path / "diff.patch"
        if diff_file.exists():
            data["git_diff"] = diff_file.read_text(encoding="utf-8")
        else:
            data["git_diff"] = ""

        verif_file = run_path / "verification" / "result.json"
        if verif_file.exists():
            try:
                data["verification"] = json.loads(verif_file.read_text(encoding="utf-8"))
            except Exception:
                data["verification"] = None

        review_file = run_path / "review" / "decision.json"
        if review_file.exists():
            try:
                data["review"] = json.loads(review_file.read_text(encoding="utf-8"))
            except Exception:
                data["review"] = None

        task_file = run_path / "task.json"
        if task_file.exists():
            try:
                data["task"] = json.loads(task_file.read_text(encoding="utf-8"))
            except Exception:
                data["task"] = None

        return JSONResponse(data)

    async def get_review_prompt_endpoint(self, request: Request) -> JSONResponse:
        run_id = request.query_params.get("run_id")
        config, store, task_manager, _, _, _ = get_components(str(self.project_path))

        runs_dir = store.runs_dir
        if not runs_dir.exists():
            return JSONResponse({"error": "No runs exist yet"}, status_code=404)

        target_dir = (runs_dir / run_id) if run_id else None
        if not target_dir or not target_dir.exists():
            runs = sorted([d for d in runs_dir.iterdir() if d.is_dir()], reverse=True)
            if not runs:
                return JSONResponse({"error": "No runs exist yet"}, status_code=404)
            target_dir = runs[0]

        task_data = {}
        if (target_dir / "task.json").exists():
            try:
                task_data = json.loads((target_dir / "task.json").read_text(encoding="utf-8"))
            except Exception:
                pass

        diff = ""
        if (target_dir / "diff.patch").exists():
            diff = (target_dir / "diff.patch").read_text(encoding="utf-8")

        verif = None
        if (target_dir / "verification" / "result.json").exists():
            try:
                from orchestrator.core.models import VerificationResult
                verif = VerificationResult(**json.loads((target_dir / "verification" / "result.json").read_text(encoding="utf-8")))
            except Exception:
                pass

        from orchestrator.core.models import ReviewContext
        from orchestrator.reviewers.base import Reviewer

        ctx = ReviewContext(
            specification=task_data.get("objective", ""),
            task_id=task_data.get("id", target_dir.name),
            title=task_data.get("title", "Review Task"),
            objective=task_data.get("objective", ""),
            acceptance_criteria=task_data.get("acceptance_criteria", []),
            git_diff=diff,
            verification=verif,
        )

        from orchestrator.reviewers.deterministic import DeterministicRuleReviewer
        prompt = DeterministicRuleReviewer().build_review_prompt(ctx)
        return JSONResponse({"prompt": prompt, "run_id": target_dir.name, "task_id": ctx.task_id})

    async def submit_review_endpoint(self, request: Request) -> JSONResponse:
        try:
            body = await request.json()
            run_id = body.get("run_id")
            raw_text = body.get("raw_text", "").strip()
            if not run_id or not raw_text:
                return JSONResponse({"error": "run_id and raw_text are required"}, status_code=400)

            config, store, task_manager, loop, _, _ = get_components(str(self.project_path))
            run_dir = store.runs_dir / run_id
            if not run_dir.exists():
                return JSONResponse({"error": f"Run '{run_id}' not found"}, status_code=404)

            from orchestrator.reviewers.base import Reviewer
            from orchestrator.core.models import ReviewDecision, TaskStatus
            decision = Reviewer.parse_review_json(raw_text)

            store.save_review_evidence(run_dir, decision)

            task_id = body.get("task_id")
            if not task_id and (run_dir / "task.json").exists():
                try:
                    tdata = json.loads((run_dir / "task.json").read_text(encoding="utf-8"))
                    task_id = tdata.get("id")
                except Exception:
                    pass

            task = task_manager.get_task(task_id) if task_id else None
            if task:
                if decision.decision == ReviewDecision.PASS:
                    task_manager.transition_state(task, TaskStatus.COMPLETED, note=f"Approved by external browser reviewer: {decision.summary}")
                elif decision.decision == ReviewDecision.BLOCKED:
                    task_manager.transition_state(task, TaskStatus.BLOCKED, note=f"Blocked by reviewer: {decision.summary}")
                else:  # FAIL
                    task_manager.record_attempt(task, error=decision.summary)
                    if not task_manager.can_retry(task):
                        task_manager.transition_state(task, TaskStatus.BLOCKED, note="Max attempts reached without passing review")
                    else:
                        task_manager.transition_state(task, TaskStatus.READY, note="Review failed; queued for corrective retry")

            return JSONResponse({"success": True, "decision": decision.model_dump()})
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=500)

    async def logs_endpoint(self, request: Request) -> JSONResponse:
        log_file = self.project_path / ".orchestrator" / "orchestrator.log"
        if not log_file.exists():
            return JSONResponse({"lines": []})
        try:
            lines = log_file.read_text(encoding="utf-8").splitlines()
            return JSONResponse({"lines": lines[-100:]})
        except Exception as e:
            return JSONResponse({"lines": [f"Error reading logs: {e}"]})


def create_app(project_dir: str = ".") -> Starlette:
    server = OrchestratorWebServer(project_dir)
    return server.get_app()
