# Google Antigravity Orchestrator

A local developer tool that provides an external orchestration and verification wrapper around Google Antigravity as the primary coding agent.

## Overview

The orchestrator creates an autonomous, evidence-first closed loop:
```
USER / CLI
  ↓
ORCHESTRATOR
  ↓
ANTIGRAVITY AGENT (SDK / IPC / Mock)
  ↓
WORKSPACE IMPLEMENTATION
  ↓
VERIFICATION ENGINE (Tests, Lint, Build)
  ↓
SENIOR REVIEWER (Claude / ChatGPT / Deterministic)
  ↓
PASS → COMPLETE   |   FAIL → CORRECTIVE RETRY   |   BLOCKED → ESCALATE
```

## Features

- **Direct Programmatic Control:** Controls Antigravity via the official `google-antigravity` Python SDK (`localharness` Go runtime) or live session IPC (`agentapi` + `transcript.jsonl`). Strictly zero browser or UI automation required.
- **Evidence-First Verification:** Enforces objective verification commands (`pytest`, `npm test`, linters, build checks, and `diff.patch`) before reviewing.
- **Provider-Agnostic Senior Reviewer:** Pluggable review interface supporting Claude, ChatGPT/OpenAI, and Deterministic Rule-based reviewers.
- **Resilient State Persistence:** Recovers gracefully from interruptions, records complete run history under `runs/<run_id>/`, and handles state corruption safely.
- **Interactive & Autonomous CLI:** Full CLI supporting `init`, `create-task`, `run`, `status`, `verify`, `review`, `history`, `resume`, and `stop`.

## Installation

```bash
git clone https://github.com/.../orchestrator.git
cd orchestrator
uv venv .venv
source .venv/bin/activate
uv pip install -e ".[dev]"
```

## Usage

```bash
# Initialize orchestrator configuration in your project
wrapper init --project ./my-app

# Add a task to the backlog
wrapper create-task --project ./my-app --title "Add user authentication" --objective "Implement JWT auth"

# Run autonomous orchestration loop
wrapper run --project ./my-app

# Dry-run mode without workspace modifications
wrapper run --project ./my-app --dry-run
```
