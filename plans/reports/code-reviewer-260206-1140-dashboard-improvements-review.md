# Code Review: Skillmark Dashboard Improvements (4 Phases)

## Scope
- Files: 4 modified (`cli-entry-point.ts`, `publish-results-command.ts`, `api-endpoints-handler.ts`, `html-pages-renderer.ts`)
- LOC: ~2,600 across reviewed files
- Focus: Security, edge cases, type safety, backward compatibility
- Scout findings: 7 issues identified (2 critical, 2 high, 3 medium)

## Overall Assessment

Solid feature delivery across all 4 phases. The auto-publish, full metrics upload, expandable drill-down, and radar chart are well-integrated. However, several security and robustness issues need attention before production deployment.

---

## Critical Issues

### C1. XSS via `JSON.parse(raw_json)` returned directly to client (api-endpoints-handler.ts:261)

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/webapp/src/routes/api-endpoints-handler.ts` line 261

The `/api/result/:id` endpoint parses `raw_json` from the database and returns it directly:

```typescript
return c.json(JSON.parse(result.raw_json as string));
```

The `raw_json` column is populated from user-submitted data (`JSON.stringify(result)` in CLI). If `raw_json` contains malformed JSON, `JSON.parse` will throw and the `catch` block returns a 500. However, the bigger risk: the `raw_json` is stored unvalidated from the CLI payload. A crafted payload could store arbitrary JSON that, when fetched by the client-side `renderTestBreakdown()` JS, gets inserted into DOM via `.innerHTML`. The client-side `esc()` function is used for `name` and `type` fields, but `response` text inside `testResults` is never escaped before DOM insertion.

**Impact:** Stored XSS. A malicious user could craft `testResults[].response` with script tags, then anyone viewing the drill-down would execute that JS.

**Recommendation:**
- Server-side: Validate/sanitize `raw_json` structure on the API endpoint before returning it, or strip the `response` field entirely from the returned JSON (it's not displayed anyway).
- Client-side: Ensure ALL string values from fetched data go through `esc()` before HTML insertion. Currently `renderTestBreakdown` does use `esc()` for `name` and `type`, but verify no other path injects unescaped data.

### C2. Missing UUID validation on `/api/result/:id` (api-endpoints-handler.ts:251)

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/webapp/src/routes/api-endpoints-handler.ts` line 251

```typescript
const id = c.req.param('id');
```

The `id` parameter is passed directly to a SQL query without format validation. While D1 parameterized queries prevent SQL injection, any arbitrary string can be passed, and the endpoint returns raw benchmark data. Should validate UUID format.

**Impact:** Information disclosure risk if IDs are guessable. Low severity since UUIDs are random.

**Recommendation:** Add UUID format validation: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

---

## High Priority

### H1. Falsy-zero bug in API payload binding (api-endpoints-handler.ts:97-101)

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/webapp/src/routes/api-endpoints-handler.ts` lines 97-101

```typescript
payload.tokensInput || null,   // BUG: 0 becomes null
payload.tokensOutput || null,  // BUG: 0 becomes null
payload.toolCount || null,     // BUG: 0 becomes null
```

Using `||` instead of `??` means legitimate zero values are stored as `null`. A benchmark that uses 0 tool calls or has 0 output tokens would lose that data.

**Impact:** Data loss for edge-case metric values. Zero is a valid value for `toolCount` (no tools used) and theoretically for `tokensOutput`.

**Fix:** Use nullish coalescing:
```typescript
payload.tokensInput ?? null,
payload.tokensOutput ?? null,
payload.toolCount ?? null,
```

### H2. Duplicate upload functions with diverging payloads (publish-results-command.ts)

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/commands/publish-results-command.ts`

There are two upload functions: `uploadResult()` (lines 113-162) and `uploadResultWithExtras()` (lines 298-349). They share nearly identical logic but differ:

- `uploadResult()` sends `securityScore`, `securityJson`, and calls `extractTestFilesFromResult()` + `detectSkillshLink()`
- `uploadResultWithExtras()` does NOT send `securityScore` or `securityJson`

This means auto-publish via `publishResultsWithAutoKey()` silently drops security scores.

**Impact:** Security scores are only published via manual `publish` command, not auto-publish. This contradicts the Phase 1 intent of making auto-publish the default.

**Recommendation:** Either:
1. Add `securityScore`/`securityJson` to `uploadResultWithExtras()` payload, or
2. Consolidate both functions into one parameterized upload function (DRY principle)

---

## Medium Priority

### M1. `html-pages-renderer.ts` is 2,211 lines (exceeds 200-line modularization threshold)

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/webapp/src/routes/html-pages-renderer.ts`

Per project conventions, files exceeding 200 LOC should be modularized. At 2,211 lines this file is 11x the threshold. Clear separation boundaries exist:

- Leaderboard page renderer
- Skill detail page renderer
- Radar chart renderer
- Docs/How-It-Works pages
- Login/Dashboard pages
- Shared utilities (escapeHtml, formatRelativeTime, renderNav)

**Recommendation:** Split into focused modules under a `pages/` directory.

### M2. Radar chart `speed` normalization uses average of all results including nulls (html-pages-renderer.ts:1344-1346)

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/webapp/src/routes/html-pages-renderer.ts` lines 1344-1346

```typescript
const avgDuration = results.length > 0
  ? results.reduce((s, r) => s + (r.durationMs || 0), 0) / results.length
  : 0;
```

Results where `durationMs` is `null` contribute 0 to the sum but still count in the divisor, skewing the average down (making speed appear faster than it is).

**Fix:** Filter out null duration results:
```typescript
const validDurations = results.filter(r => r.durationMs != null);
const avgDuration = validDurations.length > 0
  ? validDurations.reduce((s, r) => s + r.durationMs!, 0) / validDurations.length
  : 0;
```

### M3. `renderDocLayout` passes `title` unescaped into HTML (html-pages-renderer.ts:1256, 1305)

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/webapp/src/routes/html-pages-renderer.ts` lines 1256, 1305

```typescript
<title>${title} - Skillmark</title>
...
<h1>${title}</h1>
```

The `title` parameter is not escaped. Currently only called with hardcoded strings ("Getting Started", "How It Works"), so no actual risk. But if future callers pass user input, this becomes XSS.

**Recommendation:** Apply `escapeHtml(title)` for defense-in-depth.

---

## Low Priority

### L1. `formatRelativeTime` returns "Never" for timestamp 0 (html-pages-renderer.ts:2186)

The function checks `if (!timestamp)` which catches both `null`/`undefined` AND the valid Unix epoch `0`. Unlikely to matter in practice (1970-01-01 results don't exist) but technically incorrect.

### L2. Radar chart SVG viewBox too tight for label text

Labels placed at `maxR + 24` offset can clip for longer text like "Cost" + value. The viewBox is `0 0 300 300` with center at 150,150 and maxR=110. Label at top axis: `y = 150 - 134 = 16`, which is fine. But label at bottom-left/right: `x` could be near 0 or 300, potentially clipping text.

### L3. Docs page still shows `--publish` as explicit flag

Line 1084 and line 2117 of html-pages-renderer.ts still show:
```
--publish     Auto-publish results to leaderboard
skillmark run ./my-skill --publish
```

Since Phase 1 made publish the default, these should be updated to reflect `--no-publish` as the opt-out.

---

## Edge Cases Found by Scout

1. **Empty testResults array:** `renderTestBreakdown` handles this correctly with early return
2. **Result with no `raw_json`:** `/api/result/:id` returns 404 correctly
3. **Security score = 0:** `securityScore ?? null` handles correctly (unlike `|| null`)
4. **Results with null costUsd:** `$${r.costUsd?.toFixed(4) || '-'}` -- if `costUsd` is `0`, this shows `'-'` instead of `$0.0000` (falsy zero bug, same as H1 pattern)
5. **`detectSkillshLink` with unusual source formats:** Only matches `skill.sh/x/y` -- won't match `skill.sh/x/y@v1.0` (version suffix gets captured as part of skill name). The regex `[^/]+` matches `@`, so `skill.sh/user/name@v1.0` produces link `https://skill.sh/user/name@v1.0`, which may not resolve correctly.
6. **Large `raw_json` payloads:** No size limit on `raw_json` storage or retrieval. A malicious user could submit very large payloads (multiple MB) that get stored and returned via `/api/result/:id`. D1 has a 1MB row limit, but this could still cause client-side performance issues.
7. **Race condition on expand/collapse:** If user clicks rapidly, multiple `fetch()` calls could fire for the same result. The `data-loaded` check prevents re-fetch but the first click's fetch could complete after a second click's collapse, leaving stale content.

---

## Positive Observations

- **Consistent escapeHtml usage** throughout server-rendered HTML, including `data-result-id`, `href`, and text content
- **Parameterized SQL queries** everywhere, no string interpolation in SQL
- **Graceful degradation** for missing data (null checks with `??`, `|| '-'`, em-dashes)
- **Client-side `esc()` function** mirrors server-side escaping in JS drill-down renderer
- **Good separation** between API endpoints and HTML rendering routes
- **Proper error handling** with try/catch wrapping spinner states in CLI
- **Cache-friendly drill-down** using `data-loaded` attribute to avoid re-fetching

---

## Recommended Actions (Priority Order)

1. **[Critical]** Fix `uploadResultWithExtras` to include `securityScore`/`securityJson` in payload (or consolidate with `uploadResult`)
2. **[Critical]** Validate/sanitize `raw_json` structure before returning from `/api/result/:id`
3. **[High]** Replace `||` with `??` in DB binding (api-endpoints-handler.ts:97-101) and HTML rendering (costUsd display)
4. **[Medium]** Fix radar chart `avgDuration` to exclude null durations from average
5. **[Medium]** Update docs pages to reflect auto-publish as default behavior
6. **[Low]** Plan modularization of `html-pages-renderer.ts` into smaller focused modules

---

## Metrics

- Type Coverage: Good (strict TS, typed interfaces for all data shapes)
- Test Coverage: Not measured in this review (no new tests for Phase 3/4 UI)
- Linting Issues: 1 pre-existing (unrelated `static-assets-handler.ts` TS2307), 0 new
- Build: CLI builds clean; webapp has pre-existing type error

---

## Unresolved Questions

1. Should the `/api/result/:id` endpoint require authentication? Currently it is unauthenticated, exposing full raw benchmark data including Claude responses to anyone who can guess/enumerate UUIDs.
2. Is the `raw_json` field intentionally stored with Claude's raw response text? This could contain sensitive information from the skill being tested.
3. Should there be a size limit on `testFiles` content upload? Currently, a user could upload very large test file contents.
