---
status: pending
created: 2026-02-10
slug: skill-test-improvements
branch: main
---

# Skill Test Improvements Plan

Implement 4 test improvements inspired by Anthropic's official skills guide. Ordered by effort/risk (lowest first).

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | [Consistency/Variance Scoring](./phase-01-consistency-variance-scoring.md) | pending | Small | 3 modified |
| 2 | [Unit Test Coverage](./phase-02-unit-test-coverage.md) | pending | Medium | 3 new test files |
| 3 | [Trigger Test Type](./phase-03-trigger-test-type.md) | pending | Medium | 5 modified, 1 new |
| 4 | [Performance Baseline](./phase-04-performance-baseline.md) | pending | Large | 4 modified |

## Dependencies

```
Phase 1 (consistency) ─┐
                       ├──► Phase 3 (trigger) ──► Phase 4 (baseline)
Phase 2 (unit tests) ──┘
```

Phase 1 & 2 are independent — can run in parallel.
Phase 3 depends on types from Phase 1.
Phase 4 depends on Phase 3 (shares executor patterns).

## Key Decisions

- Trigger tests use **real Claude CLI** invocations (haiku model for cost)
- Baseline uses **same prompt, no skill flag** — opt-in via `--with-baseline`
- Consistency is **additive analysis** on existing multi-run data (zero new invocations)
- All new types/interfaces added to `benchmark-types.ts` incrementally per phase

## Brainstorm Source

`plans/reports/brainstorm-260210-0954-skill-test-improvements.md`
