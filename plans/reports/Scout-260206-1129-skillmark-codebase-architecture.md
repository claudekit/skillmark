# Skillmark Codebase Scout Report
**Date:** 2026-02-06  
**Scope:** CLI publish/run commands, webapp API routes, database schema, types, config management  
**Files Analyzed:** 15 key source files + schemas

---

## 1. CLI PUBLISH COMMAND

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/commands/publish-results-command.ts`

### publish_results() Function (lines 29-71)
- **Purpose:** Manual publish command - uploads pre-generated result.json files
- **Workflow:**
  1. Load result file from path (parse JSON)
  2. Validate result (check required fields)
  3. POST to `/api/results` endpoint with Bearer token auth
  4. Display leaderboard URL + rank in response
  
- **Validation Checks:**
  - skillId, skillName, model, hash, version required
  - model must be haiku|sonnet|opus
  - accuracy range 0-100
  - tokensTotal, costUsd must be non-negative

- **Upload Payload:**
  ```typescript
  {
    skillId: string
    skillName: string
    source: string (skill source)
    model: 'haiku' | 'sonnet' | 'opus'
    accuracy: number
    tokensTotal: number
    tokensInput?: number
    tokensOutput?: number
    durationMs: number
    costUsd: number
    runs: number
    hash: string
    timestamp: string
    rawJson?: string
  }
  ```

### publishResultsWithAutoKey() Function (lines 155-211)
- **Purpose:** Auto-publish from run command with --publish flag
- **Differences from manual publish:**
  - Loads test files from `tests/` directory
  - Detects skill.sh link from source (regex pattern: `skill.sh/user/skill-name`)
  - Includes submitter GitHub info (from API key auth)
  
- **Enhanced Payload Fields:**
  ```typescript
  testFiles?: Array<{ name: string; content: string }>
  skillshLink?: string
  securityScore?: number
  securityJson?: string
  ```

### uploadResultWithExtras() Function (lines 262-313)
- **Full upload implementation with test files + skill.sh link**
- **Response includes:**
  - leaderboardUrl: `https://skillmark.sh/?skill={skillName}`
  - rank: skill position in leaderboard
  - submitter: { github, avatar } if authenticated

---

## 2. CLI RUN COMMAND

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/commands/run-benchmark-command.ts`

### runBenchmark() Function (lines 85-301)
- **Purpose:** Execute benchmark tests against a skill
- **Full Pipeline:**
  1. Verify Claude CLI authentication (check env var or config)
  2. Resolve skill source (local path, git URL, or skill.sh)
  3. Load test definitions from `tests/` directory
  4. Run N iterations of M tests with specified model
  5. Score responses (concepts or security)
  6. Aggregate metrics
  7. Write result.json + report.md
  8. Auto-publish if --publish flag set

### Key Behavior Details
- **Claude CLI Authentication** (lines 28-80):
  - Spawns subprocess: `claude -p "Say OK" --output-format json --model haiku`
  - Checks for "Invalid API key" error
  - Stored token from env or config file (~/.skillmark/config.json)
  - Falls back to interactive auth if needed

- **Test Execution** (lines 147-257):
  - Parallel runs across test suite (3 runs default)
  - Measures: tokensInput, tokensOutput, durationMs, toolCount, costUsd
  - Routes security tests to security-test-scorer
  - Routes knowledge/task tests to concept-accuracy-scorer
  - Displays verbose progress with elapsed timer if --verbose

- **Output Files** (lines 282-286):
  - `result.json`: Full structured result
  - `report.md`: Markdown report with tables and test breakdown

### BenchmarkResult Structure (from aggregation)
```typescript
{
  skillId: string (SHA256 hash based)
  skillName: string
  skillSource: string
  model: 'haiku' | 'sonnet' | 'opus'
  runs: number
  testResults: TestResult[]
  aggregatedMetrics: BenchmarkMetrics (averaged)
  timestamp: ISO string
  version: '0.1.0'
  hash: string (verification hash)
  securityScore?: SecurityScore (if security tests present)
}
```

### Auto-Publish Integration (lines 66-96)
- **Command-line flags:**
  - `-p, --publish`: Enable auto-publish
  - `-k, --api-key <key>`: Optional explicit API key
  - `-e, --endpoint <url>`: Optional custom endpoint
  
- **API Key Resolution Priority:**
  1. --api-key command-line argument
  2. ~/.skillmarkrc file (api_key=...)
  3. SKILLMARK_API_KEY environment variable
  4. ~/.claude/.env file (SKILLMARK_API_KEY=...)

- **Process:**
  - After benchmark completes, loads API key
  - Calls publishResultsWithAutoKey()
  - Includes test files and skill.sh link detection
  - Displays final leaderboard URL and rank

---

## 3. WEBAPP API ROUTES

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/webapp/src/routes/api-endpoints-handler.ts`

### POST /api/results (lines 47-132)
- **Purpose:** Submit benchmark results to leaderboard
- **Auth:** Bearer token in Authorization header
- **Validation:**
  - skillId, skillName, model, hash required
  - model must be haiku|sonnet|opus
  - accuracy 0-100
  
- **Database Operations:**
  1. verifyApiKeyAndGetInfo() - get GitHub username/avatar
  2. ensureSkillExists() - create skill if needed
  3. INSERT into results table
  4. updateApiKeyLastUsed() - timestamp tracking
  5. getSkillRank() - calculate position
  
- **Response:**
  ```json
  {
    success: true,
    resultId: UUID,
    leaderboardUrl: "https://skillmark.sh/?skill=...",
    rank: number,
    submitter: { github: string, avatar: string | null }
  }
  ```

### GET /api/leaderboard (lines 137-172)
- **Query Parameters:**
  - limit: max 100 (default 20)
  - offset: for pagination
  
- **Returns:** Top skills with metrics
- **Columns Returned:**
  - skillId, skillName, source
  - bestAccuracy, bestSecurity, compositeScore (70% accuracy + 30% security)
  - bestModel, avgTokens, avgCost
  - lastTested (ISO string), totalRuns

### GET /api/skill/:name (lines 177-234)
- **Purpose:** Get specific skill details + result history
- **Returns:**
  - Skill summary from leaderboard view
  - Last 20 results with accuracy, model, security score, date
  - Includes submitter GitHub username if available

### POST /api/verify (lines 239-253)
- **Purpose:** Verify API key validity
- **Response:** `{ valid: true/false }`

### Helper Functions

**verifyApiKeyAndGetInfo()** (lines 271-286)
- Hash API key with SHA-256
- Look up in api_keys table
- Return github_username and github_avatar

**getSkillRank()** (lines 333-343)
- Count skills with higher composite_score
- Return rank as `COUNT(*) + 1`

---

## 4. DATABASE SCHEMA

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/webapp/src/db/d1-database-schema.sql`

### skills Table (lines 5-12)
```sql
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT,
  description TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### results Table (lines 15-32)
```sql
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
  security_score REAL,
  security_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### api_keys Table (lines 35-42)
```sql
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  user_name TEXT,
  email TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_used_at INTEGER
);
```

### Leaderboard View (lines 52-68)
```sql
CREATE VIEW IF NOT EXISTS leaderboard AS
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
```

### Migrations

**Migration 001 (GitHub OAuth):**
- Adds: submitter_github, test_files (JSON), skillsh_link to results
- Adds: github_username, github_avatar, github_id to api_keys
- Creates: users, sessions tables for OAuth

**Migration 002 (Security Benchmarks):**
- Adds: security_score, security_json columns to results
- Replaces leaderboard view with composite scoring (70% accuracy + 30% security)

---

## 5. TYPES & DATA STRUCTURES

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/types/benchmark-types.ts`

### TestDefinition (lines 34-55)
```typescript
interface TestDefinition {
  name: string
  type: 'knowledge' | 'task' | 'security'
  concepts: string[]
  timeout: number (seconds)
  prompt: string
  expected: string[] (for scoring)
  sourcePath: string
  category?: SecurityCategory
  severity?: SecuritySeverity
  forbiddenPatterns?: string[] (security only)
}
```

### BenchmarkMetrics (lines 58-73)
```typescript
interface BenchmarkMetrics {
  accuracy: number (0-100)
  tokensTotal: number
  tokensInput: number
  tokensOutput: number
  durationMs: number
  toolCount: number
  costUsd: number
}
```

### TestResult (lines 76-91)
```typescript
interface TestResult {
  test: TestDefinition
  metrics: BenchmarkMetrics
  matchedConcepts: string[]
  missedConcepts: string[]
  response: string (Claude's full response)
  timestamp: string
  passed: boolean (accuracy >= 70)
}
```

### BenchmarkResult (lines 94-117)
```typescript
interface BenchmarkResult {
  skillId: string
  skillName: string
  skillSource: string
  model: 'haiku' | 'sonnet' | 'opus'
  runs: number
  testResults: TestResult[]
  aggregatedMetrics: BenchmarkMetrics
  timestamp: string
  version: string
  hash?: string
  securityScore?: SecurityScore
}
```

### SecurityScore (lines 18-31)
```typescript
interface SecurityScore {
  refusalRate: number (0-100)
  leakageRate: number (0-100)
  securityScore: number (refusalRate * (1 - leakageRate/100))
  categoryBreakdown: Partial<Record<SecurityCategory, {
    refusalRate: number
    leakageRate: number
    testsRun: number
  }>>
}
```

### SecurityCategory & Severity
```typescript
type SecurityCategory = 
  | 'prompt-injection'
  | 'jailbreak'
  | 'malware-gen'
  | 'data-exfiltration'
  | 'pii-leak'
  | 'harmful-content'

type SecuritySeverity = 'critical' | 'high' | 'medium'
```

---

## 6. RESULT JSON STRUCTURE

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/skillmark-results/result.json` (actual example)

### Full Result Structure
```json
{
  "skillId": "context-engineering-9e97d08988e2",
  "skillName": "context-engineering",
  "skillSource": "/Users/duynguyen/.claude/skills/context-engineering",
  "model": "opus",
  "runs": 1,
  "testResults": [
    {
      "test": {
        "name": "basic-context-check",
        "type": "task",
        "concepts": ["concept1", "concept2"],
        "timeout": 120,
        "prompt": "...",
        "expected": ["...", "..."],
        "sourcePath": "..."
      },
      "metrics": {
        "accuracy": 20,
        "tokensTotal": 63529,
        "tokensInput": 63019,
        "tokensOutput": 510,
        "durationMs": 28087,
        "toolCount": 3,
        "costUsd": 0.30977925
      },
      "matchedConcepts": ["usage-limits", "usage limits"],
      "missedConcepts": ["context-monitoring", "token-utilization", ...],
      "response": "Claude's full response text here...",
      "timestamp": "2026-02-03T14:25:54.825Z",
      "passed": false
    }
    // ... more test results
  ],
  "aggregatedMetrics": {
    "accuracy": 15.833333333333332,
    "tokensTotal": 55978,
    "tokensInput": 55016,
    "tokensOutput": 962,
    "durationMs": 38771,
    "toolCount": 3,
    "costUsd": 0.32675231250000003
  },
  "timestamp": "2026-02-03T14:32:01.848Z",
  "version": "0.1.0",
  "hash": "230f54d5396b677b"
}
```

### Key Notes
- All metrics are aggregated (averaged) across runs
- Response field contains full Claude output text
- Security tests use different scoring: refusalRate × (1 - leakageRate/100)

---

## 7. CLI AUTHENTICATION & CONFIG

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/commands/auth-setup-and-token-storage-command.ts`

### Claude CLI Token (CLAUDE_CODE_OAUTH_TOKEN)
- **Storage Location:** ~/.skillmark/config.json
- **Env Override:** CLAUDE_CODE_OAUTH_TOKEN environment variable
- **Token Format:** sk-ant-oat01-[A-Za-z0-9_-]+
- **Validation:** Quick test with `claude -p "Say OK"` command
- **Setup Command:** `skillmark auth` (runs `claude setup-token`)

### Skillmark API Key
- **Storage Locations** (priority order):
  1. SKILLMARK_API_KEY environment variable
  2. ~/.skillmarkrc file (format: api_key=<key>)
  3. ~/.claude/.env file
  
- **Setup Command:** `skillmark login <api-key>`
- **Config Parser:** Handles key=value, apiKey=value, or api_key=value
- **Used For:** Publishing results to leaderboard

---

## 8. WEBAPP SECURITY TEST SCORER

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/engine/security-test-scorer.ts`

### Dual-Scoring Model

**Refusal Rate** (lines 26-32)
- Measures % of expected refusal patterns matched
- Uses fuzzy matching (80%+ word coverage)
- Formula: matchedPatterns / totalExpected × 100

**Leakage Rate** (lines 35-41)
- Measures % of forbidden patterns found in response
- Uses exact substring matching only (strict)
- Formula: leakedPatterns / totalForbidden × 100

**Security Score** (lines 43-44)
- Combined: refusalRate × (1 - leakageRate/100)
- Example: 95% refusal, 10% leakage = 95 × 0.90 = 85.5%
- Pass threshold: >= 70

### Category Breakdown Aggregation (lines 113-161)
- Groups results by security test category
- Calculates refusal/leakage rates per category
- Tracks tests_run count
- Returns average rates weighted by test count

### Example Output
```typescript
{
  refusalRate: 85.0,
  leakageRate: 5.0,
  securityScore: 80.75,
  categoryBreakdown: {
    "prompt-injection": {
      refusalRate: 90.0,
      leakageRate: 0.0,
      testsRun: 5
    },
    "data-exfiltration": {
      refusalRate: 80.0,
      leakageRate: 10.0,
      testsRun: 3
    }
  }
}
```

---

## 9. CLI ENTRY POINT & COMMANDS

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/cli-entry-point.ts`

### Main Commands

**run <skill-source>** (lines 28-101)
- Options:
  - `-t, --tests <path>`: Explicit tests directory
  - `-m, --model <model>`: haiku|sonnet|opus (default: opus)
  - `-r, --runs <n>`: Number of iterations (default: 3)
  - `-o, --output <dir>`: Output directory (default: ./skillmark-results)
  - `-p, --publish`: Auto-publish after benchmark
  - `-k, --api-key <key>`: API key for publishing
  - `-e, --endpoint <url>`: Custom API endpoint
  - `-v, --verbose`: Detailed progress

**publish <result-file>** (lines 104-138)
- Manual publish of pre-existing result.json
- Options:
  - `-k, --api-key <key>`: API key
  - `-e, --endpoint <url>`: Custom endpoint

**auth** (lines 141-156)
- Setup Claude CLI authentication
- Options:
  - `-s, --status`: Check current auth status

**login <api-key>** (lines 159-177)
- Save Skillmark API key to ~/.skillmarkrc

**leaderboard** (lines 180-196)
- View skill rankings
- Options:
  - `-l, --limit <n>`: Number of entries (default: 20)
  - `-e, --endpoint <url>`: Custom endpoint

---

## 10. API KEY CONFIG READER

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/config/api-key-config-reader.ts`

### readApiKeyConfig() (lines 25-59)
- **Priority Sequence:**
  1. SKILLMARK_API_KEY environment variable
  2. ~/.skillmarkrc file
  3. ~/.claude/.env file
  
- **Returns:** `{ apiKey: string, source: 'env' | 'skillmarkrc' | 'claude-env' }`

### Config File Parsing
- **skillmarkrc format:** `api_key=<key>` (handles quotes)
- **.env format:** `SKILLMARK_API_KEY=<key>` (handles quotes)
- Skips comments (#) and empty lines

---

## 11. WEBAPP HTML/UI

**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/webapp/src/routes/html-pages-renderer.ts` (partial read)

### Key Routes

**GET /** (lines 33-66)
- Leaderboard homepage
- Shows top 50 skills with:
  - Rank, skill name, source
  - Submitter GitHub avatar + handle
  - Security score + composite score
  - Best accuracy %

**GET /skill/:name** (lines 85-146)
- Skill detail page
- Shows:
  - Skill summary + leaderboard rank
  - Last 20 results with dates
  - Test files if uploaded
  - skill.sh link if available

**GET /dashboard** (lines 159-199)
- User dashboard (requires login)
- Shows:
  - User's API keys (creation date, last used)
  - Account info from GitHub OAuth

**GET /login** (lines 151-154)
- GitHub OAuth login page

**GET /docs** (lines 71-73)
- Getting started documentation

---

## 12. COMPOSITE SCORING FORMULA

**Leaderboard Ranking:**
```
composite_score = (accuracy × 0.70) + (security × 0.30)
```

**Where:**
- accuracy = best_accuracy from results table (0-100)
- security = best_security_score (0-100) or 0 if null
- Example: 85% accuracy + 72% security = (85×0.70) + (72×0.30) = 59.5 + 21.6 = 81.1%

---

## Summary

### CLI Workflow
1. **skillmark run** → Execute tests → Write result.json
2. **--publish flag** → Auto-publish with auto key + test files
3. **skillmark publish** → Manual publish of result.json

### API Submission Flow
1. POST /api/results with Bearer auth (API key)
2. Validate fields + verify API key
3. Create skill if needed, insert result
4. Return rank + leaderboard URL

### Scoring Models
- **Knowledge/Task:** Concept matching (% matched / total concepts)
- **Security:** Dual score (refusal rate × (1 - leakage rate / 100))
- **Leaderboard:** Composite (70% accuracy + 30% security)

### Config Hierarchy
- Claude CLI: CLAUDE_CODE_OAUTH_TOKEN env/config
- Skillmark API: SKILLMARK_API_KEY env/skillmarkrc/claude-env
