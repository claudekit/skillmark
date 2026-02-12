---
phase: 3
status: pending
priority: high
effort: S
---

# Phase 3: Static Asset Serving

## Context
- [plan.md](./plan.md)
- Depends on Phase 2 (embed script must exist)

## Overview
Serve the compiled `embed.js` as a static asset from the Cloudflare Worker, with long-lived cache headers.

## Key Insight
The existing `static-assets-handler.ts` serves favicon/OG assets via base64 strings. For embed.js, we have two approaches:
1. **Inline as string constant** — same pattern as favicon (base64 or template literal)
2. **Import as text** — use Cloudflare Workers' text module import

Option 2 is cleaner. Cloudflare Workers support `import embedScript from './embed.js' with { type: 'text' }` or we can use wrangler's `rules` config to import `.js` as text.

**Simplest approach:** Since the embed script is self-contained JS, write it as a string constant exported from the embed module, or import it at build time. Given the existing pattern (base64 favicon), a string constant is most consistent.

## Related Code Files
- **Modify:** `packages/webapp/src/routes/static-assets-handler.ts`
- **Modify:** `packages/webapp/src/worker-entry-point.ts` (add route comment)
- **Reference:** Phase 2 output file

## Implementation Steps

1. In `static-assets-handler.ts`, add a route for `/embed.js`:
   ```typescript
   import { EMBED_SCRIPT } from '../embed/embed-widget-radar-chart.js';

   assetsRouter.get('/embed.js', (c) => {
     return new Response(EMBED_SCRIPT, {
       headers: {
         'Content-Type': 'application/javascript; charset=utf-8',
         'Cache-Control': 'public, max-age=604800',
       },
     });
   });
   ```
2. The embed script module exports its content as a string constant `EMBED_SCRIPT`
3. Update route comments in `worker-entry-point.ts` to document `/embed.js`

## Todo
- [ ] Add `/embed.js` route to static-assets-handler
- [ ] Import embed script content
- [ ] Set Cache-Control: 7 days
- [ ] Update route documentation comment in worker-entry-point

## Success Criteria
- `GET /embed.js` returns valid JavaScript with correct Content-Type
- Cache-Control header set to 7 days
- Response body matches compiled embed widget script
