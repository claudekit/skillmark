---
phase: 1
status: completed
priority: high
effort: small
completed_at: 2026-02-10T10:34:00Z
---

# Phase 1: Consistency/Variance Scoring

## Context

- [Brainstorm Report](../reports/brainstorm-260210-0954-skill-test-improvements.md)
- Anthropic guide recommends: "Run same request 3-5 times. Compare outputs for structural consistency."
- Currently `aggregateMetrics()` averages across runs but discards variance info.

## Overview

Add variance/consistency metrics computed from existing multi-run data. No new CLI invocations — purely additive analysis on data already collected.

## Key Insights

- `benchmark-report-generator.ts:174-188` already computes stdDev/range for markdown report but doesn't expose it as structured data
- `concept-accuracy-scorer.ts` returns `matchedConcepts`/`missedConcepts` per result but these aren't compared across runs
- `BenchmarkResult.testResults` contains all per-run results grouped by test name — sufficient to compute overlap

## Requirements

### Functional
- Compute accuracy stdDev, range, and consistency score per test
- Compute concept overlap: % concepts matched in ALL runs vs ANY run
- Flag tests as "flaky" when accuracy range > 20pp
- Include `ConsistencyMetrics` in `BenchmarkResult`

### Non-functional
- Zero additional CLI invocations
- No new dependencies

## Architecture

```
TestResult[] (existing) → computeConsistencyMetrics() → ConsistencyMetrics
                                                          ↓
                                              BenchmarkResult.consistency
                                                          ↓
                                              Report: ## Consistency section
                                              Console: flaky warnings
```

## Related Code Files

### Modify
- `packages/cli/src/types/benchmark-types.ts` — add `ConsistencyMetrics` interface, add to `BenchmarkResult`
- `packages/cli/src/engine/concept-accuracy-scorer.ts` — add `computeConsistencyMetrics()` function
- `packages/cli/src/commands/run-benchmark-command.ts` — call new function after aggregation, attach to result
- `packages/cli/src/engine/benchmark-report-generator.ts` — use structured `ConsistencyMetrics` in report + console

### Test
- `packages/cli/src/engine/concept-accuracy-scorer.test.ts` — add consistency tests

## Implementation Steps

### 1. Add types to `benchmark-types.ts`

```typescript
/** Consistency metrics from multi-run variance analysis */
export interface ConsistencyMetrics {
  /** Standard deviation of accuracy across runs */
  accuracyStdDev: number;
  /** Max accuracy - min accuracy across runs */
  accuracyRange: number;
  /** Consistency score: 100 - (stdDev * 3), clamped to [0, 100] */
  consistencyScore: number;
  /** % concepts matched in ALL runs vs ANY run */
  conceptOverlap: number;
  /** Test names with accuracy range > 20pp */
  flakyTests: string[];
}
```

Add `consistency?: ConsistencyMetrics` to `BenchmarkResult` interface.

### 2. Add `computeConsistencyMetrics()` to `concept-accuracy-scorer.ts`

```typescript
export function computeConsistencyMetrics(
  results: TestResult[]
): ConsistencyMetrics | null {
  // Group by test name
  // For each group with >1 result:
  //   - Compute accuracy stdDev, range
  //   - Compute concept overlap (intersection / union of matchedConcepts)
  //   - Flag as flaky if range > 20
  // Aggregate across all groups
  // Return null if all tests have single run
}
```

Logic details:
- **stdDev**: `sqrt(mean((accuracy - mean)^2))` across all per-test groups, then average
- **conceptOverlap per test**: `|intersection of matchedConcepts across runs| / |union of matchedConcepts across runs| * 100`
- **Overall conceptOverlap**: average across all test groups
- **consistencyScore**: `max(0, min(100, 100 - avgStdDev * 3))`
- **flakyTests**: test names where `max - min > 20`

### 3. Wire into `run-benchmark-command.ts`

After line 313 (`aggregateSecurityScores`), add:

```typescript
import { computeConsistencyMetrics } from '../engine/concept-accuracy-scorer.js';
// ...
const consistency = options.runs > 1 ? computeConsistencyMetrics(allResults) : null;
```

Add `...(consistency && { consistency })` to `benchmarkResult` object (line 315-327).

### 4. Update report generator

In `benchmark-report-generator.ts`, update `buildConsistencyAnalysis()` to use structured `ConsistencyMetrics` from result if available (fall back to current computation for backwards compat).

In `printConsoleSummary()`, add flaky test warnings:
```
  ⚠ Flaky: test-name (accuracy range 35pp across runs)
```

### 5. Add unit tests

In `concept-accuracy-scorer.test.ts`:

```typescript
describe('computeConsistencyMetrics', () => {
  it('returns null for single-run results');
  it('computes stdDev and range across runs');
  it('flags flaky tests with >20pp range');
  it('computes concept overlap percentage');
  it('returns consistencyScore clamped to [0, 100]');
});
```

## Todo

- [x] Add `ConsistencyMetrics` interface to `benchmark-types.ts`
- [x] Add `consistency?` field to `BenchmarkResult`
- [x] Implement `computeConsistencyMetrics()` in `concept-accuracy-scorer.ts`
- [x] Wire into `run-benchmark-command.ts` after aggregation
- [x] Update `benchmark-report-generator.ts` to use structured metrics
- [x] Add console flaky test warnings
- [x] Add unit tests for `computeConsistencyMetrics()`
- [x] Run `pnpm build && pnpm test`

## Implementation Notes

**Completed:** 2026-02-10T10:34:00Z

**Changes:**
- Added 18 lines to benchmark-types.ts (ConsistencyMetrics interface)
- Added 99 lines to concept-accuracy-scorer.ts (computeConsistencyMetrics function)
- Added 2 lines to run-benchmark-command.ts (integration)
- Added 31 lines to benchmark-report-generator.ts (report enhancements)
- Added 186 lines to concept-accuracy-scorer.test.ts (6 new tests)

**Tests:** All 23 concept-accuracy-scorer tests pass (17 existing + 6 new)

**Build:** Success - no TypeScript errors or warnings

**Report:** [fullstack-developer-260210-1034-phase-01-consistency-implementation.md](../reports/fullstack-developer-260210-1034-phase-01-consistency-implementation.md)

## Success Criteria

- `pnpm test` passes with new consistency tests
- Multi-run benchmarks show consistency section in report
- Flaky tests flagged when accuracy range > 20pp
- Single-run benchmarks gracefully skip (returns null)

## Risk Assessment

**Low risk.** Purely additive — no existing behavior changed. Existing report generator already computes similar values inline; we're just structuring them.

Only risk: `conceptOverlap` depends on `matchedConcepts` being deterministic per concept name across runs. Already the case since concepts come from test definition.
