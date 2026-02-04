# Benchmark Report: /code:auto vs /cook --auto

**Date:** 2026-02-03 12:18
**Model:** opus
**Task:** 4-phase greeting API implementation

## Summary

| Method | Runs | Tokens (avg±std) | Duration (avg) | Tools | Subagents | Accuracy |
|--------|------|------------------|----------------|-------|-----------|----------|
| /code:auto | 0 | - | - | - | - | - |
| /cook --auto | 1 | 1,030,881±0 | 94.6s | 22 | 0 | 95.5% |

## Detailed Results

### /cook --auto Runs

| Run | Tokens | Duration | Tools | Subagents | Review Cycles | Accuracy |
|-----|--------|----------|-------|-----------|---------------|----------|
| 1 | 1,030,881 | 94.6s | 22 | 0 | 0 | 95.5% |

**Tool usage (Run 1):**
- Bash: 3
- Edit: 2
- Glob: 1
- Read: 5
- TodoWrite: 4
- Write: 7

## Conclusions

*Insufficient data for comparison*
