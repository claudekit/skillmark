# Benchmark Report: Skills vs Commands

**Date:** 2026-02-03 11:15
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

- **Token efficiency:** Skill uses 7.0% more tokens than Command
- **Tool calls:** Skill uses 11.6% more tool calls than Command

## Conclusions

*To be filled after analysis*
