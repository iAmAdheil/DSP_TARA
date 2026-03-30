# TARA Application Model - Entities, Workflows, and Feature I/O

## 1) Core Entities

## 1.1 User
Represents a person using the platform.

Fields:
- `user_id` (string, immutable)
- `name` (string)
- `email` (string, unique)
- `role` (`owner` | `analyst` | `reviewer` | `viewer`)
- `created_at` (datetime)
- `last_active_at` (datetime)

Owns/Accesses:
- Projects
- Runs
- Reports

## 1.2 Workspace (optional but recommended)
Container for team-level collaboration.

Fields:
- `workspace_id`
- `name`
- `members[]`
- `default_risk_profile`

Contains:
- Many projects

## 1.3 Project
Top-level object for a target system/vehicle program.

Fields:
- `project_id`
- `workspace_id`
- `name`
- `domain` (`automotive` | `general-system-security`)
- `status` (`active` | `archived`)
- `created_by`
- `created_at`

Contains:
- Runs
- Project-level settings (risk weights, templates)

## 1.4 Run
A single analysis execution snapshot for a project.

Fields:
- `run_id`
- `project_id`
- `initiated_by`
- `status` (`queued` | `running` | `completed` | `failed`)
- `started_at`
- `completed_at`
- `model_version`
- `retrieval_index_version`
- `config_snapshot`

Contains generated artifacts:
- Canonical model
- Threats
- CVE matches
- Attack paths
- Risk scores
- Mitigations
- Export files

## 1.5 Input Artifact
User-provided data used for ingestion.

Fields:
- `artifact_id`
- `run_id`
- `type` (`text` | `form` | `file`)
- `filename` (if file)
- `content_hash`
- `uploaded_at`

## 1.6 Canonical System Model
Normalized graph representation of system context.

Sub-entities:
- `Asset`
- `Interface`
- `TrustBoundary`
- `SoftwareInstance`
- `DataFlow`
- `SafetyFunction`

Key links:
- Assets connect via DataFlows and Interfaces.
- Trust boundaries sit between nodes/segments.
- Software instances attach to assets.

## 1.7 Threat
Threat hypothesis generated from system model.

Fields:
- `threat_id`
- `run_id`
- `category` (STRIDE/HEAVENS style)
- `entry_points[]`
- `impacted_assets[]`
- `impact_breakdown`
- `confidence`
- `evidence_refs[]`

## 1.8 CVE Match
Potential vulnerability mapped to components/software.

Fields:
- `cve_id`
- `run_id`
- `matched_assets[]`
- `match_tier` (`exact` | `near` | `contextual`)
- `match_score`
- `why_relevant`
- `published_date`

## 1.9 Attack Path
Multi-step adversarial route through the system.

Fields:
- `path_id`
- `run_id`
- `start_surface`
- `steps[]`
- `target_asset`
- `feasibility_score`
- `impact_score`
- `overall_path_risk`

## 1.10 Risk Item
Prioritized risk unit used for decision-making.

Fields:
- `risk_id`
- `run_id`
- `source_type` (`threat` | `cve` | `attack_path`)
- `source_id`
- `likelihood`
- `impact`
- `exploitability`
- `exposure_modifier`
- `final_score`
- `severity`

## 1.11 Mitigation
Recommended control action tied to one or more risk items.

Fields:
- `mitigation_id`
- `run_id`
- `linked_risks[]`
- `control_type`
- `estimated_effort`
- `expected_risk_reduction`
- `validation_steps[]`

## 1.12 Report/Export
Generated output artifact for sharing/audit.

Fields:
- `report_id`
- `run_id`
- `format` (`json` | `md` | `pdf`)
- `generated_at`
- `download_url`

## 2) Entity Lifecycle (How App Works End-to-End)
1. User selects/creates Project.
2. User starts a new Run.
3. User submits Input Artifacts.
4. Ingestion builds Canonical System Model.
5. Threat engine creates Threat entities.
6. CVE engine maps CVE Match entities.
7. Path engine creates Attack Paths.
8. Risk engine produces Risk Items.
9. Mitigation engine creates Mitigation options.
10. User explores via 2D/3D subsystem views.
11. User exports Report artifacts.

## 3) Main User Workflows

## 3.1 First-Time Analysis Workflow
When used:
- New vehicle/system architecture being assessed first time.

Steps:
1. Create Project.
2. Provide architecture context via text/form/files.
3. Build model and review extraction quality.
4. Generate threats.
5. Match CVEs.
6. Score risks.
7. Review top risks and mitigations.
8. Export initial baseline report.

## 3.2 Iteration/Re-Run Workflow
When used:
- Architecture changes, software version changes, or new data available.

Steps:
1. Open existing Project.
2. Start new Run from previous baseline.
3. Update only changed inputs.
4. Recompute threats/CVEs/risks.
5. Compare run diffs.
6. Update mitigation backlog.

## 3.3 Engineering Triage Workflow
When used:
- Team needs actionable priorities for implementation.

Steps:
1. Open completed Run.
2. Filter Risk queue by severity and subsystem.
3. Open risk explainability panel.
4. Review recommended mitigations.
5. Simulate control impact.
6. Export prioritized action plan.

## 3.4 Subsystem Drilldown Workflow
When used:
- Need to isolate one part (e.g., infotainment, telematics, gateway).

Steps:
1. Open 2D/3D explorer.
2. Select subsystem.
3. View linked threats/CVEs/paths.
4. Inspect risk and mitigation for that subsystem only.

## 4) Feature-by-Feature Input/Output Contracts

## 4.1 System Ingestion
Input:
- Free text architecture description.
- Structured metadata form.
- Files (CSV/JSON/YAML/docs).

Output:
- Canonical model graph.
- Model quality score.
- Assumption register.
- Missing-data checklist.

## 4.2 Canonical Model Explorer
Input:
- `run_id` + canonical graph.

Output:
- Interactive graph/tree.
- Node detail inspector (metadata, relations, evidence).

## 4.3 Threat Generation
Input:
- Canonical model.
- Threat config (framework mode, confidence threshold).

Output:
- Threat list with categories, entry points, impacts, confidence, evidence.
- Threat coverage stats by subsystem.

## 4.4 CVE Matching
Input:
- Software instances + versions/CPE candidates.
- Retrieval config (sources, thresholds).

Output:
- CVE match list with tier, score, rationale, affected assets.
- Uncertainty labels for inferred matches.

## 4.5 Attack Path Builder
Input:
- Canonical graph + threats + CVE matches.

Output:
- Ranked multi-step attack paths.
- Per-path feasibility + impact + linked evidence.

## 4.6 Risk Prioritization
Input:
- Threat/CVE/path artifacts.
- Scoring profile weights.

Output:
- Ranked risk register with numeric score + severity buckets.
- Explainability breakdown per risk item.

## 4.7 Mitigation Planner
Input:
- Ranked risk items.
- Available control catalog/policies.

Output:
- Mitigation suggestions with effort and expected risk reduction.
- Validation checklist per mitigation.

## 4.8 What-If Simulation
Input:
- Selected mitigations/controls.

Output:
- Before/after risk delta.
- Residual risk profile.

## 4.9 Subsystem Explorer (2D/3D)
Input:
- Subsystem mapping from canonical assets.
- Threat/CVE/risk links.

Output:
- Clickable subsystem views with overlays.
- Isolated risk breakdown for selected subsystem.

## 4.10 Reports & Export
Input:
- `run_id` + selected include options.

Output:
- JSON/MD/PDF export packages.
- Evidence/provenance snapshot.

## 4.11 Run History and Diff
Input:
- Project run list + selected run IDs.

Output:
- Timeline/history view.
- Delta report (new/removed/changed threats, CVEs, risks).

## 5) When a User Uses Which Feature
- `System Ingestion`: at run start or when system context changes.
- `Threat Generation`: after model is valid.
- `CVE Matching`: after software/component mapping exists.
- `Attack Paths`: after threats/CVEs are present.
- `Risk Prioritization`: after path/threat/cve artifacts exist.
- `Mitigation Planner`: once priorities are known.
- `Subsystem Explorer`: anytime for focused analysis.
- `Export`: after review or for stakeholder sync.
- `Run History`: during iteration and comparison.

## 6) Permissions by Role (Recommended)
- `Owner`: full control (project settings, runs, exports, members).
- `Analyst`: create runs, edit inputs, generate artifacts, export.
- `Reviewer`: view runs, comment/approve, export.
- `Viewer`: read-only access.

## 7) Minimal API Object References (for frontend integration)
- `/projects` -> Project objects
- `/projects/{id}/runs` -> Run list
- `/runs/{id}/ingestion` -> canonical model + quality
- `/runs/{id}/threats` -> Threat[]
- `/runs/{id}/cves` -> CVE Match[]
- `/runs/{id}/paths` -> Attack Path[]
- `/runs/{id}/risks` -> Risk Item[]
- `/runs/{id}/mitigations` -> Mitigation[]
- `/runs/{id}/exports` -> Report[]

## 8) Frontend Data Dependencies (Critical)
- No Threat/CVE/Path modules without `run_id`.
- No Risk module before threat/cve/path generation complete.
- No Simulation before mitigation recommendations exist.
- 3D explorer must degrade to 2D when geometry/model unavailable.

This ensures predictable flow and prevents invalid user journeys.
