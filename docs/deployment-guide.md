# Skillmark - Deployment Guide

## Overview

Skillmark consists of two independently deployed packages:
1. **@skillmark/cli** - Published to npm registry (global CLI tool)
2. **@skillmark/webapp** - Deployed to Cloudflare Workers (serverless API + UI)

This guide covers deployment procedures for both packages.

---

## Prerequisites

### Development Machine
- Node.js ≥18.0.0
- pnpm ≥8.0.0
- Git (for cloning, version control)
- GitHub account (OAuth, releases)

### npm Account
- Credentials configured: `npm login`
- 2FA enabled (recommended)
- Access to @skillmark organization

### Cloudflare Account
- Active Cloudflare Workers account
- D1 database created
- Wrangler CLI installed: `npm install -g wrangler`
- Cloudflare API token configured

### Environment Setup

```bash
# Install global dependencies
npm install -g wrangler
npm install -g @cloudflare/cli

# Verify credentials
npm whoami          # Should show npm username
wrangler whoami     # Should show Cloudflare account

# Configure environment variables
export CF_API_TOKEN=<your-cloudflare-api-token>
export CF_ACCOUNT_ID=<your-cloudflare-account-id>
```

---

## Part 1: CLI Package Deployment (@skillmark/cli)

### Autonomous Release with Changesets

The CLI uses [Changesets](https://github.com/changesets/changesets) with auto-generation from conventional commits. The release process is **fully autonomous** — no manual `pnpm changeset` needed.

#### How It Works

On every push to `main`, the release workflow:

1. **Auto-generates a changeset** from conventional commit messages since the last release tag
2. **Determines bump type** from commit prefixes:
   - `feat!:` or `BREAKING CHANGE` → **major** (e.g., 0.2.0 → 1.0.0)
   - `feat:` → **minor** (e.g., 0.2.0 → 0.3.0)
   - `fix:`, `perf:`, `refactor:`, etc. → **patch** (e.g., 0.2.0 → 0.2.1)
3. **Creates a "chore: version packages" PR** that bumps `package.json` versions and generates `CHANGELOG.md`
4. **Merging that PR** triggers npm publish + git tag push

#### Safeguards
- Skips auto-generation if manual changeset files already exist
- Skips runs triggered by version bump commits (prevents infinite loop)
- Uses `fetch-depth: 0` for full git history to find the last release tag

#### Manual Override

You can still manually create changesets for more control:

```bash
pnpm changeset
# Select packages, bump type, and write summary
# Commit the .changeset/*.md file with your PR
```

If a manual changeset exists, auto-generation is skipped.

#### Bump Type Reference

| Type | Commit Prefix | Example |
|------|---------------|---------|
| `patch` | `fix:`, `perf:`, `refactor:`, `chore:` | 0.2.0 → 0.2.1 |
| `minor` | `feat:` | 0.2.0 → 0.3.0 |
| `major` | `feat!:`, `BREAKING CHANGE` | 0.2.0 → 1.0.0 |

### Manual Release (Legacy)

### Step 2: Build CLI Package

```bash
# Install dependencies (if not already done)
pnpm install

# Build CLI package
pnpm --filter @skillmark/cli build

# Verify build output
ls -la packages/cli/dist/
# Should contain:
# - cli-entry-point.js
# - cli-entry-point.d.ts
# - commands/*.js
# - engine/*.js
# - sources/*.js
# - types/*.js
```

### Step 3: Test Locally

```bash
# Test the built CLI locally
node packages/cli/dist/cli-entry-point.js --help

# Should display command help:
# Usage: skillmark [options] [command]
# Commands:
#   run <skill-source>     Run benchmark
#   publish <result-file>  Publish results
#   leaderboard [name]     View rankings
#   auth <api-key>         Configure API key

# Test specific command
node packages/cli/dist/cli-entry-point.js run --help
```

### Step 4: Publish to npm

```bash
# Navigate to CLI package
cd packages/cli

# Verify package.json metadata
cat package.json | grep -A5 '"name"'
# Should show: "@skillmark/cli", "version": "0.2.0", etc.

# Dry run (preview what will be published)
npm publish --dry-run

# Actual publish
npm publish --access public

# Verify publication
npm view @skillmark/cli

# Check published files
npm view @skillmark/cli files
```

### Step 5: Verify npm Installation

```bash
# Test global install
npm install -g @skillmark/cli

# Test CLI from anywhere
skillmark --version
# Should output: v0.2.0

# Test run command help
skillmark run --help
```

### Rollback CLI Release

```bash
# If publication failed or needs rollback
npm unpublish @skillmark/cli@0.2.0

# Or deprecate version (don't remove):
npm deprecate @skillmark/cli@0.2.0 "Use v0.2.1 instead"

# Fix issue and re-publish with new version
npm version patch
npm publish --access public
```

---

## Part 2: Webapp Deployment (@skillmark/webapp)

### Step 1: Prepare Cloudflare Environment

```bash
# Verify wrangler is configured
wrangler whoami

# Check Cloudflare account settings
wrangler deployments list

# Create D1 database (if not exists)
wrangler d1 create skillmark-db

# Note the database_id from output, add to wrangler.toml:
# [[d1_databases]]
# binding = "DB"
# database_name = "skillmark-db"
# database_id = "<id-from-output>"
```

### Step 2: Database Schema Migration

```bash
# Create D1 database tables
wrangler d1 execute skillmark-db --file ./schema.sql

# Or run migration step by step:
wrangler d1 execute skillmark-db \
  --command "CREATE TABLE results (...)"

# Verify tables
wrangler d1 query skillmark-db "SELECT name FROM sqlite_master WHERE type='table'"
```

**schema.sql:**
```sql
-- Results table
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  skill_source TEXT,
  model TEXT NOT NULL,
  accuracy REAL NOT NULL,
  tokens_total INTEGER,
  duration_ms INTEGER,
  cost_usd REAL,
  test_count INTEGER,
  passed_count INTEGER,
  created_at TEXT NOT NULL,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_skill_accuracy
  ON results(skill_id, accuracy DESC);
CREATE INDEX IF NOT EXISTS idx_skill_recent
  ON results(skill_id, created_at DESC);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  github_id TEXT UNIQUE NOT NULL,
  github_login TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  last_used TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_key_hash ON api_keys(key_hash);
```

### Step 3: Configure Environment Variables

```bash
# Create .env file (local development only)
cat > packages/webapp/.env.local <<EOF
GITHUB_OAUTH_CLIENT_ID=<your-github-oauth-app-id>
GITHUB_OAUTH_CLIENT_SECRET=<your-github-oauth-app-secret>
GITHUB_OAUTH_REDIRECT_URI=https://skillmark.workers.dev/auth/github/callback
SKILLMARK_API_ENDPOINT=https://skillmark.workers.dev
EOF

# For Cloudflare deployment, set as Worker secrets:
wrangler secret put GITHUB_OAUTH_CLIENT_ID
# Prompt will ask for value, paste: <your-client-id>

wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
# Prompt will ask for value, paste: <your-client-secret>
```

**To create GitHub OAuth app:**
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Application name: Skillmark
   - Homepage URL: https://skillmark.sh
   - Authorization callback URL: https://skillmark.workers.dev/auth/github/callback
4. Copy Client ID and Client Secret

### Step 4: Build Webapp Package

```bash
# Build webapp
pnpm --filter @skillmark/webapp build

# Verify build output
ls -la packages/webapp/dist/
# Should contain:
# - worker-entry-point.js
# - routes/*.js
# - db/*.js (if exists)

# Verify TypeScript compilation
pnpm --filter @skillmark/webapp tsc --noEmit
```

### Step 5: Local Testing (Wrangler Dev)

```bash
# Start local development server
cd packages/webapp
wrangler dev --local

# Wrangler will output:
# ▲ [wrangler] ...
# ▲ [wrangler] Proxy running at http://localhost:8787
# ▲ [wrangler] D1 is available at http://localhost:8787 (local mode)

# Test endpoints in another terminal
curl http://localhost:8787/api/leaderboard
curl http://localhost:8787/auth/me

# Test GitHub OAuth flow
# Visit: http://localhost:8787/auth/github
# Should redirect to GitHub login

# Stop with Ctrl+C
```

### Step 6: Deploy to Cloudflare

```bash
# Deploy from CLI
cd packages/webapp
wrangler deploy

# Wrangler output:
# ▲ [wrangler] Uploading service worker...
# ▲ [wrangler] Uploading D1 database ...
# ▲ [wrangler] Successfully published ...
# ▲ [wrangler] URL: https://skillmark.<account-id>.workers.dev

# Or deploy from root workspace:
pnpm --filter @skillmark/webapp deploy
```

### Step 7: Verify Deployment

```bash
# Check worker is live
curl https://skillmark.workers.dev/api/leaderboard

# View logs
wrangler tail

# Check D1 database access
wrangler d1 query skillmark-db "SELECT COUNT(*) as count FROM results"

# Verify GitHub OAuth
# Visit: https://skillmark.workers.dev/auth/github
# Should redirect to GitHub OAuth flow

# Check HTTP status
curl -I https://skillmark.workers.dev/
# Should return 200 OK
```

### Step 8: Custom Domain (Optional)

```bash
# Add custom domain to Worker
wrangler publish --routes skillmark.sh/*

# Or via Cloudflare dashboard:
# 1. Go to Workers & Pages
# 2. Click "skillmark" worker
# 3. Settings > Triggers > Routes
# 4. Add route: skillmark.sh/* with account.workers.dev as service

# Verify custom domain
curl https://skillmark.sh/api/leaderboard
```

### Rollback Webapp Deployment

```bash
# View deployment history
wrangler deployments list

# Rollback to previous version
wrangler rollback

# Or manually deploy previous commit
git checkout <previous-commit>
pnpm --filter @skillmark/webapp deploy

# Check current version
curl https://skillmark.workers.dev/version
```

---

## Part 3: Production Configuration

### Monitoring & Logging

```bash
# Enable Wrangler tail for real-time logs
wrangler tail --format json

# Setup error tracking (Sentry integration)
# 1. Create Sentry project
# 2. Add to worker:
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

### Performance Monitoring

```bash
# Enable Cloudflare analytics
# In wrangler.toml:
# [analytics]
# enabled = true

# View performance metrics
# Dashboard: https://dash.cloudflare.com/
# -> Workers & Pages
# -> skillmark worker
# -> Analytics tab
```

### Rate Limiting

```bash
# Add rate limiting to wrangler.toml:
[routes]
pattern = "skillmark.sh/api/*"
custom_domain = true
rate_limiting = { threshold = 100, period = 60 }
```

### Database Backups

```bash
# Export D1 database
wrangler d1 backup create skillmark-db

# List backups
wrangler d1 backup list skillmark-db

# Restore from backup
wrangler d1 backup restore skillmark-db <backup-id>
```

---

## Part 4: CI/CD Setup

### Current Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `test-cli.yml` | Push to main/dev, PRs to dev | Lint, build, test |
| `release-cli.yml` | Push to main | Version packages + publish to npm |
| `deploy-webapp.yml` | Push to main | Deploy webapp to Cloudflare |

### CLI Release Workflow (release-cli.yml)

Fully autonomous release using [changesets/action](https://github.com/changesets/action) with auto-generated changesets from conventional commits:

```
Push to main (feat:/fix:/etc.)
  → Auto-generate changeset from commit messages
  → changesets/action creates "version packages" PR
  → Merge PR → publish to npm + push git tags
```

**Key workflow steps:**
1. Checkout with `fetch-depth: 0` (full history for tag detection)
2. Build CLI
3. Auto-generate changeset if none exist (reads commits since last `@skillmark/cli@*` tag)
4. `changesets/action` creates version PR or publishes

**Required permissions:** `contents: write`, `pull-requests: write`

**Org setting required:** "Allow GitHub Actions to create and approve pull requests" must be enabled.

### GitHub Secrets Required

Set these in GitHub repository Settings > Secrets:

1. `NPM_TOKEN` - npm authentication token
2. `CLOUDFLARE_API_TOKEN` - Cloudflare API token
3. `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID

---

## Part 5: Troubleshooting

### CLI Deployment Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "package not found" | Not published yet | Run `npm publish --access public` |
| "403 Forbidden" | No npm access | Contact org owner or check token |
| "dist/ empty" | Build failed | Run `pnpm --filter @skillmark/cli build` |
| "npm install -g" fails | Package missing | Check npm registry: `npm view @skillmark/cli` |

### Webapp Deployment Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Database error" | D1 not configured | Create DB: `wrangler d1 create skillmark-db` |
| "OAuth redirect fails" | Wrong callback URL | Check wrangler.toml and GitHub OAuth app |
| "500 error" | Worker crash | Check logs: `wrangler tail` |
| "Timeout" | D1 query too slow | Add indexes, check schema.sql |

### Local Testing Issues

```bash
# CLI not found after install
which skillmark          # Check if in PATH
npm bin -g              # Show global npm bin directory
export PATH=$PATH:$(npm bin -g)

# Wrangler dev not working
wrangler whoami         # Verify credentials
wrangler dev --local    # Try local mode

# D1 database query fails
wrangler d1 execute skillmark-db --command "SELECT 1"
# If fails, recreate: wrangler d1 create skillmark-db
```

---

## Post-Deployment Checklist

### CLI Release
- [ ] Version updated in package.json
- [ ] Built successfully (`dist/` has files)
- [ ] Tested locally (`npm install -g @skillmark/cli`)
- [ ] Published to npm (`npm publish`)
- [ ] Verified on npm registry
- [ ] Git tag created and pushed
- [ ] Release notes published

### Webapp Release
- [ ] D1 database tables created
- [ ] Secrets configured in Cloudflare
- [ ] Built successfully
- [ ] Tested locally (`wrangler dev`)
- [ ] Deployed to Cloudflare (`wrangler deploy`)
- [ ] Endpoints verified (curl tests)
- [ ] GitHub OAuth flow tested
- [ ] Monitoring enabled (analytics)
- [ ] Backup configured

### Both Releases
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] GitHub release published
- [ ] Team notified
- [ ] Announcement posted (if public release)

---

## Scaling & Performance

### Monitor CLI Usage
```bash
# Check npm download stats
curl https://api.npmjs.org/downloads/point/last-month/@skillmark/cli

# Check for issues
npm audit @skillmark/cli
```

### Monitor Webapp Performance
```bash
# View Cloudflare analytics
# Dashboard: https://dash.cloudflare.com/
# -> Workers & Pages -> skillmark
# -> Analytics tab (requests, errors, duration)

# Monitor D1 usage
wrangler d1 query skillmark-db \
  "SELECT COUNT(*) as row_count FROM results"
```

### Cost Optimization
- CLI: npm hosting is free
- Webapp: Monitor Cloudflare Workers pricing (free tier: 100k requests/day)
- D1: Monitor database storage (included in Workers plan)

---

## Security

### API Key Rotation
```bash
# Generate new API key
wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
# Paste new secret

# Old secret automatically revoked after deployment
wrangler deploy
```

### Dependency Updates
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
pnpm update

# Review and test
pnpm test

# Deploy if successful
pnpm deploy
```

---

## Support & Rollback

### Emergency Rollback

**CLI:**
```bash
npm deprecate @skillmark/cli@<bad-version> "Critical bug, use v<good-version>"
npm unpublish @skillmark/cli@<bad-version>
```

**Webapp:**
```bash
wrangler rollback
# or
git checkout <previous-commit>
wrangler deploy
```

### Incident Response
1. Identify issue (check logs: `wrangler tail`)
2. Rollback to last stable version
3. Debug locally or in staging
4. Re-deploy fix
5. Notify users if data affected

---

**Last Updated:** February 2026
**Maintained By:** DevOps Team
**Version Alignment:** 0.2.0
