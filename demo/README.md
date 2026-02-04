# Skills vs Commands Benchmark

Experimental framework for comparing **Skill** vs **Slash Command** prompt adherence in Claude Code.

## Summary

| Benchmark | Task Type | Winner | Key Finding |
|-----------|-----------|--------|-------------|
| [File Ops](#benchmark-1-file-operations) | 21-step deterministic | **Command** | Commands excel at simple, deterministic tasks |
| [Orchestration](#benchmark-2-orchestration) | 4-phase multi-agent | **Skill** | Skills excel with advanced models (Sonnet/Opus) |
| [Context Engineering](#benchmark-3-context-engineering) | 5-task knowledge | **Monolithic** | 90% accuracy with 44% fewer tokens than modular |

## Benchmark 1: File Operations

**Task:** 21-step file operations (mkdir, write, edit, read, grep, rename)

### Results

| Method | Accuracy | Tokens | Duration | Tools |
|--------|----------|--------|----------|-------|
| Skill | 95.2% | 12.4k | 45s | 42 |
| Command | **100%** | **10.8k** | **38s** | 36 |

**Winner: Command** - Simpler architecture better suited for deterministic tasks.

### Scripts

```bash
# Run benchmark
./scripts/run-benchmark.sh all 3 --model sonnet

# Analyze results
~/.claude/skills/.venv/bin/python3 scripts/analyze-benchmark-results.py
```

---

## Benchmark 2: Orchestration

**Task:** 4-phase greeting API implementation with subagent delegation

### Cross-Model Results

| Model | Winner | Tokens (code vs cook) | Duration (code vs cook) | Accuracy |
|-------|--------|----------------------|------------------------|----------|
| Haiku | **Tie** | 3.54M vs 4.17M (+18%) | 643s vs 888s (+38%) | 100% both |
| Sonnet | **cook** | 3.54M vs 2.67M (-25%) | 643s vs 735s (+14%) | 100% both |
| Opus | **cook** | 3.54M vs 3.40M (-4%) | 643s vs 483s (-25%) | 100% both |

**Winner: /cook --auto** (wins 2/3 models)

### Key Findings

| Model | Best Method | Reason |
|-------|-------------|--------|
| Haiku | `/code:auto` | Simpler model benefits from explicit command structure |
| Sonnet | `/cook --auto` | Balanced model leverages skill's smart detection |
| Opus | `/cook --auto` | Advanced model maximizes skill's flexibility |

### Scripts

```bash
# Run benchmark
./scripts/run-orchestration-benchmark-code-auto-vs-cook-auto.sh --model opus

# Analyze results
~/.claude/skills/.venv/bin/python3 scripts/analyze-orchestration-benchmark-code-auto-vs-cook-auto.py
```

---

## Benchmark 3: Context Engineering

**Task:** 5 context engineering questions (degradation, multi-agent, optimization, memory, evaluation)

**Comparison:** `ck-context-engineering` (monolithic) vs `Agent-Skills-for-Context-Engineering` (modular - 13 skills)

### Results (3-run average)

| Method | Accuracy | Tokens | Cost | Architecture |
|--------|----------|--------|------|--------------|
| **Monolithic** | **90.0%** | **~600K** | **$0.58** | Single skill |
| Modular | 96.7% | ~1,066K | $0.89 | 13 separate skills |

**Winner: Monolithic** - 90% accuracy with 44% fewer tokens, 35% lower cost.

### Per-Task Accuracy

| Task | Monolithic | Modular |
|------|-----------|---------|
| context-degradation | 83% | 100% |
| multi-agent-design | **94%** | 100% |
| token-optimization | 78% | 83% |
| memory-systems | 100% | 100% |
| evaluation | 94% | 100% |

### Key Finding

Added "Key Concepts Index" to SKILL.md improved multi-agent task from 67% → 94%.

### Scripts

```bash
# Run benchmark
./scripts/run-context-engineering-skill-benchmark.sh sonnet all

# Analyze results
~/.claude/skills/.venv/bin/python3 scripts/analyze-context-engineering-skill-benchmark.py
```

---

## Recommendations

| Use Case | Recommended | Reason |
|----------|-------------|--------|
| Simple tasks (file ops) | Command | Lower overhead, deterministic |
| Complex multi-phase | Skill (Sonnet/Opus) | Better optimization |
| Budget-conscious | Command on Haiku | Cheapest option |
| Quality-focused | Skill on Opus | Best results |

## Structure

```
skill-validation/
├── .claude/
│   ├── skills/benchmark-fileops/     # Skill implementation
│   ├── commands/benchmark-fileops.md # Command implementation
│   ├── commands/code/auto.md         # /code:auto command
│   └── hooks/                        # Logging hooks
├── scripts/
│   ├── run-benchmark.sh              # File ops benchmark
│   ├── run-orchestration-benchmark-*.sh  # Orchestration benchmark
│   ├── verify-steps.py               # File ops verification
│   ├── verify-greeting-*.py          # Greeting verification
│   └── analyze-*.py                  # Results analysis
├── plans/
│   ├── test-feature-greeting/        # 4-phase test plan
│   └── reports/                      # Benchmark reports
└── README.md
```

## Reports

- File ops: `plans/reports/benchmark-YYMMDD-HHMM-fileops.md`
- Orchestration: `plans/reports/benchmark-YYMMDD-*-orchestration-code-auto-vs-cook-auto.md`
