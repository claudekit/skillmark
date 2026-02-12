---
phase: 1
status: pending
priority: high
effort: S
---

# Phase 1: API Cache Headers

## Context
- [Brainstorm report](../reports/brainstorm-260210-1154-embeddable-radar-chart-widget.md)
- [plan.md](./plan.md)

## Overview
Add `Cache-Control` headers to `/api/skill/:name` response so embed widgets and browsers cache data for 1 hour. CORS is already handled globally by Hono middleware in `worker-entry-point.ts`.

## Key Insight
CORS middleware already exists at app level (`origin: '*'`), so we only need cache headers on the skill detail API response.

## Related Code Files
- **Modify:** `packages/webapp/src/routes/api-endpoints-handler.ts` (lines 195-270)

## Implementation Steps

1. In `apiRouter.get('/skill/:name', ...)`, add `Cache-Control` header to the JSON response:
   ```typescript
   c.header('Cache-Control', 'public, max-age=3600, s-maxage=3600');
   return c.json({ ... });
   ```
2. The `s-maxage=3600` tells Cloudflare edge to cache for 1h too

## Todo
- [ ] Add Cache-Control header to `/api/skill/:name` response
- [ ] Verify no existing cache headers conflict

## Success Criteria
- `/api/skill/:name` returns `Cache-Control: public, max-age=3600, s-maxage=3600` header
- Response still returns correct JSON payload
