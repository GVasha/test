# Collecta — Loan Collection Calling Platform

Bank ops tool for uploading borrower lists, running **simulated outbound calls** through branching conversation tracks, gathering answers, and saving outcomes.

## Stack

- **Client:** React (Vite) + React Router
- **Server:** Node.js + Express
- **Database:** SQLite via Node's built-in `node:sqlite` (file at `server/data/loan_collection.db`)

## Requirements

- Node.js 22.5+ (uses built-in `node:sqlite`; tested on Node 26)

## Quick start

```bash
# from repo root
npm install
npm run install:all
npm run seed
npm run dev
```

- App UI: http://localhost:5173  
- API: http://localhost:4000  

Seed data includes sample contacts, four conversation tracks, and a demo campaign (`Demo Collection Wave`). A sample CSV is at `sample-contacts.csv`.

## Features

- **Contacts** — add borrowers or upload CSV (`name,phone,account_number,loan_amount`)
- **Campaigns** — assign a track + contact set, work a call queue
- **Call Console** — simulated agent conversation with choice buttons or free-text replies
- **Tracks** — Standard Collection, Hardship, Payment Arrangement, Dispute / Wrong Party (editable JSON)
- **Results** — transcripts, gathered fields, outcome summary, CSV export

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run API + Vite client together |
| `npm run seed` | Seed tracks / contacts / demo campaign |
| `npm run build` | Build client for production |
| `npm start` | Serve API (and built client if present) |

## API overview

- `GET/POST /api/contacts`, `POST /api/contacts/upload`
- `GET/POST /api/campaigns`, `POST /api/campaigns/:id/start`
- `GET/PUT /api/tracks`
- `POST /api/calls/start`, `POST /api/calls/:id/reply`
- `GET /api/calls/results`, `GET /api/calls/dashboard`

Calls are simulated in v1 (no Twilio). The call service is isolated so a real telephony adapter can replace the simulator later.

## ElevenLabs voice (optional)

Agent lines can be read aloud via ElevenLabs TTS. The API key stays on the server only.

1. Copy `.env.example` to `.env` in the project root and set `ELEVENLABS_API_KEY`.
2. Restart the API (`npm run dev`).
3. Open **Call Console** — with a valid key you will see **Auto-speak agent** and **Play** on agent bubbles.

Optional: `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID` (defaults: Rachel + `eleven_turbo_v2_5`).

**Security:** never commit `.env` or paste keys in chat. Rotate any key that was exposed.
