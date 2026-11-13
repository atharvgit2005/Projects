# Antigravity Orchestrator: System & Environment Discovery

**Date:** 2026-09-07  
**Host:** Darwin Atharvs-MacBook-Pro-3.local (macOS 26.6.2, Apple Silicon arm64)  
**Author:** Antigravity Orchestrator Initiative  

---

## 1. Executive Summary

This discovery phase systematically inspected the local macOS development environment, Google Antigravity installations, available CLI tools, Python SDKs, gRPC/WebSocket protocols, IPC messaging mechanisms, and filesystem data structures.

The key findings are:
1. **Direct Programmatic Interfaces Exist:**
   - **Antigravity Python SDK (`google-antigravity==0.1.16`):** Provides a first-class programmatic interface (`google.antigravity.Agent`, `LocalAgentConfig`, `CapabilitiesConfig`) bundling a native Go runtime (`localharness`, 116 MB). When initialized, it manages the full agentic loop headlessly without requiring browser automation, GUI interaction, or coordinate clicking.
   - **Agent API CLI (`agentapi`):** Packaged at `~/.gemini/antigravity/bin/agentapi` (routing to `/Applications/Antigravity.app/Contents/Resources/bin/language_server agentapi "$@"`). It exposes commands `get-conversation-metadata`, `new-conversation`, and `send-message`.
   - **Live Session IPC & Reactive Messaging:** The system delivers reactive messages directly into active conversations (`agentapi send-message <conversation_id> <content>`).
2. **Deterministic Evidence & Observability:**
   - Every agent interaction, step, reasoning trace, tool execution (`run_command`, `write_to_file`, `edit_file`, etc.), tool output, and completion status is persisted in real time as JSONL in:
     `~/.gemini/antigravity-ide/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`
   - File modifications can be deterministically verified through both the JSONL trajectory and Git diff / worktree tracking (`git status --porcelain`, `git diff`).
3. **Reviewer Integrations:**
   - Claude CLI is available locally at `/Users/atharvpaharia100/.local/bin/claude` (Claude Code 2.1.245).
   - Reviewer interface must remain provider-agnostic, supporting Claude, OpenAI, and deterministic mock/offline reviewers.

---

## 2. Environment & System Details

| Parameter | Value | Verification Command / Source |
| :--- | :--- | :--- |
| **Operating System** | macOS 26.6.2 (Darwin 25.6.0 arm64) | `sw_vers`, `uname -a` |
| **Antigravity IDE** | Version 2.5.5 | `mdls -name kMDItemVersion /Applications/Antigravity\ IDE.app` |
| **Antigravity Desktop** | Version 2.1.4 | `mdls -name kMDItemVersion /Applications/Antigravity.app` |
| **Language Server** | CL 930583198 (mint client `agy_ls_release_branch/2.1/google3`) | `/Applications/Antigravity.app/Contents/Resources/bin/language_server -stamp` |
| **Node.js** | v20.20.1 | `node --version` |
| **Python Runtimes** | Python 3.14.0 (Homebrew / uv) & Python 3.9.6 (macOS system) | `python3 --version` |
| **Package Managers** | `uv` (/Users/atharvpaharia100/.local/bin/uv), `npm`, `bun` | `which uv npm bun` |
| **Claude CLI** | 2.1.245 (Claude Code) | `/Users/atharvpaharia100/.local/bin/claude --version` |
| **Get-Shit-Done (GSD)** | Version installed in `~/.gemini/antigravity/get-shit-done` | `ls ~/.gemini/antigravity/get-shit-done/` |

---

## 3. Discovered Capabilities & Interfaces

### 3.1 Antigravity Python SDK (`google-antigravity`)
- **Package:** `google-antigravity==0.1.16` installable via PyPI.
- **Runtime Binary:** Packages platform-specific `localharness` binary (Mach-O 64-bit executable arm64, 116,847,666 bytes).
- **Core Abstractions:**
  - `Agent(config: AgentConfig)`: Asynchronous context manager.
  - `LocalAgentConfig`: Configures workspace roots, capabilities, policies, system instructions, and models.
  - `CapabilitiesConfig`: Controls enabled/disabled tools, subagents, and compaction thresholds.
  - `policy.allow_all()`: Grants non-interactive execution for all tools including shell commands (`run_command`).
  - `ChatResponse`: Emits tokens, `.thoughts`, `.tool_calls`, `.usage_metadata`, and `.stop_reason`.
- **Tools Built Into Harness:**
  `CREATE_FILE`, `EDIT_FILE`, `FIND_FILE`, `FINISH`, `GENERATE_IMAGE`, `LIST_DIR`, `READ_URL_CONTENT`, `RUN_COMMAND`, `SEARCH_DIR`, `SEARCH_WEB`, `START_SUBAGENT`, `VIEW_FILE`, `ASK_QUESTION`.

### 3.2 Agent API CLI (`agentapi`)
- **Location:** `~/.gemini/antigravity/bin/agentapi`
- **Subcommands:**
  1. `get-conversation-metadata <conversation_id>`: Returns JSON containing workspace paths, git roots, creation timestamps, and experiment configurations.
  2. `send-message <recipient_id> <content>`: Sends a high-priority reactive message to an active conversation ID.
  3. `new-conversation [--model=<flash_lite|flash|pro>] <prompt>`: Initiates a new conversation cascade.

### 3.3 Event Logs & Trajectory Streams
- **Location:** `<appDataDir>/brain/<conversation-id>/.system_generated/logs/`
- **Files:**
  - `transcript.jsonl`: Compact line-delimited JSON of all steps.
  - `transcript_full.jsonl`: Untruncated full-fidelity step logs.
- **Entry Structure:**
  ```json
  {
    "step_index": 158,
    "source": "MODEL",
    "type": "PLANNER_RESPONSE",
    "status": "DONE",
    "created_at": "2026-09-06T20:29:16Z",
    "tool_calls": [
      {
        "name": "run_command",
        "args": { "CommandLine": "..." }
      }
    ]
  }
  ```

### 3.4 Changed Files & Artifacts Detection
- **Git State:** Running `git status --porcelain` and `git diff` on the target workspace provides the ground truth of code alterations.
- **Tool Calls in Transcript:** Any `write_to_file`, `replace_file_content`, or `edit_file` event in `transcript.jsonl` contains the absolute path in `TargetFile`.
- **Artifacts:** Output documents and plans are written to `<appDataDir>/brain/<conversation-id>/`.

### 3.5 Terminal Execution & Browser Automation
- Terminal execution is natively supported via `run_command`.
- Browser operation is supported via `browser_subagent` and Chrome DevTools MCP.
- MCP is supported via `mcp_config.json`.

---

## 4. Architectural Comparison: Integration Options

| Mechanism | Reliability | Autonomy | Observability | Overhead | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Python SDK (`Agent`)** | **Highest** (native API) | Full (headless) | Direct async events & tool calls | Low (spawns localharness) | **Primary Headless Driver** |
| **Live Session IPC (`agentapi` + `transcript.jsonl`)** | **High** (direct socket/gRPC) | Full (in-situ) | Live JSONL tailing | Minimal | **Primary In-Situ Driver** |
| **Language Server gRPC Direct** | Medium (private proto) | High | Rich | High (requires proto compilation) | Future optimization |
| **Browser / DOM Automation** | **Lowest** (brittle, UI shifts) | Poor | Cluttered | Heavy (CDP/Playwright) | **Strictly Disallowed** |

---

## 5. Recommended Integration Strategy

We implement a **Hybrid Pluggable Agent Adapter (`AntigravityAdapter`)**:

1. **`HeadlessSdkExecutor`**: Uses `google.antigravity.Agent` with `LocalAgentConfig(policies=[policy.allow_all()])`. Spawns the native Go `localharness` runtime directly, communicates over WebSocket, and captures tokens, thoughts, and tool executions. This provides 100% headless, testable, standalone execution.
2. **`LiveSessionExecutor`**: Uses `agentapi send-message` and reads `<appDataDir>/brain/<conversation_id>/.system_generated/logs/transcript.jsonl`. Ideal when controlling an active Antigravity session or running as an Antigravity Sidecar.
3. **`MockAgentExecutor`**: For unit tests, CI pipelines without API keys, and dry-run demonstrations.

### Completion Detection Strategy
Do not rely solely on the agent stating "I'm done":
- In SDK mode: Wait for `response.resolve()`, inspect `response.stop_reason`, and parse tool calls.
- In Live Session mode: Monitor `transcript.jsonl` until a `PLANNER_RESPONSE` step with status `DONE` is emitted and no background tasks are pending.
- In all modes: Capture Git diff (`git status --porcelain`, `git diff`) as required proof of changes.

---

## 6. Reviewer Integration Strategy

The Senior Engineer / Reviewer evaluates **evidence**, never assumptions:
- **Input Context:** Original task requirements, acceptance criteria, Git diff (`diff.patch`), verification output (unit tests, linter, build status), and agent execution summary.
- **Output Schema:** Structured JSON adhering to:
  ```json
  {
    "decision": "PASS | FAIL | BLOCKED",
    "confidence": 0.95,
    "summary": "...",
    "issues": [
      {
        "severity": "critical | major | minor",
        "category": "functional | visual | architecture | security | performance | testing",
        "description": "...",
        "evidence": "...",
        "required_fix": "..."
      }
    ],
    "next_prompt": "..."
  }
  ```
- **Reviewer Implementations:**
  - `ClaudeReviewer`: Interacts via Anthropic API / Claude Code CLI (`claude -p`).
  - `OpenAIReviewer`: Interacts via OpenAI API (`gpt-4o` / `o3-mini`).
  - `DeterministicRuleReviewer`: Evaluates verification results deterministically (e.g. test exit codes, lint reports, diff presence).
  - `MockReviewer`: Returns predetermined responses for automated testing of pass/fail/retry loops.

---

## 7. Limitations, Risks & Fallback Strategy

1. **Quota / API Key Availability:**
   - *Risk:* Claude CLI showed `402 Budget pool quota has been exhausted` during discovery.
   - *Mitigation:* The orchestrator must seamlessly fallback between Claude, OpenAI, and Deterministic/Mock reviewers. Configurable via `--reviewer` flag or environment variables.
2. **File Policy & Sandboxing:**
   - *Risk:* Default Antigravity policies require confirmation for destructive shell commands.
   - *Mitigation:* Configured in `LocalAgentConfig` with `policies=[policy.allow_all()]` for workspace targets, and trusted verification commands from project configuration.
3. **Infinite Retry Prevention:**
   - *Risk:* Agent and Reviewer get stuck in continuous corrective loops.
   - *Mitigation:* Explicit `max_attempts` per task (default 3), global runtime limits, and `BLOCKED` state requiring human intervention.
