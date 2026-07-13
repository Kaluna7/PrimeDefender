# Slark

**Real-time threat visibility for websites you protect.**

Slark is a private cyber-attack monitoring platform. Your sites keep their own WAF or middleware, forward incidents over HTTPS, and you get a live map, history, intel commentary, and an AI threat assistant — scoped to your account, not a public shared feed.

---

## Branches & AI providers

| Branch | AI provider | Default model / key |
|--------|-------------|---------------------|
| **`main`** | [DeepSeek](https://www.deepseek.com/) | `DEEPSEEK_API_KEY` · model `deepseek-chat` |
| **`hacktoon`** | [Fireworks AI](https://fireworks.ai/) | `FIREWORKS_API_KEY` · model `accounts/fireworks/models/deepseek-v4-pro` |

Switch branch depending on which AI backend you want to run:

```bash
git checkout main      # DeepSeek
git checkout hacktoon  # Fireworks
```

Both branches share the same product features; the AI module and env vars differ.

---

## Features

- **Live attack map** — Socket.io feed + interactive globe (ECharts / Three.js)
- **History & attacker views** — browse past incidents and source patterns
- **Intel** — daily stats with AI commentary
- **Threat assistant** — authenticated AI chat for security analysis
- **Landing support chat** — public AI FAB for product questions
- **Ingest API** — `POST /ingest` with per-customer API keys
- **Detection middleware** — Express-ready rules (SQLi, XSS, brute force, path traversal, bots, scanners, …)
- **Auth** — email + SMTP verification codes, Google OAuth, sessions
- **Subscriptions** — Midtrans Snap (prepaid plans)
- **i18n** — English & Indonesian

---

## Repo structure

```
.
├── cyber-attack-map/          # Frontend (React + Vite) → typically Vercel
└── cyber-attack-map-server/   # Backend bridge (Node + Socket.io) → typically Railway
```

---

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 19, Vite, Tailwind, React Router, Socket.io client, ECharts, Three.js / R3F, GSAP |
| Backend | Node 20, `node:http` + Socket.io, MongoDB, Nodemailer, Midtrans, AI chat API |
| Deploy | Frontend → Vercel · Backend → Railway · DB → MongoDB Atlas (recommended for production) |

---

## Quick start

### 1. Backend

```bash
cd cyber-attack-map-server
cp .env.example .env
# fill in MongoDB, auth, SMTP, Midtrans, and AI keys
npm install
npm run dev
```

Bridge listens on **http://localhost:3000** by default.

### 2. Frontend

```bash
cd cyber-attack-map
cp .env.example .env
# set VITE_SOCKET_URL=http://localhost:3000
npm install
npm run dev
```

UI runs on **http://localhost:5173**.

---

## Environment (overview)

Copy from each package’s `.env.example`. Never commit real secrets.

### Server (common)

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port (default `3000`) |
| `INGEST_ENABLED` | Allow `POST /ingest` |
| `ADMIN_SECRET` | Dashboard / admin key management |
| `MONGODB_URI` / `MONGODB_DB` / `MONGODB_COLLECTION` | Incident storage |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Google OAuth |
| `FRONTEND_URL` | CORS + post-login redirects |
| `AUTH_SESSION_SECRET` / `AUTH_SESSION_HOURS` | Session cookies |
| `SMTP_*` | Email verification codes |
| `MIDTRANS_*` | Subscription payments |

### AI — `main` (DeepSeek)

```env
DEEPSEEK_API_KEY=
# optional overrides
# DEEPSEEK_MODEL=deepseek-chat
# DEEPSEEK_BASE_URL=https://api.deepseek.com
```

### AI — `hacktoon` (Fireworks)

```env
FIREWORKS_API_KEY=
FIREWORKS_MODEL=accounts/fireworks/models/deepseek-v4-pro
FIREWORKS_BASE_URL=https://api.fireworks.ai/inference/v1
```

### Frontend

```env
VITE_SOCKET_URL=http://localhost:3000
```

### Production OAuth checklist

- `GOOGLE_CALLBACK_URL` must be the **backend** URL, e.g.  
  `https://YOUR-RAILWAY-SERVICE.up.railway.app/auth/google/callback`
- `FRONTEND_URL` must be the **Vercel** app URL, e.g.  
  `https://your-app.vercel.app`
- Google Cloud Console:
  - **Authorized JavaScript origins** → your Vercel origin  
  - **Authorized redirect URIs** → same value as `GOOGLE_CALLBACK_URL`

---

## Useful API routes

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/health` | Bridge health / version |
| `POST` | `/ingest` | Incident ingest (`X-Api-Key` or `INGEST_TOKEN`) |
| `GET` | `/auth/google` | Start Google OAuth |
| `GET` | `/auth/google/callback` | OAuth callback |
| `GET` | `/ai/status` | Whether AI is configured |
| `POST` | `/ai/chat` | Threat / landing assistant |
| `POST` | `/ai/intel/daily-commentary` | Intel AI commentary |

---

## License

Private project — all rights reserved unless otherwise stated.
