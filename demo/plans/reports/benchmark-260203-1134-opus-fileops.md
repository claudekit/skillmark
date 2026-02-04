# Benchmark Report: Skills vs Commands

**Date:** 2026-02-03 11:34
**Model:** opus
**Task:** 21-step file operations

## Summary

| Method | Runs | Tokens (avg±std) | Duration (avg) | Tools (avg) |
|--------|------|------------------|----------------|-------------|
| Skill | 3 | 1,406,924±267,308 | 185.2s | 26 |
| Command | 3 | 1,220,049±456 | 177.1s | 25 |

## Detailed Results

### Skill Runs

| Run | Tokens | Duration | Tools |
|-----|--------|----------|-------|
| 1 | 1,252,187 | 177.2s | 26 |
| 2 | 1,253,000 | 176.6s | 26 |
| 3 | 1,715,584 | 201.7s | 26 |

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
| 1 | 1,220,222 | 183.5s | 25 |
| 2 | 1,219,532 | 174.7s | 25 |
| 3 | 1,220,394 | 173.0s | 25 |

**Tool usage (Run 1):**
- Bash: 9
- Edit: 3
- Grep: 1
- Read: 4
- Write: 8

## Comparison

| Metric | Skill | Command | Diff |
|--------|-------|---------|------|
| Tokens | 1,406,924 | 1,220,049 | +15.3% |
| Duration | 185.2s | 177.1s | +4.6% |
| Tools | 26 | 25 | +4.0% |

## Conclusions

**Winner: Command** (0/3 metrics favor Skill, 3/3 favor Command)

Commands demonstrate better efficiency due to:
- Inline instructions reduce context overhead
- No skill loading/parsing overhead

**Observations:**
- Command is more token-efficient
- Execution time is comparable between methods
