---
title: "Skillmark Dashboard Improvements"
description: "Auto-publish, full metrics publishing, deeper result drill-down, and radar chart on skill detail page"
status: complete
priority: P2
effort: 5h
branch: zuey
tags: [cli, webapp, leaderboard, ux]
created: 2026-02-06
---

# Skillmark Dashboard Improvements

## Overview

Four improvements to the Skillmark benchmarking platform:
1. Auto-publish after `skillmark run` when API key exists
2. `uploadResult()` sends full metrics (parity with `uploadResultWithExtras()`)
3. Skill detail page with per-test drill-down from `raw_json`
4. SVG radar chart on skill detail page

No DB migrations required -- `raw_json` already stores everything.

---

## Phase 1: Auto-publish after `skillmark run`

**Priority:** High
**Effort:** 45min
**Status:** Complete

### Context
- `cli-entry-point.ts` lines 67-96 handle publish only when `options.publish` is truthy
- `readApiKeyConfig()` checks env > `~/.skillmarkrc` > `~/.claude/.env`

### Files to Modify
- `packages/cli/src/cli-entry-point.ts`

### Implementation Steps

1. Add `--no-publish` option to the `run` command:
   ```
   .option('--no-publish', 'Skip auto-publishing results')
   ```
   Commander treats `--no-X` as `options.publish = false`. Keep existing `-p, --publish` for backward compat but it becomes the default.

2. Replace the publish gate (line 67) from `if (options.publish)` to `if (options.publish !== false)`:
   - If `--no-publish` passed: `options.publish === false` -> skip
   - If `--publish` passed: `options.publish === true` -> publish
   - If neither passed: `options.publish === undefined` -> publish (new default)

3. When API key not found, change from `process.exit(1)` to a friendly info message:
   ```
   console.log(chalk.gray('\nResults not published. Get your API key at https://skillmark.sh/login'));
   console.log(chalk.gray('Then run: skillmark login <key>\n'));
   ```
   Do NOT exit(1) -- the benchmark completed successfully.

4. Update the examples section at the bottom (line 214) to remove `--publish` from the example since it's now default.

5. Update login command success message (line 172) to remove reference to `--publish` flag, e.g.:
   ```
   console.log(chalk.gray('\nResults will now auto-publish after each benchmark run.'));
   ```

### Todo
- [ ] Add `--no-publish` option to run command
- [ ] Change publish gate from explicit opt-in to opt-out
- [ ] Soft-fail when no API key (info message, not exit(1))
- [ ] Update CLI examples and login success message
- [ ] Keep `--publish` flag for backward compat

### Success Criteria
- `skillmark run ./skill` auto-publishes when API key exists
- `skillmark run ./skill --no-publish` skips publishing
- No API key -> benchmark succeeds, prints friendly guidance
- `skillmark run ./skill --publish` still works (backward compat)

---

## Phase 2: Full Metrics in `uploadResult()`

**Priority:** High
**Effort:** 30min
**Status:** Complete

### Context
- `uploadResult()` (line 113-149) sends: skillId, skillName, source, model, accuracy, tokensTotal, durationMs, costUsd, runs, hash, timestamp, rawJson
- Missing: `tokensInput`, `tokensOutput`, `toolCount`, `testFiles`
- `uploadResultWithExtras()` (line 262-312) already sends all of these
- The `publish` command uses `uploadResult()`, so manually published results lack these fields

### Files to Modify
- `packages/cli/src/commands/publish-results-command.ts`

### Implementation Steps

1. Update `uploadResult()` body JSON to include missing fields from the `BenchmarkResult`:
   ```typescript
   tokensInput: result.aggregatedMetrics.tokensInput,
   tokensOutput: result.aggregatedMetrics.tokensOutput,
   toolCount: result.aggregatedMetrics.toolCount,
   ```

2. Add `testFiles` to `uploadResult()` by extracting from `result.testResults`. Load test files from the result's source path if available, or extract unique test file names from `result.testResults[].test.sourcePath`. Since `publishResults()` reads from a `result.json` file, the `testResults` are embedded in it. Extract:
   ```typescript
   const testFiles = extractTestFilesFromResult(result);
   ```
   Add to body: `testFiles: testFiles.length > 0 ? testFiles : undefined`

3. Add helper `extractTestFilesFromResult()`:
   - Read unique `sourcePath` values from `result.testResults[].test`
   - For each sourcePath, try `readFile(sourcePath)` to get content
   - Return array of `{ name: basename(path), content }`
   - Wrap in try/catch -- file may not exist anymore (result.json could be from different machine)

4. Add `skillshLink` detection using existing `detectSkillshLink(result.skillSource)`.

5. Add `securityScore` and `securityJson` from `result.securityScore` if present.

### Todo
- [ ] Add tokensInput, tokensOutput, toolCount to uploadResult() body
- [ ] Add testFiles extraction from result.testResults
- [ ] Add skillshLink detection
- [ ] Add securityScore/securityJson fields
- [ ] Test with `skillmark publish ./result.json`

### Success Criteria
- `skillmark publish result.json` sends same data fields as auto-publish
- API receives full metrics (tokensInput, tokensOutput, toolCount, testFiles)
- Graceful fallback if test source files don't exist

---

## Phase 3: Deeper Result Info on Skill Detail Page

**Priority:** Medium
**Effort:** 2h
**Status:** Complete

### Context
- `raw_json` column stores full `BenchmarkResult` JSON including `testResults[]` with per-test metrics, matched/missed concepts, response text
- Current skill detail page shows only high-level accuracy/model/tokens/cost per result row
- Need: clickable result rows that expand to show per-test breakdown
- Need: new API endpoint `GET /api/result/:id` returning parsed `raw_json`

### Files to Modify
- `packages/webapp/src/routes/api-endpoints-handler.ts` -- new endpoint
- `packages/webapp/src/routes/html-pages-renderer.ts` -- expandable rows + JS

### Implementation Steps

#### 3A. New API Endpoint

1. Add `GET /api/result/:id` to `api-endpoints-handler.ts`:
   ```typescript
   apiRouter.get('/result/:id', async (c) => {
     const id = c.req.param('id');
     const result = await c.env.DB.prepare(
       'SELECT raw_json FROM results WHERE id = ?'
     ).bind(id).first();
     if (!result?.raw_json) return c.json({ error: 'Not found' }, 404);
     return c.json(JSON.parse(result.raw_json as string));
   });
   ```

2. No auth required -- result data is public (leaderboard is public).

#### 3B. Add result `id` to skill detail query

1. In `html-pages-renderer.ts`, update the skill detail results query (line 112-127) to also select `r.id`:
   ```sql
   SELECT r.id, r.accuracy, r.model, ...
   ```

2. Add `id` field to `SkillResultRow` interface.

3. Add `r.duration_ms as durationMs` to the results query (currently not fetched but needed for display).

#### 3C. Expandable Result Rows

1. Update `resultRows` template to wrap each `<tr>` in a clickable element:
   - Add `class="result-row"` and `data-result-id="${r.id}"`
   - Add a hidden `<tr class="result-detail" data-result-id="${r.id}">` below each result row with a `<td colspan="7">` containing a loading placeholder

2. Add CSS for expandable rows:
   ```css
   .result-row { cursor: pointer; }
   .result-row:hover { background: #111; }
   .result-detail { display: none; }
   .result-detail.active { display: table-row; }
   .result-detail td { padding: 1rem; background: #0a0a0a; }
   .test-breakdown { display: grid; gap: 0.75rem; }
   .test-item { border: 1px solid var(--border); border-radius: 6px; padding: 0.75rem; }
   .test-item-header { display: flex; justify-content: space-between; }
   .test-concepts { font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.5rem; }
   .concept-matched { color: #3fb950; }
   .concept-missed { color: #d29922; }
   ```

3. Add client-side JS to fetch and render detail on click:
   ```javascript
   document.querySelectorAll('.result-row').forEach(row => {
     row.addEventListener('click', async () => {
       const id = row.dataset.resultId;
       const detail = document.querySelector('.result-detail[data-result-id="' + id + '"]');
       if (detail.classList.contains('active')) {
         detail.classList.remove('active');
         return;
       }
       // Collapse others
       document.querySelectorAll('.result-detail.active').forEach(d => d.classList.remove('active'));
       // Fetch if not loaded
       if (!detail.dataset.loaded) {
         detail.querySelector('td').innerHTML = 'Loading...';
         detail.classList.add('active');
         const res = await fetch('/api/result/' + id);
         if (!res.ok) { detail.querySelector('td').innerHTML = 'Failed to load'; return; }
         const data = await res.json();
         detail.querySelector('td').innerHTML = renderTestBreakdown(data);
         detail.dataset.loaded = '1';
       } else {
         detail.classList.add('active');
       }
     });
   });
   ```

4. Add `renderTestBreakdown()` JS function that takes parsed `BenchmarkResult` and renders:
   - Aggregated metrics summary (accuracy, tokens, cost, duration, tool calls)
   - Per-test cards showing: test name, type badge, accuracy%, matched/missed concepts, tokens, duration, cost
   - Group results by test name (multiple runs of same test)

### Todo
- [ ] Add `GET /api/result/:id` endpoint
- [ ] Add `id` and `durationMs` to skill detail results query
- [ ] Update `SkillResultRow` interface
- [ ] Make result rows clickable with expand/collapse
- [ ] Add CSS for detail rows and test breakdown cards
- [ ] Add client-side JS to fetch and render per-test detail
- [ ] Add `renderTestBreakdown()` JS function
- [ ] Handle edge case: result without `raw_json` (older results)

### Success Criteria
- Clicking a result row expands inline detail panel
- Panel shows aggregated metrics + per-test breakdown
- Each test shows name, type, accuracy, matched/missed concepts, tokens, duration
- Second click collapses the panel
- Loading state shown while fetching
- Graceful fallback for results without raw_json

### Risk Assessment
- `raw_json` could be null for older manually published results -> show "Detailed breakdown not available"
- Large `raw_json` payloads (many tests, many runs) -> response size could be large but acceptable for individual result fetch

---

## Phase 4: SVG Radar Chart

**Priority:** Medium
**Effort:** 1.5h
**Status:** Complete

### Context
- Skill detail page currently shows 5 stat cards (accuracy, security, best model, avg tokens, total runs)
- Need radar chart comparing: accuracy, security, token efficiency, cost efficiency, speed
- Must be inline SVG, no external libs (Cloudflare Workers bundle constraint)
- Server-side rendered in HTML template

### Files to Modify
- `packages/webapp/src/routes/html-pages-renderer.ts`
- `packages/webapp/src/routes/api-endpoints-handler.ts` (add `avg_duration` to skill API)

### Implementation Steps

#### 4A. Compute Normalized Metrics

1. Update the skill detail results query to also fetch `AVG(r.duration_ms)` for the skill. Add to the leaderboard view query or compute inline. Simplest: compute in the skill detail route handler from the `results` query:
   ```typescript
   const avgDuration = results.results?.reduce((s, r) => s + (r.duration_ms || 0), 0) / (results.results?.length || 1);
   ```

2. Add `duration_ms as durationMs` to the results query in the skill detail route.

3. Define normalization function for each axis (0-100 scale):
   - **Accuracy**: `skill.bestAccuracy` (already 0-100)
   - **Security**: `skill.bestSecurity ?? 0` (already 0-100)
   - **Token Efficiency**: `Math.max(0, 100 - (avgTokens / 1000) * 10)` -- 0 tokens = 100, 10K tokens = 0. Clamp 0-100.
   - **Cost Efficiency**: `Math.max(0, 100 - (avgCost / 0.10) * 100)` -- $0 = 100, $0.10+ = 0. Clamp 0-100.
   - **Speed**: `Math.max(0, 100 - (avgDuration / 60000) * 100)` -- 0s = 100, 60s+ = 0. Clamp 0-100.

   These are heuristic scales. Adjust thresholds based on typical benchmark data.

#### 4B. SVG Radar Chart Function

1. Add `renderRadarChart(metrics: RadarMetrics): string` function that generates an inline SVG:
   - 5-axis radar (pentagon)
   - SVG viewBox: `0 0 300 300`, center at (150, 150), radius 120
   - Draw concentric pentagons for 25%, 50%, 75%, 100% gridlines (stroke: #333)
   - Draw axis lines from center to each vertex (stroke: #333)
   - Draw filled polygon for actual values (fill: rgba(88,166,255,0.15), stroke: #58a6ff)
   - Draw value dots at each data point
   - Add axis labels outside pentagon: Accuracy, Security, Tokens, Cost, Speed
   - All text/colors consistent with existing dark theme (--bg: #000, --text: #ededed)

2. Pentagon vertex positions for angle offsets (starting from top, clockwise):
   ```
   angles = [-90, -90+72, -90+144, -90+216, -90+288] degrees
   x = cx + r * cos(angle)
   y = cy + r * sin(angle)
   ```

3. Scale each metric's radius: `pointR = (value / 100) * maxRadius`

#### 4C. Integrate Chart into Skill Detail Page

1. Add radar chart section between stat cards and result history:
   ```html
   <section class="section radar-section">
     <h2>Performance Profile</h2>
     <div class="radar-container">
       ${renderRadarChart(metrics)}
     </div>
   </section>
   ```

2. Add CSS:
   ```css
   .radar-container { display: flex; justify-content: center; margin: 1rem 0; }
   .radar-container svg { max-width: 350px; width: 100%; }
   .radar-label { font-family: 'Geist', sans-serif; font-size: 11px; fill: #888; }
   .radar-value { font-family: 'Geist Mono', monospace; font-size: 10px; fill: #ededed; }
   ```

3. Compute metrics in the skill detail route handler, pass to `renderSkillDetailPage()`.

4. Add `RadarMetrics` interface:
   ```typescript
   interface RadarMetrics {
     accuracy: number;    // 0-100
     security: number;    // 0-100
     tokenEfficiency: number;  // 0-100
     costEfficiency: number;   // 0-100
     speed: number;       // 0-100
   }
   ```

### Todo
- [ ] Add durationMs to results query in skill detail route
- [ ] Compute normalized radar metrics (5 axes)
- [ ] Create `renderRadarChart()` SVG generator function
- [ ] Add RadarMetrics interface
- [ ] Integrate radar chart into skill detail page HTML
- [ ] Add radar chart CSS
- [ ] Pass metrics from route handler to renderer
- [ ] Test with skills that have no security score (should show 0)

### Success Criteria
- Radar chart renders as inline SVG on skill detail page
- 5 axes: accuracy, security, token efficiency, cost efficiency, speed
- All values normalized to 0-100
- Chart uses project's dark theme (black bg, gray gridlines, blue data)
- No external dependencies (pure inline SVG)
- Responsive (scales on mobile)

### Risk Assessment
- Token/cost/speed normalization thresholds are heuristic -- may need tuning after seeing real data
- Skills with no security tests show 0 security -- acceptable, matches current stat card behavior

---

## Dependency Graph

```
Phase 1 (auto-publish) -----> independent
Phase 2 (full metrics) -----> independent
Phase 3 (result drill-down) -> independent (but Phase 2 ensures richer data)
Phase 4 (radar chart) -------> depends on Phase 3 (shares avg duration query)
```

Recommended order: Phase 1 -> Phase 2 -> Phase 3 -> Phase 4

Phase 1 and Phase 2 are CLI-only changes, can be done in parallel.
Phase 3 and Phase 4 both touch `html-pages-renderer.ts` -- do sequentially to avoid conflicts.

---

## Testing Strategy

- **Phase 1**: Manual test `skillmark run` with/without API key, with `--no-publish`
- **Phase 2**: Manual test `skillmark publish result.json`, verify API receives all fields
- **Phase 3**: Deploy to staging, verify expandable rows work, test with result that has/lacks `raw_json`
- **Phase 4**: Visual verification of radar chart on staging, test with various metric ranges

---

## Unresolved Questions

1. **Token/cost/speed normalization thresholds** -- current heuristic values (10K tokens, $0.10, 60s) are best guesses. May need calibration against real benchmark data.
2. **Rate limiting on `/api/result/:id`** -- public endpoint returning potentially large JSON. Should we add rate limiting or response size caps? Current stance: defer, acceptable for MVP.
3. **Caching `raw_json` responses** -- frequent clicks on same result row will re-fetch. Could add `Cache-Control` header or rely on client-side `data-loaded` flag (plan uses client-side caching).
