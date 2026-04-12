# TARA — Threat Analysis & Risk Assessment Platform

An LLM-powered security analysis tool for automotive and embedded systems. Describe a vehicle architecture in plain text; TARA builds a system model, generates STRIDE threats, matches CVEs, constructs attack paths, scores risk, and recommends mitigations — all in one pipeline.

---

## What It Does

Given a system description like:

> "My Toyota Camry has a Bluetooth chip running Linux 5.4, a CAN bus, and a Brake ECU"

TARA will:

1. **Ingest & normalize** — extract assets, interfaces, trust boundaries, data flows, and software instances into a canonical graph
2. **Generate threats** — produce STRIDE-categorized threat hypotheses with entry points, preconditions, and impact breakdown
3. **Match CVEs** — query NVD for known vulnerabilities affecting identified software components
4. **Build attack paths** — construct multi-hop adversarial routes from external surfaces to safety-critical assets
5. **Score risk** — rank threats/CVEs/paths using `Likelihood × Impact × Exploitability × ExposureModifier`, with automotive safety weighting
6. **Recommend mitigations** — suggest controls with effort estimates and expected risk reduction
7. **Export** — generate JSON/Markdown reports with full evidence traceability

---

## Project Structure

```
dsp-project/
├── dsp-backend/       # Fastify API + BullMQ pipeline workers
├── dsp-frontend/      # React SPA (Vite + TanStack Query + Cytoscape)
└── dsp-project-notes/ # Specs, decisions, assumptions, deferred work
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend API | Fastify (TypeScript), Zod, Prisma ORM |
| Database | PostgreSQL |
| Job Queue | BullMQ + Redis |
| AI | Google Gemini (`@google/generative-ai`) |
| CVE Data | NVD API |
| Auth | Fastify JWT + httpOnly cookies |
| Frontend | React 18, React Router, TanStack Query |
| Graph UI | Cytoscape.js + cytoscape-dagre |
| Styling | Tailwind CSS, Geist font |

---

## Getting Started

### Prerequisites

- **Node.js 20+** (or [Bun](https://bun.sh))
- **PostgreSQL** — a local database named `dsp` is expected by default
- **Redis** — default `redis://localhost:6379`
- **Gemini API key** — create one at [Google AI Studio](https://aistudio.google.com/app/apikey)
- **NVD API key** (optional but recommended to avoid rate limits) — request one at [nvd.nist.gov](https://nvd.nist.gov/developers/request-an-api-key)

---

### 1. Clone & install

```bash
git clone <repo-url>
cd dsp-project
```

---

### 2. Backend setup

```bash
cd dsp-backend
npm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

`.env` variables:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/dsp` |
| `REDIS_URL` | Yes | Redis connection string, e.g. `redis://localhost:6379` |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `JWT_SECRET` | Yes | Random string, at least 32 characters |
| `NVD_API_KEY` | No | NVD API key; omitting it works but requests are heavily rate-limited |
| `PORT` | No | API port (default: `4000`) |
| `GEMINI_LLM_MODEL` | No | Gemini model for text generation (default: `gemini-2.5-flash`) |

Run database migrations:

```bash
npx prisma migrate deploy
```

Start the API server and pipeline worker in two separate terminals:

```bash
# Terminal 1 — API server (http://localhost:4000)
npm run dev

# Terminal 2 — BullMQ pipeline worker
npm run dev:worker
```

Both processes must be running for the pipeline to work. The API enqueues jobs; the worker executes them.

---

### 3. Frontend setup

```bash
cd dsp-frontend
npm install
npm run dev          # Vite dev server at http://localhost:5173
```

The frontend connects to the backend at `http://localhost:4000` (hardcoded in `src/lib/api.ts`). If you change the backend port, update that file.

---

### 4. Regenerate API types (optional)

Both packages use `openapi-typescript` to generate typed API clients from the OpenAPI spec. Run this after modifying `dsp-backend/openapi.yaml`:

```bash
# In dsp-backend/
npm run api:types     # regenerates src/core/types/openapi.generated.ts

# In dsp-frontend/
npm run api:types     # regenerates src/generated/api.ts
```

---

### Available scripts

**Backend (`dsp-backend/`)**

| Script | Description |
|---|---|
| `npm run dev` | Start API server with hot reload (`tsx watch`) |
| `npm run dev:worker` | Start pipeline worker with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled API server |
| `npm run start:worker` | Run compiled worker |
| `npm run typecheck` | Type-check without emitting |
| `npm run api:lint` | Lint OpenAPI spec with Redocly |
| `npm run api:preview` | Preview API docs via Redocly |

**Frontend (`dsp-frontend/`)**

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint |
| `npm run api:types` | Regenerate typed API client from OpenAPI spec |

---

## Pipeline Architecture

The analysis pipeline runs as a BullMQ job, allowing the frontend to poll for progress across 6 steps:

```
POST /runs/:runId/start
        │
        ▼
[1] ingestion      → canonical system graph (Gemini extraction)
[2] threats        → STRIDE threat list (Gemini, batched by 3 assets)
[3] cves           → NVD CVE matches per software instance
[4] attack_paths   → BFS paths + Gemini plausibility scoring
[5] risk           → scored risk register
[6] mitigations    → Gemini-generated control recommendations
```

Each step writes artifacts to Postgres under the `run_id`. The frontend polls `GET /runs/:runId` and renders each module as its step completes.

---

## Data Model (Key Entities)

| Entity | Description |
|---|---|
| `Project` | Top-level container for a target system |
| `Run` | A single analysis execution snapshot |
| `Asset` | ECU, module, or logical component |
| `Interface` | External/internal surface (Bluetooth, CAN, USB, API) |
| `TrustBoundary` | Boundary between network segments |
| `SoftwareInstance` | Software/firmware with version + CPE candidates |
| `DataFlow` | Directed communication edge with protocol |
| `Threat` | STRIDE hypothesis with entry points + confidence |
| `CveMatch` | NVD CVE linked to a software component |
| `AttackPath` | Multi-hop adversarial route with feasibility score |
| `RiskItem` | Scored and ranked risk unit |
| `Mitigation` | Control recommendation with effort + delta |
| `Report` | Export artifact (JSON / Markdown) |

---

## Frontend Pages

| Route | Page |
|---|---|
| `/auth` | Sign in / sign up |
| `/projects` | Project workspace |
| `/runs/:id/ingestion` | System ingestion + model quality |
| `/runs/:id/model` | Canonical model explorer (Cytoscape graph) |
| `/runs/:id/threats` | Threat generation list |
| `/runs/:id/cves` | CVE matching results |
| `/runs/:id/paths` | Attack path visualization |
| `/runs/:id/risk` | Risk prioritization register |
| `/runs/:id/mitigations` | Mitigation planner |
| `/runs/:id/subsystems` | 2D subsystem explorer |
| `/runs/:id/car` | 3D car inspector |
| `/runs/:id/export` | Reports & export |
| `/runs/:id/history` | Run history & diff |

---

## API Reference

Full OpenAPI spec: `dsp-backend/openapi.yaml`

Core endpoints:

```
POST   /auth/sign-up
POST   /auth/sign-in
POST   /projects
GET    /projects
GET    /projects/:id/runs
POST   /runs
POST   /runs/:id/start
GET    /runs/:id
GET    /runs/:id/threats
GET    /runs/:id/cves
GET    /runs/:id/paths
GET    /runs/:id/risks
GET    /runs/:id/mitigations
GET    /runs/:id/exports
```

---

## Risk Scoring Formula

```
Risk = Likelihood × Impact × Exploitability × ExposureModifier
```

Default automotive impact weights (configurable per project):

| Dimension | Weight |
|---|---|
| Safety | 0.45 |
| Operational | 0.25 |
| Security / Data | 0.20 |
| Financial / Compliance | 0.10 |

Scores produce `Critical`, `High`, `Medium`, `Low` severity buckets. Every score exposes its input factors, weights, and intermediate calculations for auditability.

---

## Known Limitations & Deferred Work

See [`dsp-project-notes/DEFERRED-TODOS.md`](dsp-project-notes/DEFERRED-TODOS.md) for the full list. Key items:

- **Auth** — JWT auth is in place but server-side sign-out is not yet implemented
- **Export** — currently generates a JSON data URL stub; real file generation and PDF export are deferred
- **CVE performance** — NVD matching can be slow on runs with many software components; vector-embedding-based relevance filtering is planned but not built
- **Threat triage** — per-threat accept/reject status is deferred pending schema change
- **File upload** — `.arxml`/`.json`/`.yaml` system model upload is deferred; free-text input is the only supported ingestion path today

See [`dsp-project-notes/ASSUMPTIONS.md`](dsp-project-notes/ASSUMPTIONS.md) for active working assumptions (system scale, NVD as sole CVE source, LLM latency tolerance, etc.).

---

## Out of Scope

- SOC / SIEM alert triage workflows
- Runtime IDS/IPS agent deployment on ECUs
- OTA patch orchestration
- Full physics-fidelity digital twin simulation
