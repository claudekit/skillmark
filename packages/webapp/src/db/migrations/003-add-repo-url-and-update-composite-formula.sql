-- Migration: Add repo_url column and update composite score formula (80/20)
-- Run: wrangler d1 execute skillmark-db --file=./src/db/migrations/003-add-repo-url-and-update-composite-formula.sql

-- Add repo_url column to results
ALTER TABLE results ADD COLUMN repo_url TEXT;

-- Update leaderboard view with new composite formula (80% accuracy + 20% security)
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
  (SELECT repo_url FROM results WHERE skill_id = s.id AND repo_url IS NOT NULL ORDER BY created_at DESC LIMIT 1) as repo_url,
  AVG(r.tokens_total) as avg_tokens,
  AVG(r.cost_usd) as avg_cost,
  MAX(r.created_at) as last_tested,
  SUM(r.runs) as total_runs
FROM skills s
JOIN results r ON r.skill_id = s.id
GROUP BY s.id
ORDER BY composite_score DESC;
