# Benchmark Report: /code:auto vs /cook --auto

**Date:** 2026-02-03 12:29
**Model:** opus
**Task:** 4-phase greeting API implementation

## Summary

| Method | Runs | Tokens (avg±std) | Duration (avg) | Tools | Subagents | Accuracy |
|--------|------|------------------|----------------|-------|-----------|----------|
| /code:auto | 1 | 1,873,547±0 | 512.9s | 35 | 5 | 62.5% |
| /cook --auto | 1 | 1,132,461±0 | 107.2s | 22 | 0 | 95.5% |

## Detailed Results

### /code:auto Runs

| Run | Tokens | Duration | Tools | Subagents | Review Cycles | Accuracy |
|-----|--------|----------|-------|-----------|---------------|----------|
| 1 | 1,873,547 | 512.9s | 35 | 5 | 2 | 62.5% |

**Subagent usage (Run 1):**
- code-reviewer: 2
- docs-manager: 1
- project-manager: 1
- tester: 1

**Tool usage (Run 1):**
- Bash: 8
- Edit: 1
- Glob: 1
- Read: 4
- Task: 5
- TodoWrite: 12
- Write: 4

### /cook --auto Runs

| Run | Tokens | Duration | Tools | Subagents | Review Cycles | Accuracy |
|-----|--------|----------|-------|-----------|---------------|----------|
| 1 | 1,132,461 | 107.2s | 22 | 0 | 0 | 95.5% |

**Tool usage (Run 1):**
- Bash: 3
- Edit: 2
- Read: 6
- TodoWrite: 4
- Write: 7

## Comparison

| Metric | /code:auto | /cook --auto | Diff |
|--------|------------|--------------|------|
| Tokens | 1,873,547 | 1,132,461 | -39.6% |
| Duration | 512.9s | 107.2s | -79.1% |
| Tools | 35 | 22 | -37.1% |
| Subagents | 5 | 0 | -100.0% |
| Accuracy | 62.5% | 95.5% | +52.7% |

## Critical Finding: Architectural Difference

**⚠ UNFAIR COMPARISON DETECTED**

| Aspect | /code-auto | /cook --auto |
|--------|------------|--------------|
| **Phase handling** | Single phase per invocation | All phases in one invocation |
| **Completion** | Phase 1 only (25% of task) | Phases 1-4 (100% of task) |
| **Auto-proceed** | ❌ Stops after each phase | ✓ Continues to next phase |

**`/code-auto` completed Phase 1 successfully but stopped** - it's designed for single-phase execution. The 62.5% accuracy reflects that it only did ~25% of the work (Phase 1 of 4).

**`/cook --auto` completed all 4 phases** automatically due to its built-in phase progression in auto mode.

## Adjusted Analysis

For a fair comparison, `/code-auto` would need to be called 4 times (once per phase):
- Estimated tokens: ~1.87M × 4 = ~7.5M (vs 1.1M for cook)
- Estimated duration: ~512s × 4 = ~34 min (vs 107s for cook)

## Conclusions

**Winner: /cook --auto** (decisively)

The skill architecture provides:
1. **End-to-end execution**: Auto-proceeds through all phases without manual invocation
2. **Token efficiency**: 40% fewer tokens for Phase 1 alone; ~85% fewer for full task
3. **Speed**: 5x faster per phase; ~19x faster for full task
4. **Fewer subagents**: Direct implementation vs delegation overhead

**Key Insight**: Commands are designed for single-phase, human-in-loop workflows. Skills with `--auto` mode excel at autonomous multi-phase execution.

## Recommendations

| Use Case | Recommended |
|----------|-------------|
| Single phase with review gates | `/code` (command) |
| Full feature implementation (auto) | `/cook --auto` (skill) |
| Parallel multi-feature work | `/cook --parallel` (skill) |
| Quick prototyping | `/cook --fast` (skill) |

## Limitations

1. **Single run per method** - needs more runs for statistical significance
2. **Unfair comparison** - commands vs skills have different design goals
3. **No failure recovery testing** - both succeeded on Phase 1
