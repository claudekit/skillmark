---
phase: 2
status: pending
priority: high
effort: M
---

# Phase 2: Embed Widget Script

## Context
- [Brainstorm report](../reports/brainstorm-260210-1154-embeddable-radar-chart-widget.md)
- [plan.md](./plan.md)

## Overview
Create the client-side embed script that fetches skill data from the API and renders an SVG radar chart inside a shadow DOM container. This is the core deliverable.

## Key Insights
- Port existing `computeRadarMetrics()` and `renderRadarChart()` from `html-pages-renderer.ts` to plain JS
- The API `/api/skill/:name` returns `bestAccuracy`, `bestSecurity`, `bestTrigger`, `avgTokens`, `avgCost` + `history[]` with `durationMs`
- `computeRadarMetrics` normalizes: accuracy/security/trigger direct (0-100), tokenEfficiency (10K→0, 0→100), costEfficiency ($0.10→0, $0→100), speed (60s→0, 0s→100)
- Shadow DOM isolates widget styles from host page

## Related Code Files
- **Create:** `packages/webapp/src/embed/embed-widget-radar-chart.ts`
- **Reference:** `packages/webapp/src/routes/html-pages-renderer.ts` lines 1425-1514 (RadarMetrics, computeRadarMetrics, renderRadarChart)

## Architecture

```
<script src="https://skillmark.sh/embed.js" data-skill="X" data-theme="dark" data-width="360">
  ↓ on DOMContentLoaded
  1. Find all script[data-skill] tags
  2. For each: read data-skill, data-theme, data-width
  3. Fetch /api/skill/{name}
  4. Compute radar metrics from response
  5. Generate SVG string
  6. Create <div> with shadow DOM
  7. Inject SVG + styles + branding link
  8. Insert <div> adjacent to <script> tag
```

## Implementation Steps

1. Create `packages/webapp/src/embed/embed-widget-radar-chart.ts` as a self-contained IIFE script
2. Port `computeRadarMetrics` logic:
   - Input: API response `{ bestAccuracy, bestSecurity, bestTrigger, avgTokens, avgCost, history[] }`
   - Compute `avgDuration` from `history[].durationMs`
   - Return 6 normalized values (0-100)
3. Port `renderRadarChart` logic:
   - 6-axis hexagonal radar with grid at 25/50/75/100%
   - Data polygon with fill + stroke + dots
   - Labels with values outside hexagon
4. Theme support via CSS custom properties:
   ```
   Dark:  --bg: #000, --text: #ededed, --accent: #58a6ff, --grid: #333
   Light: --bg: #fff, --text: #1a1a1a, --accent: #2563eb, --grid: #ddd
   ```
5. Shadow DOM creation:
   ```js
   const container = document.createElement('div');
   const shadow = container.attachShadow({ mode: 'closed' });
   shadow.innerHTML = `<style>...</style>${svgHtml}<div class="branding">...</div>`;
   scriptTag.parentNode.insertBefore(container, scriptTag.nextSibling);
   ```
6. Branding footer: `Powered by <a href="https://skillmark.sh/skill/{name}">Skillmark</a>`
7. Error handling: show "Failed to load" message if fetch fails or skill not found
8. Loading state: show subtle "Loading..." placeholder while fetching

## Data Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-skill` | string | required | Skill name |
| `data-theme` | `dark`\|`light` | `dark` | Color theme |
| `data-width` | number | `360` | Widget width in px |

## Build Consideration
- File will be written as TypeScript but needs to compile to a standalone JS bundle
- Add a build step in webapp's build config to produce `dist/embed.js`
- Target: ES2020, no module system (IIFE), minified
- Alternative: write as plain `.js` in assets if build pipeline too complex — evaluate during implementation

## Todo
- [ ] Create embed script file with IIFE wrapper
- [ ] Port computeRadarMetrics (normalize 6 axes from API data)
- [ ] Port renderRadarChart (SVG generation)
- [ ] Implement shadow DOM container creation
- [ ] Add dark/light theme CSS
- [ ] Add branding footer
- [ ] Add loading state + error handling
- [ ] Ensure script works with multiple embeds on same page

## Success Criteria
- Script renders correct radar chart matching server-side version
- Dark and light themes work correctly
- Multiple widgets on same page render independently
- Widget width configurable via data-width
- Branding link points to correct skill page
- Total bundle <5KB
- No global namespace pollution (IIFE)
