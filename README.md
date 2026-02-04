# Skillmark

![Skillmark - The Agent Skill Benchmarking Platform](https://cdn.claudekit.cc/skillmark/og-image.png)

Agent skill benchmarking platform with CLI and public leaderboards.

**Website:** [skillmark.sh](https://skillmark.sh)

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          SKILLMARK                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐   │
│  │  CLI (npm)   │────▶│   Claude     │────▶│  Results JSON    │   │
│  │  skillmark   │     │   Engine     │     │  + Markdown      │   │
│  └──────────────┘     └──────────────┘     └────────┬─────────┘   │
│        │                                             │             │
│        │ skill source                                │ upload      │
│        ▼                                             ▼             │
│  ┌──────────────┐                          ┌──────────────────┐   │
│  │  Skill       │                          │  Cloudflare      │   │
│  │  Sources     │                          │  Workers + D1    │   │
│  │  - local     │                          │  (API + Web)     │   │
│  │  - git       │                          └────────┬─────────┘   │
│  │  - skill.sh  │                                   │             │
│  └──────────────┘                                   ▼             │
│                                            ┌──────────────────┐   │
│                                            │  Public          │   │
│                                            │  Leaderboard     │   │
│                                            └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install -g skillmark
# or
npx skillmark
```

## Usage

### Run Benchmark

```bash
# Local skill
skillmark run ~/.claude/skills/my-skill

# Git repository
skillmark run https://github.com/user/skill-repo

# skill.sh reference
skillmark run skill.sh/user/skill-name

# With options
skillmark run ./my-skill \
  --tests ./tests \
  --model opus \
  --runs 5 \
  --output ./results
```

### Publish Results

```bash
skillmark publish ./skillmark-results/result.json --api-key <your-key>
```

### View Leaderboard

```bash
# Show all skills
skillmark leaderboard

# Show specific skill
skillmark leaderboard my-skill-name
```

## Test Definition Format

Create markdown files with YAML frontmatter in a `tests/` directory:

```markdown
---
name: multi-agent-reasoning
type: knowledge
concepts:
  - orchestrator
  - consensus
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

### Test Types

| Type | Description |
|------|-------------|
| `knowledge` | Q&A style tests checking concept coverage |
| `task` | Execution tests verifying tool usage and outcomes |

## Metrics

| Metric | Description |
|--------|-------------|
| accuracy | Percentage of expected concepts matched |
| tokens_total | Total tokens consumed |
| duration_ms | Wall-clock time |
| tool_count | Number of tool calls |
| cost_usd | Estimated API cost |

## Output

Results are saved to the output directory:

```
skillmark-results/
├── result.json    # Machine-readable metrics
└── report.md      # Human-readable report
```

## API

### POST /api/results

Submit benchmark results to the leaderboard.

```bash
curl -X POST https://skillmark.workers.dev/api/results \
  -H "Authorization: Bearer <api-key>" \
  -H "Content-Type: application/json" \
  -d @result.json
```

### GET /api/leaderboard

Get skill rankings.

```bash
curl https://skillmark.workers.dev/api/leaderboard
```

### GET /api/skill/:name

Get specific skill details and history.

```bash
curl https://skillmark.workers.dev/api/skill/my-skill
```

## Development

```bash
# Install dependencies
pnpm install

# Build CLI
pnpm --filter @skillmark/cli build

# Run webapp locally
pnpm --filter @skillmark/webapp dev

# Deploy webapp
pnpm --filter @skillmark/webapp deploy
```

## Project Structure

```
skillmark/
├── packages/
│   ├── cli/                           # Node.js CLI
│   │   └── src/
│   │       ├── cli-entry-point.ts
│   │       ├── commands/
│   │       ├── engine/
│   │       ├── sources/
│   │       └── types/
│   └── webapp/                        # Cloudflare Worker
│       └── src/
│           ├── worker-entry-point.ts
│           ├── routes/
│           └── db/
├── examples/
│   └── tests/                         # Example test suites
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Documentation

Complete documentation is available in the [`docs/`](./docs/) directory:

- **[Project Overview & PDR](./docs/project-overview-pdr.md)** - Goals, requirements, and success criteria
- **[Codebase Summary](./docs/codebase-summary.md)** - Directory structure and key modules
- **[Code Standards](./docs/code-standards.md)** - TypeScript conventions and best practices
- **[System Architecture](./docs/system-architecture.md)** - Architecture diagrams and data flow
- **[Project Roadmap](./docs/project-roadmap.md)** - Phases, milestones, and timeline
- **[Deployment Guide](./docs/deployment-guide.md)** - CLI npm publishing and Cloudflare deployment

## Contributing

Contributions welcome! Please:
1. Read [Code Standards](./docs/code-standards.md)
2. Follow the [Development Rules](https://github.com/claudekit/skillmark/blob/main/.claude/workflows/development-rules.md)
3. Ensure tests pass: `pnpm test`
4. Run linting: `pnpm lint`

## License

MIT
