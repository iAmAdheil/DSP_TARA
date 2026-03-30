# PRD - LLM-based TARA Framework (Core Features Only)

## 1) Product Scope Boundary

### In Scope
- Intake and normalization of automotive/system context from user inputs.
- Threat hypothesis generation using structured threat modeling templates.
- CVE/CPE retrieval and component-to-vulnerability matching.
- Attack-path construction across system boundaries.
- Risk scoring and ranking for threat/CVE combinations.
- Mitigation recommendation generation tied to threats and controls.
- Interactive subsystem-centric exploration (2D + optional 3D mapping).
- Evidence traceability and explainability for every generated item.
- Export/reporting for engineering and audit consumption.

### Out of Scope (for this PRD phase)
- SOC operations workflows (alert triage, SIEM correlation).
- Runtime IDS/IPS agent deployment in production ECUs.
- OTA patch orchestration and deployment automation.
- Full digital twin simulation with physics fidelity.

## 2) System Inputs and Canonical Data Model

### 2.1 Input Channels
- Freeform text description (architecture, components, versions, protocols, use cases).
- Structured form input (vehicle profile, ECU inventory, software stack, connectivity).
- File upload (CSV/JSON/YAML/BOM/architecture docs).

### 2.2 Canonical Internal Model
All input is transformed into a canonical system graph:
- `Asset`: physical/logical component (ECU, infotainment head unit, telematics module, gateway, mobile app backend, cloud service).
- `Interface`: external/internal interaction surface (Bluetooth, Wi-Fi, CAN, LIN, Ethernet, USB, OBD-II, cellular, API).
- `TrustBoundary`: boundary crossing edges (external network to in-vehicle network, infotainment to safety-critical bus).
- `SoftwareInstance`: software/firmware package with version + supplier + CPE candidates.
- `DataFlow`: directional communication edges with protocol + authentication assumptions.
- `SafetyFunction`: vehicle behavior impacted by compromise (braking, steering assist, display-only, telemetry).

### 2.3 Data Validation Rules
- Reject/flag assets with missing identifiers (`name`, `type`).
- Require protocol tagging on every data flow.
- Mark unknown software versions explicitly as `version=unknown` (never infer silently).
- Maintain provenance metadata for every field (`source=user_text`, `source=file`, `source=inferred`).

## 3) Feature Module: Context Ingestion & Normalization

### Functional Behavior
1. Parse raw input into entities and relations.
2. Resolve entity synonyms (e.g., "HU" -> "Head Unit").
3. Build system graph and detect disconnected/ambiguous components.
4. Produce a "model quality score" indicating confidence and missing critical details.

### Key Functions
- Named-entity extraction for automotive/security entities.
- Schema mapping from unstructured text to canonical fields.
- Assumption register generation (explicit assumptions list).

### Outputs
- Canonical graph JSON.
- Data quality diagnostics.
- Missing-information checklist to improve next iteration.

## 4) Feature Module: Threat Hypothesis Generation

### Functional Behavior
1. For each asset/interface/trust boundary, generate candidate threats using STRIDE + automotive extensions (HEAVENS-style categories if enabled).
2. Generate attack preconditions, required capabilities, and exploitation steps.
3. Link each threat to impacted assets, data flows, and safety functions.
4. Tag each threat with confidence and evidence references.

### Threat Object Schema
- `threat_id`
- `category` (Spoofing/Tampering/Repudiation/Information Disclosure/DoS/Elevation of Privilege)
- `title`
- `description`
- `entry_points[]`
- `preconditions[]`
- `attack_steps[]`
- `impacted_assets[]`
- `impacted_safety_functions[]`
- `estimated_likelihood` (ordinal or numeric)
- `estimated_impact` (safety/operational/privacy)
- `confidence`
- `evidence_refs[]`

### Guardrails
- No threat without mapped entry point.
- No high-severity threat without explicit impact rationale.
- Distinguish speculative vs evidence-supported threats.

## 5) Feature Module: CVE/CPE Retrieval and Matching

### Functional Behavior
1. Derive CPE candidates for each software instance.
2. Query CVE sources (NVD + optionally vendor advisories if configured).
3. Perform hybrid matching:
   - Deterministic filter: exact vendor/product/version overlap.
   - Semantic filter: description embedding similarity to component context.
4. Assign relevance tier and explainability note for each match.

### Matching Tiers
- `Tier 1 (Exact)`: direct version match + component fit.
- `Tier 2 (Near)`: product family match with adjacent versions.
- `Tier 3 (Contextual)`: no exact version, but behavior/protocol alignment suggests potential applicability.

### CVE Match Object
- `cve_id`
- `cvss_base`
- `vector`
- `published_date`
- `affected_cpe[]`
- `matched_assets[]`
- `match_tier`
- `match_score`
- `exploitability_notes`
- `why_relevant`

### Guardrails
- Never represent Tier 2/3 as confirmed vulnerability presence.
- Display confidence warnings for inferred matches.
- Preserve source links and retrieval timestamps.

## 6) Feature Module: Attack Path Construction

### Functional Behavior
1. Use graph traversal from external attack surfaces to sensitive/safety-critical assets.
2. Combine threat preconditions and CVE opportunities into multi-step paths.
3. Compute path feasibility based on required privileges, network reachability, and boundary crossings.
4. Rank paths by probable attacker effort vs potential impact.

### Attack Path Schema
- `path_id`
- `start_surface`
- `intermediate_steps[]`
- `target_asset`
- `linked_threats[]`
- `linked_cves[]`
- `required_capabilities`
- `feasibility_score`
- `impact_score`
- `overall_path_risk`

### Path Constraints
- Each step must correspond to an actual graph edge or valid trust-boundary transition.
- Unsupported hops are rejected.
- Circular/self-loop paths are removed unless explicitly modeling persistence behavior.

## 7) Feature Module: Risk Scoring and Prioritization

### Risk Model
Risk is computed at three levels:
- Threat-level risk.
- CVE-level risk in context.
- Attack-path risk.

### Core Formula (Configurable)
`Risk = Likelihood x Impact x Exploitability x ExposureModifier`

Where:
- `Likelihood`: attacker capability + attack surface accessibility + known exploit maturity.
- `Impact`: weighted across safety, operational continuity, financial, privacy.
- `Exploitability`: CVSS exploitability subcomponents and contextual controls.
- `ExposureModifier`: internet exposure, fleet size, remote accessibility, isolation quality.

### Automotive Safety Weighting
Default impact weight presets (configurable):
- Safety impact: 0.45
- Operational impact: 0.25
- Security/data impact: 0.20
- Financial/compliance impact: 0.10

### Output Categories
- `Critical`, `High`, `Medium`, `Low` based on configurable thresholds.
- Priority queue sorted by risk score + remediation effort estimate.

### Explainability Requirements
Every risk score must expose:
- Input factors used.
- Factor weights.
- Intermediate calculations.
- Uncertainty flags.

## 8) Feature Module: Mitigation Recommendation Engine

### Functional Behavior
1. Generate mitigation candidates per top-ranked threat/path.
2. Map mitigations to control families (authentication hardening, bus segmentation, secure boot, signed OTA, rate limiting, IDS, logging integrity).
3. Estimate effort/complexity and expected risk reduction.
4. Support "what-if" simulation by toggling controls.

### Mitigation Object
- `mitigation_id`
- `title`
- `linked_risks[]`
- `control_type`
- `implementation_notes`
- `estimated_effort`
- `expected_risk_reduction`
- `validation_steps`

### What-if Mode
- User applies candidate control.
- Engine recomputes risk with adjusted likelihood/exploitability/exposure.
- Show before/after score deltas and residual risk.

## 9) Feature Module: Subsystem Visualization (2D + Optional 3D)

### 2D Baseline Visualization
- Component graph view with filters by subsystem (infotainment, telematics, ADAS, gateway, powertrain).
- Heatmap overlays for risk density.
- Click node/edge to view linked threats, CVEs, paths, mitigations.

### Optional 3D Car View (Phase 2)
- 3D model segmented into major vehicle zones/subsystems.
- Click subsystem to isolate associated assets and risk profile.
- Layer toggles for attack surfaces, trust boundaries, and control coverage.

### Data Binding Requirements
- Every visual element maps to canonical IDs.
- Drill-down panel always shows evidence + confidence + timestamp.

## 10) Feature Module: Evidence, Traceability, and Auditability

### Requirements
- Every generated threat/CVE/risk must store provenance.
- Store prompt/version metadata for model reproducibility.
- Maintain immutable run snapshot for audit export.

### Evidence Bundle
- Input artifacts checksum.
- Model version + retrieval index version.
- Source references (NVD/vendor URLs where applicable).
- Decision log for scoring and ranking transitions.

## 11) Feature Module: Reporting and Export

### Export Types
- Machine-readable JSON (full graph + threats + CVEs + risks + mitigations).
- Human-readable markdown/PDF summary focused on prioritized action list.

### Mandatory Report Sections
- System model coverage and uncertainty.
- Top risks and attack paths.
- CVE relevance matrix by subsystem.
- Recommended mitigations with effort vs impact.
- Residual risk after proposed controls.

## 12) Core APIs (Contract-Level)

### `POST /ingest`
Input: raw text/form/files.  
Output: canonical graph + quality diagnostics.

### `POST /threats/generate`
Input: canonical graph ID + generation config.  
Output: threat objects + evidence.

### `POST /cves/match`
Input: graph/software instances + retrieval config.  
Output: matched CVEs + tiers + rationale.

### `POST /paths/build`
Input: graph + threats + CVEs.  
Output: ranked attack paths.

### `POST /risk/score`
Input: threats/CVEs/paths + weighting profile.  
Output: scored and prioritized risk register.

### `POST /mitigations/recommend`
Input: risk register.  
Output: mitigation plan + expected deltas.

### `POST /simulate/controls`
Input: selected controls.  
Output: recomputed risk and residual profile.

### `GET /export/{run_id}`
Output: report artifacts.

## 13) Functional Quality Requirements

### Accuracy and Reliability
- Threat generation must include confidence and uncertainty for each item.
- CVE matching precision targets configurable per tier.
- Deterministic rerun mode for same input + same config.

### Performance Targets (initial)
- Ingestion + normalization: <= 10s for medium system model.
- Threat generation: <= 20s for <= 100 assets.
- CVE matching: <= 25s with indexed retrieval cache.
- Full pipeline end-to-end: <= 90s target for typical academic demo input.

### Scalability Targets
- Support at least 500 assets per run in batch mode.
- Incremental recompute when a small subset of assets changes.

## 14) Safety and Misuse Constraints

- Must not output exploit instructions beyond high-level attack mechanics.
- Must label hypothetical findings as "potential" until validated.
- Must prevent false certainty phrasing for inferred CVE applicability.
- Access control required for project runs containing proprietary architecture data.

## 15) MVP Cut vs Phase 2

### MVP (must build first)
- Ingestion + canonical model.
- Threat generation.
- CVE matching with tiers.
- Risk scoring + prioritization.
- Basic 2D subsystem explorer.
- Report export.

### Phase 2
- 3D subsystem visualization.
- Control simulation with richer policy packs.
- Vendor advisory integration beyond NVD.
- Multi-vehicle/fleet comparative risk analytics.

## 16) Acceptance Criteria (Feature-Level)

### Ingestion
- Given mixed input text + file, system creates valid canonical graph with >= 90% mapped entities (for benchmark datasets).

### Threat Generation
- Every threat has at least one entry point, one impacted asset, and one evidence ref.

### CVE Matching
- Each matched CVE includes tier, score, and rationale.
- Tier 2/3 include uncertainty warning.

### Attack Paths
- Generated paths are graph-valid and reproducible with same inputs.

### Risk Engine
- Score breakdown view is available for every ranked item.

### Mitigations
- Top N risks include at least one recommended mitigation and expected delta.

### Visualization
- User can isolate any subsystem and inspect linked risks in <= 3 interactions.

### Export
- End-to-end run export includes all objects with stable IDs and provenance.

## 17) Implementation Notes for Course Delivery

- Keep logic modular so each module can be demoed independently.
- Treat 3D as optional UI layer over same backend contracts.
- Preserve strict distinction between "detected," "matched," and "inferred" states to avoid overclaiming.
- Prioritize explainability artifacts; they are crucial for evaluation credibility.
