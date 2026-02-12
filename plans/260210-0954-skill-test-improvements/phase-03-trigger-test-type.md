---
phase: 3
status: completed
priority: medium
effort: medium
depends_on: [phase-01]
completed_date: 2026-02-10
---

# Phase 3: New `trigger` Test Type

## Context

- [Brainstorm Report](../reports/brainstorm-260210-0954-skill-test-improvements.md)
- Anthropic guide: "Test that skills load on relevant queries and DON'T load on irrelevant ones."
- Current types: `knowledge`, `task`, `security`. No trigger testing exists.

## Overview

Add a `trigger` test type that validates skill activation. Each trigger test contains positive queries (should activate) and negative queries (should NOT activate). Uses real Claude CLI invocations with haiku model for speed/cost.

## Key Insights

- `executeTest()` in `claude-cli-executor.ts:45` already supports optional `skillPath` — passing empty string omits `--allowedTools`
- `num_turns` (mapped to `toolCount`) > 0 is a reliable activation signal: if skill tools were called, it triggered
- Trigger tests need short timeout (30s default) since we only need to detect activation, not full workflow
- `markdown-test-definition-parser.ts` already handles custom sections via regex — adding `# Positive Triggers` / `# Negative Triggers` sections follows existing pattern

## Requirements

### Functional
- Parse trigger test markdown with `# Positive Triggers` and `# Negative Triggers` sections
- Execute each trigger query via Claude CLI (haiku model)
- Score activation: `triggerRate`, `falsePositiveRate`, `triggerScore`
- Include `TriggerScore` in `BenchmarkResult`
- Auto-generate trigger tests from SKILL.md description field

### Non-functional
- Use haiku model for trigger tests (fast, cheap)
- Default timeout 30s per query
- Each query = 1 Claude CLI invocation

## Architecture

```
Trigger Test MD → parse positive/negative queries
                        ↓
              For each query: executeTest(query, skillPath, haiku)
                        ↓
              Check toolCount > 0 → activated = true/false
                        ↓
              triggerRate = positiveActivated / totalPositive
              falsePositiveRate = negativeActivated / totalNegative
              triggerScore = triggerRate × (1 - falsePositiveRate / 100)
```

## Related Code Files

### Modify
- `packages/cli/src/types/benchmark-types.ts` — add `'trigger'` to type union, `TriggerScore` interface, add to `BenchmarkResult`
- `packages/cli/src/engine/markdown-test-definition-parser.ts` — parse `# Positive Triggers` / `# Negative Triggers` sections, store in `TestDefinition`
- `packages/cli/src/commands/run-benchmark-command.ts` — route trigger tests to new scorer
- `packages/cli/src/engine/enhanced-test-prompt-builder.ts` — add trigger test generation in prompts
- `packages/cli/src/engine/benchmark-report-generator.ts` — render trigger results in report + console

### Create
- `packages/cli/src/engine/trigger-activation-scorer.ts` — new scorer module

### Test
- `packages/cli/src/engine/trigger-activation-scorer.test.ts`

## Implementation Steps

### 1. Extend types in `benchmark-types.ts`

```typescript
// Update TestDefinition.type
type: 'knowledge' | 'task' | 'security' | 'trigger';

// Add trigger-specific fields to TestDefinition
/** Queries that SHOULD activate the skill (only for type: 'trigger') */
positiveTriggers?: string[];
/** Queries that should NOT activate the skill (only for type: 'trigger') */
negativeTriggers?: string[];

// New interface
export interface TriggerScore {
  /** % of positive queries that activated the skill (0-100) */
  triggerRate: number;
  /** % of negative queries that incorrectly activated (0-100) */
  falsePositiveRate: number;
  /** Combined: triggerRate × (1 - falsePositiveRate / 100) */
  triggerScore: number;
  /** Per-query results */
  queryResults: Array<{
    query: string;
    expected: 'activate' | 'ignore';
    actual: 'activated' | 'ignored';
    correct: boolean;
    toolCount: number;
  }>;
}

// Add to BenchmarkResult
triggerScore?: TriggerScore;
```

### 2. Parse trigger sections in `markdown-test-definition-parser.ts`

In the section parsing logic (around `parseSections()`), add:

```typescript
// After existing section detection for # Prompt, # Expected, etc.
case 'positive triggers':
  // Parse each line as a trigger query (strip quotes, bullets)
  definition.positiveTriggers = parseListItems(sectionContent);
  break;
case 'negative triggers':
  definition.negativeTriggers = parseListItems(sectionContent);
  break;
```

Set defaults for trigger type:
- `timeout: 30` (short — just detecting activation)
- `concepts: ['activates-on-relevant', 'ignores-irrelevant']`

### 3. Create `trigger-activation-scorer.ts`

```typescript
import type { TestDefinition, TestResult, BenchmarkMetrics } from '../types/index.js';
import type { TriggerScore } from '../types/index.js';
import { executeTest } from './claude-cli-executor.js';

/** Check if a trigger test */
export function isTriggerTest(test: TestDefinition): boolean {
  return test.type === 'trigger';
}

/** Score trigger activation across positive/negative queries */
export async function scoreTriggerTest(
  test: TestDefinition,
  skillPath: string,
  workDir: string
): Promise<TriggerScore> {
  const queryResults: TriggerScore['queryResults'] = [];

  // Run positive triggers
  for (const query of test.positiveTriggers || []) {
    const result = await executeTest(
      { ...test, prompt: query, timeout: 30 },
      skillPath, 'haiku', workDir
    );
    const activated = result.success && result.toolCount > 0;
    queryResults.push({
      query,
      expected: 'activate',
      actual: activated ? 'activated' : 'ignored',
      correct: activated,
      toolCount: result.toolCount,
    });
  }

  // Run negative triggers
  for (const query of test.negativeTriggers || []) {
    const result = await executeTest(
      { ...test, prompt: query, timeout: 30 },
      skillPath, 'haiku', workDir
    );
    const activated = result.success && result.toolCount > 0;
    queryResults.push({
      query,
      expected: 'ignore',
      actual: activated ? 'activated' : 'ignored',
      correct: !activated,
      toolCount: result.toolCount,
    });
  }

  // Calculate rates
  const positiveResults = queryResults.filter(q => q.expected === 'activate');
  const negativeResults = queryResults.filter(q => q.expected === 'ignore');

  const triggerRate = positiveResults.length > 0
    ? (positiveResults.filter(q => q.correct).length / positiveResults.length) * 100
    : 0;

  const falsePositiveRate = negativeResults.length > 0
    ? (negativeResults.filter(q => !q.correct).length / negativeResults.length) * 100
    : 0;

  const triggerScore = triggerRate * (1 - falsePositiveRate / 100);

  return { triggerRate, falsePositiveRate, triggerScore, queryResults };
}

/** Aggregate trigger scores from multiple results */
export function aggregateTriggerScores(
  scores: TriggerScore[]
): TriggerScore | null {
  if (scores.length === 0) return null;
  // Average rates across runs
  // Merge queryResults
}
```

### 4. Wire into `run-benchmark-command.ts`

In `runSingleTest()`, add trigger type routing:

```typescript
// Before the existing scoring block (line 148)
if (test.type === 'trigger') {
  // Trigger tests handle their own execution loop
  // Return early — scored differently
  const triggerResult = await scoreTriggerTest(test, skillPath, workDir);
  // Convert to TestResult format for consistency
  // ...
}
```

Alternatively, handle trigger tests in a separate loop in `runBenchmark()` to avoid confusion with the standard test flow.

In the aggregation section (after line 313):
```typescript
const triggerScore = aggregateTriggerScores(triggerScores);
// Add to benchmarkResult: ...(triggerScore && { triggerScore })
```

### 5. Update test generation prompt

In `enhanced-test-prompt-builder.ts`, add to the JSON output format:

```
{"name":"<skill>-trigger","test_type":"trigger","concepts":["activates-on-relevant","ignores-irrelevant"],"timeout":30,"positive_triggers":["query1","query2","query3"],"negative_triggers":["query1","query2","query3"]}
```

Add rule: "Generate 1 trigger test with 3 positive + 3 negative queries derived from the skill description."

### 6. Update report generator

In `benchmark-report-generator.ts`, add `buildTriggerAnalysis()`:

```markdown
## Trigger Analysis

| Metric | Value |
|--------|-------|
| Trigger Rate | 100% (3/3 positive activated) |
| False Positive Rate | 0% (0/3 negative activated) |
| Trigger Score | 100.0% |

### Query Results
| Query | Expected | Actual | Tools |
|-------|----------|--------|-------|
| "Help me set up..." | activate | ✅ activated | 3 |
| "What's the weather?" | ignore | ✅ ignored | 0 |
```

### 7. Unit tests

```typescript
// trigger-activation-scorer.test.ts
describe('isTriggerTest', () => {
  it('returns true for trigger type');
  it('returns false for other types');
});

describe('scoreTriggerTest', () => {
  // Mock executeTest
  it('scores 100% when all positive queries activate');
  it('scores 0% trigger rate when no positive queries activate');
  it('penalizes false positives in negative queries');
  it('handles empty positive triggers');
  it('handles empty negative triggers');
  it('records per-query results with tool counts');
});
```

## Todo

- [x] Add `'trigger'` to TestDefinition type union
- [x] Add `positiveTriggers?`, `negativeTriggers?` to `TestDefinition`
- [x] Add `TriggerScore` interface
- [x] Add `triggerScore?` to `BenchmarkResult`
- [x] Parse `# Positive Triggers` / `# Negative Triggers` in markdown parser
- [x] Create `trigger-activation-scorer.ts` with `scoreTriggerTest()` + `aggregateTriggerScores()`
- [x] Wire trigger routing in `run-benchmark-command.ts`
- [x] Update test generation prompt with trigger test format
- [x] Add trigger section to markdown report + console summary
- [x] Create `trigger-activation-scorer.test.ts`
- [x] Create example trigger test in `examples/`
- [x] Run `pnpm build && pnpm test`

## Success Criteria

- Trigger test markdown files parse correctly
- Each positive/negative query runs as separate Claude CLI invocation
- Trigger score appears in benchmark report
- Auto-generated tests include 1 trigger test from SKILL.md
- `pnpm test` passes

## Risk Assessment

**Medium risk.**
- **Activation detection**: `toolCount > 0` as proxy. If skill responds without tools (pure knowledge skill), this heuristic fails. Mitigation: also check response length / content similarity to skill domain.
- **Cost**: 6 queries × 3 runs = 18 haiku invocations. ~$0.02 total. Acceptable.
- **Flakiness**: Claude may inconsistently activate skills. Mitigated by multi-run averaging + consistency scoring from Phase 1.
