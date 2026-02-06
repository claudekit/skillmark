# Phase 5: DB Migration & API Changes

## Context
- [d1-database-schema.sql](../../packages/webapp/src/db/d1-database-schema.sql)
- [api-endpoints-handler.ts](../../packages/webapp/src/routes/api-endpoints-handler.ts)
- [Migration 001](../../packages/webapp/src/db/migrations/001-add-github-oauth-and-user-session-tables.sql)

## Overview
- **Priority:** P1
- **Status:** Pending
- **Description:** Add security columns to D1 database, update leaderboard view with composite score, extend API endpoints to accept/return security data

## Key Insights
- D1 uses SQLite — `ALTER TABLE ADD COLUMN` is safe and backward compatible
- Existing leaderboard view must be replaced (DROP + CREATE) since SQLite doesn't support `CREATE OR REPLACE VIEW`
- COALESCE handles null security_score for old results

## Requirements
- New columns: `security_score REAL`, `security_json TEXT` on results table
- Updated leaderboard view with composite_score column
- POST /api/results accepts security payload
- GET /api/leaderboard returns security + composite scores
- GET /api/skill/:name returns security data in history

## Related Code Files

### Create
- `packages/webapp/src/db/migrations/002-add-security-benchmark-columns.sql`

### Modify
- `packages/webapp/src/db/d1-database-schema.sql` — update schema definition
- `packages/webapp/src/routes/api-endpoints-handler.ts` — extend endpoints

## Implementation Steps

### Step 1: Create migration file

`packages/webapp/src/db/migrations/002-add-security-benchmark-columns.sql`:

```sql
-- Migration: Add security benchmark columns and composite leaderboard
-- Run: wrangler d1 execute skillmark-db --file=./src/db/migrations/002-add-security-benchmark-columns.sql

-- Add security columns to results
ALTER TABLE results ADD COLUMN security_score REAL;
ALTER TABLE results ADD COLUMN security_json TEXT;

-- Replace leaderboard view with composite scoring
DROP VIEW IF EXISTS leaderboard;

CREATE VIEW leaderboard AS
SELECT
  s.id as skill_id,
  s.name as skill_name,
  s.source,
  MAX(r.accuracy) as best_accuracy,
  MAX(r.security_score) as best_security,
  (MAX(r.accuracy) * 0.70 + COALESCE(MAX(r.security_score), 0) * 0.30) as composite_score,
  (SELECT model FROM results WHERE skill_id = s.id ORDER BY accuracy DESC LIMIT 1) as best_model,
  AVG(r.tokens_total) as avg_tokens,
  AVG(r.cost_usd) as avg_cost,
  MAX(r.created_at) as last_tested,
  SUM(r.runs) as total_runs
FROM skills s
JOIN results r ON r.skill_id = s.id
GROUP BY s.id
ORDER BY composite_score DESC;

-- Index for security score queries
CREATE INDEX IF NOT EXISTS idx_results_security_score ON results(security_score);
```

### Step 2: Update base schema definition

Update `d1-database-schema.sql` results table to include the new columns (for reference — the migration handles existing DBs):

After `raw_json TEXT,` (line ~28), add:
```sql
  security_score REAL,
  security_json TEXT,
```

Update the leaderboard view to match the migration's version (replace lines 49-64).

### Step 3: Extend ResultPayload interface

In `api-endpoints-handler.ts`, add to `ResultPayload` (after `rawJson`):
```typescript
/** Security benchmark score (0-100) */
securityScore?: number;
/** Full security breakdown JSON */
securityJson?: string;
```

### Step 4: Update POST /api/results

Update the INSERT statement to include security fields. Change the INSERT (line ~80-103):

```typescript
await c.env.DB.prepare(`
  INSERT INTO results (
    id, skill_id, model, accuracy, tokens_total, tokens_input, tokens_output,
    duration_ms, cost_usd, tool_count, runs, hash, raw_json,
    submitter_github, test_files, skillsh_link,
    security_score, security_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).bind(
  resultId,
  payload.skillId,
  payload.model,
  payload.accuracy,
  payload.tokensTotal,
  payload.tokensInput || null,
  payload.tokensOutput || null,
  payload.durationMs,
  payload.costUsd,
  payload.toolCount || null,
  payload.runs,
  payload.hash,
  payload.rawJson || null,
  keyInfo.githubUsername || null,
  payload.testFiles ? JSON.stringify(payload.testFiles) : null,
  payload.skillshLink || null,
  payload.securityScore ?? null,
  payload.securityJson || null
).run();
```

### Step 5: Update GET /api/leaderboard

Update the SELECT query (line ~135) to include new columns:
```typescript
const results = await c.env.DB.prepare(`
  SELECT
    skill_id as skillId,
    skill_name as skillName,
    source,
    best_accuracy as bestAccuracy,
    best_security as bestSecurity,
    composite_score as compositeScore,
    best_model as bestModel,
    avg_tokens as avgTokens,
    avg_cost as avgCost,
    last_tested as lastTested,
    total_runs as totalRuns
  FROM leaderboard
  LIMIT ? OFFSET ?
`).bind(limit, offset).all();
```

### Step 6: Update GET /api/skill/:name

Add security data to skill detail query (line ~173):
```typescript
const skill = await c.env.DB.prepare(`
  SELECT
    l.skill_id as skillId,
    l.skill_name as skillName,
    l.source,
    l.best_accuracy as bestAccuracy,
    l.best_security as bestSecurity,
    l.composite_score as compositeScore,
    l.best_model as bestModel,
    l.avg_tokens as avgTokens,
    l.avg_cost as avgCost,
    l.last_tested as lastTested,
    l.total_runs as totalRuns
  FROM leaderboard l
  WHERE l.skill_name = ?
`).bind(skillName).first();
```

Add security to history query (line ~193):
```typescript
SELECT
  accuracy,
  model,
  security_score as securityScore,
  created_at as date
FROM results
```

### Step 7: Update getSkillRank()

Change ranking to use composite_score (line ~320):
```typescript
async function getSkillRank(db: D1Database, skillId: string): Promise<number | null> {
  const result = await db.prepare(`
    SELECT COUNT(*) + 1 as rank
    FROM leaderboard
    WHERE composite_score > (
      SELECT composite_score FROM leaderboard WHERE skill_id = ?
    )
  `).bind(skillId).first();

  return result?.rank as number || null;
}
```

## Todo List

- [ ] Create migration 002 SQL file
- [ ] Update base schema definition
- [ ] Extend ResultPayload with security fields
- [ ] Update POST /api/results INSERT
- [ ] Update GET /api/leaderboard SELECT
- [ ] Update GET /api/skill/:name queries
- [ ] Update getSkillRank() to use composite_score
- [ ] Verify `pnpm --filter @skillmark/webapp build` compiles
- [ ] Test migration against local D1

## Success Criteria
- Migration adds columns without breaking existing data
- Leaderboard view returns composite_score
- API accepts and returns security data
- Old results with null security_score rank correctly (COALESCE to 0)

## Risk Assessment
- **Medium:** DROP VIEW + CREATE VIEW could fail if view has dependencies
- Mitigation: Use `DROP VIEW IF EXISTS` before CREATE
- **Low:** ALTER TABLE ADD COLUMN is safe in SQLite — no data loss
