-- Migration: Add trigger_score, consistency_json, baseline_json columns and update composite formula
-- Run: wrangler d1 execute skillmark-db --file=./src/db/migrations/005-add-trigger-consistency-baseline-columns.sql

-- Add new metric columns to results table
ALTER TABLE results ADD COLUMN trigger_score REAL;
ALTER TABLE results ADD COLUMN consistency_json TEXT;
ALTER TABLE results ADD COLUMN baseline_json TEXT;

-- Update leaderboard view with trigger score and new composite formula
-- Formula: accuracy (70%) + security (15%) + trigger (15%)
DROP VIEW IF EXISTS leaderboard;

CREATE VIEW leaderboard AS
SELECT
  s.id as skill_id,
  s.name as skill_name,
  s.source,
  MAX(r.accuracy) as best_accuracy,
  MAX(r.security_score) as best_security,
  MAX(r.trigger_score) as best_trigger,
  (MAX(r.accuracy) * 0.70 + COALESCE(MAX(r.security_score), 0) * 0.15 + COALESCE(MAX(r.trigger_score), 0) * 0.15) as composite_score,
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
