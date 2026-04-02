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
      "seed": 4001, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "Step 4 — Attack Path Construction",
      "fontSize": 24, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "Step 4 — Attack Path Construction",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "subtitle", "type": "text",
      "x": 50, "y": 46, "width": 860, "height": 18,
      "angle": 0, "strokeColor": "#374151", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 4002, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "Worker: attack-paths.worker.ts  |  Plain adjacency list  |  BFS + Gemini plausibility  |  maxHops: configurable 「default 10」",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "Worker: attack-paths.worker.ts  |  Plain adjacency list  |  BFS + Gemini plausibility  |  maxHops: configurable 「default 10」",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "box-input", "type": "rectangle",
      "x": 30, "y": 80, "width": 170, "height": 145,
      "angle": 0, "strokeColor": "#1e40af", "backgroundColor": "#a5d8ff",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 3 }, "seed": 4003, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false
    },
    {
      "id": "text-input", "type": "text",
      "x": 35, "y": 92, "width": 160, "height": 124,
      "angle": 0, "strokeColor": "#1e40af", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 4004, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "FROM DB\nAsset[]\nInterface[]\nTrustBoundary[]\nSoftwareInstance[]\nThreat[]\nCVEMatch[]",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "FROM DB\nAsset[]\nInterface[]\nTrustBoundary[]\nSoftwareInstance[]\nThreat[]\nCVEMatch[]",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "arrow-in", "type": "arrow",
      "x": 200, "y": 152, "width": 50, "height": 0,
      "angle": 0, "strokeColor": "#3b82f6", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 2 }, "seed": 4005, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false,
      "points": [[0, 0], [50, 0]], "lastCommittedPoint": null,
      "startBinding": null, "endBinding": null, "startArrowhead": null, "endArrowhead": "arrow"
    },
    {
      "id": "box-graph", "type": "rectangle",
      "x": 250, "y": 80, "width": 200, "height": 55,
      "angle": 0, "strokeColor": "#374151", "backgroundColor": "#eebefa",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 3 }, "seed": 4006, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false
    },
    {
      "id": "text-graph", "type": "text",
      "x": 255, "y": 92, "width": 190, "height": 32,
      "angle": 0, "strokeColor": "#374151", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 4007, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "Build adjacency list\n「Map<assetId, {node, edges[]}>」",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "Build adjacency list\n「Map<assetId, {node, edges[]}>」",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "arrow-graph-bfs", "type": "arrow",
      "x": 350, "y": 135, "width": 0, "height": 30,
      "angle": 0, "strokeColor": "#374151", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 2 }, "seed": 4008, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false,
      "points": [[0, 0], [0, 30]], "lastCommittedPoint": null,
      "startBinding": null, "endBinding": null, "startArrowhead": null, "endArrowhead": "arrow"
    },
    {
      "id": "box-bfs", "type": "rectangle",
      "x": 250, "y": 165, "width": 200, "height": 90,
      "angle": 0, "strokeColor": "#7c3aed", "backgroundColor": "#e5dbff",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 3 }, "seed": 4009, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false
    },
    {
      "id": "text-bfs", "type": "text",
      "x": 255, "y": 175, "width": 190, "height": 72,
      "angle": 0, "strokeColor": "#7c3aed", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 4010, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "BFS per threat\nentry → high-value targets\nrespect edge direction\ntrack boundary crossings\nprune at maxHops",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "BFS per threat\nentry → high-value targets\nrespect edge direction\ntrack boundary crossings\nprune at maxHops",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "arrow-bfs-llm", "type": "arrow",
      "x": 350, "y": 255, "width": 0, "height": 30,
      "angle": 0, "strokeColor": "#374151", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 2 }, "seed": 4011, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false,
      "points": [[0, 0], [0, 30]], "lastCommittedPoint": null,
      "startBinding": null, "endBinding": null, "startArrowhead": null, "endArrowhead": "arrow"
    },
    {
      "id": "text-candidates", "type": "text",
      "x": 360, "y": 262, "width": 100, "height": 16,
      "angle": 0, "strokeColor": "#757575", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 4012, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "candidate paths",
      "fontSize": 14, "fontFamily": 5, "textAlign": "left", "verticalAlign": "middle",
      "containerId": null, "originalText": "candidate paths",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "box-llm", "type": "rectangle",
      "x": 250, "y": 285, "width": 200, "height": 75,
      "angle": 0, "strokeColor": "#c2410c", "backgroundColor": "#ffd8a8",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 3 }, "seed": 4013, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false
    },
    {
      "id": "text-llm", "type": "text",
      "x": 255, "y": 295, "width": 190, "height": 56,
      "angle": 0, "strokeColor": "#c2410c", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 4014, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "Gemini plausibility check\n→ plausible: boolean\n→ feasibilityScore 「0-1」\n→ reasoning: string",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "Gemini plausibility check\n→ plausible: boolean\n→ feasibilityScore 「0-1」\n→ reasoning: string",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "arrow-llm-out", "type": "arrow",
      "x": 450, "y": 250, "width": 100, "height": 0,
      "angle": 0, "strokeColor": "#0ca678", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 2 }, "seed": 4015, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false,
      "points": [[0, 0], [100, 0]], "lastCommittedPoint": null,
      "startBinding": null, "endBinding": null, "startArrowhead": null, "endArrowhead": "arrow"
    },
    {
      "id": "text-filter", "type": "text",
      "x": 455, "y": 232, "width": 90, "height": 16,
      "angle": 0, "strokeColor": "#757575", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 4016, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "filter plausible",
      "fontSize": 14, "fontFamily": 5, "textAlign": "left", "verticalAlign": "middle",
      "containerId": null, "originalText": "filter plausible",
      "autoResize": true, "lineHeight": 1.25
    },
    {
      "id": "box-output", "type": "rectangle",
      "x": 550, "y": 80, "width": 310, "height": 280,
      "angle": 0, "strokeColor": "#0ca678", "backgroundColor": "#b2f2bb",
      "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [],
      "roundness": { "type": 3 }, "seed": 4017, "version": 1,
      "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false
    },
    {
      "id": "text-output", "type": "text",
      "x": 555, "y": 92, "width": 300, "height": 258,
      "angle": 0, "strokeColor": "#15803d", "backgroundColor": "transparent",
      "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid",
      "roughness": 1, "opacity": 100, "groupIds": [], "roundness": null,
      "seed": 4018, "version": 1, "isDeleted": false, "boundElements": null,
      "updated": 1, "link": null, "locked": false,
      "text": "AttackPath[]\n「ranked by overallPathRisk DESC」\n「only plausible paths included」\n\nhops[] 「asset → interface → asset...」\nhopCount\ntrustBoundaryCrossings\nfeasibilityScore 「0-1, from Gemini」\nimpactScore 「0-1, target asset criticality」\noverallPathRisk = feasibility x impact\nreasoning 「LLM explanation」\nevidenceRefs[] 「threat + CVE IDs」\n\n→ DB: INSERT many",
      "fontSize": 14, "fontFamily": 5, "textAlign": "center", "verticalAlign": "middle",
      "containerId": null, "originalText": "AttackPath[]\n「ranked by overallPathRisk DESC」\n「only plausible paths included」\n\nhops[] 「asset → interface → asset...」\nhopCount\ntrustBoundaryCrossings\nfeasibilityScore 「0-1, from Gemini」\nimpactScore 「0-1, target asset criticality」\noverallPathRisk = feasibility x impact\nreasoning 「LLM explanation」\nevidenceRefs[] 「threat + CVE IDs」\n\n→ DB: INSERT many",
      "autoResize": true, "lineHeight": 1.25
    }
  ],
  "appState": { "gridSize": null, "viewBackgroundColor": "#ffffff" },
  "files": {}
}
```
%%
