# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Project Tracker is a chat-bot-driven project/time tracker for two people. Messages (text or voice) sent via Telegram and/or WhatsApp are classified and parsed by Claude (Anthropic API), written to a Google Sheet, and confirmed back to the sender. A separate React dashboard (served by the same Express app) reads the same data over a small REST API. There's also a no-code n8n workflow (`n8n/workflow.json`) that re-implements the same pipeline for users who don't want to run the Node app.

## Commands

```bash
npm install              # install dependencies
npm run build:dashboard  # install + build the React dashboard (src/dashboard) into src/dashboard/dist
npm start                # run the bot/server (src/index.js)
npm run dev              # same, with --watch auto-restart
npm run digest           # manually trigger the weekly unreported-hours email (src/jobs/weekly-digest.js)
npm run health-check     # manually run the pipeline health check (src/jobs/health-check.js)
npm test                 # run tests/test-messages.js — sends 10 sample messages through Claude, prints parsed output. No sheets touched, but needs ANTHROPIC_API_KEY.
npm run test:sheets      # run tests/test-sheets.js — writes/updates/deletes REAL rows in the configured Google Sheet. Use a throwaway GOOGLE_SHEETS_ID.
```

There is no lint/typecheck script and no test framework — both test files are plain Node scripts run directly (`node tests/test-messages.js`); there's no per-test-case runner.

Local setup requires `.env` (copy from `.env.example`) and `config/google-credentials.json` (a Google service account key, shared as Editor on the target spreadsheet). See README.md for the full walkthrough of provisioning Telegram/WhatsApp/Google/Anthropic/OpenAI/Resend credentials.

Production deploys run via `bash deploy.sh` on a VPS (installs Node/PM2, builds the dashboard, writes a template `.env` if missing, starts/restarts the app under PM2). There is no Render/Vercel/etc. config in this repo.

## Architecture

### Multi-channel → single pipeline

`MESSAGING_PLATFORM` (`telegram` | `whatsapp` | `telegram+whatsapp` | `all`) controls which channel(s) `src/index.js` boots. Each channel is a thin adapter that ends up calling the same `processMessage()` in `src/core/processor.js` with `{ messageText, senderName, replyFn }` — this is the one place that knows about AI parsing, sheet writes, and email notifications. New channels should follow the `BaseMessenger` contract documented in `src/messaging/interface.js` rather than duplicating processor logic.

- **Telegram** (`src/telegram/bot.js`, Telegraf): allowlist via `ALLOWED_USER_IDS`. Voice notes transcribed in `voice-handler.js`.
- **WhatsApp** (`src/messaging/whatsapp.js`, Meta Cloud API): runs as webhook routes (`GET/POST /whatsapp`) on the Express app from `src/server.js`. Verifies `X-Hub-Signature-256` against `WHATSAPP_APP_SECRET`, dedupes by message ID (in-memory `Set`, resets on restart), and authorizes senders by matching `PHONE_JEFF`/`PHONE_PARTNER`. Voice notes are downloaded from the Graph API and transcribed inline (Whisper).
- Sender identity is phone-number/Telegram-ID based, not real auth — see `PHONE_JEFF`/`PHONE_PARTNER`/`NAME_JEFF`/`NAME_PARTNER` in `.env`.

### AI parsing

`src/ai/message-parser.js` sends the message (plus existing project list for context) to Claude with a system prompt from `src/ai/prompts.js`, expecting strict JSON back with a `category` (`NEW_PROJECT` | `PROJECT_UPDATE` | `TIME_LOG`) and a `data` payload. `processor.js` switches on `category` to decide which sheet(s) to write and which email/reply template to use.

### Google Sheets as the database

`src/sheets/client.js` owns the `googleapis` auth client and `initializeSheets()`, which auto-creates three tabs with headers on first run if missing: **Projects**, **Time Log**, **Activity Log**. Each tab has its own module with a `COL` index map (see `src/sheets/projects.js`, `time-log.js`, `activity-log.js`) — there's no schema migration system, so adding a column means updating both the header array in `client.js` and the corresponding `COL` map/row mapper.

Notable behavior, not obvious from any single file:
- **Hours Logged** on the Projects tab is *not* trusted from writes — `getAllProjects()` recomputes it by summing Time Log rows every time, so manual edits to Time Log are always reflected.
- Time Log column F (**Reported**) is blank by default when a row is added; any non-empty value excludes that row from `getAllTimeEntries({ unreportedOnly: true })`, which is what the weekly digest queries.
- Activity Log intentionally excludes `'time logged'` entries when merged with Time Log for the dashboard's activity feed (`src/api/routes.js`, `GET /activity`) — Time Log is the source of truth for time entries, to avoid duplicates.

### Jobs & notifications

`src/jobs/weekly-digest.js` runs on a `node-cron` schedule registered in `src/index.js` (`0 1 * * 6` = Saturday 1 AM server time) and can also be triggered on-demand via `POST /api/admin/trigger-digest` (guarded by `WHATSAPP_VERIFY_TOKEN` as a shared secret) or `npm run digest`. It emails a breakdown of all unreported hours grouped by project, and is a no-op (no email sent) if there are zero unreported entries. `src/email/mailer.js` wraps Resend with one shared HTML template (`html()`) reused across new-project, project-update, collaboration-message, digest, and health-check-failure emails.

`src/jobs/health-check.js` runs every 6 hours (same cron mechanism) and is also triggerable via `POST /api/admin/trigger-health-check` or `npm run health-check`. It proves the WhatsApp → AI → Sheets pipeline actually works without leaving a trace: it pings the WhatsApp Graph API with the access token (catches expired/revoked tokens), runs a fixed sample message through `parseMessage()` (catches Anthropic API issues), and does a create → verify → delete round trip on the Projects sheet via `addProject()`/`deleteProject()` (catches Sheets auth/quota issues) — so it never leaves a fake project behind. On any failure it emails only `EMAIL_JEFF` (not `EMAIL_PARTNER`) via `sendHealthAlert()`.

### Express app (`src/server.js`)

Single Express app serving three things behind one port (`PORT`, default 3000):
1. WhatsApp webhook (`/whatsapp`)
2. JSON REST API for the dashboard (`/api/*`, routes in `src/api/routes.js`) — projects, stats, time log, merged activity feed, project links, collaboration messages, admin digest/health-check triggers
3. The built dashboard as static files with an SPA fallback (`src/dashboard/dist`, built separately via `npm run build:dashboard`); if not built, serves a placeholder page instead

`GET /health` returns a simple liveness JSON — useful as an external uptime-check target since there's no other monitoring in this repo.

### Dashboard (`src/dashboard/`)

Separate Vite + React + Tailwind app, its own `package.json`/`node_modules`, built independently and consumed only as static output by the main Express server — not run as its own server in production.
