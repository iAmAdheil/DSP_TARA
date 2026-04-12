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

- Node.js 20+ / Bun
- PostgreSQL
- Redis

### Backend

```bash
cd dsp-backend
cp .env.example .env        # fill in DATABASE_URL, REDIS_URL, GEMINI_API_KEY, JWT_SECRET
npx prisma migrate deploy
npm run dev                 # API on :3000
npm run dev:worker          # Pipeline worker process
```

### Frontend

```bash
cd dsp-frontend
npm install
npm run dev                 # Vite dev server on :5173
```

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
