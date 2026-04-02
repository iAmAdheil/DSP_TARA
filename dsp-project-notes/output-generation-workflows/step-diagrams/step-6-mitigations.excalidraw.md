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
      "seed": 6001, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "Step 6 — Mitigation Recommendation",
      "fontSize": 24, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "Step 6 — Mitigation Recommendation",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "subtitle", "type": "text",
      "x": 50, "y": 46, "width": 860, "height": 18,
      "angle": 0, "strokeColor": "#374151", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 6002, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "Worker: mitigations.worker.ts  |  Pure Gemini LLM  |  Batch 3 RiskItems per call  |  Last step → completeRun",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "Worker: mitigations.worker.ts  |  Pure Gemini LLM  |  Batch 3 RiskItems per call  |  Last step → completeRun",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "box-input", "type": "rectangle",
      "x": 30, "y": 80, "width": 180, "height": 75,
      "angle": 0, "strokeColor": "#1e40af", "backgroundColor": "#a5d8ff",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 3 }, "seed": 6003, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false
    },
    {
      "id": "text-input", "type": "text",
      "x": 35, "y": 96, "width": 170, "height": 44,
      "angle": 0, "strokeColor": "#1e40af", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 6004, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "ALL RiskItem[]\n「ordered by finalScore DESC」",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "ALL RiskItem[]\n「ordered by finalScore DESC」",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "arrow-in", "type": "arrow",
      "x": 210, "y": 117, "width": 60, "height": 0,
      "angle": 0, "strokeColor": "#3b82f6", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 2 }, "seed": 6005, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false,
      "points": [[0, 0], [60, 0]], "lastCommittedPoint": null,
      "startBinding": null, "endBinding": null, "startArrowhead": null, "endArrowhead": "arrow"
    },
    {
      "id": "box-llm", "type": "rectangle",
      "x": 270, "y": 80, "width": 250, "height": 195,
      "angle": 0, "strokeColor": "#c2410c", "backgroundColor": "#ffd8a8",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 3 }, "seed": 6006, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false
    },
    {
      "id": "text-llm", "type": "text",
      "x": 275, "y": 88, "width": 240, "height": 180,
      "angle": 0, "strokeColor": "#c2410c", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 6007, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "Gemini  「pure LLM — no catalog」\n\nPer batch of 3 RiskItems:\n- RiskItem details + breakdown\n- source data 「threat/CVE/path」\n- canonical model context\n\nReturns per RiskItem:\n- title + description\n- controlType\n- estimatedEffort\n- expectedRiskReduction 「0-1」\n- validationSteps[]",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "Gemini  「pure LLM — no catalog」\n\nPer batch of 3 RiskItems:\n- RiskItem details + breakdown\n- source data 「threat/CVE/path」\n- canonical model context\n\nReturns per RiskItem:\n- title + description\n- controlType\n- estimatedEffort\n- expectedRiskReduction 「0-1」\n- validationSteps[]",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "arrow-out", "type": "arrow",
      "x": 520, "y": 177, "width": 60, "height": 0,
      "angle": 0, "strokeColor": "#0ca678", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 2 }, "seed": 6008, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false,
      "points": [[0, 0], [60, 0]], "lastCommittedPoint": null,
      "startBinding": null, "endBinding": null, "startArrowhead": null, "endArrowhead": "arrow"
    },
    {
      "id": "box-output", "type": "rectangle",
      "x": 580, "y": 80, "width": 290, "height": 195,
      "angle": 0, "strokeColor": "#0ca678", "backgroundColor": "#b2f2bb",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 3 }, "seed": 6009, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false
    },
    {
      "id": "text-output", "type": "text",
      "x": 585, "y": 88, "width": 280, "height": 180,
      "angle": 0, "strokeColor": "#15803d", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 6010, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "Mitigation[]\n「1 per RiskItem — no dedup」\n\ntitle\ndescription\ncontrolType 「technical|process|policy」\nestimatedEffort 「low|medium|high」\nexpectedRiskReduction 「0-1」\nvalidationSteps[]\nlinkedRisks[] 「1:1 for now」\n\n→ DB: INSERT many\n→ completeRun「runId」\n   Run.status = COMPLETED",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "Mitigation[]\n「1 per RiskItem — no dedup」\n\ntitle\ndescription\ncontrolType 「technical|process|policy」\nestimatedEffort 「low|medium|high」\nexpectedRiskReduction 「0-1」\nvalidationSteps[]\nlinkedRisks[] 「1:1 for now」\n\n→ DB: INSERT many\n→ completeRun「runId」\n   Run.status = COMPLETED",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "box-note", "type": "rectangle",
      "x": 30, "y": 295, "width": 840, "height": 40,
      "angle": 0, "strokeColor": "#374151", "backgroundColor": "#fff3bf",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "dashed",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 3 }, "seed": 6011, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false
    },
    {
      "id": "text-note", "type": "text",
      "x": 40, "y": 307, "width": 820, "height": 18,
      "angle": 0, "strokeColor": "#374151", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 6012, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "Duplicate mitigations stored as-is — dedup is a UI concern, not backend 「see ASSUMPTIONS.md #A10」",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "Duplicate mitigations stored as-is — dedup is a UI concern, not backend 「see ASSUMPTIONS.md #A10」",
      "autoResize": true, "lineHeight": 1.25
    }
  ],
  "appState": { "gridSize": null, "viewBackgroundColor": "#ffffff" },
  "files": {}
}
```
%%
