"""Command-line interface for Google Antigravity Orchestrator."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
import sys
from typing import List, Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from orchestrator.antigravity.ipc_executor import LiveSessionExecutor
from orchestrator.antigravity.mock_executor import MockAgentExecutor
from orchestrator.antigravity.sdk_executor import HeadlessSdkExecutor
from orchestrator.config import OrchestratorConfig
from orchestrator.core.loop import OrchestratorLoop
from orchestrator.core.models import ReviewDecision, TaskStatus
from orchestrator.core.state import StateStore
from orchestrator.core.task_manager import TaskManager
from orchestrator.logging.logger import OrchestratorLogger
from orchestrator.reviewers.claude import ClaudeReviewer
from orchestrator.reviewers.deterministic import DeterministicRuleReviewer
from orchestrator.reviewers.mock_rev import MockReviewer
from orchestrator.reviewers.openai_rev import OpenAIReviewer
from orchestrator.verification.git_diff import GitInspector
from orchestrator.verification.runner import VerificationRunner

console = Console()


def get_components(project: str, reviewer_override: Optional[str] = None, agent_mode_override: Optional[str] = None):
    project_path = Path(project).resolve()
    config_file = project_path / ".orchestrator" / "config.json"
    config = OrchestratorConfig.load(config_file, project_dir=str(project_path))

    if reviewer_override:
        config.reviewer.provider = reviewer_override
    if agent_mode_override:
        config.agent.mode = agent_mode_override

    store = StateStore(project_path)
    task_manager = TaskManager(store)
    logger = OrchestratorLogger(project_path / ".orchestrator" / "orchestrator.log")

    # Select agent executor
    mode = config.agent.mode.lower()
    if mode == "sdk":
        agent_executor = HeadlessSdkExecutor(model=config.agent.model)
    elif mode == "ipc":
        conv_id = config.agent.conversation_id or "default"
        agent_executor = LiveSessionExecutor(conversation_id=conv_id)
    else:
        agent_executor = MockAgentExecutor()

    # Select reviewer
    rev_provider = config.reviewer.provider.lower()
    if rev_provider == "claude":
        reviewer = ClaudeReviewer(cli_path=config.reviewer.cli_path or "/Users/atharvpaharia100/.local/bin/claude")
    elif rev_provider == "openai":
        reviewer = OpenAIReviewer(api_key=config.reviewer.api_key)
    elif rev_provider == "mock":
        reviewer = MockReviewer()
    else:
        reviewer = DeterministicRuleReviewer()

    verifier = VerificationRunner(config.verification)
    loop = OrchestratorLoop(
        config=config,
        task_manager=task_manager,
        agent_executor=agent_executor,
        reviewer=reviewer,
        verifier=verifier,
        logger=logger,
    )
    return config, store, task_manager, loop, verifier, reviewer


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """Google Antigravity Orchestrator & Senior Reviewer Control Layer."""
    pass


@cli.command()
@click.option("--project", "-p", default=".", help="Target project directory")
def init(project: str):
    """Initializes orchestrator configuration in a project."""
    project_path = Path(project).resolve()
    orchestrator_dir = project_path / ".orchestrator"
    orchestrator_dir.mkdir(parents=True, exist_ok=True)

    config_path = orchestrator_dir / "config.json"
    if not config_path.exists():
        cfg = OrchestratorConfig(project_dir=str(project_path))
        cfg.save(config_path)
        console.print(f"[green]✓ Initialized orchestrator config at:[/green] {config_path}")
    else:
        console.print(f"[yellow]Configuration already exists at:[/yellow] {config_path}")

    # Ensure git repo initialized
    git_dir = project_path / ".git"
    if not git_dir.exists():
        console.print("[dim]Note: Target directory is not a Git repository. Run 'git init' for change tracking.[/dim]")


@cli.command("create-task")
@click.option("--project", "-p", default=".", help="Target project directory")
@click.option("--id", "task_id", required=True, help="Unique task identifier, e.g. task-001")
@click.option("--title", "-t", required=True, help="Task title")
@click.option("--objective", "-o", required=True, help="Task objective description")
@click.option("--requirement", "-r", "requirements", multiple=True, help="Specific requirement")
@click.option("--acceptance", "-a", "acceptance_criteria", multiple=True, help="Acceptance criterion")
@click.option("--max-attempts", default=3, help="Maximum implementation attempts")
def create_task(
    project: str,
    task_id: str,
    title: str,
    objective: str,
    requirements: tuple[str, ...],
    acceptance_criteria: tuple[str, ...],
    max_attempts: int,
):
    """Adds a structured task to the project backlog."""
    _, store, task_manager, _, _, _ = get_components(project)
    try:
        task = task_manager.add_task(
            task_id=task_id,
            title=title,
            objective=objective,
            requirements=list(requirements),
            acceptance_criteria=list(acceptance_criteria),
            max_attempts=max_attempts,
        )
        console.print(f"[green]✓ Task '{task.id}' added to backlog.[/green] Status: {task.status.value}")
    except ValueError as e:
        console.print(f"[red]Error:[/red] {e}")
        sys.exit(1)


@cli.command()
@click.option("--project", "-p", default=".", help="Target project directory")
@click.option("--dry-run", is_flag=True, help="Simulate state transitions without modifying workspace")
@click.option("--task-id", help="Execute specific task ID")
@click.option("--reviewer", help="Override reviewer (claude | openai | deterministic | mock)")
@click.option("--agent-mode", help="Override agent mode (sdk | ipc | mock)")
def run(project: str, dry_run: bool, task_id: Optional[str], reviewer: Optional[str], agent_mode: Optional[str]):
    """Executes the closed-loop autonomous orchestration cycle."""
    config, store, task_manager, loop, _, _ = get_components(project, reviewer, agent_mode)

    if task_id:
        task = task_manager.get_task(task_id)
        if not task:
            console.print(f"[red]Task '{task_id}' not found in backlog.[/red]")
            sys.exit(1)
        console.print(f"[bold cyan]Running single task:[/bold cyan] {task.id} - {task.title}")
        res = asyncio.run(loop.run_task(task, dry_run=dry_run))
        console.print(f"Task finished with status: [bold]{res.status.value}[/bold]")
    else:
        console.print(f"[bold cyan]Starting autonomous orchestration loop on project:[/bold cyan] {config.project_dir}")
        completed = asyncio.run(loop.run_all_tasks(dry_run=dry_run))
        console.print(f"[green]Run finished. Completed {len(completed)} task(s).[/green]")


@cli.command()
@click.option("--project", "-p", default=".", help="Target project directory")
def status(project: str):
    """Displays task queue status and current project state."""
    _, store, task_manager, _, _, _ = get_components(project)
    tasks = task_manager.tasks
    state = store.load_state()

    console.print(Panel(f"Active Run: {state.get('active_run_id', 'None')} | Current Task: {state.get('current_task_id', 'None')}", title="System State"))

    table = Table(title="Task Backlog")
    table.add_column("Task ID", style="cyan")
    table.add_column("Title")
    table.add_column("Status", style="bold")
    table.add_column("Attempt")
    table.add_column("Updated At")

    for t in tasks:
        color = "green" if t.status == TaskStatus.COMPLETED else ("red" if t.status == TaskStatus.BLOCKED else "yellow")
        table.add_row(t.id, t.title, f"[{color}]{t.status.value}[/{color}]", f"{t.attempt}/{t.max_attempts}", t.updated_at[:19])

    console.print(table)


@cli.command()
@click.option("--project", "-p", default=".", help="Target project directory")
def verify(project: str):
    """Runs verification engine on the project and prints objective evidence."""
    config, _, _, _, verifier, _ = get_components(project)
    console.print("[cyan]Running verification suite...[/cyan]")
    res = verifier.run_all(config.project_dir)
    color = "green" if res.status == "PASSED" else "red"
    console.print(f"Verification Status: [{color}][bold]{res.status}[/bold][/{color}] ({res.duration_ms}ms)")
    for c in res.checks:
        console.print(f" - {c.name}: {c.status} (exit {c.exit_code}) [{c.duration_ms}ms]")
        if c.stderr:
            console.print(f"   Stderr: {c.stderr.strip()[:200]}")


@cli.command()
@click.option("--project", "-p", default=".", help="Target project directory")
@click.option("--reviewer", help="Reviewer provider (claude | openai | deterministic | mock)")
def review(project: str, reviewer: Optional[str]):
    """Triggers senior reviewer on current workspace git diff and verification."""
    config, _, _, _, verifier, rev = get_components(project, reviewer_override=reviewer)
    inspector = GitInspector(config.project_dir)
    diff = inspector.get_diff()
    v_res = verifier.run_all(config.project_dir)

    from orchestrator.core.models import ReviewContext
    context = ReviewContext(
        specification="Ad-hoc workspace review",
        task_id="manual-review",
        title="Manual Review",
        objective="Inspect current workspace changes",
        git_diff=diff,
        verification=v_res,
    )

    console.print("[cyan]Submitting evidence to Senior Reviewer...[/cyan]")
    decision = asyncio.run(rev.review(context))

    color = "green" if decision.decision == ReviewDecision.PASS else ("yellow" if decision.decision == ReviewDecision.FAIL else "red")
    console.print(f"Decision: [{color}][bold]{decision.decision.value}[/bold][/{color}] (Confidence: {decision.confidence})")
    console.print(f"Summary: {decision.summary}")
    if decision.issues:
        console.print(f"[bold]Issues Found ({len(decision.issues)}):[/bold]")
        for i in decision.issues:
            console.print(f"  * [{i.severity.upper()}] {i.description} -> Fix: {i.required_fix}")


@cli.command()
@click.option("--project", "-p", default=".", help="Target project directory")
def history(project: str):
    """Lists past execution run directories and outcomes."""
    config, store, _, _, _, _ = get_components(project)
    runs_dir = store.runs_dir
    if not runs_dir.exists():
        console.print("[dim]No runs found.[/dim]")
        return

    runs = sorted([d for d in runs_dir.iterdir() if d.is_dir()])
    table = Table(title=f"Execution History ({len(runs)} runs)")
    table.add_column("Run ID", style="cyan")
    table.add_column("Task ID")
    table.add_column("Decision")
    table.add_column("Created")

    for r in runs:
        summary_file = r / "run_summary.json"
        if summary_file.exists():
            try:
                with open(summary_file, "r", encoding="utf-8") as f:
                    s = json.load(f)
                dec = s.get("status", "UNKNOWN")
                dec_color = "green" if dec == "PASS" else "red"
                table.add_row(r.name, s.get("task_id", ""), f"[{dec_color}]{dec}[/{dec_color}]", s.get("created_at", "")[:19])
            except Exception:
                table.add_row(r.name, "Corrupt", "ERR", "")
        else:
            table.add_row(r.name, "Incomplete", "IN_PROGRESS", "")

    console.print(table)


@cli.command()
@click.option("--project", "-p", default=".", help="Target project directory")
def resume(project: str):
    """Resumes execution from previous task or in-progress state."""
    config, store, task_manager, loop, _, _ = get_components(project)
    in_prog = task_manager.get_in_progress_task() or task_manager.get_next_runnable_task()
    if not in_prog:
        console.print("[green]No in-progress or pending tasks to resume.[/green]")
        return

    console.print(f"[cyan]Resuming task:[/cyan] {in_prog.id} ({in_prog.status.value})")
    res = asyncio.run(loop.run_task(in_prog))
    console.print(f"Task finished with status: [bold]{res.status.value}[/bold]")


@cli.command()
@click.option("--project", "-p", default=".", help="Target project directory")
@click.option("--id", "task_id", required=True, help="Task ID to manually approve")
def approve(project: str, task_id: str):
    """Manually approves a blocked task, allowing the loop to proceed."""
    _, store, task_manager, _, _, _ = get_components(project)
    task = task_manager.get_task(task_id)
    if not task:
        console.print(f"[red]Task '{task_id}' not found.[/red]")
        sys.exit(1)

    task_manager.transition_state(task, TaskStatus.COMPLETED, note="Manually approved by user")
    console.print(f"[green]✓ Task '{task_id}' marked as COMPLETED by human operator.[/green]")


@cli.command()
@click.option("--project", "-p", default=".", help="Target project directory")
def stop(project: str):
    """Safely stops active run by setting current task to BLOCKED for review."""
    _, store, task_manager, _, _, _ = get_components(project)
    task = task_manager.get_in_progress_task()
    if task:
        task_manager.transition_state(task, TaskStatus.BLOCKED, note="Stopped by user command")
        console.print(f"[yellow]Task '{task.id}' halted and set to BLOCKED.[/yellow]")
    else:
        console.print("[dim]No active in-progress task found.[/dim]")


@cli.command("ui")
@click.option("--project", "-p", default=".", help="Target project directory")
@click.option("--port", default=8000, help="Web dashboard server port")
@click.option("--host", default="127.0.0.1", help="Web dashboard server host")
def ui(project: str, port: int, host: str):
    """Starts the real-time Orchestrator Web Dashboard & Control Center."""
    import uvicorn
    from orchestrator.web.server import create_app

    app = create_app(project)
    console.print(Panel(
        f"[bold green]Google Antigravity Orchestrator Web Dashboard[/bold green]\n"
        f"Server running at: [bold cyan]http://{host}:{port}[/bold cyan]\n"
        f"Target Project: [dim]{Path(project).resolve()}[/dim]",
        title="Web UI Active",
        border_style="cyan",
    ))
    uvicorn.run(app, host=host, port=port, log_level="info")


@cli.command("serve")
@click.option("--project", "-p", default=".", help="Target project directory")
@click.option("--port", default=8000, help="Web dashboard server port")
@click.option("--host", default="127.0.0.1", help="Web dashboard server host")
@click.pass_context
def serve(ctx, project: str, port: int, host: str):
    """Alias for 'ui' command."""
    ctx.invoke(ui, project=project, port=port, host=host)


if __name__ == "__main__":
    cli()
