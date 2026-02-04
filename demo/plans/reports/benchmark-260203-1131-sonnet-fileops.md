# Benchmark Report: Skills vs Commands

**Date:** 2026-02-03 11:31
**Model:** sonnet
**Task:** 21-step file operations

## Summary

| Method | Runs | Tokens (avg±std) | Duration (avg) | Tools (avg) |
|--------|------|------------------|----------------|-------------|
| Skill | 3 | 1,816,017±59,505 | 154.5s | 28 |
| Command | 3 | 1,760,654±38,706 | 121.4s | 27 |

## Detailed Results

### Skill Runs

| Run | Tokens | Duration | Tools |
|-----|--------|----------|-------|
| 1 | 1,828,686 | 139.0s | 28 |
| 2 | 1,868,168 | 131.5s | 29 |
| 3 | 1,751,198 | 192.9s | 26 |

**Tool usage (Run 1):**
- Bash: 8
- Edit: 3
- Grep: 1
- Read: 7
- Skill: 1
- Write: 8

### Command Runs

| Run | Tokens | Duration | Tools |
|-----|--------|----------|-------|
| 1 | 1,798,404 | 124.8s | 28 |
| 2 | 1,721,059 | 125.3s | 26 |
| 3 | 1,762,500 | 114.0s | 27 |

**Tool usage (Run 1):**
- Bash: 9
- Edit: 3
- Grep: 1
- Read: 7
- Write: 8

## Comparison

| Metric | Skill | Command | Diff |
|--------|-------|---------|------|
| Tokens | 1,816,017 | 1,760,654 | +3.1% |
| Duration | 154.5s | 121.4s | +27.3% |
| Tools | 28 | 27 | +2.5% |

## Conclusions

**Winner: Command** (0/3 metrics favor Skill, 3/3 favor Command)

Commands demonstrate better efficiency due to:
- Inline instructions reduce context overhead
- No skill loading/parsing overhead

**Observations:**
- Token usage is comparable between methods
- Command executes faster
