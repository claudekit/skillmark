# Skillmark - Project Overview & Product Development Requirements

## Product Vision

Skillmark is a benchmarking platform for evaluating Claude AI skill effectiveness through standardized test suites and public leaderboards. It enables developers to:
- Quantify skill performance across different Claude models
- Compare skills on standardized metrics (accuracy, latency, cost)
- Share results in public leaderboards
- Iterate and improve skills based on benchmark data

## Goals

1. **Enable Skill Evaluation** - Provide CLI tool to run benchmark tests against any Claude skill
2. **Standardize Metrics** - Define consistent measurement criteria (accuracy %, tokens, cost, latency)
3. **Public Transparency** - Publish leaderboards showing top-performing skills
4. **Easy Integration** - Support local, Git, and skill.sh registry sources
5. **Model Comparison** - Test across Haiku, Sonnet, and Opus models

## Non-Goals

- Custom scoring algorithms per skill (standardized approach only)
- Real-time skill marketplace/trading
- Automatic skill optimization
- User reputation systems
- Paid features (free public access)

## Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| CLI installation | <5 min for new users | In Progress |
| Test execution | <2 min for 5 tests | In Progress |
| Leaderboard response | <500ms API latency | In Progress |
| Test coverage | ≥80% accuracy on known skills | In Progress |
| Documentation | README + API docs complete | In Progress |

## Technical Constraints

- **Node.js Requirement**: ≥18.0.0 (for native ESM/CJS support)
- **pnpm Workspace**: Monorepo structure with 2 packages
- **No Database Persistence** (v0.1): Results in memory only
- **OAuth Optional**: GitHub auth for future user features
- **Cloudflare Only**: Webapp must run on Cloudflare Workers

## Functional Requirements

### CLI Package (skillmark)

1. **Skill Source Resolution**
   - Local filesystem paths: `/path/to/skill`, `./skill`, `~/skill`
   - Git repositories: `https://github.com/user/repo`, `git@github.com:user/repo`
   - skill.sh registry: `skill.sh/user/skill-name`, `user/skill-name@v1.0`
   - Auto-clone Git repos to temp cache

2. **Test Definition Loading**
   - Parse markdown files with YAML frontmatter
   - Support `knowledge` (Q&A) and `task` (execution) types
   - Extract: name, type, concepts, timeout, prompt, expected patterns
   - Auto-discover tests/ directory or explicit path

3. **Benchmark Execution**
   - Invoke Claude CLI with test prompt
   - Parse JSON/JSONL transcript output
   - Run multiple iterations (configurable, default 3)
   - Test across Haiku, Sonnet, Opus models

4. **Response Scoring**
   - Count matched concepts via string patterns
   - Calculate accuracy % (matched / total)
   - Extract token metrics from transcript
   - Estimate API cost from token count

5. **Result Aggregation**
   - Average metrics across runs
   - Identify best/worst results
   - Generate JSON + Markdown output
   - Deterministic hash for verification

### Webapp Package (@skillmark/webapp)

1. **REST API (Cloudflare Worker)**
   - POST /api/results: Accept benchmark submissions (Bearer auth, full metrics)
   - GET /api/result/:id: Full benchmark detail with per-test breakdown
   - GET /api/leaderboard: Paginated rankings
   - GET /api/skill/:name: Single skill details + full metrics per result
   - POST /api/verify: Validate API keys

2. **Authentication**
   - GitHub OAuth for user registration
   - API key generation for CLI
   - Session tokens for web UI
   - Read-only public access for leaderboard

3. **Static Leaderboard UI**
   - Display top skills by accuracy/cost/speed
   - Filter by model type
   - Sort/search functionality
   - Responsive design

## Data Models

### TestDefinition
```
name: string (unique per skill)
type: 'knowledge' | 'task'
concepts: string[] (validation targets)
timeout: number (seconds)
prompt: string (test query)
expected: string[] (response patterns)
sourcePath: string (file location)
```

### BenchmarkMetrics
```
accuracy: number (0-100%)
tokensTotal: number
tokensInput: number
tokensOutput: number
durationMs: number
toolCount: number
costUsd: number
```

### BenchmarkResult
```
skillId: string (unique ID)
skillName: string
skillSource: string (original source)
model: 'haiku' | 'sonnet' | 'opus'
runs: number (iteration count)
testResults: TestResult[] (detailed per-test)
aggregatedMetrics: BenchmarkMetrics (averaged)
timestamp: string (ISO-8601)
version: string (CLI version)
hash: string (verification hash)
```

### LeaderboardEntry
```
skillId: string
skillName: string
source: string
bestAccuracy: number
bestModel: string
avgTokens: number
avgCost: number
lastTested: string (ISO-8601)
totalRuns: number
```

## Integration Points

1. **Claude CLI** - Spawned subprocess for test execution
2. **Simple-git** - Git repository cloning for skill sources
3. **Gray-matter** - Markdown YAML frontmatter parsing
4. **Commander.js** - CLI argument parsing
5. **Hono** - Cloudflare Worker framework
6. **D1 SQLite** - Optional: Result persistence (v0.2)

## Dependencies

### Core
- `typescript@^5.3.3` - Type safety
- `commander@^11.x` - CLI parsing
- `chalk@^5.x` - Colored output
- `ora@^6.x` - Spinners/progress

### Parsing
- `gray-matter@^4.x` - YAML frontmatter
- `simple-git@^3.x` - Git operations

### Utilities
- `node@>=18` - Runtime
- `pnpm@>=8` - Package manager

## Deployment Architecture

```
┌─ npm Registry ─────┐
│  skillmark    │
└────────────────────┘
         ▲
         │ npm install -g skillmark
         │
    ┌────────────┐
    │ User       │ → Local skill → Run benchmark
    │ Terminal   │ → Git skill   → Publish results
    └────────────┘ → skill.sh    →
         │
         │ POST /api/results
         ▼
┌─ Cloudflare Workers ──────────────────┐
│ @skillmark/webapp                     │
│ ┌──────────────────────────────────┐ │
│ │ API Endpoints                    │ │
│ │ - POST /api/results (submit)     │ │
│ │ - GET /api/leaderboard (view)    │ │
│ │ - GET /api/skill/:name (details) │ │
│ │ - GET /auth/* (OAuth)            │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ D1 Database (SQLite)             │ │
│ │ - results table                  │ │
│ │ - users table (future)           │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Static Leaderboard UI            │ │
│ │ - Rankings page                  │ │
│ │ - Skill detail page              │ │
│ │ - Search/filter                  │ │
│ └──────────────────────────────────┘ │
└───────────────────────────────────────┘
```

## Release Phases

| Phase | Status | Description |
|-------|--------|-------------|
| **v0.1** | In Progress | CLI + basic API + leaderboard UI |
| **v0.2** | Planned | D1 persistence + user profiles + API keys |
| **v0.3** | Planned | Skill search + advanced filtering + charts |
| **v1.0** | Planned | Stability + performance + full documentation |

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Claude API rate limits | High | Test failures | Implement exponential backoff retry |
| Large benchmark runs | Medium | Timeout | Make timeout configurable, warn on large suites |
| Malicious test definitions | Low | Security risk | Validate test syntax, timeout enforcement |
| Database costs (D1) | Medium | Budget | Monitor early, implement pagination |

## Success Metrics (Post-Launch)

- CLI downloads/installs per month
- Leaderboard page views
- Skills submitted per week
- Average benchmark accuracy by model
- API uptime (target: 99.9%)

---

**Current Version:** 0.1.0
**Last Updated:** February 2025
**Next Review:** After MVP launch
