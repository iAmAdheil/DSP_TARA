---
excalidraw-plugin: parsed
tags: [excalidraw]
---
==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠== You can decompress Drawing data with the command palette: 'Decompress current Excalidraw file'. For more info check in plugin settings under 'Saving'

# Excalidraw Data

## Text Elements
%%
## Drawing
```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://github.com/zsviczian/obsidian-excalidraw-plugin",
  "elements": [
    {
      "id": "title", "type": "text",
      "x": 50, "y": 14, "width": 860, "height": 28,
      "angle": 0, "strokeColor": "#1e40af", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 5001, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "Step 5 — Risk Scoring & Ranking",
      "fontSize": 24, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "Step 5 — Risk Scoring & Ranking",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "subtitle", "type": "text",
      "x": 50, "y": 46, "width": 860, "height": 18,
      "angle": 0, "strokeColor": "#374151", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 5002, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "Worker: risk.worker.ts  |  Fixed 4-factor formula  |  1 RiskItem per threat, CVE, and attack path  |  No LLM",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "Worker: risk.worker.ts  |  Fixed 4-factor formula  |  1 RiskItem per threat, CVE, and attack path  |  No LLM",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "box-input", "type": "rectangle",
      "x": 30, "y": 80, "width": 170, "height": 110,
      "angle": 0, "strokeColor": "#1e40af", "backgroundColor": "#a5d8ff",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 3 }, "seed": 5003, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false
    },
    {
      "id": "text-input", "type": "text",
      "x": 35, "y": 94, "width": 160, "height": 82,
      "angle": 0, "strokeColor": "#1e40af", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 5004, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "FROM DB\nThreat[]\nCVEMatch[]\nAttackPath[]\nCanonicalModel",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "FROM DB\nThreat[]\nCVEMatch[]\nAttackPath[]\nCanonicalModel",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "arrow-in", "type": "arrow",
      "x": 200, "y": 135, "width": 50, "height": 0,
      "angle": 0, "strokeColor": "#3b82f6", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 2 }, "seed": 5005, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false,
      "points": [[0, 0], [50, 0]], "lastCommittedPoint": null,
      "startBinding": null, "endBinding": null, "startArrowhead": null, "endArrowhead": "arrow"
    },
    {
      "id": "box-formula", "type": "rectangle",
      "x": 250, "y": 80, "width": 280, "height": 270,
      "angle": 0, "strokeColor": "#374151", "backgroundColor": "#eebefa",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 3 }, "seed": 5006, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false
    },
    {
      "id": "text-formula", "type": "text",
      "x": 255, "y": 88, "width": 270, "height": 254,
      "angle": 0, "strokeColor": "#374151", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 5007, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "Fixed formula 「hardcoded weights」\n\nfinalScore =\n  0.30 x likelihood\n+ 0.30 x impact\n+ 0.25 x exploitability\n+ 0.15 x exposureModifier\n\nFactor sources vary by sourceType:\n\nthreat → confidence, asset crit, 0.5, exposure\ncve → 0.8, asset crit, cvss/10, exposure\nattack_path → feasibility, target crit,\n  max cvss at hops, boundary penalty\n\nSeverity buckets:\ncritical 「0.8-1.0」  high 「0.6-0.79」\nmedium 「0.4-0.59」  low 「0.0-0.39」",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "Fixed formula 「hardcoded weights」\n\nfinalScore =\n  0.30 x likelihood\n+ 0.30 x impact\n+ 0.25 x exploitability\n+ 0.15 x exposureModifier\n\nFactor sources vary by sourceType:\n\nthreat → confidence, asset crit, 0.5, exposure\ncve → 0.8, asset crit, cvss/10, exposure\nattack_path → feasibility, target crit,\n  max cvss at hops, boundary penalty\n\nSeverity buckets:\ncritical 「0.8-1.0」  high 「0.6-0.79」\nmedium 「0.4-0.59」  low 「0.0-0.39」",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "arrow-out", "type": "arrow",
      "x": 530, "y": 215, "width": 60, "height": 0,
      "angle": 0, "strokeColor": "#0ca678", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 2 }, "seed": 5008, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false,
      "points": [[0, 0], [60, 0]], "lastCommittedPoint": null,
      "startBinding": null, "endBinding": null, "startArrowhead": null, "endArrowhead": "arrow"
    },
    {
      "id": "box-output", "type": "rectangle",
      "x": 590, "y": 80, "width": 280, "height": 270,
      "angle": 0, "strokeColor": "#0ca678", "backgroundColor": "#b2f2bb",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 3 }, "seed": 5009, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false
    },
    {
      "id": "text-output", "type": "text",
      "x": 595, "y": 88, "width": 270, "height": 254,
      "angle": 0, "strokeColor": "#15803d", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 5010, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "RiskItem[]\n「flat list — Option A」\n「1 per threat + 1 per CVE + 1 per path」\n「ranked by finalScore DESC」\n\nsourceType 「threat | cve | attack_path」\nsourceId\nfinalScore\nseverity 「critical|high|medium|low」\n\nbreakdown 「JSON」:\n  likelihood: value, weight, contribution\n  impact: value, weight, contribution\n  exploitability: value, weight, contribution\n  exposureModifier: value, weight, contribution\n  each with source label\n\n→ DB: INSERT many\n→ formula displayed on frontend",
      "fontSize": 13, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "RiskItem[]\n「flat list — Option A」\n「1 per threat + 1 per CVE + 1 per path」\n「ranked by finalScore DESC」\n\nsourceType 「threat | cve | attack_path」\nsourceId\nfinalScore\nseverity 「critical|high|medium|low」\n\nbreakdown 「JSON」:\n  likelihood: value, weight, contribution\n  impact: value, weight, contribution\n  exploitability: value, weight, contribution\n  exposureModifier: value, weight, contribution\n  each with source label\n\n→ DB: INSERT many\n→ formula displayed on frontend",
      "autoResize": true, "lineHeight": 1.25
    }
  ],
  "appState": { "gridSize": null, "viewBackgroundColor": "#ffffff" },
  "files": {}
}
```
%%
