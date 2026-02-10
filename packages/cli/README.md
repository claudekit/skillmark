# @skillmark/cli

CLI tool for benchmarking Claude AI agent skills with standardized test suites and public leaderboards.

**Website:** [skillmark.sh](https://skillmark.sh)

## Installation

```bash
npm install -g @skillmark/cli
# or
npx @skillmark/cli
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
skillmark leaderboard
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
- [ ] Context isolation strategies
```

## Metrics

| Metric | Description |
|--------|-------------|
| accuracy | Percentage of expected concepts matched |
| tokens_total | Total tokens consumed |
| duration_ms | Wall-clock time |
| tool_count | Number of tool calls |
| cost_usd | Estimated API cost |

## Output

```
skillmark-results/
├── result.json    # Machine-readable metrics
└── report.md      # Human-readable report
```

## Documentation

Full docs at [github.com/claudekit/skillmark](https://github.com/claudekit/skillmark)

## License

MIT
