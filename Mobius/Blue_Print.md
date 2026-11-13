<!-- PRINT-PAGE: 1 -->

# Möbius Architecture & Engineering Handbook

**Implementation edition 1.0 · 13 July 2026**

Möbius is a privacy-first browser loop station controlled through UI, keyboard, and optional facial gestures. It records, loops, overdubs, undoes, clears, saves, and restores local sessions without a backend.

**Reader contract.** This is the build contract for an IDE or coding agent. **MUST** is mandatory; **SHOULD** is the default unless superseded by an ADR; **MAY** is optional. It consolidates the supplied blueprint, expanded specification, and research plan.

> Markdown has no intrinsic page size. The 300 PRINT-PAGE folios are a manuscript layout for Pandoc/typical print tooling; physical pagination changes with paper, font, diagram renderer, and code wrapping.

**North star:** the audio engine owns musical time; every other subsystem requests actions through commands.

\newpage

<!-- PRINT-PAGE: 2 -->

# Contents and use

| Volume | Focus | Folios |
|---|---|---:|
| I | Product, SRS, operating model | 1–30 |
| II | Architecture, C4, UML, patterns | 31–90 |
| III | Audio engine and timing | 91–130 |
| IV | Gesture engine and calibration | 131–170 |
| V | UI, state, accessibility | 171–200 |
| VI | TypeScript contracts and data | 201–240 |
| VII | Testing, CI, performance | 241–265 |
| VIII | AI coding constitution | 266–280 |
| IX | Delivery, roadmap, operations | 281–300 |

Start with Volumes I–II. Implement in Volume IX order. Mermaid blocks are source diagrams and should render in GitHub or a Mermaid-enabled IDE.

\newpage

<!-- PRINT-PAGE: 3 -->

# Architecture invariants

- One AudioContext exists per app session and is created/resumed only after user activation.
- Only audio code reads the sample clock or schedules audio.
- UI and gesture code NEVER call a worklet or mutate audio buffers directly.
- Gesture recognition emits a command proposal, never a loop transition.
- LoopController serializes commands and solely owns the loop state machine.
- Render paths allocate no objects, arrays, closures, promises, logging, or storage work per quantum.
- Persistent writes are asynchronous and never occur on the audio rendering path.
- All public boundaries are typed; any and cross-feature imports are prohibited.
- Commands are idempotent at their target state or return a typed rejection.
- Camera and microphone bytes remain on-device; network is not a runtime dependency.

\newpage

<!-- PRINT-PAGE: 4 -->

# Decision record index

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | React + TypeScript + Vite shell | Accepted |
| ADR-002 | AudioWorklet for real-time processing | Accepted |
| ADR-003 | Controller-owned deterministic state machine | Accepted |
| ADR-004 | MediaPipe Face Landmarker behind worker adapter | Accepted |
| ADR-005 | IndexedDB repositories for local persistence | Accepted |
| ADR-006 | Zustand as UI projection, not audio authority | Accepted |
| ADR-007 | Command gateway for every intent | Accepted |
| ADR-008 | PWA shell after core audio stability | Proposed |

\newpage

<!-- PRINT-PAGE: 5 -->

# Vision and scope

Möbius replaces a hardware loop pedal for a solo musician using a laptop, audio I/O, keyboard, and optionally webcam gestures. The initial release is local-only and loop-centric.

**In scope:** mono/stereo input capture, first-loop recording, playback, overdub, undo, clear, metronome/count-in, volume controls, named local sessions, gesture calibration, keyboard parity, errors, and offline shell.

**Out of scope (v1):** cloud accounts, collaboration, DAW hosting, arbitrary plugins, MIDI I/O, multi-device sync, and automatic tempo as a source of truth.

\newpage

<!-- PRINT-PAGE: 6 -->

# Personas and use cases

| Persona | Job | Failure they will not tolerate |
|---|---|---|
| Performing musician | Build loop without breaking flow | late or false record/stop |
| Practice musician | Save ideas and replay them | lost session after reload |
| Accessibility-first user | Operate without camera | gesture-only controls |
| Developer | Extend bounded module safely | timing leaked into UI |

~~~mermaid
flowchart LR
Musician([Musician]) -->|keyboard / UI / optional gesture| App[Möbius]
Camera[Webcam] -->|frames| App
Input[Mic / interface] -->|audio stream| App
App -->|audio| Output[Headphones / speakers]
App -->|sessions/settings| IDB[(IndexedDB)]
~~~

\newpage

<!-- PRINT-PAGE: 7 -->

# Functional requirements

| ID | The system shall |
|---|---|
| FR-001 | Acquire microphone after explicit activation and permission. |
| FR-002 | Record a first loop and transition to seamless playback. |
| FR-003 | Overdub a layer aligned to existing loop timeline. |
| FR-004 | Undo the most recently committed layer. |
| FR-005 | Clear current session using a confirmation policy. |
| FR-006 | Provide equivalent pointer and keyboard inputs for every gesture action. |
| FR-007 | Offer metronome/count-in/tempo/quantization/level/mute/solo. |
| FR-008 | Save/list/load/rename/duplicate/delete local sessions. |
| FR-009 | Offer mapping/calibration/enable-disable/confidence/cooldown for gestures. |
| FR-010 | Report meaningful audio/camera/storage/browser errors. |

A requirement is complete only when an automated or documented acceptance test exists.

\newpage

<!-- PRINT-PAGE: 8 -->

# Non-functional requirements and budgets

| ID | Constraint |
|---|---|
| NFR-001 | No network service is required after assets are installed. |
| NFR-002 | At 48kHz, 128 frames equals 2.667ms; processing preserves headroom within that deadline. |
| NFR-003 | Command-to-UI acknowledgement target ≤100ms; audio scheduling uses audio time. |
| NFR-004 | Gesture sampling target is 30fps; overload degrades gesture cadence before audio. |
| NFR-005 | Camera/audio content does not leave device. |
| NFR-006 | Core controls support keyboard and screen reader. |
| NFR-007 | Secure context is required for media/worklet paths. |
| NFR-008 | Schemas migrate forward without silent data loss. |

Latency is measured, not assumed: record device I/O, graph latency, render time, and command quantization separately.

\newpage

<!-- PRINT-PAGE: 9 -->

# C4: context and containers

~~~mermaid
flowchart TB
UI[React UI intent + projection] --> LC[LoopController command serialization]
Gesture[Gesture worker MediaPipe adapter] -->|CommandProposal| LC
Keyboard[Keyboard mapper] -->|CommandProposal| LC
LC --> AE[Audio Facade + Worklet authoritative clock]
LC --> Store[Zustand UI projection]
UI <--> Store
LC --> Repo[IndexedDB repositories]
AudioIn[Audio input] --> AE
Camera --> Gesture
AE --> Out[Audio output]
~~~

UI projection may lag audio events; it must never become a second transport authority.

\newpage

<!-- PRINT-PAGE: 10 -->

# Component responsibility map

| Component | Owns | May call | Must not call |
|---|---|---|---|
| React view | display and intent capture | view model, command gateway | audio/IndexedDB |
| LoopController | queue and transitions | audio facade, repositories, store adapter | MediaPipe internals |
| Audio facade | graph/worklet protocol | AudioContext/worklet node | React/Zustand |
| Worklet | sample transform/mix/playhead | typed buffers/port | DOM, IndexedDB, fetch |
| Gesture worker | landmarks to proposal | worker adapter/output port | controller/audio |
| Repository | durable records/migrations | IndexedDB | audio renderer |

\newpage

<!-- PRINT-PAGE: 11 -->

# Package structure

~~~mermaid
flowchart LR
app --> controllers
app --> components
components --> stores
controllers --> audio
controllers --> gesture
controllers --> storage
audio --> contracts
gesture --> contracts
controllers --> contracts
components --> contracts
contracts -.no imports.-> app
~~~

~~~text
src/{app,contracts,controllers,audio,gesture,storage,stores,components,services,tests}
~~~

\newpage

<!-- PRINT-PAGE: 12 -->

# Loop state machine

~~~mermaid
stateDiagram-v2
[*] --> Idle
Idle --> Armed: arm / countIn
Armed --> Recording: recordBoundary
Armed --> Idle: cancel
Recording --> Playing: commitFirstLayer
Recording --> Idle: discard
Playing --> Overdubbing: overdubBoundary
Overdubbing --> Playing: commitLayer
Overdubbing --> Playing: cancelLayer
Playing --> Idle: clearCommitted
Playing --> Paused: pause
Paused --> Playing: resume
~~~

Invalid transitions return INVALID_TRANSITION; handlers never improvise state changes.

\newpage

<!-- PRINT-PAGE: 13 -->

# Command lifecycle

~~~mermaid
sequenceDiagram
participant Source as UI/Keyboard/Gesture
participant Gate as CommandGateway
participant LC as LoopController
participant AE as AudioFacade
participant Store as UI Store
Source->>Gate: CommandProposal
Gate->>Gate: validate + assign id
Gate->>LC: execute(command)
LC->>LC: validate policy/state
LC->>AE: schedule(effect, audioTime)
AE-->>LC: AudioEvent(ack/commit)
LC->>Store: publish ViewState
LC-->>Source: CommandResult
~~~

Commands include ID, origin, requested time, payload, and trace context. Log intent, decision, and resulting event.

\newpage

<!-- PRINT-PAGE: 14 -->

# Design patterns

| Pattern | Where | Why | Guardrail |
|---|---|---|---|
| Facade | AudioFacade | hides Web Audio/worklet protocol | no domain policy |
| Command | all inputs | uniform queue/auditability | no direct mutation |
| State | LoopController | legal transitions explicit | state not inferred from UI |
| Observer | UI store/events | decoupled projection | events are facts, not commands |
| Strategy | classifier/quantizer | replaceable algorithms | typed input/output |
| Factory | adapter creation | environment-specific creation | composition root only |
| Singleton bounded | audio session | one hardware graph | inject port in tests |

\newpage

<!-- PRINT-PAGE: 15 -->

# Audio architecture

~~~mermaid
flowchart LR
Media[MediaStreamAudioSource] --> InputGain --> MeterIn --> Worklet[LoopProcessor 128-frame blocks]
Worklet --> MasterGain --> Limiter --> Destination
Metro[Metronome] --> MasterGain
Worklet <-->|MessagePort telemetry/control| Facade[AudioFacade]
Facade --> Controller[LoopController]
~~~

Graph is built once. Metering is low-rate telemetry. Persistence/export copies data outside render.

\newpage

<!-- PRINT-PAGE: 16 -->

# Audio timing model

The sample frame is authoritative. Controller maps a wall-time command to a target frame using current audio time, quantization, loop length, and transport state. Worklet applies effect at that frame and acknowledges it.

At 48,000Hz: 128 frames = 2.667ms; 256 = 5.333ms. These are render-quantum deadlines, not device end-to-end promises. Record base/output latency where available, render cost, dropout count, and command-to-commit time.

\newpage

<!-- PRINT-PAGE: 17 -->

# AudioWorklet processor rules

- Preallocate ring buffers and scratch arrays before rendering.
- Use indexed loops over typed arrays; no map/reduce/spread/object creation/console logging in process().
- Batch configuration and low-rate meters; apply control at frame boundary.
- Store boundaries as integer frame counts, not accumulated seconds.
- Treat worklet messages as asynchronous events.
- Define record-overflow policy before recording.
- Keep layer gain/mute/solo in compact typed state.

\newpage

<!-- PRINT-PAGE: 18 -->

# Recording and overdub algorithm

1. Validate RECORD/OVERDUB against current phase.
2. Calculate target frame.
3. Send schedule command with ID and target.
4. Begin input write on target.
5. First recording establishes positive loopFrames.
6. Commit immutable layer metadata.
7. Overdub produces a layer exactly loopFrames long and wraps modulo loop length.
8. Mix enabled layers, apply master gain and limiter.
9. Undo only affects highest committed layer.

\newpage

<!-- PRINT-PAGE: 19 -->

# Audio buffer model

~~~mermaid
erDiagram
SESSION ||--o{ LAYER : owns
LAYER ||--|| PCM_ASSET : references
SESSION { string id PK int sampleRate int loopFrames }
LAYER { string id PK int order float gain boolean muted }
PCM_ASSET { string id PK string codec int channels int frames }
~~~

Runtime PCM is planar Float32Array per layer. Persist versioned blobs and metadata, not live AudioBuffer as a domain model.

\newpage

<!-- PRINT-PAGE: 20 -->

# Metronome and quantization

Tempo uses BPM. Beat frames are sampleRate * 60 / bpm, accumulated rationally to avoid drift. Modes: OFF, BEAT, BAR, LOOP. Default time signature is 4/4, stored with session. Count-in creates click events before transport start. UI shows queued immediately and committed only after audio acknowledgement.

\newpage

<!-- PRINT-PAGE: 21 -->

# Gesture architecture

~~~mermaid
flowchart LR
Cam[Camera stream] --> Frame[Frame sampler] --> Worker[Gesture Worker]
Worker --> MP[Face Landmarker adapter] --> Features[Normalized features]
Features --> Smooth[Smoothing + baseline] --> Classify[Classifier strategy]
Classify --> Hold[Hold duration] --> Cooldown[Cooldown/arbitration]
Cooldown --> Proposal[CommandProposal] --> Controller[LoopController]
~~~

Gesture is an optional producer. Its delay/failure cannot block audio or keyboard.

\newpage

<!-- PRINT-PAGE: 22 -->

# Gesture feature and classifier

Features: eye/mouth aspect ratios, brow distance, head pitch/yaw/roll, face presence, quality, timestamp. Normalize against face scale and user baseline. A classifier returns candidate+confidence, never a command. Hold requires sustained confidence. Cooldown/arbitration emits at most one proposal. Loss of face/quality resets transient hold.

\newpage

<!-- PRINT-PAGE: 23 -->

# Calibration protocol

1. Explain local-only processing and request camera.
2. Verify one stable face/light; capture neutral baseline for 2–3 seconds.
3. Guide repeated gestures; reject poor samples.
4. Derive thresholds and preview without triggering.
5. Confirm, version, store, and provide reset.
6. Show minimal confidence/armed indicator in performance mode.

Store features/thresholds, not raw video.

\newpage

<!-- PRINT-PAGE: 24 -->

# Gesture safety policy

| Rule | Policy |
|---|---|
| Ambiguous candidate | reject |
| Face lost | reset hold, show unavailable |
| Multiple faces | pause by default |
| Repeat candidate | cooldown blocks re-fire |
| CLEAR | strong gesture plus confirmation, or keyboard/pointer confirmation |
| Low FPS | show reduced responsiveness |
| Camera denied | keyboard/UI remain fully operable |

\newpage

<!-- PRINT-PAGE: 25 -->

# UI and state model

Performance screen regions: dominant transport state; loop/layer state; I/O meters; primary controls; optional gesture diagnostic. Controls distinguish **queued** from **committed**.

~~~typescript
type AppStore = { loop: LoopViewState; audio: AudioTelemetry; gesture: GestureViewState; settings: SettingsViewState; diagnostics: DiagnosticsViewState; replaceFromDomain(event: DomainEvent): void; };
// React reads narrow selectors. Controller/audio never read this store.
~~~

Zustand is UI projection only. Throttle meters before publish.

\newpage

<!-- PRINT-PAGE: 26 -->

# Accessibility and keyboard map

| Action | Default | Requirement |
|---|---|---|
| Record/stop | Space | announced state |
| Overdub | O | announced queued/committed |
| Undo | Ctrl/Cmd+Z | feedback |
| Clear | Shift+Backspace | confirmation |
| Metronome | M | persistent toggle |
| Settings | , | modal focus management |

Use semantic controls, visible focus, contrast-tested text+color/icon status, and polite live regions. Gesture-free onboarding is primary.

\newpage

<!-- PRINT-PAGE: 27 -->

# Persistence architecture

IndexedDB is the local structured/blob store. Separate small indexable session metadata from large PCM assets. Repository is the sole storage boundary and returns domain values plus typed errors. Quota/eviction varies by browser: catch failure, preserve memory state, and offer export.

\newpage

<!-- PRINT-PAGE: 28 -->

# IndexedDB schema

~~~typescript
// Database: mobius, version 1
sessions: keyPath id; indexes updatedAt, nameLower
layers: keyPath id; indexes sessionId, [sessionId, order]
assets: keyPath id; indexes checksum, createdAt
settings: keyPath key
calibrations: keyPath id; indexes updatedAt
exports: keyPath id; indexes sessionId, createdAt
~~~

All records carry schemaVersion, createdAt, updatedAt, UUID. Deletion is transactional or tombstoned/recoverable.

\newpage

<!-- PRINT-PAGE: 29 -->

# Core TypeScript contracts

~~~typescript
export type LoopPhase = "idle"|"armed"|"recording"|"playing"|"overdubbing"|"paused";
export type CommandKind = "RECORD"|"STOP"|"OVERDUB"|"UNDO"|"CLEAR"|"PAUSE"|"RESUME";
export interface Command { id:string; kind:CommandKind; origin:"ui"|"keyboard"|"gesture"|"system"; requestedAtMs:number; quantize:QuantizeMode; payload?:Record<string,unknown>; }
export interface CommandResult { commandId:string; status:"accepted"|"rejected"|"committed"; reason?:RejectReason; targetFrame?:number; }
export interface LoopSnapshot { phase:LoopPhase; loopFrames:number|null; sampleRate:number; layers:readonly LayerMeta[]; transportFrame:number; }
export interface AudioFacade { initialize(input:MediaStream):Promise<void>; schedule(effect:AudioEffect):Promise<void>; dispose():Promise<void>; }
export interface GestureEngine { initialize():Promise<void>; start():Promise<void>; stop():Promise<void>; calibrate():Promise<Calibration>; onProposal(l:(p:CommandProposal)=>void):Unsubscribe; }
export interface SessionRepository { save(s:Session):Promise<void>; get(id:string):Promise<Session|null>; list():Promise<SessionSummary[]>; remove(id:string):Promise<void>; }
~~~

\newpage

<!-- PRINT-PAGE: 30 -->

# Worklet protocol

~~~typescript
type MainToWorklet = {type:"init";config:ProcessorConfig}|{type:"schedule";commandId:string;effect:AudioEffect;targetFrame:number}|{type:"set-layer";layerId:string;gain?:number;muted?:boolean;solo?:boolean}|{type:"dispose"};
type WorkletToMain = {type:"ready";sampleRate:number}|{type:"commit";commandId:string;event:AudioCommit}|{type:"telemetry";data:AudioTelemetry}|{type:"fault";fault:AudioFault};
~~~

Validate both ends; unknown types/versions fail closed. Transfer buffers only at safe handoff points.

\newpage

<!-- PRINT-PAGE: 31 -->

# Error taxonomy

| Code | Meaning | Recovery |
|---|---|---|
| PERMISSION_DENIED | mic/camera denied | explain; keep keyboard UI |
| AUDIO_INIT_FAILED | graph/worklet unavailable | retry after activation; show details |
| DEVICE_CHANGED | topology changed | pause safely; reinitialize |
| INVALID_TRANSITION | illegal command | show current availability |
| GESTURE_UNAVAILABLE | camera/model/tracking failed | disable gesture producer only |
| STORAGE_QUOTA | save failed | preserve runtime; export/manage storage |
| SCHEMA_MIGRATION | incompatible persisted version | backup then migrate/safe reset |

\newpage

<!-- PRINT-PAGE: 32 -->

# Security and privacy

- Use HTTPS and restrictive CSP; no eval or unreviewed remote scripts.
- Request media only after clear activation; stop tracks when disabled.
- No media, landmarks, sessions, or telemetry leave device in v1.
- IndexedDB follows same-origin policy but is not defense against compromised origin.
- Pin/review model and dependency versions; maintain licenses.
- Validate import size/schema/IDs/binary metadata.
- Never ship client secrets; v1 has no account/backend.

\newpage

<!-- PRINT-PAGE: 33 -->

# Test strategy

| Layer | Target | Examples |
|---|---|---|
| Unit | pure logic | transitions, quantizer, features |
| Contract | boundaries | worklet messages, repository |
| Integration | composition | controller/facade commit, migration |
| Offline audio | deterministic DSP | wrap/mix/gain/layer length |
| Browser E2E | journeys | keyboard record/undo/save |
| Manual device | hardware | latency, switches, lighting |

Test invariants; use fakes at ports, not mocks that prove nothing.

\newpage

<!-- PRINT-PAGE: 34 -->

# Critical acceptance scenarios

- First recording commits one layer and repeats at loopFrames without invalid index.
- Overdub is exactly loopFrames and prior content remains unchanged.
- UNDO removes newest committed layer; none yields typed no-op/rejection.
- CLEAR follows confirmation policy.
- Duplicate/stale command ID cannot create a second layer.
- Gesture and keyboard use same controller path.
- Reload reproduces metadata/order/assets.
- Storage failure does not crash transport.
- Supported-device telemetry demonstrates render budget under target load.

\newpage

<!-- PRINT-PAGE: 35 -->

# CI/CD

~~~yaml
name: verify
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run format:check
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit -- --coverage
      - run: npm run test:integration
      - run: npm run build
~~~

Add Playwright E2E as a separate job. Device/performance testing remains scheduled/manual; virtual CI audio is not certification.

\newpage

<!-- PRINT-PAGE: 36 -->

# AI coding constitution

- Read the relevant contract and invariant before changing code.
- Make the smallest coherent change; do not refactor unrelated modules.
- Never bypass controller to make UI/gesture work.
- Do not move worklet work to main thread as a debugging shortcut.
- Preserve ports; add adapter rather than cross-layer import.
- Add/update tests for transitions, contracts, migrations, and bugs.
- Persistence change means migration plus prior-fixture test.
- Document platform conflicts through ADR and graceful fallback.
- Use measurements for latency/accuracy claims.
- Keep diagrams, contracts, tests, and implementation synchronized.

\newpage

<!-- PRINT-PAGE: 37 -->

# Delivery roadmap

~~~mermaid
gantt
title Möbius delivery sequence
dateFormat YYYY-MM-DD
section Foundation
Contracts and scaffold :a1, 2026-07-14, 5d
State machine + keyboard :a2, after a1, 5d
section Audio
Graph + protocol :a3, after a2, 10d
Record/play/overdub/undo :a4, after a3, 12d
section Product
Storage + session UX :a5, after a4, 7d
Gesture + calibration :a6, after a5, 12d
section Harden
Accessibility, QA, PWA :a7, after a6, 10d
~~~

Do not add gestures before keyboard transport and audio state acceptance pass.

\newpage

<!-- PRINT-PAGE: 38 -->

# Risk register and runbook

| Risk | Signal | Mitigation |
|---|---|---|
| high device latency | measurements | guidance, buffer selection, diagnostics |
| glitches | render/dropout telemetry | preallocate, simplify DSP, layer limits |
| false gestures | candidate/rejection log | calibration, hold/cooldown |
| quota/eviction | failed save | export, storage UX |
| API variance | init failures | compatibility gate/adapters |

Before performance: select devices, check levels, test keyboard record/undo, optionally enable gestures, save known-good session. If save fails, do not reload; preserve runtime and export.

\newpage

<!-- PRINT-PAGE: 39 -->

# References

Platform claims must be rechecked against primary documentation during implementation:

- [MDN: AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [W3C: Web Audio API 1.1](https://www.w3.org/TR/webaudio-1.1/)
- [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Google: MediaPipe Face Landmarker for Web](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)

References inform design; they are not production runtime dependencies.

\newpage

<!-- PRINT-PAGE: 40 -->

# Implementation dossier 040: Requirements traceability

**Control ID:** REQ-TRACE-01

**Objective.** Map each requirement to module, test ID, and release evidence. Code compilation is not completion.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 41 -->

# Implementation dossier 041: Transport transition

**Control ID:** FSM-01

**Objective.** Assert phase, scheduled effect, audio event, and published view state for one transition.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 42 -->

# Implementation dossier 042: Audio render budget

**Control ID:** AUDIO-PERF-01

**Objective.** Benchmark maximum supported layer count; capture p50/p95/max cost and qualify devices by deadline.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 43 -->

# Implementation dossier 043: Worklet message validation

**Control ID:** WORKLET-PROTO-01

**Objective.** Reject malformed, unknown-version, and stale messages on both protocol ends.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 44 -->

# Implementation dossier 044: First-loop boundary

**Control ID:** LOOP-BOUNDARY-01

**Objective.** Specify immediate/beat/bar/cancel policy and test all boundaries.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 45 -->

# Implementation dossier 045: Overdub integrity

**Control ID:** LAYER-INTEGRITY-01

**Objective.** Confirm old samples stay bit-identical after a new layer is committed.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 46 -->

# Implementation dossier 046: Undo policy

**Control ID:** UNDO-01

**Objective.** Target newest committed layer only; expose unavailable state clearly.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 47 -->

# Implementation dossier 047: Clear policy

**Control ID:** CLEAR-01

**Objective.** Clear is destructive: confirm and emit auditable event.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 48 -->

# Implementation dossier 048: Metronome timing

**Control ID:** METRO-01

**Objective.** Use audio frames and rational beat accumulation; UI animation is non-authoritative.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 49 -->

# Implementation dossier 049: Device recovery

**Control ID:** DEVICE-01

**Objective.** Pause safely on topology change and require explicit reinitialization.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 50 -->

# Implementation dossier 050: Camera capture

**Control ID:** CAMERA-01

**Objective.** Adapter owns track lifecycle; stop tracks when gesture mode is off.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 51 -->

# Implementation dossier 051: Feature normalization

**Control ID:** FEATURES-01

**Objective.** Normalize face-derived measures against scale and baseline.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 52 -->

# Implementation dossier 052: Classifier arbitration

**Control ID:** GESTURE-ARB-01

**Objective.** Overlap means no action unless explicit priority evidence exists.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 53 -->

# Implementation dossier 053: Hold gate

**Control ID:** GESTURE-HOLD-01

**Objective.** Start hold above threshold; reset on confidence loss; test timestamps.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 54 -->

# Implementation dossier 054: Cooldown gate

**Control ID:** GESTURE-COOLDOWN-01

**Objective.** Committed gesture locks mapping until expiry.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 55 -->

# Implementation dossier 055: Calibration storage

**Control ID:** CALIBRATION-01

**Objective.** Persist thresholds/version/quality, never raw frames.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 56 -->

# Implementation dossier 056: Keyboard parity

**Control ID:** INPUT-PARITY-01

**Objective.** All gesture actions have keyboard/pointer route to same gateway.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 57 -->

# Implementation dossier 057: UI projection

**Control ID:** UI-PROJECTION-01

**Objective.** Delayed UI events cannot alter controller state.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 58 -->

# Implementation dossier 058: Store selectors

**Control ID:** STORE-01

**Objective.** Meters do not rerender unrelated controls.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 59 -->

# Implementation dossier 059: Session save

**Control ID:** SAVE-01

**Objective.** Failure leaves prior durable state or recoverable draft.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 60 -->

# Implementation dossier 060: Migration

**Control ID:** MIGRATION-01

**Objective.** Explicit idempotent migration from every supported fixture.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 61 -->

# Implementation dossier 061: Import validation

**Control ID:** IMPORT-01

**Objective.** Limit and validate untrusted sessions before opening assets.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 62 -->

# Implementation dossier 062: Export integrity

**Control ID:** EXPORT-01

**Objective.** Manifest/version/checksum; round-trip test.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 63 -->

# Implementation dossier 063: Fault reporting

**Control ID:** FAULTS-01

**Objective.** Stable code plus actionable detail; preserve diagnostics.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 64 -->

# Implementation dossier 064: Observability

**Control ID:** OBSERVABILITY-01

**Objective.** Command/transition/audio config timing with no media content.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 65 -->

# Implementation dossier 065: Browser support

**Control ID:** COMPATIBILITY-01

**Objective.** Gate media, worklet, IndexedDB, worker/model prerequisites.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 66 -->

# Implementation dossier 066: Accessibility

**Control ID:** A11Y-01

**Objective.** Test keyboard, focus, announcements, contrast and explanations.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 67 -->

# Implementation dossier 067: Performance regression

**Control ID:** REGRESSION-01

**Objective.** Compare checked-in representative benchmark baseline.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 68 -->

# Implementation dossier 068: Security review

**Control ID:** SECURITY-01

**Objective.** Check CSP, deps, permissions, imports, no egress.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 69 -->

# Implementation dossier 069: Release gate

**Control ID:** RELEASE-01

**Objective.** Require quality/tests/build/E2E/manual device checklist.

**Delivery lens.** Architecture: define the port, ownership, data lifecycle, and forbidden dependencies before writing behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 70 -->

# Implementation dossier 070: Requirements traceability

**Control ID:** REQ-TRACE-02

**Objective.** Map each requirement to module, test ID, and release evidence. Code compilation is not completion.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 71 -->

# Implementation dossier 071: Transport transition

**Control ID:** FSM-02

**Objective.** Assert phase, scheduled effect, audio event, and published view state for one transition.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 72 -->

# Implementation dossier 072: Audio render budget

**Control ID:** AUDIO-PERF-02

**Objective.** Benchmark maximum supported layer count; capture p50/p95/max cost and qualify devices by deadline.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 73 -->

# Implementation dossier 073: Worklet message validation

**Control ID:** WORKLET-PROTO-02

**Objective.** Reject malformed, unknown-version, and stale messages on both protocol ends.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 74 -->

# Implementation dossier 074: First-loop boundary

**Control ID:** LOOP-BOUNDARY-02

**Objective.** Specify immediate/beat/bar/cancel policy and test all boundaries.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 75 -->

# Implementation dossier 075: Overdub integrity

**Control ID:** LAYER-INTEGRITY-02

**Objective.** Confirm old samples stay bit-identical after a new layer is committed.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 76 -->

# Implementation dossier 076: Undo policy

**Control ID:** UNDO-02

**Objective.** Target newest committed layer only; expose unavailable state clearly.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 77 -->

# Implementation dossier 077: Clear policy

**Control ID:** CLEAR-02

**Objective.** Clear is destructive: confirm and emit auditable event.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 78 -->

# Implementation dossier 078: Metronome timing

**Control ID:** METRO-02

**Objective.** Use audio frames and rational beat accumulation; UI animation is non-authoritative.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 79 -->

# Implementation dossier 079: Device recovery

**Control ID:** DEVICE-02

**Objective.** Pause safely on topology change and require explicit reinitialization.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 80 -->

# Implementation dossier 080: Camera capture

**Control ID:** CAMERA-02

**Objective.** Adapter owns track lifecycle; stop tracks when gesture mode is off.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 81 -->

# Implementation dossier 081: Feature normalization

**Control ID:** FEATURES-02

**Objective.** Normalize face-derived measures against scale and baseline.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 82 -->

# Implementation dossier 082: Classifier arbitration

**Control ID:** GESTURE-ARB-02

**Objective.** Overlap means no action unless explicit priority evidence exists.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 83 -->

# Implementation dossier 083: Hold gate

**Control ID:** GESTURE-HOLD-02

**Objective.** Start hold above threshold; reset on confidence loss; test timestamps.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 84 -->

# Implementation dossier 084: Cooldown gate

**Control ID:** GESTURE-COOLDOWN-02

**Objective.** Committed gesture locks mapping until expiry.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 85 -->

# Implementation dossier 085: Calibration storage

**Control ID:** CALIBRATION-02

**Objective.** Persist thresholds/version/quality, never raw frames.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 86 -->

# Implementation dossier 086: Keyboard parity

**Control ID:** INPUT-PARITY-02

**Objective.** All gesture actions have keyboard/pointer route to same gateway.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 87 -->

# Implementation dossier 087: UI projection

**Control ID:** UI-PROJECTION-02

**Objective.** Delayed UI events cannot alter controller state.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 88 -->

# Implementation dossier 088: Store selectors

**Control ID:** STORE-02

**Objective.** Meters do not rerender unrelated controls.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 89 -->

# Implementation dossier 089: Session save

**Control ID:** SAVE-02

**Objective.** Failure leaves prior durable state or recoverable draft.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 90 -->

# Implementation dossier 090: Migration

**Control ID:** MIGRATION-02

**Objective.** Explicit idempotent migration from every supported fixture.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 91 -->

# Implementation dossier 091: Import validation

**Control ID:** IMPORT-02

**Objective.** Limit and validate untrusted sessions before opening assets.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 92 -->

# Implementation dossier 092: Export integrity

**Control ID:** EXPORT-02

**Objective.** Manifest/version/checksum; round-trip test.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 93 -->

# Implementation dossier 093: Fault reporting

**Control ID:** FAULTS-02

**Objective.** Stable code plus actionable detail; preserve diagnostics.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 94 -->

# Implementation dossier 094: Observability

**Control ID:** OBSERVABILITY-02

**Objective.** Command/transition/audio config timing with no media content.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 95 -->

# Implementation dossier 095: Browser support

**Control ID:** COMPATIBILITY-02

**Objective.** Gate media, worklet, IndexedDB, worker/model prerequisites.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 96 -->

# Implementation dossier 096: Accessibility

**Control ID:** A11Y-02

**Objective.** Test keyboard, focus, announcements, contrast and explanations.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 97 -->

# Implementation dossier 097: Performance regression

**Control ID:** REGRESSION-02

**Objective.** Compare checked-in representative benchmark baseline.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 98 -->

# Implementation dossier 098: Security review

**Control ID:** SECURITY-02

**Objective.** Check CSP, deps, permissions, imports, no egress.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 99 -->

# Implementation dossier 099: Release gate

**Control ID:** RELEASE-02

**Objective.** Require quality/tests/build/E2E/manual device checklist.

**Delivery lens.** Implementation: make the smallest vertical slice and leave every effect behind the existing contract.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 100 -->

# Implementation dossier 100: Requirements traceability

**Control ID:** REQ-TRACE-03

**Objective.** Map each requirement to module, test ID, and release evidence. Code compilation is not completion.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 101 -->

# Implementation dossier 101: Transport transition

**Control ID:** FSM-03

**Objective.** Assert phase, scheduled effect, audio event, and published view state for one transition.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 102 -->

# Implementation dossier 102: Audio render budget

**Control ID:** AUDIO-PERF-03

**Objective.** Benchmark maximum supported layer count; capture p50/p95/max cost and qualify devices by deadline.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 103 -->

# Implementation dossier 103: Worklet message validation

**Control ID:** WORKLET-PROTO-03

**Objective.** Reject malformed, unknown-version, and stale messages on both protocol ends.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 104 -->

# Implementation dossier 104: First-loop boundary

**Control ID:** LOOP-BOUNDARY-03

**Objective.** Specify immediate/beat/bar/cancel policy and test all boundaries.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 105 -->

# Implementation dossier 105: Overdub integrity

**Control ID:** LAYER-INTEGRITY-03

**Objective.** Confirm old samples stay bit-identical after a new layer is committed.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 106 -->

# Implementation dossier 106: Undo policy

**Control ID:** UNDO-03

**Objective.** Target newest committed layer only; expose unavailable state clearly.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 107 -->

# Implementation dossier 107: Clear policy

**Control ID:** CLEAR-03

**Objective.** Clear is destructive: confirm and emit auditable event.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 108 -->

# Implementation dossier 108: Metronome timing

**Control ID:** METRO-03

**Objective.** Use audio frames and rational beat accumulation; UI animation is non-authoritative.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 109 -->

# Implementation dossier 109: Device recovery

**Control ID:** DEVICE-03

**Objective.** Pause safely on topology change and require explicit reinitialization.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 110 -->

# Implementation dossier 110: Camera capture

**Control ID:** CAMERA-03

**Objective.** Adapter owns track lifecycle; stop tracks when gesture mode is off.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 111 -->

# Implementation dossier 111: Feature normalization

**Control ID:** FEATURES-03

**Objective.** Normalize face-derived measures against scale and baseline.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 112 -->

# Implementation dossier 112: Classifier arbitration

**Control ID:** GESTURE-ARB-03

**Objective.** Overlap means no action unless explicit priority evidence exists.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 113 -->

# Implementation dossier 113: Hold gate

**Control ID:** GESTURE-HOLD-03

**Objective.** Start hold above threshold; reset on confidence loss; test timestamps.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 114 -->

# Implementation dossier 114: Cooldown gate

**Control ID:** GESTURE-COOLDOWN-03

**Objective.** Committed gesture locks mapping until expiry.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 115 -->

# Implementation dossier 115: Calibration storage

**Control ID:** CALIBRATION-03

**Objective.** Persist thresholds/version/quality, never raw frames.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 116 -->

# Implementation dossier 116: Keyboard parity

**Control ID:** INPUT-PARITY-03

**Objective.** All gesture actions have keyboard/pointer route to same gateway.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 117 -->

# Implementation dossier 117: UI projection

**Control ID:** UI-PROJECTION-03

**Objective.** Delayed UI events cannot alter controller state.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 118 -->

# Implementation dossier 118: Store selectors

**Control ID:** STORE-03

**Objective.** Meters do not rerender unrelated controls.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 119 -->

# Implementation dossier 119: Session save

**Control ID:** SAVE-03

**Objective.** Failure leaves prior durable state or recoverable draft.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 120 -->

# Implementation dossier 120: Migration

**Control ID:** MIGRATION-03

**Objective.** Explicit idempotent migration from every supported fixture.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 121 -->

# Implementation dossier 121: Import validation

**Control ID:** IMPORT-03

**Objective.** Limit and validate untrusted sessions before opening assets.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 122 -->

# Implementation dossier 122: Export integrity

**Control ID:** EXPORT-03

**Objective.** Manifest/version/checksum; round-trip test.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 123 -->

# Implementation dossier 123: Fault reporting

**Control ID:** FAULTS-03

**Objective.** Stable code plus actionable detail; preserve diagnostics.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 124 -->

# Implementation dossier 124: Observability

**Control ID:** OBSERVABILITY-03

**Objective.** Command/transition/audio config timing with no media content.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 125 -->

# Implementation dossier 125: Browser support

**Control ID:** COMPATIBILITY-03

**Objective.** Gate media, worklet, IndexedDB, worker/model prerequisites.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 126 -->

# Implementation dossier 126: Accessibility

**Control ID:** A11Y-03

**Objective.** Test keyboard, focus, announcements, contrast and explanations.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 127 -->

# Implementation dossier 127: Performance regression

**Control ID:** REGRESSION-03

**Objective.** Compare checked-in representative benchmark baseline.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 128 -->

# Implementation dossier 128: Security review

**Control ID:** SECURITY-03

**Objective.** Check CSP, deps, permissions, imports, no egress.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 129 -->

# Implementation dossier 129: Release gate

**Control ID:** RELEASE-03

**Objective.** Require quality/tests/build/E2E/manual device checklist.

**Delivery lens.** Verification: write a deterministic happy-path test plus a boundary/failure-path test with precise assertions.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 130 -->

# Implementation dossier 130: Requirements traceability

**Control ID:** REQ-TRACE-04

**Objective.** Map each requirement to module, test ID, and release evidence. Code compilation is not completion.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 131 -->

# Implementation dossier 131: Transport transition

**Control ID:** FSM-04

**Objective.** Assert phase, scheduled effect, audio event, and published view state for one transition.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 132 -->

# Implementation dossier 132: Audio render budget

**Control ID:** AUDIO-PERF-04

**Objective.** Benchmark maximum supported layer count; capture p50/p95/max cost and qualify devices by deadline.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 133 -->

# Implementation dossier 133: Worklet message validation

**Control ID:** WORKLET-PROTO-04

**Objective.** Reject malformed, unknown-version, and stale messages on both protocol ends.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 134 -->

# Implementation dossier 134: First-loop boundary

**Control ID:** LOOP-BOUNDARY-04

**Objective.** Specify immediate/beat/bar/cancel policy and test all boundaries.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 135 -->

# Implementation dossier 135: Overdub integrity

**Control ID:** LAYER-INTEGRITY-04

**Objective.** Confirm old samples stay bit-identical after a new layer is committed.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 136 -->

# Implementation dossier 136: Undo policy

**Control ID:** UNDO-04

**Objective.** Target newest committed layer only; expose unavailable state clearly.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 137 -->

# Implementation dossier 137: Clear policy

**Control ID:** CLEAR-04

**Objective.** Clear is destructive: confirm and emit auditable event.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 138 -->

# Implementation dossier 138: Metronome timing

**Control ID:** METRO-04

**Objective.** Use audio frames and rational beat accumulation; UI animation is non-authoritative.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 139 -->

# Implementation dossier 139: Device recovery

**Control ID:** DEVICE-04

**Objective.** Pause safely on topology change and require explicit reinitialization.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 140 -->

# Implementation dossier 140: Camera capture

**Control ID:** CAMERA-04

**Objective.** Adapter owns track lifecycle; stop tracks when gesture mode is off.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 141 -->

# Implementation dossier 141: Feature normalization

**Control ID:** FEATURES-04

**Objective.** Normalize face-derived measures against scale and baseline.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 142 -->

# Implementation dossier 142: Classifier arbitration

**Control ID:** GESTURE-ARB-04

**Objective.** Overlap means no action unless explicit priority evidence exists.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 143 -->

# Implementation dossier 143: Hold gate

**Control ID:** GESTURE-HOLD-04

**Objective.** Start hold above threshold; reset on confidence loss; test timestamps.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 144 -->

# Implementation dossier 144: Cooldown gate

**Control ID:** GESTURE-COOLDOWN-04

**Objective.** Committed gesture locks mapping until expiry.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 145 -->

# Implementation dossier 145: Calibration storage

**Control ID:** CALIBRATION-04

**Objective.** Persist thresholds/version/quality, never raw frames.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 146 -->

# Implementation dossier 146: Keyboard parity

**Control ID:** INPUT-PARITY-04

**Objective.** All gesture actions have keyboard/pointer route to same gateway.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 147 -->

# Implementation dossier 147: UI projection

**Control ID:** UI-PROJECTION-04

**Objective.** Delayed UI events cannot alter controller state.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 148 -->

# Implementation dossier 148: Store selectors

**Control ID:** STORE-04

**Objective.** Meters do not rerender unrelated controls.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 149 -->

# Implementation dossier 149: Session save

**Control ID:** SAVE-04

**Objective.** Failure leaves prior durable state or recoverable draft.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 150 -->

# Implementation dossier 150: Migration

**Control ID:** MIGRATION-04

**Objective.** Explicit idempotent migration from every supported fixture.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 151 -->

# Implementation dossier 151: Import validation

**Control ID:** IMPORT-04

**Objective.** Limit and validate untrusted sessions before opening assets.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 152 -->

# Implementation dossier 152: Export integrity

**Control ID:** EXPORT-04

**Objective.** Manifest/version/checksum; round-trip test.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 153 -->

# Implementation dossier 153: Fault reporting

**Control ID:** FAULTS-04

**Objective.** Stable code plus actionable detail; preserve diagnostics.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 154 -->

# Implementation dossier 154: Observability

**Control ID:** OBSERVABILITY-04

**Objective.** Command/transition/audio config timing with no media content.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 155 -->

# Implementation dossier 155: Browser support

**Control ID:** COMPATIBILITY-04

**Objective.** Gate media, worklet, IndexedDB, worker/model prerequisites.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 156 -->

# Implementation dossier 156: Accessibility

**Control ID:** A11Y-04

**Objective.** Test keyboard, focus, announcements, contrast and explanations.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 157 -->

# Implementation dossier 157: Performance regression

**Control ID:** REGRESSION-04

**Objective.** Compare checked-in representative benchmark baseline.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 158 -->

# Implementation dossier 158: Security review

**Control ID:** SECURITY-04

**Objective.** Check CSP, deps, permissions, imports, no egress.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 159 -->

# Implementation dossier 159: Release gate

**Control ID:** RELEASE-04

**Objective.** Require quality/tests/build/E2E/manual device checklist.

**Delivery lens.** Performance: measure this feature under worst expected load and ensure its work cannot displace audio rendering.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 160 -->

# Implementation dossier 160: Requirements traceability

**Control ID:** REQ-TRACE-05

**Objective.** Map each requirement to module, test ID, and release evidence. Code compilation is not completion.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 161 -->

# Implementation dossier 161: Transport transition

**Control ID:** FSM-05

**Objective.** Assert phase, scheduled effect, audio event, and published view state for one transition.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 162 -->

# Implementation dossier 162: Audio render budget

**Control ID:** AUDIO-PERF-05

**Objective.** Benchmark maximum supported layer count; capture p50/p95/max cost and qualify devices by deadline.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 163 -->

# Implementation dossier 163: Worklet message validation

**Control ID:** WORKLET-PROTO-05

**Objective.** Reject malformed, unknown-version, and stale messages on both protocol ends.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 164 -->

# Implementation dossier 164: First-loop boundary

**Control ID:** LOOP-BOUNDARY-05

**Objective.** Specify immediate/beat/bar/cancel policy and test all boundaries.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 165 -->

# Implementation dossier 165: Overdub integrity

**Control ID:** LAYER-INTEGRITY-05

**Objective.** Confirm old samples stay bit-identical after a new layer is committed.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 166 -->

# Implementation dossier 166: Undo policy

**Control ID:** UNDO-05

**Objective.** Target newest committed layer only; expose unavailable state clearly.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 167 -->

# Implementation dossier 167: Clear policy

**Control ID:** CLEAR-05

**Objective.** Clear is destructive: confirm and emit auditable event.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 168 -->

# Implementation dossier 168: Metronome timing

**Control ID:** METRO-05

**Objective.** Use audio frames and rational beat accumulation; UI animation is non-authoritative.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 169 -->

# Implementation dossier 169: Device recovery

**Control ID:** DEVICE-05

**Objective.** Pause safely on topology change and require explicit reinitialization.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 170 -->

# Implementation dossier 170: Camera capture

**Control ID:** CAMERA-05

**Objective.** Adapter owns track lifecycle; stop tracks when gesture mode is off.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 171 -->

# Implementation dossier 171: Feature normalization

**Control ID:** FEATURES-05

**Objective.** Normalize face-derived measures against scale and baseline.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 172 -->

# Implementation dossier 172: Classifier arbitration

**Control ID:** GESTURE-ARB-05

**Objective.** Overlap means no action unless explicit priority evidence exists.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 173 -->

# Implementation dossier 173: Hold gate

**Control ID:** GESTURE-HOLD-05

**Objective.** Start hold above threshold; reset on confidence loss; test timestamps.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 174 -->

# Implementation dossier 174: Cooldown gate

**Control ID:** GESTURE-COOLDOWN-05

**Objective.** Committed gesture locks mapping until expiry.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 175 -->

# Implementation dossier 175: Calibration storage

**Control ID:** CALIBRATION-05

**Objective.** Persist thresholds/version/quality, never raw frames.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 176 -->

# Implementation dossier 176: Keyboard parity

**Control ID:** INPUT-PARITY-05

**Objective.** All gesture actions have keyboard/pointer route to same gateway.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 177 -->

# Implementation dossier 177: UI projection

**Control ID:** UI-PROJECTION-05

**Objective.** Delayed UI events cannot alter controller state.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 178 -->

# Implementation dossier 178: Store selectors

**Control ID:** STORE-05

**Objective.** Meters do not rerender unrelated controls.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 179 -->

# Implementation dossier 179: Session save

**Control ID:** SAVE-05

**Objective.** Failure leaves prior durable state or recoverable draft.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 180 -->

# Implementation dossier 180: Migration

**Control ID:** MIGRATION-05

**Objective.** Explicit idempotent migration from every supported fixture.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 181 -->

# Implementation dossier 181: Import validation

**Control ID:** IMPORT-05

**Objective.** Limit and validate untrusted sessions before opening assets.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 182 -->

# Implementation dossier 182: Export integrity

**Control ID:** EXPORT-05

**Objective.** Manifest/version/checksum; round-trip test.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 183 -->

# Implementation dossier 183: Fault reporting

**Control ID:** FAULTS-05

**Objective.** Stable code plus actionable detail; preserve diagnostics.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 184 -->

# Implementation dossier 184: Observability

**Control ID:** OBSERVABILITY-05

**Objective.** Command/transition/audio config timing with no media content.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 185 -->

# Implementation dossier 185: Browser support

**Control ID:** COMPATIBILITY-05

**Objective.** Gate media, worklet, IndexedDB, worker/model prerequisites.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 186 -->

# Implementation dossier 186: Accessibility

**Control ID:** A11Y-05

**Objective.** Test keyboard, focus, announcements, contrast and explanations.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 187 -->

# Implementation dossier 187: Performance regression

**Control ID:** REGRESSION-05

**Objective.** Compare checked-in representative benchmark baseline.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 188 -->

# Implementation dossier 188: Security review

**Control ID:** SECURITY-05

**Objective.** Check CSP, deps, permissions, imports, no egress.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 189 -->

# Implementation dossier 189: Release gate

**Control ID:** RELEASE-05

**Objective.** Require quality/tests/build/E2E/manual device checklist.

**Delivery lens.** Operations: add concise diagnostics and recovery guidance without recording private audio or video content.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 190 -->

# Implementation dossier 190: Requirements traceability

**Control ID:** REQ-TRACE-06

**Objective.** Map each requirement to module, test ID, and release evidence. Code compilation is not completion.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 191 -->

# Implementation dossier 191: Transport transition

**Control ID:** FSM-06

**Objective.** Assert phase, scheduled effect, audio event, and published view state for one transition.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 192 -->

# Implementation dossier 192: Audio render budget

**Control ID:** AUDIO-PERF-06

**Objective.** Benchmark maximum supported layer count; capture p50/p95/max cost and qualify devices by deadline.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 193 -->

# Implementation dossier 193: Worklet message validation

**Control ID:** WORKLET-PROTO-06

**Objective.** Reject malformed, unknown-version, and stale messages on both protocol ends.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 194 -->

# Implementation dossier 194: First-loop boundary

**Control ID:** LOOP-BOUNDARY-06

**Objective.** Specify immediate/beat/bar/cancel policy and test all boundaries.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 195 -->

# Implementation dossier 195: Overdub integrity

**Control ID:** LAYER-INTEGRITY-06

**Objective.** Confirm old samples stay bit-identical after a new layer is committed.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 196 -->

# Implementation dossier 196: Undo policy

**Control ID:** UNDO-06

**Objective.** Target newest committed layer only; expose unavailable state clearly.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 197 -->

# Implementation dossier 197: Clear policy

**Control ID:** CLEAR-06

**Objective.** Clear is destructive: confirm and emit auditable event.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 198 -->

# Implementation dossier 198: Metronome timing

**Control ID:** METRO-06

**Objective.** Use audio frames and rational beat accumulation; UI animation is non-authoritative.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 199 -->

# Implementation dossier 199: Device recovery

**Control ID:** DEVICE-06

**Objective.** Pause safely on topology change and require explicit reinitialization.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 200 -->

# Implementation dossier 200: Camera capture

**Control ID:** CAMERA-06

**Objective.** Adapter owns track lifecycle; stop tracks when gesture mode is off.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 201 -->

# Implementation dossier 201: Feature normalization

**Control ID:** FEATURES-06

**Objective.** Normalize face-derived measures against scale and baseline.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 202 -->

# Implementation dossier 202: Classifier arbitration

**Control ID:** GESTURE-ARB-06

**Objective.** Overlap means no action unless explicit priority evidence exists.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 203 -->

# Implementation dossier 203: Hold gate

**Control ID:** GESTURE-HOLD-06

**Objective.** Start hold above threshold; reset on confidence loss; test timestamps.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 204 -->

# Implementation dossier 204: Cooldown gate

**Control ID:** GESTURE-COOLDOWN-06

**Objective.** Committed gesture locks mapping until expiry.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 205 -->

# Implementation dossier 205: Calibration storage

**Control ID:** CALIBRATION-06

**Objective.** Persist thresholds/version/quality, never raw frames.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 206 -->

# Implementation dossier 206: Keyboard parity

**Control ID:** INPUT-PARITY-06

**Objective.** All gesture actions have keyboard/pointer route to same gateway.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 207 -->

# Implementation dossier 207: UI projection

**Control ID:** UI-PROJECTION-06

**Objective.** Delayed UI events cannot alter controller state.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 208 -->

# Implementation dossier 208: Store selectors

**Control ID:** STORE-06

**Objective.** Meters do not rerender unrelated controls.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 209 -->

# Implementation dossier 209: Session save

**Control ID:** SAVE-06

**Objective.** Failure leaves prior durable state or recoverable draft.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 210 -->

# Implementation dossier 210: Migration

**Control ID:** MIGRATION-06

**Objective.** Explicit idempotent migration from every supported fixture.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 211 -->

# Implementation dossier 211: Import validation

**Control ID:** IMPORT-06

**Objective.** Limit and validate untrusted sessions before opening assets.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 212 -->

# Implementation dossier 212: Export integrity

**Control ID:** EXPORT-06

**Objective.** Manifest/version/checksum; round-trip test.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 213 -->

# Implementation dossier 213: Fault reporting

**Control ID:** FAULTS-06

**Objective.** Stable code plus actionable detail; preserve diagnostics.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 214 -->

# Implementation dossier 214: Observability

**Control ID:** OBSERVABILITY-06

**Objective.** Command/transition/audio config timing with no media content.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 215 -->

# Implementation dossier 215: Browser support

**Control ID:** COMPATIBILITY-06

**Objective.** Gate media, worklet, IndexedDB, worker/model prerequisites.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 216 -->

# Implementation dossier 216: Accessibility

**Control ID:** A11Y-06

**Objective.** Test keyboard, focus, announcements, contrast and explanations.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 217 -->

# Implementation dossier 217: Performance regression

**Control ID:** REGRESSION-06

**Objective.** Compare checked-in representative benchmark baseline.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 218 -->

# Implementation dossier 218: Security review

**Control ID:** SECURITY-06

**Objective.** Check CSP, deps, permissions, imports, no egress.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 219 -->

# Implementation dossier 219: Release gate

**Control ID:** RELEASE-06

**Objective.** Require quality/tests/build/E2E/manual device checklist.

**Delivery lens.** Review: inspect changed dependencies, permission impact, schema compatibility, accessibility, and rollback behavior.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 220 -->

# Implementation dossier 220: Requirements traceability

**Control ID:** REQ-TRACE-07

**Objective.** Map each requirement to module, test ID, and release evidence. Code compilation is not completion.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 221 -->

# Implementation dossier 221: Transport transition

**Control ID:** FSM-07

**Objective.** Assert phase, scheduled effect, audio event, and published view state for one transition.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 222 -->

# Implementation dossier 222: Audio render budget

**Control ID:** AUDIO-PERF-07

**Objective.** Benchmark maximum supported layer count; capture p50/p95/max cost and qualify devices by deadline.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 223 -->

# Implementation dossier 223: Worklet message validation

**Control ID:** WORKLET-PROTO-07

**Objective.** Reject malformed, unknown-version, and stale messages on both protocol ends.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 224 -->

# Implementation dossier 224: First-loop boundary

**Control ID:** LOOP-BOUNDARY-07

**Objective.** Specify immediate/beat/bar/cancel policy and test all boundaries.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 225 -->

# Implementation dossier 225: Overdub integrity

**Control ID:** LAYER-INTEGRITY-07

**Objective.** Confirm old samples stay bit-identical after a new layer is committed.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 226 -->

# Implementation dossier 226: Undo policy

**Control ID:** UNDO-07

**Objective.** Target newest committed layer only; expose unavailable state clearly.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 227 -->

# Implementation dossier 227: Clear policy

**Control ID:** CLEAR-07

**Objective.** Clear is destructive: confirm and emit auditable event.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 228 -->

# Implementation dossier 228: Metronome timing

**Control ID:** METRO-07

**Objective.** Use audio frames and rational beat accumulation; UI animation is non-authoritative.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 229 -->

# Implementation dossier 229: Device recovery

**Control ID:** DEVICE-07

**Objective.** Pause safely on topology change and require explicit reinitialization.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 230 -->

# Implementation dossier 230: Camera capture

**Control ID:** CAMERA-07

**Objective.** Adapter owns track lifecycle; stop tracks when gesture mode is off.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 231 -->

# Implementation dossier 231: Feature normalization

**Control ID:** FEATURES-07

**Objective.** Normalize face-derived measures against scale and baseline.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 232 -->

# Implementation dossier 232: Classifier arbitration

**Control ID:** GESTURE-ARB-07

**Objective.** Overlap means no action unless explicit priority evidence exists.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 233 -->

# Implementation dossier 233: Hold gate

**Control ID:** GESTURE-HOLD-07

**Objective.** Start hold above threshold; reset on confidence loss; test timestamps.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 234 -->

# Implementation dossier 234: Cooldown gate

**Control ID:** GESTURE-COOLDOWN-07

**Objective.** Committed gesture locks mapping until expiry.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 235 -->

# Implementation dossier 235: Calibration storage

**Control ID:** CALIBRATION-07

**Objective.** Persist thresholds/version/quality, never raw frames.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 236 -->

# Implementation dossier 236: Keyboard parity

**Control ID:** INPUT-PARITY-07

**Objective.** All gesture actions have keyboard/pointer route to same gateway.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 237 -->

# Implementation dossier 237: UI projection

**Control ID:** UI-PROJECTION-07

**Objective.** Delayed UI events cannot alter controller state.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 238 -->

# Implementation dossier 238: Store selectors

**Control ID:** STORE-07

**Objective.** Meters do not rerender unrelated controls.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 239 -->

# Implementation dossier 239: Session save

**Control ID:** SAVE-07

**Objective.** Failure leaves prior durable state or recoverable draft.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 240 -->

# Implementation dossier 240: Migration

**Control ID:** MIGRATION-07

**Objective.** Explicit idempotent migration from every supported fixture.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 241 -->

# Implementation dossier 241: Import validation

**Control ID:** IMPORT-07

**Objective.** Limit and validate untrusted sessions before opening assets.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 242 -->

# Implementation dossier 242: Export integrity

**Control ID:** EXPORT-07

**Objective.** Manifest/version/checksum; round-trip test.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 243 -->

# Implementation dossier 243: Fault reporting

**Control ID:** FAULTS-07

**Objective.** Stable code plus actionable detail; preserve diagnostics.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 244 -->

# Implementation dossier 244: Observability

**Control ID:** OBSERVABILITY-07

**Objective.** Command/transition/audio config timing with no media content.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 245 -->

# Implementation dossier 245: Browser support

**Control ID:** COMPATIBILITY-07

**Objective.** Gate media, worklet, IndexedDB, worker/model prerequisites.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 246 -->

# Implementation dossier 246: Accessibility

**Control ID:** A11Y-07

**Objective.** Test keyboard, focus, announcements, contrast and explanations.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 247 -->

# Implementation dossier 247: Performance regression

**Control ID:** REGRESSION-07

**Objective.** Compare checked-in representative benchmark baseline.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 248 -->

# Implementation dossier 248: Security review

**Control ID:** SECURITY-07

**Objective.** Check CSP, deps, permissions, imports, no egress.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 249 -->

# Implementation dossier 249: Release gate

**Control ID:** RELEASE-07

**Objective.** Require quality/tests/build/E2E/manual device checklist.

**Delivery lens.** Hardening: exercise duplicate input, stale events, permission loss, device change, and storage pressure.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 250 -->

# Implementation dossier 250: Requirements traceability

**Control ID:** REQ-TRACE-08

**Objective.** Map each requirement to module, test ID, and release evidence. Code compilation is not completion.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 251 -->

# Implementation dossier 251: Transport transition

**Control ID:** FSM-08

**Objective.** Assert phase, scheduled effect, audio event, and published view state for one transition.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 252 -->

# Implementation dossier 252: Audio render budget

**Control ID:** AUDIO-PERF-08

**Objective.** Benchmark maximum supported layer count; capture p50/p95/max cost and qualify devices by deadline.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 253 -->

# Implementation dossier 253: Worklet message validation

**Control ID:** WORKLET-PROTO-08

**Objective.** Reject malformed, unknown-version, and stale messages on both protocol ends.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 254 -->

# Implementation dossier 254: First-loop boundary

**Control ID:** LOOP-BOUNDARY-08

**Objective.** Specify immediate/beat/bar/cancel policy and test all boundaries.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 255 -->

# Implementation dossier 255: Overdub integrity

**Control ID:** LAYER-INTEGRITY-08

**Objective.** Confirm old samples stay bit-identical after a new layer is committed.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 256 -->

# Implementation dossier 256: Undo policy

**Control ID:** UNDO-08

**Objective.** Target newest committed layer only; expose unavailable state clearly.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 257 -->

# Implementation dossier 257: Clear policy

**Control ID:** CLEAR-08

**Objective.** Clear is destructive: confirm and emit auditable event.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 258 -->

# Implementation dossier 258: Metronome timing

**Control ID:** METRO-08

**Objective.** Use audio frames and rational beat accumulation; UI animation is non-authoritative.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 259 -->

# Implementation dossier 259: Device recovery

**Control ID:** DEVICE-08

**Objective.** Pause safely on topology change and require explicit reinitialization.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 260 -->

# Implementation dossier 260: Camera capture

**Control ID:** CAMERA-08

**Objective.** Adapter owns track lifecycle; stop tracks when gesture mode is off.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 261 -->

# Implementation dossier 261: Feature normalization

**Control ID:** FEATURES-08

**Objective.** Normalize face-derived measures against scale and baseline.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 262 -->

# Implementation dossier 262: Classifier arbitration

**Control ID:** GESTURE-ARB-08

**Objective.** Overlap means no action unless explicit priority evidence exists.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 263 -->

# Implementation dossier 263: Hold gate

**Control ID:** GESTURE-HOLD-08

**Objective.** Start hold above threshold; reset on confidence loss; test timestamps.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 264 -->

# Implementation dossier 264: Cooldown gate

**Control ID:** GESTURE-COOLDOWN-08

**Objective.** Committed gesture locks mapping until expiry.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 265 -->

# Implementation dossier 265: Calibration storage

**Control ID:** CALIBRATION-08

**Objective.** Persist thresholds/version/quality, never raw frames.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 266 -->

# Implementation dossier 266: Keyboard parity

**Control ID:** INPUT-PARITY-08

**Objective.** All gesture actions have keyboard/pointer route to same gateway.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 267 -->

# Implementation dossier 267: UI projection

**Control ID:** UI-PROJECTION-08

**Objective.** Delayed UI events cannot alter controller state.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 268 -->

# Implementation dossier 268: Store selectors

**Control ID:** STORE-08

**Objective.** Meters do not rerender unrelated controls.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 269 -->

# Implementation dossier 269: Session save

**Control ID:** SAVE-08

**Objective.** Failure leaves prior durable state or recoverable draft.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 270 -->

# Implementation dossier 270: Migration

**Control ID:** MIGRATION-08

**Objective.** Explicit idempotent migration from every supported fixture.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 271 -->

# Implementation dossier 271: Import validation

**Control ID:** IMPORT-08

**Objective.** Limit and validate untrusted sessions before opening assets.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 272 -->

# Implementation dossier 272: Export integrity

**Control ID:** EXPORT-08

**Objective.** Manifest/version/checksum; round-trip test.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 273 -->

# Implementation dossier 273: Fault reporting

**Control ID:** FAULTS-08

**Objective.** Stable code plus actionable detail; preserve diagnostics.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 274 -->

# Implementation dossier 274: Observability

**Control ID:** OBSERVABILITY-08

**Objective.** Command/transition/audio config timing with no media content.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 275 -->

# Implementation dossier 275: Browser support

**Control ID:** COMPATIBILITY-08

**Objective.** Gate media, worklet, IndexedDB, worker/model prerequisites.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 276 -->

# Implementation dossier 276: Accessibility

**Control ID:** A11Y-08

**Objective.** Test keyboard, focus, announcements, contrast and explanations.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 277 -->

# Implementation dossier 277: Performance regression

**Control ID:** REGRESSION-08

**Objective.** Compare checked-in representative benchmark baseline.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 278 -->

# Implementation dossier 278: Security review

**Control ID:** SECURITY-08

**Objective.** Check CSP, deps, permissions, imports, no egress.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 279 -->

# Implementation dossier 279: Release gate

**Control ID:** RELEASE-08

**Objective.** Require quality/tests/build/E2E/manual device checklist.

**Delivery lens.** Release: attach requirement evidence, a manual-device check where needed, and a rollback-safe deployment note.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 280 -->

# Implementation dossier 280: Requirements traceability

**Control ID:** REQ-TRACE-09

**Objective.** Map each requirement to module, test ID, and release evidence. Code compilation is not completion.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 281 -->

# Implementation dossier 281: Transport transition

**Control ID:** FSM-09

**Objective.** Assert phase, scheduled effect, audio event, and published view state for one transition.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 282 -->

# Implementation dossier 282: Audio render budget

**Control ID:** AUDIO-PERF-09

**Objective.** Benchmark maximum supported layer count; capture p50/p95/max cost and qualify devices by deadline.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 283 -->

# Implementation dossier 283: Worklet message validation

**Control ID:** WORKLET-PROTO-09

**Objective.** Reject malformed, unknown-version, and stale messages on both protocol ends.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 284 -->

# Implementation dossier 284: First-loop boundary

**Control ID:** LOOP-BOUNDARY-09

**Objective.** Specify immediate/beat/bar/cancel policy and test all boundaries.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 285 -->

# Implementation dossier 285: Overdub integrity

**Control ID:** LAYER-INTEGRITY-09

**Objective.** Confirm old samples stay bit-identical after a new layer is committed.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 286 -->

# Implementation dossier 286: Undo policy

**Control ID:** UNDO-09

**Objective.** Target newest committed layer only; expose unavailable state clearly.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 287 -->

# Implementation dossier 287: Clear policy

**Control ID:** CLEAR-09

**Objective.** Clear is destructive: confirm and emit auditable event.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 288 -->

# Implementation dossier 288: Metronome timing

**Control ID:** METRO-09

**Objective.** Use audio frames and rational beat accumulation; UI animation is non-authoritative.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 289 -->

# Implementation dossier 289: Device recovery

**Control ID:** DEVICE-09

**Objective.** Pause safely on topology change and require explicit reinitialization.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 290 -->

# Implementation dossier 290: Camera capture

**Control ID:** CAMERA-09

**Objective.** Adapter owns track lifecycle; stop tracks when gesture mode is off.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 291 -->

# Implementation dossier 291: Feature normalization

**Control ID:** FEATURES-09

**Objective.** Normalize face-derived measures against scale and baseline.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 292 -->

# Implementation dossier 292: Classifier arbitration

**Control ID:** GESTURE-ARB-09

**Objective.** Overlap means no action unless explicit priority evidence exists.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 293 -->

# Implementation dossier 293: Hold gate

**Control ID:** GESTURE-HOLD-09

**Objective.** Start hold above threshold; reset on confidence loss; test timestamps.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 294 -->

# Implementation dossier 294: Cooldown gate

**Control ID:** GESTURE-COOLDOWN-09

**Objective.** Committed gesture locks mapping until expiry.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 295 -->

# Implementation dossier 295: Calibration storage

**Control ID:** CALIBRATION-09

**Objective.** Persist thresholds/version/quality, never raw frames.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 296 -->

# Implementation dossier 296: Keyboard parity

**Control ID:** INPUT-PARITY-09

**Objective.** All gesture actions have keyboard/pointer route to same gateway.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 297 -->

# Implementation dossier 297: UI projection

**Control ID:** UI-PROJECTION-09

**Objective.** Delayed UI events cannot alter controller state.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 298 -->

# Implementation dossier 298: Store selectors

**Control ID:** STORE-09

**Objective.** Meters do not rerender unrelated controls.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 299 -->

# Implementation dossier 299: Session save

**Control ID:** SAVE-09

**Objective.** Failure leaves prior durable state or recoverable draft.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage

<!-- PRINT-PAGE: 300 -->

# Implementation dossier 300: Migration

**Control ID:** MIGRATION-09

**Objective.** Explicit idempotent migration from every supported fixture.

**Delivery lens.** Maintenance: document limits, upgrade paths, ownership, and the signal that tells support this control failed.

**Boundary.** Identify the owning module and use an injected port at every platform edge. LoopController alone owns transition decisions; the audio processor alone owns frame-accurate effects. Keep this concern out of React state unless it is a throttled view projection.

**Evidence.** Add a focused automated test, a failure-path assertion, and a diagnostic signal that distinguishes input failure, policy rejection, and platform failure. Link the result to the corresponding functional/non-functional requirement and affected contract.

**Review questions.** Does it create a circular dependency? Does it allocate or perform I/O on the audio render path? Does it preserve keyboard fallback and local-only privacy? Can a duplicate or stale command produce an unintended second result? What is the safe recovery when it fails?

\newpage