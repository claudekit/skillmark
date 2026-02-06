# Skillmark - CLAUDE.md

## Project Overview

Skillmark is a benchmarking platform for evaluating Claude AI skill effectiveness through standardized test suites and public leaderboards. It enables developers to quantify skill performance across different Claude models (Haiku, Sonnet, Opus) and compare skills on standardized metrics (accuracy, latency, cost).

**Key Features:**
- CLI tool to run benchmark tests against any Claude skill
- Skill source resolution (local paths, Git repos, skill.sh registry)
- Standardized metrics: accuracy %, tokens, cost, latency
- Public leaderboards showing top-performing skills
- REST API for submitting and querying results

**Current Version:** 0.1.0 (MVP)

---

## Tech Stack & Structure

### Monorepo Architecture

**pnpm workspace** with 2 packages:

1. **@skillmark/cli** (~3,900 lines TypeScript)
   - Node.js >=18.0.0 package
   - CLI tool for benchmark execution
   - Published to npm registry as global CLI

2. **@skillmark/webapp** (~500 lines TypeScript)
   - Cloudflare Workers serverless API
   - REST endpoints + static leaderboard UI
   - D1 SQLite database for result persistence

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `typescript@^5.3.3` | Type safety (ES2020, ESM) |
| `commander@^12.x` | CLI argument parsing |
| `chalk@^5.x`, `ora@^8.x` | Terminal UI (colors, spinners) |
| `gray-matter@^4.x` | YAML frontmatter parsing for test definitions |
| `simple-git@^3.x` | Git operations (clone repos) |
| `hono@^3.x` | Cloudflare Workers framework |

---

## Development Commands

```bash
# Installation
pnpm install              # Install all workspace dependencies

# Build
pnpm build                # Build both packages
pnpm --filter @skillmark/cli build    # Build CLI only
pnpm --filter @skillmark/webapp build # Build webapp only

# Linting
pnpm lint                 # Lint TypeScript across workspace

# Testing
pnpm test                 # Run vitest tests

# Local Development
cd packages/webapp && wrangler dev --local    # Dev server on localhost:8787
node packages/cli/dist/cli-entry-point.js --help  # Test CLI locally

# Deployment
pnpm changeset            # Create release changelog (CLI only)
pnpm release              # Build and publish to npm
cd packages/webapp && wrangler deploy  # Deploy webapp to Cloudflare
```

---

## Key Architectural Patterns

### 1. Skill Source Resolution (Three Types)

- **Local:** `/path/to/skill`, `./skill`, `~/skill`
- **Git:** `https://github.com/user/repo` (cloned to cache)
- **skill.sh:** `user/skill-name@v1.0` (resolved to GitHub)

**Implementation:** `unified-skill-source-resolver.ts` routes to specific handlers

### 2. Test Definition Format

Markdown files with YAML frontmatter in `tests/` directory:

```markdown
---
name: test-name
type: knowledge | task | security
concepts: [concept1, concept2, ...]
timeout: 120
---

# Prompt
Test question/task here

# Expected
- [ ] Concept 1
- [ ] Concept 2
```

### Security Test Type

- `type: security` — adversarial tests checking refusal + leakage
- Extra frontmatter: `category`, `severity`
- Extra sections: `# Expected Refusal`, `# Forbidden Patterns`
- Scored via dual model: refusal rate x (1 - leakage rate)

### 3. Benchmark Execution Pipeline

```
Skill Resolution -> Test Loading -> Execute Tests -> Score -> Aggregate -> Output
```

- Execute via Claude CLI subprocess
- Score by regex-matching response against expected concepts
- Average metrics across iterations (default: 3 runs)

### 4. Scoring & Metrics

- **Accuracy:** `(matched_concepts / total_concepts) * 100%`
- **Pass threshold:** >=70% accuracy
- **Token tracking:** input, output, total tokens
- **Cost estimation:** tokens * model-price-per-token

### Security Scoring

- **Refusal Rate:** % of expected refusal patterns matched
- **Leakage Rate:** % of forbidden patterns found (exact match)
- **Security Score:** refusalRate x (1 - leakageRate / 100)
- **Composite Score:** accuracy x 0.80 + securityScore x 0.20

---

## Code Conventions

### File Naming

**kebab-case** with self-documenting names:
- `markdown-test-definition-parser.ts`
- `concept-accuracy-scorer.ts`
- `unified-skill-source-resolver.ts`

### Code Organization

```
src/
├── commands/              # CLI command implementations
├── engine/               # Core benchmarking logic
├── sources/              # Skill source handlers
├── config/               # Configuration utilities
└── types/                # TypeScript type definitions
```

### TypeScript Standards

- **Target:** ES2020, ESM (import/export)
- **Strict mode:** Enabled
- **Type imports:** Use `import type` for TS-only imports
- **No `any`:** Use `unknown` for external data with validation

---

## Core Types

### TestDefinition
- `name`, `type`, `concepts[]`, `timeout`, `prompt`, `expected[]`, `sourcePath`
- Security fields: `category?`, `severity?`, `forbiddenPatterns?`

### BenchmarkMetrics
- `accuracy`, `tokensTotal`, `tokensInput`, `tokensOutput`, `durationMs`, `toolCount`, `costUsd`

### SecurityScore
- `refusalRate`, `leakageRate`, `securityScore`, `categoryBreakdown`

### BenchmarkResult
- `skillId`, `skillName`, `skillSource`, `model`, `runs`, `testResults[]`, `aggregatedMetrics`, `hash`, `securityScore?`

### SkillSource
- `type`: 'local' | 'git' | 'skillsh'
- `original`, `localPath`, `name`

---

## Configuration & Paths

- **API key config:** `~/.skillmarkrc` or `SKILLMARK_API_KEY` env
- **Skill cache:** `~/.skillmark/cache/{hash}/`
- **Results dir:** `./skillmark-results/` (default)
- **Claude auth:** `CLAUDE_CODE_OAUTH_TOKEN` env or `skillmark auth`

---

## Deployment

### CLI (npm)
- Uses **changesets** for versioning
- Merge to main -> creates "Version Packages" PR
- Merge that PR -> auto-publishes to npm

### Webapp (Cloudflare)
- `wrangler deploy` to Cloudflare Workers
- D1 database for persistence

---

## Key Rules

- Always use TypeScript strict mode - no `any` types
- Timeout all external operations - prevent hanging
- Validate external data - use type guards
- Cache deterministically - same input = same cache key
- Run linting before commit - `pnpm lint`
- Write JSDoc for exported functions

---

## Documentation

- `docs/project-overview-pdr.md` - Requirements
- `docs/code-standards.md` - Conventions
- `docs/codebase-summary.md` - Structure
- `docs/system-architecture.md` - Architecture
- `docs/deployment-guide.md` - CI/CD & deployment
