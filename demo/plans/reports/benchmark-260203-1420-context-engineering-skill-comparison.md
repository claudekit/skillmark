# Context Engineering Skill Benchmark Report

**Date:** 2026-02-03 14:20
**Comparison:** ck-context-engineering (monolithic) vs Agent-Skills-for-Context-Engineering (modular)

## Summary

| Metric | Local (Monolithic) | External (Modular) | Diff |
|--------|-------------------|-------------------|------|
| Total Tokens | 594,907 | 1,066,492 | +79.3% |
| Avg Tokens/Task | 118,981 | 213,298 | +79.3% |
| Total Duration | 332.8s | 509.7s | +53.1% |
| Total Cost | $0.5768 | $0.8934 | +54.9% |

## Accuracy Comparison

| Task | Local Accuracy | External Accuracy | Winner |
|------|---------------|------------------|--------|
| context-degradation-diagnosis | 100% | 100% | Tie |
| multi-agent-architecture-design | 67% | 100% | External |
| token-optimization-strategy | 67% | 83% | External |
| memory-system-implementation | 100% | 100% | Tie |
| evaluation-framework | 100% | 100% | Tie |
| **Average** | **86.7%** | **96.7%** | **External** |

## Task Details

### Local (Monolithic) Skill

| Task | Tokens | Duration | Cost | Turns |
|------|--------|----------|------|-------|
| context-degradation-diagnosis | 270,208 | 107.5s | $0.1975 | 11 |
| multi-agent-architecture-design | 65,557 | 63.3s | $0.0975 | 3 |
| token-optimization-strategy | 64,867 | 57.5s | $0.0865 | 3 |
| memory-system-implementation | 130,493 | 72.4s | $0.1248 | 5 |
| evaluation-framework | 63,782 | 32.1s | $0.0705 | 3 |

### External (Modular) Skills

| Task | Tokens | Duration | Cost | Turns |
|------|--------|----------|------|-------|
| context-degradation-diagnosis | 359,909 | 98.2s | $0.2109 | 12 |
| multi-agent-architecture-design | 453,311 | 294.9s | $0.4331 | 15 |
| token-optimization-strategy | 62,603 | 32.8s | $0.0660 | 3 |
| memory-system-implementation | 128,232 | 63.9s | $0.1200 | 5 |
| evaluation-framework | 62,437 | 19.9s | $0.0635 | 3 |

## Conclusions

**Winner: Tie**

### Architectural Trade-offs

| Aspect | Monolithic | Modular |
|--------|-----------|---------|
| Activation | Single skill | Multiple skills |
| Token overhead | Lower (one SKILL.md) | Higher (multiple SKILL.md) |
| Flexibility | Broad coverage | Focused per topic |
| Maintenance | Centralized | Distributed |

### Recommendations

| Use Case | Recommended |
|----------|-------------|
| General context questions | Monolithic |
| Deep-dive specific topic | Modular |
| Token-constrained env | Monolithic |
| Team specialization | Modular |
