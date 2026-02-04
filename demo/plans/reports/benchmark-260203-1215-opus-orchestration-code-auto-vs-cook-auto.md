# Benchmark Report: /code:auto vs /cook --auto

**Date:** 2026-02-03 12:15
**Model:** opus
**Task:** 4-phase greeting API implementation

## Summary

| Method | Runs | Tokens (avg±std) | Duration (avg) | Tools | Subagents | Accuracy |
|--------|------|------------------|----------------|-------|-----------|----------|
| /code:auto | 0 | - | - | - | - | - |
| /cook --auto | 1 | 1,324,754±0 | 131.0s | 27 | 0 | 95.5% |

## Detailed Results

### /cook --auto Runs

| Run | Tokens | Duration | Tools | Subagents | Review Cycles | Accuracy |
|-----|--------|----------|-------|-----------|---------------|----------|
| 1 | 1,324,754 | 131.0s | 27 | 0 | 0 | 95.5% |

**Tool usage (Run 1):**
- Bash: 4
- Edit: 4
- Glob: 2
- Read: 6
- TodoWrite: 4
- Write: 7

## Conclusions

*Insufficient data for comparison*
