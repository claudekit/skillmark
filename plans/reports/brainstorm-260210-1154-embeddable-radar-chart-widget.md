# Brainstorm: Embeddable Radar Chart Widget

**Date:** 2026-02-10
**Status:** Agreed

## Problem
Skill authors want to embed Skillmark radar charts on blogs/websites via copy-paste script tag with cached real-time data.

## Agreed Solution: Self-Contained Script Widget

### How It Works
1. User copies `<script>` tag from skill detail page
2. Script fetches `/api/skill/:name` (Cloudflare edge cached, 1h TTL)
3. Renders inline SVG radar chart inside shadow DOM
4. "Powered by Skillmark" link always visible

### Embed Code Format
```html
<script
  src="https://skillmark.sh/embed.js"
  data-skill="my-skill"
  data-theme="dark"
  data-width="360"
></script>
```

### Data Attributes
| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `data-skill` | string | required | Skill name to display |
| `data-theme` | `dark` \| `light` | `dark` | Color theme |
| `data-width` | number (px) | `360` | Widget width |

### Architecture

```
User's Blog                    Skillmark (Cloudflare Workers)
┌───────────────┐              ┌──────────────────────────┐
│ <script> tag  │──fetch──────>│ GET /api/skill/:name     │
│ data-skill=X  │              │   Cache-Control: 1h      │
│ data-theme=   │              │   Access-Control-Allow-*  │
│ data-width=   │              ├──────────────────────────┤
├───────────────┤              │ GET /embed.js (static)   │
│ Shadow DOM    │              │   Cache-Control: 7d      │
│ ┌───────────┐ │              └──────────────────────────┘
│ │ SVG Radar │ │
│ │ Chart     │ │
│ └───────────┘ │
│ Powered by    │
│ Skillmark ↗   │
└───────────────┘
```

### Implementation Components

| Component | File | Work |
|-----------|------|------|
| `embed.js` | New static asset | ~3KB JS: fetch, render SVG, shadow DOM |
| CORS headers | `api-endpoints-handler.ts` | `Access-Control-Allow-Origin: *` on `/api/skill/:name` |
| Cache headers | `api-endpoints-handler.ts` | `Cache-Control: public, max-age=3600` |
| Copy UI | `html-pages-renderer.ts` | "Embed" button + code snippet modal on skill detail |
| Radar logic | Port from `renderRadarChart()` | Client-side SVG generation (existing logic) |

### Script Flow
1. On load → find all `script[src*="embed.js"]` on page
2. Read `data-*` attributes from each
3. Fetch `/api/skill/{name}` (browser caches via Cache-Control)
4. Compute radar metrics client-side
5. Generate SVG string
6. Create `<div>` with shadow DOM, inject SVG + branding link
7. Insert after `<script>` tag position

### Theme Support
- **Dark:** `#000` bg, `#ededed` text, `#58a6ff` accent (matches skillmark.sh)
- **Light:** `#fff` bg, `#1a1a1a` text, `#2563eb` accent

### Caching Strategy
- `embed.js` → `Cache-Control: public, max-age=604800` (7 days, versioned URL)
- `/api/skill/:name` → `Cache-Control: public, max-age=3600` (1 hour)
- Browser + Cloudflare edge cache = zero origin hits for popular skills

### Security
- CORS only on public read endpoints
- No auth data exposed
- Rate limiting via Cloudflare
- Shadow DOM prevents CSS injection

### Risks
| Risk | Mitigation |
|------|------------|
| API abuse | Cloudflare cache + rate limiting |
| CSP blocks script | Document CSP needs; iframe fallback later if needed |
| Stale data | 1h TTL acceptable tradeoff |
| Bundle bloat | No deps, target <5KB |

### Why Not Alternatives
- **iframe:** Rigid sizing, feels dated, double page load, responsive issues
- **Image/SVG URL:** Static, can't update, no interactivity
- **Chart.js/D3:** Adds dependency burden on embedder, violates KISS

### Success Metrics
- Script load: <100ms (edge cached)
- Total render: <200ms
- Copy-to-working: 1 step
- Bundle: <5KB

### Branding
"Powered by Skillmark" link always shown below chart, links to `https://skillmark.sh/skill/{name}`.
