---
phase: 4
status: completed
priority: medium
effort: large
depends_on: [phase-03]
---

# Phase 4: Performance Baseline Comparison

## Context

- [Brainstorm Report](../reports/brainstorm-260210-0954-skill-test-improvements.md)
- Anthropic guide: "Compare same task with and without the skill. Count tool calls, tokens consumed."
- Currently no way to measure skill value vs vanilla Claude.

## Overview

Add opt-in `--with-baseline` flag. Runs each test twice: once with skill, once without. Computes delta metrics to quantify skill value (accuracy improvement, token reduction, cost savings).

## Key Insights

- `executeTest()` in `claude-cli-executor.ts:71` conditionally adds `--allowedTools` — passing empty `skillPath` already omits it
- `scoreResponse()` works regardless of skill presence — concepts match against raw response
- Skip baseline for `security` and `trigger` tests (meaningless without skill context)
- Doubles execution time + cost — must be opt-in only

## Requirements

### Functional
- New `--with-baseline` CLI flag (opt-in, default false)
- Run each `knowledge`/`task` test twice: with skill → score, without skill → score
- Compute deltas: accuracy, tokens, tool count, cost, duration
- Include `BaselineComparison` in `BenchmarkResult`
- Render comparison table in report + console

### Non-functional
- Opt-in only — never run baseline automatically
- Skip baseline for security + trigger tests
- Baseline uses same model as main run

## Architecture

```
For each test (knowledge/task only):
  ┌─ With skill ──→ executeTest(prompt, skillPath) → scoreResponse() → metricsA
  │
  └─ Without skill → executeTest(prompt, '')        → scoreResponse() → metricsB
                                                          ↓
                                              computeBaselineDelta(metricsA, metricsB)
                                                          ↓
                                              BenchmarkResult.baseline
```

## Related Code Files

### Modify
- `packages/cli/src/types/benchmark-types.ts` — add `BaselineComparison`, `BaselineDelta`, `withBaseline` to `RunOptions`
- `packages/cli/src/cli-entry-point.ts` — add `--with-baseline` option
- `packages/cli/src/commands/run-benchmark-command.ts` — orchestrate dual execution, compute deltas
- `packages/cli/src/engine/benchmark-report-generator.ts` — render baseline comparison table

### Test
- Add baseline tests to `benchmark-report-generator.test.ts`

## Implementation Steps

### 1. Add types to `benchmark-types.ts`

```typescript
/** Delta between with-skill and without-skill metrics */
export interface BaselineDelta {
  /** Accuracy change in percentage points (positive = skill helped) */
  accuracyDelta: number;
  /** Token reduction percentage (positive = fewer tokens with skill) */
  tokenReduction: number;
  /** Tool count difference (positive = fewer tools with skill) */
  toolCountDelta: number;
  /** Cost savings in USD (positive = cheaper with skill) */
  costDelta: number;
  /** Duration change in ms (positive = faster with skill) */
  durationDelta: number;
}

/** Baseline comparison for a single test */
export interface BaselineTestComparison {
  testName: string;
  withSkill: BenchmarkMetrics;
  withoutSkill: BenchmarkMetrics;
  delta: BaselineDelta;
}

/** Aggregated baseline comparison */
export interface BaselineComparison {
  /** Per-test comparisons */
  tests: BaselineTestComparison[];
  /** Averaged deltas across all tested items */
  aggregatedDelta: BaselineDelta;
}
```

Add to `RunOptions`:
```typescript
/** Run baseline comparison (same tests without skill) */
withBaseline?: boolean;
```

Add to `BenchmarkResult`:
```typescript
/** Baseline comparison (null if --with-baseline not used) */
baseline?: BaselineComparison;
```

### 2. Add CLI flag in `cli-entry-point.ts`

After line 46 (the `--parallel` option):
```typescript
.option('--with-baseline', 'Run baseline comparison (tests without skill for comparison)')
```

Pass through to `RunOptions`:
```typescript
withBaseline: options.withBaseline ?? false,
```

### 3. Implement dual execution in `run-benchmark-command.ts`

Add new function:
```typescript
async function runBaselineTest(
  test: TestDefinition,
  model: 'haiku' | 'sonnet' | 'opus',
  workDir: string,
  verbose: boolean,
  spinner: ReturnType<typeof ora>
): Promise<TestResult | null> {
  // Same as runSingleTest but skillPath = '' (no --allowedTools)
  // Display with "[BASELINE]" prefix
}
```

In `runBenchmark()`, after normal test loop:
```typescript
if (options.withBaseline) {
  console.log(chalk.blue('\n── Running Baseline (without skill) ──\n'));
  const baselineResults: TestResult[] = [];

  for (const test of tests) {
    // Skip security and trigger tests
    if (test.type === 'security' || test.type === 'trigger') continue;

    const result = await runBaselineTest(test, options.model, workDir, verbose, spinner);
    if (result) baselineResults.push(result);
  }

  baseline = computeBaselineComparison(allResults, baselineResults);
}
```

Add pure function:
```typescript
export function computeBaselineComparison(
  withSkill: TestResult[],
  withoutSkill: TestResult[]
): BaselineComparison {
  const tests: BaselineTestComparison[] = [];

  // Match by test name
  for (const ws of withSkill) {
    if (ws.test.type === 'security' || ws.test.type === 'trigger') continue;
    const wos = withoutSkill.find(r => r.test.name === ws.test.name);
    if (!wos) continue;

    tests.push({
      testName: ws.test.name,
      withSkill: ws.metrics,
      withoutSkill: wos.metrics,
      delta: {
        accuracyDelta: ws.metrics.accuracy - wos.metrics.accuracy,
        tokenReduction: wos.metrics.tokensTotal > 0
          ? ((wos.metrics.tokensTotal - ws.metrics.tokensTotal) / wos.metrics.tokensTotal) * 100
          : 0,
        toolCountDelta: wos.metrics.toolCount - ws.metrics.toolCount,
        costDelta: wos.metrics.costUsd - ws.metrics.costUsd,
        durationDelta: wos.metrics.durationMs - ws.metrics.durationMs,
      },
    });
  }

  // Average deltas
  const aggregatedDelta = averageDeltas(tests.map(t => t.delta));

  return { tests, aggregatedDelta };
}
```

### 4. Update report generator

Add `buildBaselineComparison()` to `benchmark-report-generator.ts`:

```markdown
## Baseline Comparison (With Skill vs Without)

### Aggregated Impact

| Metric | With Skill | Without Skill | Delta |
|--------|-----------|---------------|-------|
| Accuracy | 92.0% | 61.0% | **+31.0pp** |
| Tokens | 4,200 | 11,800 | **-64%** |
| Tool Calls | 3 | 12 | **-9** |
| Cost | $0.08 | $0.22 | **-$0.14** |
| Duration | 12.5s | 38.2s | **-25.7s** |

### Per-Test Breakdown
(collapsible details for each test)
```

Console summary addition:
```
── Baseline Impact ──
  Accuracy:  +31.0pp (61.0% → 92.0%)
  Tokens:    -64% reduction
  Cost:      -$0.14 savings
```

### 5. Unit tests

Add to `benchmark-report-generator.test.ts`:

```typescript
describe('baseline comparison in report', () => {
  it('renders baseline table when baseline present');
  it('skips baseline section when baseline absent');
  it('formats positive deltas with + prefix');
  it('formats negative token reduction as savings');
});
```

Add to a new section or existing file:

```typescript
describe('computeBaselineComparison', () => {
  it('matches tests by name');
  it('skips security tests');
  it('skips trigger tests');
  it('calculates accuracy delta correctly');
  it('calculates token reduction percentage');
  it('handles zero baseline tokens without division error');
  it('averages deltas across multiple tests');
});
```

## Todo

- [x] Add `BaselineDelta`, `BaselineTestComparison`, `BaselineComparison` to types
- [x] Add `withBaseline?` to `RunOptions`
- [x] Add `baseline?` to `BenchmarkResult`
- [x] Add `--with-baseline` CLI option in `cli-entry-point.ts`
- [x] Implement `runBaselineTest()` in `run-benchmark-command.ts`
- [x] Implement `computeBaselineComparison()` pure function
- [x] Wire baseline execution loop (skip security/trigger)
- [x] Add `buildBaselineComparison()` to report generator
- [x] Add baseline section to console summary
- [x] Add unit tests for `computeBaselineComparison()`
- [x] Add report rendering tests
- [x] Run `pnpm build && pnpm test`

## Success Criteria

- `--with-baseline` flag accepted by CLI
- Knowledge/task tests run twice (with + without skill)
- Security/trigger tests skipped in baseline
- Delta table appears in markdown report + console
- `pnpm test` passes
- Baseline disabled by default (no cost impact on normal runs)

## Risk Assessment

**Medium-high risk.**
- **Cost doubling**: Baseline doubles invocations for knowledge/task tests. Mitigated by opt-in flag + clear console warning showing estimated extra cost.
- **Baseline meaninglessness**: Without skill, Claude may score 0% on domain-specific prompts. This is actually informative — proves skill value. But may look odd in report. Mitigate with note: "Baseline accuracy of 0% indicates the prompt requires skill-specific knowledge."
- **Test matching**: Baseline results matched by test name. If test names aren't unique (shouldn't happen), matching breaks. Validate uniqueness in parser.

## Security Considerations

- Baseline tests run same prompts without skill — no additional security exposure
- No sensitive data in baseline execution path
- `--dangerously-skip-permissions` already used in both paths
