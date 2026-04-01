# Assumptions Register

> Assumptions are **guesses made due to a knowledge gap** — things we don't know for certain but need to move forward on. Each assumption carries risk: if it turns out to be wrong, the dependent work may need to change.
>
> **What belongs here:**
> - Guesses about user behavior, system scale, or real-world conditions that we haven't validated
> - Estimates that we're not confident in but are using as a working baseline
> - Things we assumed because we couldn't get a definitive answer yet
>
> **What does NOT belong here:**
> - Decisions (those go in `backend/Iteration-1-Decisions.md`)
> - Deferred work items (those go in `DEFERRED-TODOS.md`)
> - Facts derived from the codebase or specs (those are just... facts)

---

## System Scale

- **A1 — System size per project:** Typical systems have 20–30 assets with connections between them. This is small enough that a plain in-memory adjacency list is sufficient for graph operations — no graph library needed. *(Decided: 2026-04-02)*

## CVE Matching

- **A4 — NVD API is the sole CVE source:** No other vulnerability databases (OSV, GitHub Advisory, Snyk) are queried. NVD covers the broadest range but may miss ecosystem-specific vulnerabilities. *(Decided: 2026-04-02)*

- **A6 — No CVE scoring/filtering:** All CVEs returned by NVD for a given software component are displayed as-is. The user decides relevance — no match-score thresholds, no tier labels. *(Decided: 2026-04-02)*

## Pipeline

- **A7 — Sequential is fine for steps 4–6:** With 20–30 assets, each step completes in seconds (except LLM calls). No need for parallelism beyond the existing steps 2+3 fan-out. *(Implicit from system scale)*

- **A8 — LLM latency is acceptable:** Multiple LLM calls per run (ingestion, threats in batches of 3, attack path evaluation, mitigations) may take 30–60 seconds total. Users are OK waiting — the polling UI shows progress. *(Implicit — no user feedback yet)*

- **A9 — Max-hop default of 10 for attack paths:** Configurable at run level. 10 is generous for a 20–30 node system — most realistic paths will be 3–5 hops. The high default avoids accidentally pruning valid paths. *(Decided: 2026-04-02)*
