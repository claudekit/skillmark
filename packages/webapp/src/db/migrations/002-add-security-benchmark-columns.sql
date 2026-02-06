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
  (MAX(r.accuracy) * 0.80 + COALESCE(MAX(r.security_score), 0) * 0.20) as composite_score,
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
