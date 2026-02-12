---
phase: 5
status: pending
priority: medium
effort: S
---

# Phase 5: Build, Lint & Test

## Context
- [plan.md](./plan.md)
- Final phase — all code changes complete

## Overview
Ensure the new embed widget code compiles, passes linting, and the webapp builds+deploys cleanly.

## Related Code Files
- All files modified in phases 1-4
- `packages/webapp/tsconfig.json`
- `packages/webapp/wrangler.toml`

## Implementation Steps

1. Run `pnpm --filter @skillmark/webapp build` — verify no compile errors
2. Run `pnpm lint` — fix any lint issues in new/modified files
3. Run `pnpm test` — verify existing tests still pass
4. Verify locally with `wrangler dev --local`:
   - `GET /embed.js` returns JS with correct headers
   - `/api/skill/:name` returns Cache-Control header
   - Skill detail page shows "Embed" button + working popover
5. Test the embed script works on a standalone HTML page:
   ```html
   <html><body>
     <h1>Test Page</h1>
     <script src="http://localhost:8787/embed.js" data-skill="test-skill" data-theme="dark"></script>
   </body></html>
   ```

## Todo
- [ ] Build webapp — no compile errors
- [ ] Lint — no new warnings/errors
- [ ] Run tests — all pass
- [ ] Manual verification with wrangler dev

## Success Criteria
- `pnpm build` succeeds
- `pnpm lint` passes (existing lint issues in static-assets-handler.ts excluded — pre-existing)
- `pnpm test` passes
- Embed widget renders correctly on external test page
