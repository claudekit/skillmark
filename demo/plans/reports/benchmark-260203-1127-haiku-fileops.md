# Benchmark Report: Skills vs Commands

**Date:** 2026-02-03 11:27
**Model:** haiku
**Task:** 21-step file operations

## Summary

| Method | Runs | Tokens (avg±std) | Duration (avg) | Tools (avg) |
|--------|------|------------------|----------------|-------------|
| Skill | 3 | 1,851,943±77,878 | 128.2s | 28 |
| Command | 3 | 1,788,199±83,216 | 126.7s | 26 |

## Detailed Results

### Skill Runs

| Run | Tokens | Duration | Tools |
|-----|--------|----------|-------|
| 1 | 1,914,776 | 136.4s | 28 |
| 2 | 1,876,239 | 132.7s | 29 |
| 3 | 1,764,813 | 115.4s | 27 |

**Tool usage (Run 1):**
- Bash: 9
- Edit: 3
- Grep: 1
- Read: 6
- Skill: 1
- Write: 8

### Command Runs

| Run | Tokens | Duration | Tools |
|-----|--------|----------|-------|
| 1 | 1,762,329 | 121.2s | 25 |
| 2 | 1,881,277 | 127.6s | 28 |
| 3 | 1,720,990 | 131.1s | 26 |

**Tool usage (Run 1):**
- Bash: 9
- Edit: 3
- Grep: 1
- Read: 4
- Write: 8

## Comparison

| Metric | Skill | Command | Diff |
|--------|-------|---------|------|
| Tokens | 1,851,943 | 1,788,199 | +3.6% |
| Duration | 128.2s | 126.7s | +1.2% |
| Tools | 28 | 26 | +6.3% |

## Conclusions

**Winner: Command** (0/3 metrics favor Skill, 3/3 favor Command)

Commands demonstrate better efficiency due to:
- Inline instructions reduce context overhead
- No skill loading/parsing overhead

**Observations:**
- Token usage is comparable between methods
- Execution time is comparable between methods
