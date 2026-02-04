# Benchmark Report: Skills vs Commands

**Date:** 2026-02-03 11:21
**Model:** haiku
**Task:** 21-step file operations

## Summary

| Method | Runs | Tokens (avg±std) | Duration (avg) | Tools (avg) |
|--------|------|------------------|----------------|-------------|
| Skill | 3 | 1,894,444±4,817 | 97.3s | 29 |
| Command | 3 | 1,761,881±64,247 | 96.2s | 25 |

## Detailed Results

### Skill Runs

| Run | Tokens | Duration | Tools |
|-----|--------|----------|-------|
| 1 | 1,889,377 | 100.6s | 28 |
| 2 | 1,894,991 | 98.9s | 29 |
| 3 | 1,898,964 | 92.3s | 29 |

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
| 1 | 1,749,012 | 94.3s | 25 |
| 2 | 1,705,042 | 95.9s | 24 |
| 3 | 1,831,588 | 98.4s | 27 |

**Tool usage (Run 1):**
- Bash: 9
- Edit: 3
- Grep: 1
- Read: 4
- Write: 8

## Comparison

| Metric | Skill | Command | Diff |
|--------|-------|---------|------|
| Tokens | 1,894,444 | 1,761,881 | +7.5% |
| Duration | 97.3s | 96.2s | +1.1% |
| Tools | 29 | 25 | +13.2% |

## Conclusions

**Winner: Command** (0/3 metrics favor Skill, 3/3 favor Command)

Commands demonstrate better efficiency due to:
- Inline instructions reduce context overhead
- No skill loading/parsing overhead

**Observations:**
- Token usage is comparable between methods
- Execution time is comparable between methods
