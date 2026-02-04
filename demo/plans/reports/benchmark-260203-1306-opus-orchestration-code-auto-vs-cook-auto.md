# Benchmark Report: /code:auto vs /cook --auto

**Date:** 2026-02-03 13:06
**Model:** opus
**Task:** 4-phase greeting API implementation

## Summary

| Method | Runs | Tokens (avg±std) | Duration (avg) | Tools | Subagents | Accuracy |
|--------|------|------------------|----------------|-------|-----------|----------|
| /code:auto | 1 | 3,537,230±0 | 643.0s | 48 | 6 | 100.0% |
| /cook --auto | 1 | 4,172,446±0 | 887.6s | 48 | 6 | 100.0% |

## Detailed Results

### /code:auto Runs

| Run | Tokens | Duration | Tools | Subagents | Review Cycles | Accuracy |
|-----|--------|----------|-------|-----------|---------------|----------|
| 1 | 3,537,230 | 643.0s | 48 | 6 | 2 | 100.0% |

**Subagent usage (Run 1):**
- code-reviewer: 2
- docs-manager: 1
- git-manager: 1
- project-manager: 2

**Tool usage (Run 1):**
- Bash: 16
- Edit: 2
- Read: 16
- Task: 6
- TodoWrite: 7
- Write: 1

### /cook --auto Runs

| Run | Tokens | Duration | Tools | Subagents | Review Cycles | Accuracy |
|-----|--------|----------|-------|-----------|---------------|----------|
| 1 | 4,172,446 | 887.6s | 48 | 6 | 1 | 100.0% |

**Subagent usage (Run 1):**
- bash: 1
- code-reviewer: 1
- debugger: 1
- general-purpose: 1
- project-manager: 1
- tester: 1

**Tool usage (Run 1):**
- Bash: 15
- Edit: 2
- Glob: 4
- Read: 7
- Task: 6
- TodoWrite: 5
- Write: 9

## Comparison

| Metric | /code:auto | /cook --auto | Diff |
|--------|------------|--------------|------|
| Tokens | 3,537,230 | 4,172,446 | +18.0% |
| Duration | 643.0s | 887.6s | +38.0% |
| Tools | 48 | 48 | 0.0% |
| Subagents | 6 | 6 | 0.0% |
| Accuracy | 100.0% | 100.0% | 0.0% |

## Conclusions

**Winner: Tie** (2/4 metrics favor /code:auto, 2/4 favor /cook --auto)

Results are comparable - both methods perform similarly for this task type.

**Observations:**
- /code:auto is more token-efficient
- /code:auto executes faster
- Subagent usage is similar
