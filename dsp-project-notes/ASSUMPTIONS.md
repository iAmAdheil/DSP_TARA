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

- **A6 — CVE relevance is user-determined:** CVEs are returned as-is from NVD without relevance filtering. The user decides what's applicable to their specific deployment. Match tiers (`exact`, `cpe`, `keyword`) are stored for transparency but are not used to filter results. *(Updated: 2026-04-02)*

- **A11 — CVE version filtering not applied on "cpe" tier:** When the exact versioned CPE returns 0 results, we query the base product CPE without version and return the top 100 by CVSS score. We assume the most severe CVEs for a product are relevant regardless of exact version. A CVE fixed before the installed version may still appear — the user is responsible for filtering by version relevance. *(Decided: 2026-04-02)*

## Pipeline

- **A7 — Sequential is fine for steps 4–6:** With 20–30 assets, each step completes in seconds (except LLM calls). No need for parallelism beyond the existing steps 2+3 fan-out. *(Implicit from system scale)*

- **A8 — LLM latency is acceptable:** Multiple LLM calls per run (ingestion, threats in batches of 3, attack path evaluation, mitigations) may take 30–60 seconds total. Users are OK waiting — the polling UI shows progress. *(Implicit — no user feedback yet)*

- **A9 — Max-hop default of 10 for attack paths:** Configurable at run level. 10 is generous for a 20–30 node system — most realistic paths will be 3–5 hops. The high default avoids accidentally pruning valid paths. *(Decided: 2026-04-02)*

## Mitigation Generation

- **A10 — LLM training data is sufficient for mitigations:** Gemini generates mitigations from its general training data without a structured control catalog (ISO 27001, NIST 800-53, ISO 21434, etc.). We assume the quality is good enough for iteration 2. If mitigations turn out to be too generic or miss domain-specific controls, a catalog lookup layer should be added. *(Decided: 2026-04-02)*
