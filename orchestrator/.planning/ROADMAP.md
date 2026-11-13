# Project Roadmap: Antigravity Orchestrator

## Phase Overview

- [x] **Phase 1: Discovery & Capability Audit**
  - Completed discovery of macOS environment, Antigravity IDE/desktop, language server, Python SDK, Agent API, and IPC protocols. Documented in `DISCOVERY.md`.

- [ ] **Phase 2: Core Domain Models & State Management**
  - Implement task schema, lifecycle state machine, run state store, and configuration loader.
  - Implement task persistence and recovery mechanisms.

- [ ] **Phase 3: Antigravity Agent Adapter**
  - Implement `AgentExecutor` protocol and `AgentResult` schema.
  - Implement `HeadlessSdkExecutor` using `google-antigravity` Python SDK.
  - Implement `LiveSessionExecutor` using `agentapi` and `transcript.jsonl` streaming.
  - Implement `MockAgentExecutor` for offline testing and dry-run operations.

- [ ] **Phase 4: Verification Engine & Evidence Packager**
  - Implement trusted verification command runner (tests, lint, typecheck, build).
  - Implement Git diff extractor (`diff.patch`, `git status --porcelain`).
  - Implement evidence packager writing to `runs/<run_id>/verification/`.

- [ ] **Phase 5: Senior Reviewer System**
  - Implement `Reviewer` protocol and structured JSON result parser.
  - Implement `ClaudeReviewer` (CLI and direct API support).
  - Implement `OpenAIReviewer` (API client).
  - Implement `DeterministicRuleReviewer` (offline rule-based reviewer).
  - Implement `MockReviewer` for deterministic test assertions.

- [ ] **Phase 6: Closed-Loop Orchestrator Core & CLI**
  - Implement central control loop with state transitions and error recovery.
  - Implement corrective task generator on review failure.
  - Build CLI commands (`init`, `create-task`, `run`, `status`, `verify`, `review`, `history`, `resume`, `stop`, `--dry-run`).
  - Implement structured event logging (`[TIMESTAMP] [TASK_ID] [STATE] [ACTION] [RESULT]`).

- [ ] **Phase 7: Comprehensive Automated Test Suite**
  - Implement all 12 specified test cases (agent success/failure/timeout, verifier pass/fail, reviewer PASS/FAIL/BLOCKED/malformed, retry limits, interruption/resume, corruption handling).
  - Execute automated tests and ensure 100% pass rate.

- [ ] **Phase 8: Milestone 1 Demonstration & Validation**
  - Create a test project repository.
  - Run the wrapper on an initial task where verification/review fails on first attempt.
  - Verify wrapper sends corrective prompt back to Antigravity.
  - Verify Antigravity applies fix, verification succeeds, reviewer passes, and task completes.
