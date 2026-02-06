# Phase 4: Benchmark Pipeline Integration

## Context
- [Phase 1](./phase-01-security-types-and-test-format.md) — types
- [Phase 2](./phase-02-security-test-scorer.md) — security scorer
- [run-benchmark-command.ts](../../packages/cli/src/commands/run-benchmark-command.ts)

## Overview
- **Priority:** P1
- **Status:** Pending
- **Description:** Wire security scorer into the benchmark pipeline. Separate security vs functional tests, route to correct scorer, aggregate SecurityScore into BenchmarkResult.

## Requirements
- Security tests scored via `scoreSecurityResponse()` instead of `scoreResponse()`
- Console output distinguishes security tests from functional tests
- BenchmarkResult includes `securityScore` when security tests exist
- Markdown report includes security section
- Summary prints composite score when security data present

## Related Code Files

### Modify
- `packages/cli/src/commands/run-benchmark-command.ts` — pipeline routing + output

## Implementation Steps

### Step 1: Add imports

At top of `run-benchmark-command.ts`, add:
```typescript
import { scoreSecurityResponse, aggregateSecurityScores, isSecurityTest } from '../engine/security-test-scorer.js';
import type { SecurityScore } from '../types/index.js';
```

### Step 2: Route tests to correct scorer

In the test execution loop (line ~205, after `const metrics`), replace the direct `scoreResponse()` call:

```typescript
// Score response — route security tests to security scorer
const result = isSecurityTest(test)
  ? scoreSecurityResponse(test, execution.response, metrics)
  : scoreResponse(test, execution.response, metrics);
allResults.push(result);
```

### Step 3: Display security test results differently

Update the status display section (line ~209-230). After computing `status` and `accuracy`:

```typescript
const isSecTest = isSecurityTest(test);
const label = isSecTest ? 'Security' : accuracy;

if (verbose) {
  if (isSecTest) {
    console.log(`  ${status} Security: ${accuracy}% score (${test.category || 'general'})`);
    if (result.missedConcepts.some(c => c.startsWith('[LEAKED]'))) {
      console.log(chalk.red(`  Leaked: ${result.missedConcepts.filter(c => c.startsWith('[LEAKED]')).map(c => c.replace('[LEAKED] ', '')).join(', ')}`));
    }
  } else {
    // ... existing verbose output
  }
}
```

### Step 4: Aggregate security scores after all runs

After `const aggregated = aggregateMetrics(allResults);` (line ~247), add:

```typescript
// Aggregate security scores separately
const securityScore = aggregateSecurityScores(allResults);
```

### Step 5: Include security score in BenchmarkResult

In the `benchmarkResult` object construction (line ~249), add:
```typescript
...(securityScore && { securityScore }),
```

### Step 6: Update `generateMarkdownReport()`

Add security section after the test results section (line ~360):

```typescript
if (result.securityScore) {
  const s = result.securityScore;
  md += `## Security Benchmark\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Security Score | ${s.securityScore.toFixed(1)}% |\n`;
  md += `| Refusal Rate | ${s.refusalRate.toFixed(1)}% |\n`;
  md += `| Leakage Rate | ${s.leakageRate.toFixed(1)}% |\n`;
  md += `| Composite Score | ${(m.accuracy * 0.70 + s.securityScore * 0.30).toFixed(1)}% |\n\n`;

  // Category breakdown
  const categories = Object.entries(s.categoryBreakdown);
  if (categories.length > 0) {
    md += `### Category Breakdown\n\n`;
    md += `| Category | Refusal | Leakage | Tests |\n|----------|---------|---------|-------|\n`;
    for (const [cat, data] of categories) {
      if (!data) continue;
      md += `| ${cat} | ${data.refusalRate.toFixed(1)}% | ${data.leakageRate.toFixed(1)}% | ${data.testsRun} |\n`;
    }
    md += '\n';
  }
}
```

### Step 7: Update `printSummary()`

After the existing metrics output (line ~388), add:

```typescript
if (result.securityScore) {
  const s = result.securityScore;
  const composite = m.accuracy * 0.70 + s.securityScore * 0.30;
  const secColor = s.securityScore >= 80 ? chalk.green : s.securityScore >= 50 ? chalk.yellow : chalk.red;

  console.log('');
  console.log(`${chalk.gray('Security:')}  ${secColor(s.securityScore.toFixed(1) + '%')} (refusal: ${s.refusalRate.toFixed(0)}%, leakage: ${s.leakageRate.toFixed(0)}%)`);
  console.log(`${chalk.gray('Composite:')} ${composite.toFixed(1)}% (70% accuracy + 30% security)`);
}
```

### Step 8: Update `generateResultHash()`

Include security score in hash (line ~303):
```typescript
const data = {
  skillId: result.skillId,
  model: result.model,
  runs: result.runs,
  accuracy: result.aggregatedMetrics.accuracy,
  securityScore: result.securityScore?.securityScore ?? null,
  tokensTotal: result.aggregatedMetrics.tokensTotal,
  timestamp: result.timestamp,
};
```

## Todo List

- [ ] Add security scorer imports
- [ ] Route security tests to `scoreSecurityResponse()`
- [ ] Display security test results in verbose/normal mode
- [ ] Aggregate security scores after runs
- [ ] Include securityScore in BenchmarkResult
- [ ] Add security section to markdown report
- [ ] Add security + composite to console summary
- [ ] Include security in result hash
- [ ] Verify `pnpm --filter @skillmark/cli build` compiles

## Success Criteria
- Security tests scored separately from functional tests
- Console output clearly shows security test results
- Markdown report includes security benchmark section
- Composite score displayed in summary
- Existing non-security benchmarks produce identical output (backward compat)

## Risk Assessment
- **Low:** All changes are additive. `isSecurityTest()` check ensures existing tests are unaffected.
- Hash change is backward-compatible (null security score produces same hash for old results)
