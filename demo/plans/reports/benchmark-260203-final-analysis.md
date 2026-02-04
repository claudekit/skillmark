# Final Benchmark Report: Skills vs Commands

**Date:** 2026-02-03
**Task:** 21-step file operations
**Runs:** 3 per method per model (18 total runs)

## Cross-Model Summary

| Model | Winner | Tokens (S vs C) | Duration (S vs C) | Tools (S vs C) |
|-------|--------|-----------------|-------------------|----------------|
| Haiku | Command | 1.85M vs 1.79M (+3.6%) | 128s vs 127s (+1.2%) | 28 vs 26 (+6.3%) |
| Sonnet | Command | 1.82M vs 1.76M (+3.1%) | 155s vs 121s (+27.3%) | 28 vs 27 (+2.5%) |
| Opus | Command | 1.41M vs 1.22M (+15.3%) | 185s vs 177s (+4.6%) | 26 vs 25 (+4.0%) |

**Overall Winner: Command (9/9 metrics across all models)**

## Key Findings

### 1. Commands Consistently Outperform Skills

All 3 models show Commands winning on all metrics:
- **Token efficiency**: Commands use 3-15% fewer tokens
- **Execution speed**: Commands are 1-27% faster
- **Tool calls**: Commands use 2-6% fewer tools

### 2. Model-Specific Observations

| Model | Token Efficiency | Duration | Consistency (std) |
|-------|------------------|----------|-------------------|
| Opus | Best (1.22M avg) | Slowest (177s) | Most consistent (456 tokens std) |
| Sonnet | Mid (1.76M avg) | Fastest (121s) | Moderate variance |
| Haiku | Highest (1.79M avg) | Mid (127s) | High variance |

### 3. Skill Overhead Analysis

Skills incur additional overhead from:
- `Skill` tool invocation (+1 tool call per run)
- Reference file loading (`workflow-steps.md`)
- Context switching between SKILL.md and references

### 4. Tool Usage Patterns

| Tool | Skill (avg) | Command (avg) | Diff |
|------|-------------|---------------|------|
| Bash | 9 | 9 | 0 |
| Write | 8 | 8 | 0 |
| Read | 5-7 | 4-7 | +1-2 |
| Edit | 3 | 3 | 0 |
| Grep | 1 | 1 | 0 |
| Skill | 1 | 0 | +1 |

## Conclusions

### Primary Finding

**Commands are more efficient than Skills for structured, deterministic workflows.**

The hypothesis that Skills would provide better "prompt adherence" due to reference file architecture was **not supported**. Commands with inline instructions:
- Execute with less overhead
- Require fewer context switches
- Achieve identical task completion

### When to Use Each

| Use Case | Recommended |
|----------|-------------|
| Deterministic workflows | **Command** |
| Simple, single-file tasks | **Command** |
| Complex multi-step logic | **Command** |
| Reusable templates with variables | **Skill** (for maintainability) |
| Tasks requiring external references | **Skill** |
| Conditional/branching logic | **Skill** |

### Limitations

1. **Task type**: Only tested file operations - results may differ for research/code-gen tasks
2. **Step count**: 21 steps - simpler tasks may show different patterns
3. **Prompt structure**: Both used similar instruction format

## Recommendations

1. **Default to Commands** for straightforward automation
2. **Use Skills** when:
   - Instructions exceed ~2000 chars (reference files help organization)
   - Need to share across projects (Skills are portable)
   - Require conditional logic or branching
3. **Consider hybrid**: Command that references external docs

## Raw Data

- Haiku: `benchmark-260203-1127-haiku-fileops.md`
- Sonnet: `benchmark-260203-1131-sonnet-fileops.md`
- Opus: `benchmark-260203-1134-opus-fileops.md`
