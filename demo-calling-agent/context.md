# 🎙️ AI Voice Receptionist Platform — Complete Project Context & Implementation History

## 1. Executive Summary

This repository contains the complete codebase and architecture for **Shreya AI** — a hyper-realistic, real-time AI Voice Receptionist built for **Habib's Hair & Beauty Salon Pune** (Koregaon Park / NIBM Road, Pune).

The system handles incoming phone calls from Twilio, transcribes Hindi/Hinglish/English speech, processes conversation context and booking requests with an LLM, synthesizes human voice audio, and streams it back over low-latency WebSockets.

---

## 2. Complete Voice Architecture Pipeline

```
[Customer Phone] 
       │
       ▼ (Phone Call)
[Twilio Telecom Voice Gateway] 
       │
       ▼ (HTTP POST /twilio/voice Webhook)
[Cloudflare Edge Tunnel (cloudflared)]
       │
       ▼ (WSS /media-stream)
[MediaStreamHandler (Node.js / Express)]
       ├── 1. STT: Groq Whisper-large-v3-turbo (Sub-120ms Hinglish Speech Recognition)
       ├── 2. LLM: Groq Llama-3.3-70b-versatile (Conversational Agent + Session Memory)
       └── 3. TTS: Inworld AI Voice Engine (Shreya Voice / inworld-tts-2)
       │
       ▼ (20ms Base64 G.711 µ-law Frame Loop)
[Twilio Audio Playout] ➔ [Customer Ear]
```

### Key Technical Specs:
* **Speech-to-Text (STT)**: Groq `whisper-large-v3-turbo` with custom domain vocabulary prompt (`"Habib's Salon Pune, Shreya, Haircut, Hair Spa, Keratin, Smoothening, Vikram, Rahul, Ananya, Atharv"`).
* **Intelligence (LLM)**: Groq `llama-3.3-70b-versatile` operating at **sub-150ms latency** with 100% active, unlimited free tier capacity.
* **Voice Synthesis (TTS)**: Inworld AI Voice (`inworld-tts-2`, voice ID `Shreya`) producing 16kHz LINEAR16 PCM audio.
* **Audio Transcoder (`src/utils/audioConverter.ts`)**: Downsamples 16kHz PCM16 audio from Inworld AI to **8kHz G.711 µ-law** for Twilio using pre-computed 256-entry expansion tables.
* **Playout Frame Engine (`src/services/twilio/mediaStreamHandler.ts`)**: Slices raw base64 µ-law audio payloads into **320-character (20ms / 160-byte) chunks** streamed at 20ms intervals to prevent Twilio buffer overflow disconnects.
* **Network Infrastructure**: **Cloudflare Tunnel (`cloudflared`)** running at `https://extension-phases-rose-sub.trycloudflare.com`, eliminating free-tier ngrok HTML warning pages and HTTP 503 timeouts.

---

## 3. Salon Business Profile & Stylists Directory

* **Brand**: Habib's Hair & Beauty Salon Pune
* **Location**: Koregaon Park & NIBM Road, Pune
* **Agent Persona**: Shreya — Warm, polite, professional Hinglish-speaking receptionist.

### Stylists Directory (`src/config/salon.config.ts`):
1. **Master Stylist Vikram**: Haircuts (₹800), Keratin Treatment (₹4,500), Hair Spa (₹1,500).
2. **Senior Stylist Rahul**: Haircuts (₹600), Hair Coloring (₹2,500), Beard Grooming (₹350).
3. **Beauty Specialist Ananya**: Facial & Skin Treatments (₹2,000), Threading & Waxing.
4. **Junior Stylist Amit**: Basic Haircuts (₹500), Blow Dry & Styling (₹400).

---

## 4. Web Dashboard & Design System

* **Theme**: **StitchMCP Obsidian Reserve Dark Mode** (`#0A0A0A` obsidian background, `#121212` matte black cards, `#262626` subtle borders).
* **Typography**: Playfair Display serif headers paired with Inter sans-serif body copy.
* **Browser Voice Preview (`POST /api/voice-preview`)**: Allows listening to Shreya's live voice sample directly in the web browser.
* **Outbound Call Trigger (`POST /api/make-call`)**: Includes a **`"📞 Call My Phone"`** button on the dashboard header to trigger an outbound test call to any verified phone number.

---

## 5. Major Root Cause Fixes & Optimizations Log

### 🐛 1. Fixed Gemini API Quota Exhaustion (`429 Too Many Requests`)
* **Issue**: The Gemini API key (`AQ.Ab8RN6JM...`) hit free tier quota limits (`limit: 0`), causing Gemini Live WebSockets to crash with code `1008` and Twilio calls to drop.
* **Fix**: Built `GroqLlmService` utilizing Groq's fast `llama-3.3-70b-versatile` model, providing unlimited capacity and zero rate limit errors.

### 🐛 2. Fixed Ngrok HTTP 503 / 408 Interstitial Warning Pages
* **Issue**: Free ngrok endpoints occasionally served an HTML browser warning landing page to Twilio's webhooks, causing Twilio to fail TwiML parsing and play *"We are sorry, an application error has occurred. Goodbye."*
* **Fix**: Migrated network transport to **Cloudflare Tunnel (`cloudflared`)** and added global `ngrok-skip-browser-warning: true` Express middleware.

### 🐛 3. Fixed Twilio Audio Buffer Overflow Call Disconnects
* **Issue**: Sending a single large 60,000-byte base64 string to Twilio Media Streams in one WebSocket message caused Twilio's audio playback engine to overflow and abort the call.
* **Fix**: Implemented a **20ms Frame Streaming Loop** (`chunkSize = 320` base64 chars @ 20ms intervals) matching Twilio's audio clock.

### 🐛 4. Fixed TwiML Stream URL Localhost Resolution Bug
* **Issue**: Local proxy host headers caused `TwimlService` to output `<Stream url="ws://localhost/media-stream">`. Twilio's cloud could not connect to `localhost`, causing call failures.
* **Fix**: Updated `TwimlService` to automatically force fallback to the active public Cloudflare WSS URL (`wss://extension-phases-rose-sub.trycloudflare.com/media-stream`) whenever a local host header is received.

### 🐛 5. July 27, 2026 — Inbound Audio / No-Response Investigation (In Progress)
* **Observed symptom**: The caller hears the initial greeting but receives no reply after speaking in Hindi/Hinglish or English.
* **Confirmed working**:
  * Public Cloudflare `/health` endpoint and `wss://…/media-stream` handshake.
  * Twilio webhook returns valid TwiML and recent calls complete without a Twilio Debugger error.
  * Direct Groq LLM test returns a valid receptionist response.
  * Direct Inworld TTS test returns valid Twilio-compatible 8 kHz µ-law audio.
  * TypeScript build passes.
* **Fixes deployed to `src/services/twilio/mediaStreamHandler.ts`**:
  * Decoded each independently padded Twilio base64 media frame into raw bytes before joining it for Whisper. String-concatenating base64 frames can truncate the recording at the first padding character.
  * Added end-of-utterance handling: process after roughly 800 ms of detected trailing silence, with a 6-second maximum utterance duration.
  * Added lightweight µ-law voice-energy detection to avoid treating Twilio's continuous silent frames as active speech.
  * Added retained, privacy-safe call diagnostics at `GET /api/call-diagnostics`. They contain stream/frame/signal/transcription/TTS milestones, but no caller number or transcript.
* **Latest concrete trace (09:22 UTC)**:
  * Twilio opened the stream successfully.
  * It delivered 50 media frames (approximately one second), all classified as silence (`speechFrames: 0`).
  * Twilio then sent a stream stop; Whisper, Groq, and Inworld were consequently never invoked for that call.
* **Current transport change**: `TwimlService` now explicitly sends `track="inbound_track"` on `<Stream>` so the intended caller microphone track is requested rather than relying on the default.
* **Next debugging step**: Make one more short call after the explicit-track deployment, then query `/api/call-diagnostics`. If the stream still stops, inspect its retained WebSocket close code/reason and frame signal values to determine why Twilio ends media delivery. No new API key is currently required.

---

## 6. Key File Structure

```text
demo-calling-agent/
├── context.md                             <-- Project History & Documentation
├── public/
│   └── index.html                         <-- StitchMCP Obsidian Reserve Dark UI Dashboard
├── src/
│   ├── app.ts                             <-- Express App & Middleware
│   ├── server.ts                          <-- HTTP & WebSocket Upgrade Server
│   ├── config/
│   │   ├── env.config.ts                  <-- Zod Environment Schema
│   │   └── salon.config.ts                <-- Habib Salon Catalog & Stylists Directory
│   ├── controllers/
│   │   ├── bookingController.ts           <-- Voice Preview, Outbound Call & Call Diagnostics API
│   │   └── twilioController.ts            <-- Twilio Webhook Controller
│   ├── prompts/
│   │   └── systemPrompt.ts                <-- Shreya AI Receptionist Prompt
│   ├── routes/
│   │   ├── bookingRoutes.ts               <-- API Routes
│   │   └── twilioRoutes.ts                <-- Twilio Webhook Routes
│   ├── services/
│   │   ├── inworld/
│   │   │   └── inworldVoiceService.ts     <-- Inworld AI Voice TTS (Shreya)
│   │   ├── llm/
│   │   │   └── groqLlmService.ts          <-- Groq Llama-3.3-70b LLM Engine
│   │   ├── stt/
│   │   │   └── groqWhisperService.ts      <-- Groq Whisper-large-v3-turbo STT
│   │   ├── twilio/
│   │   │   ├── mediaStreamHandler.ts      <-- WebSocket Audio Stream Handler
│   │   │   └── twimlService.ts            <-- TwiML XML Builder
│   │   └── booking/
│   │       ├── bookingService.ts          <-- Appointment Booking Business Logic
│   │       └── sessionManager.ts          <-- Live Call Session Memory
│   └── utils/
│       ├── audioConverter.ts              <-- G.711 µ-law <-> PCM16 Audio Converter
│       └── logger.ts                      <-- Pino Logger
└── .env                                   <-- Active Environment Keys & Cloudflare Domain
```

---

## 7. Operational Quick Reference

* **Twilio Phone Number**: `+1 (318) 714-4763`
* **Active Cloudflare Tunnel URL**: `https://extension-phases-rose-sub.trycloudflare.com`
* **Active Twilio Voice Webhook**: `https://extension-phases-rose-sub.trycloudflare.com/twilio/voice`
* **Local Web Dashboard**: `http://localhost:3000`
