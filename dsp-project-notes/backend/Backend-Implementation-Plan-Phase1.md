# Backend Implementation Plan - Phase 1 Scaffold Only

## 1) Scope of This Phase
This phase sets up backend structure only. No business logic, no heavy integrations, no optimization work.

In scope:
- Directory/file structure
- Route registry
- Controller/service/model placeholders
- DTO/schema placeholders
- Shared types and response contracts
- Module boundaries and ownership

Out of scope:
- Real CVE retrieval logic
- LLM logic
- Queue/job execution logic
- DB persistence logic
- Auth logic
- Observability tooling

## 2) Mandatory Principles for Backend Agent
- Do not add logic in route files; route files only wire handlers.
- Controller orchestrates request/response, never heavy computation.
- Service owns use-case logic.
- Model files define shapes/contracts only.
- One module = one domain (`users`, `projects`, `runs`, `threats`, etc.).
- Every module exposes `route`, `controller`, `service`, `model`, `schema` files.
- No cross-module deep imports; use module index exports.

## 3) Phase-1 Target Structure
```text
dsp-backend/
  package.json
  tsconfig.json
  .env.example
  README.md
  prisma/
    schema.prisma
  src/
    app.ts
    server.ts
    config/
      env.ts
    core/
      http/
        create-app.ts
        route-registry.ts
      types/
        api.ts
        entities.ts
    db/
      prisma-client.ts
    queues/
      queue-names.ts
      run-queue.ts
    modules/
      health/
      users/
      projects/
      runs/
      ingestion/
      threats/
      cves/
      attack-paths/
      risks/
      mitigations/
      exports/
    utils/
      http-response.ts
```

Each module must contain:
```text
<module>/
  <module>.route.ts
  <module>.controller.ts
  <module>.service.ts
  <module>.model.ts
  <module>.schema.ts
  index.ts
```

## 4) HTTP API Surface (Placeholder Contracts)
- `GET /health`
- `POST /users`
- `GET /users/:userId`
- `POST /projects`
- `GET /projects/:projectId`
- `POST /projects/:projectId/runs`
- `GET /runs/:runId`
- `POST /runs/:runId/ingestion`
- `POST /runs/:runId/threats/generate`
- `POST /runs/:runId/cves/match`
- `POST /runs/:runId/attack-paths/build`
- `POST /runs/:runId/risks/score`
- `POST /runs/:runId/mitigations/recommend`
- `POST /runs/:runId/exports`

Phase-1 handlers return deterministic placeholder payloads only.

## 5) Naming & File Rules
- File names: kebab-case.
- Exported types/interfaces: PascalCase.
- Route handler methods: `<action><Entity>` (`createRun`, `getRun`, etc.).
- Keep files small and single-purpose.

## 6) Implementation Sequence
1. Base runtime files (`app.ts`, `server.ts`, env/config)
2. Core API/entity types
3. Shared route registry
4. Scaffold all modules with placeholders
5. Register all module routes
6. Verify TypeScript compile-level structure

## 7) Acceptance Criteria
- All modules exist with required files.
- All listed routes are registered.
- Server boots with no missing import errors.
- Every endpoint returns typed placeholder response.
- No business logic or integration code is embedded yet.

## 8) Next Phase Preview
After this scaffold phase, implementation phase starts:
- real DB modeling
- real run pipeline orchestration
- CVE source adapters
- risk scoring and mitigation logic
