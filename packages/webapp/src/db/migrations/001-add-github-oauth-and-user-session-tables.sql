-- Migration: Add GitHub OAuth fields and enhanced result tracking
-- Run with: wrangler d1 execute skillmark-db --file=./src/db/migrations/001-github-oauth-fields.sql

-- Add GitHub profile fields to api_keys table
ALTER TABLE api_keys ADD COLUMN github_username TEXT;
ALTER TABLE api_keys ADD COLUMN github_avatar TEXT;
ALTER TABLE api_keys ADD COLUMN github_id INTEGER;

-- Add submitter and test data fields to results table
ALTER TABLE results ADD COLUMN submitter_github TEXT;
ALTER TABLE results ADD COLUMN test_files TEXT;  -- JSON array of test file contents
ALTER TABLE results ADD COLUMN skillsh_link TEXT;

-- Create users table for session management
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  github_id INTEGER NOT NULL UNIQUE,
  github_username TEXT NOT NULL,
  github_avatar TEXT,
  github_email TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create sessions table for OAuth session management
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_github_id ON api_keys(github_id);

-- Update api_keys to reference users
-- Note: existing keys remain valid but won't have user association
