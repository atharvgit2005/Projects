# 🎙️ AI Voice Receptionist Platform (Priya AI - Habib's Salon Pune)

> Production-Quality Real-time AI Voice Receptionist Platform built with **TypeScript**, **Node.js**, **Express**, **WebSockets**, **Google Gemini Live API**, **Twilio Media Streams**, **n8n Automation Engine**, and **Supabase (PostgreSQL)**.

---

## 🌟 Executive Overview

This platform operates as a real-time voice receptionist named **Priya** for **Habib's Salon Pune**. The architecture is multi-tenant and business-agnostic, allowing any business to onboard by simply changing configuration files or database settings.

### Key Capabilities:
- 📞 **Real-time Bidirectional Audio Streaming**: Streams 8kHz G.711 µ-law audio between Twilio Media Streams and 16kHz PCM audio with Google Gemini Live API.
- 🗣️ **Multilingual Auto-Language Detection**: Dynamically detects customer speech in **Hindi**, **Hinglish**, and **English**, responding naturally in the same language.
- ⚡ **Gemini Function Calling**: Executing 5 core receptionist functions:
  1. `check_slots({ date, time, service })`
  2. `create_booking({ customer_name, phone, service, date, time, notes })`
  3. `cancel_booking({ booking_id, phone, service, date })`
  4. `reschedule_booking({ booking_id, phone, new_date, new_time })`
  5. `get_services()`
- 🤖 **Decoupled Business Logic**: Node.js handles streaming, Gemini, and WebSockets. **All business logic** resides in **n8n webhooks**.
- 🗄️ **Supabase Persistence**: Appointment storage with PostgreSQL schema, RLS policies, and triggers.
- 📊 **Obsidian Dark-Mode Web Dashboard**: Served directly at `http://localhost:3000` with live call monitor, transcript visualizer, and appointment management.

---

## 🏗️ System Architecture

```
[Customer Call]
       │
       ▼
[Twilio Phone Number]
       │  (Webhook: POST /twilio/voice -> returns TwiML <Connect><Stream>)
       ▼
[Node.js Voice Gateway WebSockets (/media-stream)]
       │
       ├──► [Audio Transducer (µ-law 8kHz ◄──► PCM16 16kHz/24kHz)]
       │             │
       │             ▼
       │      [Google Gemini Live API WebSocket]
       │             │  (Tool Calls: check_slots, create_booking, etc.)
       ▼             ▼
[n8n Webhook Engine (http://localhost:5678/webhook)]
       ├──► [Supabase PostgreSQL]
       ├──► [Google Calendar API]
       └──► [WhatsApp Confirmation Notification]
```

---

## 📁 Folder Structure

```
├── package.json
├── tsconfig.json
├── .env.example
├── .env
├── README.md
├── n8n_workflows/
│   └── voice_receptionist_n8n_workflow.json    # Complete n8n Workflow JSON Export
├── supabase/
│   └── schema.sql                               # Full PostgreSQL SQL Schema & Seed
├── public/
│   └── index.html                               # Glassmorphism Web Dashboard
└── src/
    ├── app.ts                                   # Express App configuration
    ├── server.ts                                # HTTP + WebSocket Server on /media-stream
    ├── config/
    │   ├── env.config.ts                        # Zod Environment Validation
    │   └── salon.config.ts                      # Multi-tenant Business Profile
    ├── controllers/
    │   ├── healthController.ts                  # GET /health
    │   ├── twilioController.ts                  # POST /twilio/voice
    │   └── bookingController.ts                 # GET /appointments, POST /test-booking
    ├── routes/
    │   ├── healthRoutes.ts
    │   ├── twilioRoutes.ts
    │   └── bookingRoutes.ts
    ├── services/
    │   ├── booking/
    │   │   ├── bookingService.ts                # Tool Call Orchestrator
    │   │   └── sessionManager.ts                # Call Memory & Transcript Session Store
    │   ├── calendar/
    │   │   └── calendarUtils.ts                 # ISO Date/Time Formatter
    │   ├── database/
    │   │   └── supabaseClient.ts                # Supabase Client + In-Memory Fallback
    │   ├── gemini/
    │   │   ├── geminiLiveService.ts             # Gemini Live WebSocket Protocol Client
    │   │   └── toolsDeclarations.ts             # Gemini Function Calling Schemas
    │   ├── n8n/
    │   │   └── n8nService.ts                    # n8n Webhook HTTP Client with Fallbacks
    │   └── twilio/
    │       ├── twimlService.ts                  # TwiML Generator
    │       └── mediaStreamHandler.ts            # Twilio WebSocket Event Router
    ├── middleware/
    │   ├── errorHandler.ts
    │   └── requestLogger.ts
    ├── types/
    │   ├── twilio.types.ts
    │   ├── gemini.types.ts
    │   ├── booking.types.ts
    │   └── n8n.types.ts
    ├── interfaces/
    │   └── salon.interface.ts
    ├── utils/
    │   ├── logger.ts                            # Pino Logger
    │   └── audioConverter.ts                    # µ-law 8kHz <-> PCM16 16k/24k Resampler
    └── prompts/
        └── systemPrompt.ts                      # Dynamic System Prompt for Priya AI
```

---

## ⚡ Quick Start Guide

### 1. Installation

```bash
# Install dependencies
npm install
```

### 2. Configure Environment Variables

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
PORT=3000
NODE_ENV=development
NGROK_URL=https://your-ngrok-subdomain.ngrok-free.app

# Twilio
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Google Gemini API
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_VOICE_NAME=Kore

# Supabase Database
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# n8n Webhook Base URL
N8N_BASE_URL=http://localhost:5678/webhook
```

---

### 3. Supabase Database Setup

1. Log into your [Supabase Dashboard](https://supabase.com).
2. Open **SQL Editor**.
3. Copy and execute the contents of `supabase/schema.sql`.
4. This creates the `appointments` table with performance indexes and seed data.

---

### 4. n8n Setup (Docker or Cloud)

If running n8n locally via Docker:

```bash
docker run -d --name n8n -p 5678:5678 n8nio/n8n
```

1. Open `http://localhost:5678`.
2. Go to **Workflows -> Import from File**.
3. Select `n8n_workflows/voice_receptionist_n8n_workflow.json`.
4. Click **Activate Workflow**.

> *Note: If n8n is offline during early development, the Node.js backend automatically executes local fallback logic so testing is never blocked!*

---

### 5. ngrok & Twilio Setup

Start ngrok tunnel to expose local port 3000:

```bash
ngrok http 3000
```

Copy the generated HTTPS URL (e.g. `https://a1b2c3.ngrok-free.app`) into your `.env` file as `NGROK_URL`.

#### Twilio Phone Number Configuration:
1. Log into your [Twilio Console](https://console.twilio.com).
2. Go to **Phone Numbers -> Active Numbers**.
3. Select your phone number.
4. Under **Voice & Fax -> A CALL COMES IN**:
   - Set to **Webhook**
   - URL: `https://a1b2c3.ngrok-free.app/twilio/voice`
   - Method: `HTTP POST`
5. Click **Save**.

---

### 6. Run Application

```bash
# Start development server with live reload
npm run dev
```

Open browser at `http://localhost:3000` to view the **Obsidian AI Salon Dashboard**!

---

## 🧪 Testing Scenarios

### Scenario A: Call Twilio Phone Number

Call your Twilio phone number from your cell phone:

1. **Priya greets you**: *"Namaste, main Priya hoon. Aapka swagat hai Habib's Salon Pune mein. Main aapki kaise madad kar sakti hoon?"*
2. **You reply**: *"Mujhe kal haircut ke liye appointment chahiye."*
3. **Priya**: *"Zaroor! Kal kis time ki appointment chahiye?"*
4. **You reply**: *"5 baje."*
5. **Priya triggers `check_slots` function via n8n**, verifies availability, and asks: *"5 baje slot available hai. May I have your name?"*
6. **You reply**: *"Atharv."*
7. **Priya triggers `create_booking` function via n8n**, stores the appointment in Supabase, syncs Google Calendar, sends WhatsApp confirmation, and verbally states: *"Atharv ji, aapki Haircut appointment kal shaam 5 baje confirm ho gayi hai. Dhanyavaad!"*

---

### Scenario B: API Endpoints & Test Booking

#### 1. System Health Check
```bash
curl http://localhost:3000/health
```

#### 2. Create Test Booking Endpoint
```bash
curl -X POST http://localhost:3000/test-booking \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Atharv Paharia",
    "phone": "+919876543210",
    "service": "Hair Spa",
    "date": "2026-07-28",
    "time": "17:00",
    "notes": "Direct API Test"
  }'
```

#### 3. View Today's Appointments
```bash
curl http://localhost:3000/appointments
```

---

## 📜 License & Support

Built for **Habib's Salon Pune** by Solutions Architecture Team. Open for commercial SaaS deployment.
