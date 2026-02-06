# Phase 6: Dashboard UI Changes

## Context
- [Phase 5](./phase-05-db-migration-and-api-changes.md) — API data source
- [html-pages-renderer.ts](../../packages/webapp/src/routes/html-pages-renderer.ts)

## Overview
- **Priority:** P2
- **Status:** Pending
- **Description:** Add security score + composite score columns to main leaderboard, create dedicated security detail section on skill pages

## Key Insights
- UI is server-rendered HTML in TypeScript template literals (no frontend framework)
- Existing design: Vercel/skills.sh style — pure black, minimal, Geist font
- Security data comes from leaderboard view (Phase 5)
- `html-pages-renderer.ts` is 1896 lines — large file but all rendering functions, no need to split

## Requirements

### Main Leaderboard (/)
- Add "Security" and "Composite" columns to table
- Warning badge (yellow dot) if security < 50%
- "—" for skills without security data
- Sort by composite_score (already done in SQL view)

### Skill Detail (/skill/:name)
- New "Security Benchmark" stat card in stats grid
- Security category breakdown section
- Security score in result history table
- Warning banner if security < 50%

## Related Code Files

### Modify
- `packages/webapp/src/routes/html-pages-renderer.ts` — all UI changes

## Implementation Steps

### Step 1: Update LeaderboardRow interface

Add to interface (line ~14):
```typescript
bestSecurity: number | null;
compositeScore: number | null;
```

### Step 2: Update leaderboard SQL query

In `pagesRouter.get('/')` (line ~38), update the SELECT to include:
```sql
l.best_security as bestSecurity,
l.composite_score as compositeScore,
```

### Step 3: Update leaderboard table header

In `renderLeaderboardPage()`, update the `<thead>` (line ~856):
```html
<tr>
  <th>#</th>
  <th>Skill</th>
  <th>Submitter</th>
  <th>Security</th>
  <th>Composite</th>
  <th>Accuracy</th>
</tr>
```

### Step 4: Update leaderboard table rows

In the `rows` map (line ~272), add security and composite cells before the accuracy cell:

```typescript
const security = entry.bestSecurity != null
  ? `${entry.bestSecurity.toFixed(0)}%`
  : '—';
const composite = entry.compositeScore != null
  ? `${entry.compositeScore.toFixed(1)}%`
  : '—';
const securityWarning = entry.bestSecurity != null && entry.bestSecurity < 50
  ? '<span class="security-warning" title="Low security score">●</span> '
  : '';
```

Add cells:
```html
<td class="security">${securityWarning}${security}</td>
<td class="composite">${composite}</td>
```

### Step 5: Add CSS for security columns

Add to the `<style>` section:
```css
.security {
  font-family: 'Geist Mono', monospace;
  color: var(--text-secondary);
}

.composite {
  font-family: 'Geist Mono', monospace;
  font-weight: 500;
}

.security-warning {
  color: #d29922;
  font-size: 0.625rem;
}
```

### Step 6: Update "How It Works" page test types table

In `renderHowItWorksPage()` (line ~1080), add security row to test types:
```html
<tr><td><code>security</code></td><td>Security tests checking refusal of malicious prompts and absence of forbidden content</td></tr>
```

### Step 7: Add security stat card to skill detail page

In `renderSkillDetailPage()` (line ~1400), update stats grid to 5 columns and add security card after "Best Model":

```html
<div class="stat-card">
  <div class="stat-label">Security</div>
  <div class="stat-value">${skill.bestSecurity != null ? skill.bestSecurity.toFixed(0) + '%' : '—'}</div>
</div>
```

Update grid CSS for skill detail: `grid-template-columns: repeat(5, 1fr);`

### Step 8: Add security column to result history table

In the results table (line ~1422), add header:
```html
<th>Security</th>
```

Add cell in result rows:
```html
<td class="result-security">${r.securityScore != null ? r.securityScore.toFixed(0) + '%' : '—'}</td>
```

### Step 9: Update SkillResultRow interface

Add:
```typescript
securityScore: number | null;
```

Update the results query in `pagesRouter.get('/skill/:name')` to include:
```sql
r.security_score as securityScore,
```

### Step 10: Add security breakdown section on skill detail page

After the result history section, add a security breakdown section (only shown when security data exists):

```typescript
const securitySection = skill.bestSecurity != null ? `
  <section class="section">
    <h2>Security Benchmark</h2>
    ${skill.bestSecurity < 50 ? `
      <div class="security-banner">
        <span class="security-warning">●</span>
        This skill has a low security score. Consider running security benchmarks to identify vulnerabilities.
      </div>
    ` : ''}
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card">
        <div class="stat-label">Security Score</div>
        <div class="stat-value">${skill.bestSecurity.toFixed(1)}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Composite Score</div>
        <div class="stat-value">${skill.compositeScore?.toFixed(1) || '—'}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Accuracy</div>
        <div class="stat-value">${skill.bestAccuracy.toFixed(1)}%</div>
      </div>
    </div>
  </section>
` : '';
```

### Step 11: Add security banner CSS

```css
.security-banner {
  background: rgba(210, 153, 34, 0.1);
  border: 1px solid rgba(210, 153, 34, 0.3);
  color: #d29922;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}
```

## Todo List

- [ ] Update LeaderboardRow interface with security fields
- [ ] Update leaderboard SQL query
- [ ] Add Security + Composite columns to leaderboard table
- [ ] Add security warning badge for low scores
- [ ] Add security CSS styles
- [ ] Update How It Works test types
- [ ] Add security stat card to skill detail
- [ ] Add security column to result history
- [ ] Add security breakdown section on skill page
- [ ] Add security banner CSS
- [ ] Verify `pnpm --filter @skillmark/webapp build` compiles

## Success Criteria
- Main leaderboard shows Security and Composite columns
- Skills without security data show "—"
- Low security skills show warning badge
- Skill detail page shows security breakdown
- Responsive layout still works on mobile

## Risk Assessment
- **Low:** Pure UI changes, no data mutations
- **Medium:** Large file (html-pages-renderer.ts) — careful with line references
