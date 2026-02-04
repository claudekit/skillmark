# Benchmark Report: /code:auto vs /cook --auto

**Date:** 2026-02-03 13:04
**Model:** opus
**Task:** 4-phase greeting API implementation

## Summary

| Method | Runs | Tokens (avg±std) | Duration (avg) | Tools | Subagents | Accuracy |
|--------|------|------------------|----------------|-------|-----------|----------|
| /code:auto | 1 | 3,537,230±0 | 643.0s | 48 | 6 | 100.0% |
| /cook --auto | 1 | 2,666,893±0 | 734.8s | 38 | 5 | 100.0% |

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
| 1 | 2,666,893 | 734.8s | 38 | 5 | 1 | 100.0% |

**Subagent usage (Run 1):**
- code-reviewer: 1
- docs-manager: 1
- git-manager: 1
- project-manager: 1
- tester: 1

**Tool usage (Run 1):**
- Bash: 14
- Edit: 2
- Read: 7
- Task: 5
- TodoWrite: 8
- Write: 2

## Comparison

| Metric | /code:auto | /cook --auto | Diff |
|--------|------------|--------------|------|
| Tokens | 3,537,230 | 2,666,893 | -24.6% |
| Duration | 643.0s | 734.8s | +14.3% |
| Tools | 48 | 38 | -20.8% |
| Subagents | 6 | 5 | -16.7% |
| Accuracy | 100.0% | 100.0% | 0.0% |

## Conclusions

**Winner: /cook --auto** (1/4 metrics favor /code:auto, 3/4 favor /cook --auto)

/cook --auto demonstrates better efficiency due to:
- Smart mode detection optimizes workflow
- Task tracking provides better coordination
- Reference file architecture for complex instructions

**Observations:**
- /cook --auto is more token-efficient
- /code:auto executes faster
- /cook --auto uses fewer subagents
