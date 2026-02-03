-- Skillmark D1 Database Schema
-- Run with: wrangler d1 execute skillmark-db --file=./src/db/d1-database-schema.sql

-- Skills table: stores skill metadata
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT,
  description TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Results table: stores benchmark results
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  model TEXT NOT NULL,
  accuracy REAL NOT NULL,
  tokens_total INTEGER NOT NULL,
  tokens_input INTEGER,
  tokens_output INTEGER,
  duration_ms INTEGER NOT NULL,
  cost_usd REAL NOT NULL,
  tool_count INTEGER,
  runs INTEGER NOT NULL,
  hash TEXT NOT NULL,
  raw_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- API keys table: stores user API keys for publishing
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  user_name TEXT,
  email TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_used_at INTEGER
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_results_skill_id ON results(skill_id);
CREATE INDEX IF NOT EXISTS idx_results_accuracy ON results(accuracy DESC);
CREATE INDEX IF NOT EXISTS idx_results_created_at ON results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- View for leaderboard (best result per skill)
CREATE VIEW IF NOT EXISTS leaderboard AS
SELECT
  s.id as skill_id,
  s.name as skill_name,
  s.source,
  MAX(r.accuracy) as best_accuracy,
  (SELECT model FROM results WHERE skill_id = s.id ORDER BY accuracy DESC LIMIT 1) as best_model,
  AVG(r.tokens_total) as avg_tokens,
  AVG(r.cost_usd) as avg_cost,
  MAX(r.created_at) as last_tested,
  SUM(r.runs) as total_runs
FROM skills s
JOIN results r ON r.skill_id = s.id
GROUP BY s.id
ORDER BY best_accuracy DESC;
