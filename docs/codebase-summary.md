# Skillmark - Codebase Summary

## Directory Structure

```
skillmark/
├── packages/
│   ├── cli/                          # CLI Package (@skillmark/cli)
│   │   ├── src/
│   │   │   ├── cli-entry-point.ts         # Main CLI router
│   │   │   ├── commands/
│   │   │   │   ├── run-benchmark-command.ts
│   │   │   │   ├── publish-results-command.ts
│   │   │   │   └── view-leaderboard-command.ts
│   │   │   ├── engine/
│   │   │   │   ├── markdown-test-definition-parser.ts
│   │   │   │   ├── concept-accuracy-scorer.ts
│   │   │   │   ├── security-test-scorer.ts
│   │   │   │   ├── trigger-activation-scorer.ts
│   │   │   │   ├── consistency-variance-scorer.ts
│   │   │   │   ├── claude-cli-executor.ts
│   │   │   │   ├── skill-content-collector.ts
│   │   │   │   ├── skill-creator-invoker.ts
│   │   │   │   ├── transcript-jsonl-parser.ts
│   │   │   │   ├── enhanced-test-prompt-builder.ts
│   │   │   │   ├── retry-with-degrade-utils.ts
│   │   │   │   └── run-benchmark-command.test.ts
│   │   │   ├── sources/
│   │   │   │   ├── unified-skill-source-resolver.ts
│   │   │   │   ├── local-skill-source-handler.ts
│   │   │   │   ├── git-repository-skill-source-handler.ts
│   │   │   │   └── skillsh-registry-source-handler.ts
│   │   │   ├── config/
│   │   │   │   └── api-key-config-reader.ts
│   │   │   └── types/
│   │   │       ├── index.ts
│   │   │       └── benchmark-types.ts
│   │   ├── dist/                     # Compiled JavaScript
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── webapp/                       # Webapp Package (@skillmark/webapp)
│       ├── src/
│       │   ├── worker-entry-point.ts      # Cloudflare Worker entry
│       │   ├── routes/
│       │   │   ├── api-endpoints-handler.ts    # REST API
│       │   │   ├── github-oauth-authentication-handler.ts
│       │   │   ├── static-assets-handler.ts
│       │   │   └── html-pages-renderer.ts
│       │   └── db/                        # Database utilities (future)
│       ├── dist/                     # Built files
│       ├── package.json
│       ├── wrangler.toml             # Cloudflare config
│       └── tsconfig.json
│
├── examples/
│   └── tests/                        # Example test suites
│
├── docs/                             # Documentation
├── package.json                      # Root workspace config
├── pnpm-workspace.yaml               # pnpm monorepo config
└── README.md                         # Project README
```

## Core Packages

### CLI Package (@skillmark/cli)
**Purpose:** CLI tool for running benchmarks and publishing results

**Size:** ~3,900 lines of TypeScript

**Key Responsibilities:**
1. Parse CLI arguments and route commands
2. Resolve skill sources (local, Git, skill.sh)
3. Load test definitions from markdown files
4. Execute tests via Claude CLI
5. Score responses against expected concepts
6. Publish results to API

### Webapp Package (@skillmark/webapp)
**Purpose:** REST API and web UI for leaderboards

**Framework:** Hono (Cloudflare Workers)

**Key Responsibilities:**
1. Accept benchmark submissions (POST /api/results)
2. Serve leaderboard rankings (GET /api/leaderboard)
3. Manage GitHub OAuth
4. Generate static leaderboard HTML

## Data Flow

### Benchmark Execution Flow

```
User Input (CLI)
    ↓
┌─ Skill Source Resolution ─────────────────────┐
│ input: "~/my-skill" or git URL or skill.sh    │
│ process: unified-skill-source-resolver        │
│ output: SkillSource object with local path    │
└─────────────────────────────────────────────┘
    ↓
┌─ Test Definition Loading ──────────────────────┐
│ input: skill directory or --tests path         │
│ process: markdown-test-definition-parser       │
│ output: TestDefinition[] (name, concepts, etc) │
└─────────────────────────────────────────────┘
    ↓
┌─ Test Execution Loop ──────────────────────────┐
│ for each test × run count:                     │
│   input: TestDefinition, skill path, model     │
│   process: claude-cli-executor                 │
│   output: transcript JSONL file                │
│ ─────────────────────────────────────────────  │
│ Optional enhancement:                          │
│   - skill-content-collector: Analyze skill    │
│   - skill-creator-invoker: Generate analysis  │
│   - enhanced-test-prompt-builder: Augment     │
└─────────────────────────────────────────────┘
    ↓
┌─ Response Scoring ────────────────────────────┐
│ input: response, test type                    │
│ process:                                      │
│   - Standard: concept-accuracy-scorer         │
│   - Security: security-test-scorer            │
│ output: BenchmarkMetrics, passed flag         │
└─────────────────────────────────────────────┘
    ↓
┌─ Metrics Aggregation ─────────────────────────┐
│ input: all TestResult[] from runs             │
│ process: average metrics, identify outliers   │
│ output: BenchmarkResult with aggregated data  │
└─────────────────────────────────────────────┘
    ↓
┌─ Output Generation ───────────────────────────┐
│ output: result.json (machine-readable)        │
│ output: report.md (human-readable)            │
└─────────────────────────────────────────────┘
    ↓
User (Optional) → Publish results via API
```

### API Request Flow

```
POST /api/results (with Bearer token)
    ↓
github-oauth-authentication-handler (verify token)
    ↓
api-endpoints-handler (parse BenchmarkResult JSON)
    ↓
D1 Database (store in results table)
    ↓
Response: { success: true, skillId: "..." }

GET /api/leaderboard?limit=50&offset=0
    ↓
api-endpoints-handler (query rankings)
    ↓
D1 Database (SELECT top skills by accuracy)
    ↓
Response: LeaderboardEntry[]

GET /api/skill/my-skill-name
    ↓
api-endpoints-handler (query by name)
    ↓
D1 Database (SELECT history + details)
    ↓
Response: skill details + 10 recent runs
```

## Key Type Definitions

### TestDefinition
- `name`: string (unique identifier)
- `type`: 'knowledge' | 'task' | 'security' (Q&A, execution, or safety test)
- `category`: string (security category: prompt-injection, jailbreak, etc)
- `concepts`: string[] (validation targets, 3-5 typical)
- `timeout`: number (seconds, typical 60-300)
- `prompt`: string (the test question/task)
- `expected`: string[] (response patterns to match)
- `sourcePath`: string (markdown file path)

### BenchmarkMetrics
- `accuracy`: 0-100% (concepts_matched / total_concepts)
- `securityScore`: 0-100% (refusal × (1 - leakage/100))
- `triggerScore`: 0-100% (activation × precision)
- `consistencyScore`: 0-100% (based on stdDev, range, conceptOverlap)
- `tokensTotal`: input + output tokens
- `tokensInput`: prompt tokens
- `tokensOutput`: response tokens
- `durationMs`: wall-clock time
- `toolCount`: number of tool calls
- `costUsd`: (tokens_total × model_price_per_token)

### TestResult
Single test execution result including:
- test definition
- metrics for this run
- matchedConcepts, missedConcepts
- raw response text
- passed flag (accuracy ≥ 70% threshold)
- timestamp

### BenchmarkResult
Aggregated results across all tests/runs:
- skillId, skillName, skillSource
- model type (haiku/sonnet/opus)
- runs: number of iterations
- testResults: all individual results
- aggregatedMetrics: averaged across runs
- hash: SHA-256 for verification

### SkillSource
- `type`: 'local' | 'git' | 'skillsh'
- `original`: original input string
- `localPath`: resolved filesystem path
- `name`: extracted skill name

## Command Implementation

### run-benchmark-command.ts
1. Parse options (tests, model, runs, output, verbose, with-baseline)
2. Resolve skill source via resolveSkillSource()
3. Load tests via loadTestsFromDirectory() or discoverTests()
4. (Optional) Execute baseline tests without skill if --with-baseline
5. Execute tests via executeTest() for each test × run
6. Score responses via scoreResponse() (accuracy, security, trigger)
7. Calculate variance metrics via consistency-variance-scorer
8. Aggregate metrics via aggregateMetrics()
9. Write result.json and report.md
10. Optional: Invoke skill-creator for enhanced analysis

**Key Options:**
- `-m, --model`: haiku|sonnet|opus (required)
- `-r, --runs`: iteration count (default: 3)
- `-t, --tests`: explicit test directory
- `-o, --output`: result directory (default: ./skillmark-results)
- `-v, --verbose`: detailed progress output
- `--with-baseline`: run baseline tests (without skill) for delta metrics

### publish-results-command.ts
1. Read result.json file
2. Verify API key from config
3. POST to /api/results with Bearer token
4. Display upload success/failure

### view-leaderboard-command.ts
1. Fetch GET /api/leaderboard?limit=50
2. Parse leaderboard JSON
3. Format and display in terminal

## Skill Source Handling

### Local Source (`/path/to/skill`, `./skill`, `~/skill`)
- Check if directory exists
- Use directly as localPath
- Extract name from directory name

### Git Source (`https://github.com/user/repo` or `git@github.com:user/repo`)
- Validate URL format
- Clone to cache: `~/.skillmark/cache/{hash}`
- Use cloned path as localPath
- Extract name from repo name

### skill.sh Source (`skill.sh/user/skill-name` or `user/skill-name@v1.0`)
- Parse identifier
- Resolve to GitHub URL: `https://github.com/user/skill-name`
- Clone like Git source
- Extract name from skill-name

**Cache Strategy:** Use SHA-256 hash of source URL as cache key to avoid re-cloning.

## Test Definition Format

Markdown files with YAML frontmatter in `tests/` directory:

```markdown
---
name: multi-agent-reasoning
type: knowledge
concepts:
  - orchestrator pattern
  - consensus mechanism
  - context isolation
timeout: 120
---

# Prompt
How do you design multi-agent systems with context isolation?

# Expected
The response should cover:
- [ ] Orchestrator pattern for coordination
- [ ] Consensus mechanisms for decisions
- [ ] Cost implications (~15x token multiplier)
- [ ] Context isolation strategies
```

**Parsing:** gray-matter library extracts YAML frontmatter, rest is markdown.

## Error Handling Patterns

### retry-with-degrade-utils.ts
- Wraps skill-creator-invoker with retry logic
- Falls back to basic prompt if skill-creator fails
- Exponential backoff with max retries

### claude-cli-executor.ts
- Spawns Claude CLI subprocess
- Captures stdout/stderr
- Handles timeout and process errors
- Returns success/error flag

### markdown-test-definition-parser.ts
- Validates test schema
- Requires: name, type, concepts, timeout, prompt, expected
- Throws error if validation fails

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Load tests | <100ms | Glob + file reads |
| Resolve skill source | <500ms | Local instant, Git includes clone time |
| Single test execution | 10-300s | Depends on model + prompt length |
| Score response | <50ms | String pattern matching |
| Aggregate metrics | <10ms | Array average calculations |
| API POST /results | <1s | Network + database write |
| GET /leaderboard | <500ms | Database query + pagination |

## Configuration

### CLI Config
- API key stored: `~/.skillmark/config.json`
- Cache directory: `~/.skillmark/cache/`
- Results directory: `./skillmark-results/` (default)

### Environment Variables
- `CLAUDE_API_KEY`: Used by Claude CLI subprocess
- `SKILLMARK_API_KEY`: CLI API key for publishing

### Webapp Config (wrangler.toml)
- `name`: skillmark
- `main`: dist/worker-entry-point.js
- `compatibility_date`: 2024-01-01
- Bindings: D1 database, KV storage

## Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.3.3 | Type safety |
| commander | ^11.x | CLI argument parsing |
| chalk | ^5.x | Colored terminal output |
| ora | ^6.x | Spinners/progress indicators |
| gray-matter | ^4.x | YAML frontmatter parsing |
| simple-git | ^3.x | Git repository operations |
| hono | ^3.x | Cloudflare Worker framework |

## Build Process

```bash
# Root workspace
pnpm install              # Install all dependencies
pnpm build               # Build both packages
pnpm lint                # Lint TypeScript

# CLI specific
pnpm --filter @skillmark/cli build    # TypeScript → JavaScript
npm publish              # Publish to npm registry

# Webapp specific
pnpm --filter @skillmark/webapp build # Build worker
pnpm --filter @skillmark/webapp deploy # Deploy to Cloudflare
```

## Testing Strategy

Current implementation uses:
- Direct CLI invocation for integration tests
- Mock test definitions for unit testing
- Real Claude API calls (no mocking)

Future: Implement comprehensive test suite with:
- Unit tests for each engine module
- Integration tests for end-to-end flows
- Mock Claude API for isolated testing

---

**Codebase Stats:**
- CLI source: ~4,200 lines of TypeScript (includes security-test-scorer)
- Webapp source: ~500 lines of TypeScript
- Total: ~4,700 lines
- Test suite: 69 tests (56 standard + 13 security tests)

**Last Updated:** February 2025
