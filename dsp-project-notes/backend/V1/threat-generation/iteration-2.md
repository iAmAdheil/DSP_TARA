# Threat Generation — Backend Iteration 2

## Context

Iteration 1 is in place. Four backend issues were identified in QA. B-01 and B-02 are blockers. B-03 and B-05 are quality improvements that should ship in the same iteration.

Reference: `QA/V1/threat-generation/qa-findings-iteration-1.md`

---

## Changes Required

### 1. Gate HEAVENS Pass on Project Domain (B-01 — Blocker)

**Problem:** The HEAVENS generation pass runs for every project regardless of domain. A `general_system_security` project (EV Charging Station) produced 6 HEAVENS threats in the DB. The current code asks the LLM to "determine if this system is automotive-related" — but that self-check is unreliable. The authoritative signal is `project.domain`, which is already stored in the DB.

**Root cause:** The worker fetches `run.project.systemContext` but not `project.domain`. The HEAVENS block runs unconditionally and relies on the LLM to self-police via the prompt instruction `"Determine if this system is automotive-related. If yes, generate HEAVENS threats. If not, return empty threats array."` The LLM sometimes gets this wrong.

**Fix — `src/workers/threats.worker.ts`:**

Update the project query to also select `domain`:

```ts
const run = await prisma.run.findUniqueOrThrow({
  where: { id: runId },
  include: { project: { select: { systemContext: true, domain: true } } },
});
```

Wrap the entire HEAVENS pass in a domain guard:

```ts
// HEAVENS pass — only for automotive domain
if (run.project.domain === "automotive") {
  // ... existing HEAVENS block unchanged
}
```

Remove the LLM self-check instruction `"Determine if this system is automotive-related..."` from the HEAVENS user message — it is no longer needed and may cause the LLM to second-guess the gate.

---

### 2. Constrain HEAVENS Category Names to Enum (B-02 — Blocker)

**Problem:** The `category` field in HEAVENS threats is a free `SchemaType.STRING` with no enum constraint. The LLM generates verbose prose like `"Safety impact on vehicle occupants and road users"` instead of the short token `"Safety"`. This breaks the table layout (multiline category badges) and undermines the HEAVENS acronym-based sort order.

**Root cause:** `THREAT_SCHEMA` uses `category: { type: SchemaType.STRING }` with no enum. The HEAVENS system prompt lists categories as bullet-point descriptions, not short tokens, so the LLM copies the description rather than using a short name.

**Fix — `src/workers/threats.worker.ts`:**

The current `THREAT_SCHEMA` is shared between STRIDE and HEAVENS. Split into two schemas — `STRIDE_THREAT_SCHEMA` and `HEAVENS_THREAT_SCHEMA` — differing only in the `category` enum constraint:

```ts
const HEAVENS_CATEGORY_ENUM = ["Safety", "Financial", "Operational", "Privacy", "Environmental", "Hazardous Event"];

const HEAVENS_THREAT_SCHEMA = {
  // identical to THREAT_SCHEMA except:
  type: SchemaType.OBJECT,
  properties: {
    threats: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          // ... all other fields identical to THREAT_SCHEMA items ...
          category: {
            type: SchemaType.STRING,
            enum: HEAVENS_CATEGORY_ENUM,
          },
          // ...
        },
        required: [ /* same required list */ ],
      },
    },
  },
  required: ["threats"],
};
```

Use `HEAVENS_THREAT_SCHEMA` in the HEAVENS `geminiStructuredCall`:

```ts
const result = await geminiStructuredCall<ThreatBatchResponse>({
  systemPrompt: HEAVENS_SYSTEM_PROMPT,
  userMessage,
  responseSchema: HEAVENS_THREAT_SCHEMA,   // ← was THREAT_SCHEMA
});
```

Also update `HEAVENS_SYSTEM_PROMPT` to list the canonical short tokens explicitly:

```
HEAVENS threat categories — use ONLY these exact values for `category`:
- Safety
- Financial
- Operational
- Privacy
- Environmental
- Hazardous Event
```

---

### 3. Improve HEAVENS Prompt to Cover Financial Category (B-03)

**Problem:** Financial HEAVENS threats were entirely absent from the QA run. For an ADAS system with an OTA update channel and OEM backend, financial risk scenarios are plausible (OTA ransomware, disruption of paid V2X services, unauthorized firmware modification causing recall costs). Only 6 HEAVENS threats were generated — 5 Safety and 1 Operational.

**Root cause:** The HEAVENS system prompt describes financial threats as `"Financial damage to OEM or vehicle owner"` — too abstract for the LLM to generate concrete threats from it. The prompt also doesn't push for diversity across categories.

**Fix — `src/workers/threats.worker.ts`:**

Update `HEAVENS_SYSTEM_PROMPT` to add concrete financial threat examples and require coverage across at least Safety, Financial, and Operational categories:

```
HEAVENS threat categories — use ONLY these exact values for `category`:
- Safety: Threats that could cause physical harm to vehicle occupants or road users
- Financial: Threats causing economic damage — ransomware on OTA channels, unauthorized
  use of paid services, actions that could trigger recalls or warranty claims
- Operational: Threats causing vehicle malfunction, unavailability, or erratic behavior
- Privacy: Threats exposing driver/passenger location or personal data
- Environmental: Threats causing environmental damage (fuel spill, battery fire, etc.)
- Hazardous Event: Threats triggering hazardous situations not covered by Safety

Generate threats across multiple categories. Do not generate exclusively Safety threats.
For each trust boundary crossing, consider what financial damage an attacker could cause,
not only what physical harm they could cause.
```

---

## What NOT to Change

- `threats.service.ts` — no changes needed; severity derivation and response shape are correct
- `openapi.yaml` — no schema changes needed for this iteration
- `threats.controller.ts` — no changes needed
- The STRIDE pass — scope all changes to the HEAVENS path and entry point logic only; do not modify STRIDE prompt or schema
- Prisma schema — no migration needed

---

## Deferred to Later Iteration

- **B-04** (attack paths failure not surfaced on Threat Generation page) — this is a pipeline-level concern affecting multiple pages; tracked separately
- **B-06** (safety impact vocabulary may conflict with ISO 26262) — design/standards discussion, not a code change; needs stakeholder input before touching the enum
