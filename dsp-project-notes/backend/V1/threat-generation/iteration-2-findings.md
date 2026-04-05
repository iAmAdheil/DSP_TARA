# Threat Generation — Backend Iteration 2 Findings

## Status: Complete ✓

All spec changes in `iteration-2.md` are implemented and passing typecheck.

---

## Verification Checklist

| Spec Item | Status |
|---|---|
| **B-01** — `project.domain` fetched in run query | ✓ |
| **B-01** — HEAVENS pass wrapped in `if (run.project.domain === "automotive")` | ✓ |
| **B-01** — LLM self-check instruction removed from HEAVENS user message | ✓ |
| **B-02** — `THREAT_SCHEMA` split into `STRIDE_THREAT_SCHEMA` and `HEAVENS_THREAT_SCHEMA` | ✓ |
| **B-02** — `HEAVENS_THREAT_SCHEMA` category field has `enum: HEAVENS_CATEGORY_ENUM` | ✓ |
| **B-02** — `STRIDE_THREAT_SCHEMA` used in STRIDE `geminiStructuredCall` | ✓ |
| **B-02** — `HEAVENS_THREAT_SCHEMA` used in HEAVENS `geminiStructuredCall` | ✓ |
| **B-03** — `HEAVENS_SYSTEM_PROMPT` lists 6 canonical short tokens with descriptions | ✓ |
| **B-03** — Prompt includes concrete financial threat examples (ransomware, OTA, recalls) | ✓ |
| **B-03** — Prompt instructs LLM to generate across multiple categories, not just Safety | ✓ |
| TypeScript typecheck: no errors | ✓ |

---

## Assumptions / Notes

1. **`THREAT_SCHEMA_ITEMS_BASE` shared object** — The non-`category` properties of the schema items are extracted into a shared `THREAT_SCHEMA_ITEMS_BASE` const to avoid duplication between the two schema definitions. The spread syntax is valid for Gemini's schema object format.

2. **`HEAVENS_CATEGORY_ENUM` definition** — Declared as a `const` array so it serves as the single source of truth for both the schema enum and any future normalization fallback.

3. **Non-automotive projects with existing HEAVENS threats** — Threats already in the DB from pre-gate runs are not removed. They remain queryable but no new ones will be generated. Cleanup of dirty data is deferred per the spec's scope.

4. **B-04 / B-06 not in scope** — Attack-path failure surfacing and ISO 26262 vocabulary alignment are explicitly deferred per the spec.
