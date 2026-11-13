# Requirements Specification: Antigravity Orchestrator

## 1. Functional Requirements

### 1.1 Discovery & Environment (REQ-DISC)
- [x] **REQ-DISC-01:** Inspect and document current OS, Antigravity desktop/IDE versions, language server stamps, CLI tools, SDKs, APIs, and runtimes in `DISCOVERY.md`.
- [x] **REQ-DISC-02:** Establish programmatic integration strategy without relying on browser or UI coordinate automation.

### 1.2 Antigravity Adapter (REQ-AGY)
- [ ] **REQ-AGY-01:** Implement `AgentExecutor` abstraction returning structured `AgentResult` (task ID, status, timestamps, summary, raw output, changed files, executed commands, artifacts, errors, Git diff).
- [ ] **REQ-AGY-02:** Implement `HeadlessSdkExecutor` using `google-antigravity` Python SDK and bundled `localharness` runtime.
- [ ] **REQ-AGY-03:** Implement `LiveSessionExecutor` using `agentapi send-message` and real-time streaming of `transcript.jsonl`.
- [ ] **REQ-AGY-04:** Implement `MockAgentExecutor` for deterministic testing, dry-runs, and offline CI pipelines.
- [ ] **REQ-AGY-05:** Provide robust completion detection based on stop reasons, tool calls, and transcript status.

### 1.3 Task Lifecycle Management (REQ-TASK)
- [ ] **REQ-TASK-01:** Structured task schema: `id`, `title`, `objective`, `requirements`, `acceptance_criteria`, `verification_requirements`, `status`, `attempt`, `max_attempts`, `history`.
- [ ] **REQ-TASK-02:** Strict state transitions: `PLANNING` -> `READY` -> `IMPLEMENTING` -> `VERIFYING` -> `REVIEWING` -> `PASSED` / `FAILED` / `BLOCKED` -> `COMPLETED`.
- [ ] **REQ-TASK-03:** State persistence across restarts with JSON serialization in `runs/` and workspace state store.

### 1.4 Verification Engine (REQ-VERIF)
- [ ] **REQ-VERIF-01:** Execute trusted project-configured verification commands (unit tests, linter, typecheck, build, custom scripts).
- [ ] **REQ-VERIF-02:** Capture stdout, stderr, exit codes, execution durations, and structured failure details.
- [ ] **REQ-VERIF-03:** Produce structured, machine-readable verification evidence saved to `runs/<run_id>/verification/`.

### 1.5 Senior Reviewer Engine (REQ-REV)
- [ ] **REQ-REV-01:** Provider-independent `Reviewer` abstraction with `review(context: ReviewContext) -> ReviewResult`.
- [ ] **REQ-REV-02:** Review context includes specification, acceptance criteria, Git diff (`diff.patch`), test results, build logs, and prior attempts.
- [ ] **REQ-REV-03:** Structured JSON decision schema: `decision` (PASS/FAIL/BLOCKED), `confidence`, `summary`, `issues` list, and `next_prompt`.
- [ ] **REQ-REV-04:** Adapters for `ClaudeReviewer` (Anthropic API / Claude Code CLI), `OpenAIReviewer`, `DeterministicRuleReviewer`, and `MockReviewer`.
- [ ] **REQ-REV-05:** Evidence-first enforcement: reviewer rejects conversational claims without diffs or passing verification.

### 1.6 Central Orchestration Loop (REQ-LOOP)
- [ ] **REQ-LOOP-01:** Execute closed-loop: `Load Task -> Implement -> Verify -> Package Evidence -> Review -> Decision Branching`.
- [ ] **REQ-LOOP-02:** On PASS: record completed task, persist state, transition to next task.
- [ ] **REQ-LOOP-03:** On FAIL: generate corrective prompt with issue feedback, increment attempt counter, re-prompt Antigravity up to `max_attempts`.
- [ ] **REQ-LOOP-04:** On BLOCKED: preserve full run state, halt autonomous loop, emit escalation message for human intervention.
- [ ] **REQ-LOOP-05:** Guardrails: timeout enforcement, attempt limits, no arbitrary command execution, secret masking.

### 1.7 Evidence & Observability (REQ-OBS)
- [ ] **REQ-OBS-01:** Persist run directory for each attempt:
  `runs/<run_id>/task.json`, `agent/`, `verification/`, `review/`, `artifacts/`, `logs/run.log`, `diff.patch`.
- [ ] **REQ-OBS-02:** Human-readable console and file logging format: `[TIMESTAMP] [TASK_ID] [STATE] [ACTION] [RESULT]`.

### 1.8 Command-Line Interface (REQ-CLI)
- [ ] **REQ-CLI-01:** CLI entrypoint `orchestrator` / `wrapper` supporting:
  - `init`: initialize orchestrator configuration in a target project.
  - `create-task`: add structured tasks to backlog.
  - `run`: execute closed-loop autonomous run.
  - `run --dry-run`: simulate transitions without touching workspace.
  - `status`: display current task, attempt, and health.
  - `verify`: trigger verification engine on demand.
  - `review`: trigger senior reviewer on demand.
  - `history`: inspect past runs and evidence.
  - `resume`: restart interrupted run from state store.
  - `stop`: gracefully pause run.

### 1.9 Quality Assurance & Testing (REQ-TEST)
- [ ] **REQ-TEST-01:** Unit and integration tests covering:
  1. Agent success
  2. Agent failure
  3. Timeout handling
  4. Verification success
  5. Verification failure
  6. Reviewer PASS
  7. Reviewer FAIL
  8. Reviewer BLOCKED
  9. Malformed reviewer JSON handling
  10. Retry limit enforcement
  11. Run interruption and state resumption
  12. State corruption recovery
- [ ] **REQ-TEST-02:** End-to-end demonstration on a test project executing the complete loop through failure, correction, and final PASS.
