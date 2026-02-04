# Benchmark Report: Skills vs Commands

**Date:** 2026-02-03 11:06
**Task:** 21-step file operations

## Summary

| Method | Runs | Tokens (avg±std) | Duration (avg) | Tools (avg) |
|--------|------|------------------|----------------|-------------|
| Skill | 3 | 1,253,358±20,484 | 73.2s | 26 |
| Command | 3 | 2,352,938±1,783,569 | 168.8s | 35 |

## Detailed Results

### Skill Runs

| Run | Tokens | Duration | Tools |
|-----|--------|----------|-------|
| 1 | 1,276,948 | 79.8s | 26 |
| 2 | 1,243,053 | 73.1s | 26 |
| 3 | 1,240,072 | 66.8s | 26 |

**Tool usage (Run 1):**
- Bash: 9
- Edit: 3
- Grep: 1
- Read: 4
- Skill: 1
- Write: 8

### Command Runs

| Run | Tokens | Duration | Tools |
|-----|--------|----------|-------|
| 1 | 4,412,425 | 291.7s | 52 |
| 2 | 1,320,719 | 100.1s | 27 |
| 3 | 1,325,671 | 114.5s | 27 |

**Tool usage (Run 1):**
- Bash: 12
- Edit: 3
- Glob: 1
- Grep: 1
- Read: 5
- TodoWrite: 22
- Write: 8

## Comparison

- **Token efficiency:** Skill uses 87.7% fewer tokens than Command
- **Tool calls:** Skill uses 35.9% fewer tool calls than Command

## Conclusions

*To be filled after analysis*
