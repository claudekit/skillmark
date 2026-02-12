---
status: pending
created: 2026-02-10
slug: embeddable-radar-chart-widget
brainstorm: plans/reports/brainstorm-260210-1154-embeddable-radar-chart-widget.md
---

# Embeddable Radar Chart Widget

Self-contained `<script>` tag widget that renders a Skillmark radar chart on any website with cached real-time data.

## Summary

Skill authors can copy a script tag from the skill detail page to embed an interactive radar chart on their blog/website. The widget fetches data from the existing `/api/skill/:name` endpoint (1h cache), renders SVG inside shadow DOM, supports dark/light themes and configurable width.

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | API cache headers | pending | S | `api-endpoints-handler.ts` |
| 2 | Embed script (embed.js) | pending | M | New `embed-widget-radar-chart.ts` |
| 3 | Static asset serving | pending | S | `static-assets-handler.ts`, `worker-entry-point.ts` |
| 4 | Copy UI on skill detail | pending | M | `html-pages-renderer.ts` |
| 5 | Build + lint + test | pending | S | `tsconfig.json`, build scripts |

## Key Decisions

- **Shadow DOM** for style isolation on host pages
- **Inline SVG** rendering (port existing `renderRadarChart` + `computeRadarMetrics`)
- **CORS already enabled** globally via Hono middleware (`origin: '*'`) — no changes needed
- **Cache-Control** headers on `/api/skill/:name` for 1h TTL
- **embed.js** served as static asset with 7d cache
- **"Powered by Skillmark"** branding always shown

## Dependencies

- Existing `/api/skill/:name` endpoint (returns `bestAccuracy`, `bestSecurity`, `bestTrigger`, `avgTokens`, `avgCost`, `history[]`)
- Existing `renderRadarChart()` and `computeRadarMetrics()` functions (to port to plain JS)
