# Project: Antigravity Orchestration Wrapper

## Overview
A local developer tool that provides an external orchestration and feedback-loop wrapper around Google Antigravity as the primary coding agent. The system orchestrates tasks through a closed-loop cycle:
`TASK -> IMPLEMENT (Antigravity) -> VERIFY (Objective Test/Lint/Build Evidence) -> REVIEW (Senior Engineer LLM: Claude / ChatGPT / Deterministic) -> PASS/FAIL -> CORRECTIVE TASK or NEXT TASK`.

## Core Value Proposition
Antigravity does the actual implementation, file modifications, and tool execution. External senior reviewer models (Claude, ChatGPT) inspect objective evidence (diffs, test logs, linter results) to determine task completion without relying on optimistic agent self-reports. The wrapper guarantees reliable verification, error recovery, state persistence, and auditability.

## Target Architecture
```
USER / CLI
  ↓
ORCHESTRATOR / CONTROLLER
  ↓
ANTIGRAVITY ADAPTER (SDK Headless / Live Session IPC / Mock)
  ↓
PROJECT WORKSPACE
  ↓
VERIFICATION ENGINE (Tests, Lint, Typecheck, Build, Smoke Checks)
  ↓
EVIDENCE PACKAGER (Diffs, logs, test reports, artifacts)
  ↓
SENIOR REVIEWER (Claude / ChatGPT / Deterministic Engine)
  ↓
PASS → NEXT TASK   |   FAIL → CORRECTIVE PROMPT (Attempt N)   |   BLOCKED → Human Escalation
```

## Key Architectural Decisions
1. **No Browser/UI Automation for Agent Control:** Leverages Antigravity's official programmatic Python SDK (`google-antigravity`), native Go harness (`localharness`), and Agent API IPC (`agentapi`, `transcript.jsonl`), avoiding brittle DOM/coordinate clicking.
2. **Evidence-First Verification:** Review decisions require objective machine-readable evidence (`diff.patch`, test exit codes, lint reports), never conversational assertions.
3. **Provider-Agnostic Abstractions:** Modular interfaces for `AgentExecutor`, `Reviewer`, `Verifier`, `StateStore`, and `TaskManager`.
4. **State Persistence & Crash Recovery:** Tasks and run histories persist on disk to survive interruptions and enable full replay.
5. **Safety Constraints:** Maximum attempt bounds, trusted verification commands, non-destructive execution safeguards.
