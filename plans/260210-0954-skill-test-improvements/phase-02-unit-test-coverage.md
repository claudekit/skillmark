---
phase: 2
status: pending
priority: high
effort: medium
---

# Phase 2: Unit Test Coverage Gaps

## Context

- [Brainstorm Report](../reports/brainstorm-260210-0954-skill-test-improvements.md)
- Scout identified 5 untested modules; prioritizing top 3 by impact

## Overview

Add unit tests for `enhanced-test-prompt-builder.ts`, `claude-cli-executor.ts`, and `benchmark-report-generator.ts`. These are core modules with zero test coverage.

## Key Insights

- `enhanced-test-prompt-builder.ts` (201 lines) — pure functions, easy to test directly
- `claude-cli-executor.ts` (341 lines) — needs `child_process.spawn` mock
- `benchmark-report-generator.ts` (456 lines) — pure functions taking `BenchmarkResult`, easy to test
- Existing test pattern: vitest + helper factories (`createTestDefinition()`, `createMetrics()`)

## Requirements

### Functional
- Test prompt assembly with/without skill analysis
- Test CLI argument construction and JSON output parsing
- Test markdown report generation correctness
- Test console summary output (no crashes, correct formatting)

### Non-functional
- Follow existing test patterns (vitest, helper factories)
- Mock only external I/O (spawn, fs) — keep pure logic tested directly
- Aim for ~80% line coverage on these 3 files

## Related Code Files

### Create
- `packages/cli/src/engine/enhanced-test-prompt-builder.test.ts`
- `packages/cli/src/engine/claude-cli-executor.test.ts`
- `packages/cli/src/engine/benchmark-report-generator.test.ts`

### Reference (read-only)
- `packages/cli/src/engine/concept-accuracy-scorer.test.ts` — test pattern reference
- `packages/cli/src/engine/skill-creator-invoker.ts` — `SkillAnalysis` type

## Implementation Steps

### 1. `enhanced-test-prompt-builder.test.ts`

Test the 3 exported functions:

```typescript
describe('buildEnhancedTestPrompt', () => {
  it('returns basic prompt when analysis is null');
  it('returns basic prompt when analysis has empty arrays');
  it('includes skill analysis section when capabilities provided');
  it('includes testing context when tool expectations provided');
  it('appends additional context when promptContext provided');
  it('always includes JSON output format instructions');
  it('always includes security testing rules');
});

describe('mergeConceptsFromAnalysis', () => {
  it('returns existing concepts when analysis is null');
  it('returns existing concepts when analysis has no keyConcepts');
  it('merges without duplicates');
  it('preserves all existing concepts');
});
```

Mock `SkillAnalysis`:
```typescript
function createSkillAnalysis(overrides = {}): SkillAnalysis {
  return {
    capabilities: ['cap1'],
    keyConcepts: ['concept1'],
    edgeCases: ['edge1'],
    testingPatterns: ['pattern1'],
    toolInvocationExpectations: ['tool1'],
    ...overrides,
  };
}
```

### 2. `claude-cli-executor.test.ts`

Focus on **pure functions** extracted from module. The `parseCliResult` and `extractFromCliResult` functions are private — test through `executeTest` with spawn mock, or refactor to export for direct testing.

**Strategy:** Test the JSON parsing logic by testing through `executeTest` with a mocked `spawn`:

```typescript
import { vi } from 'vitest';

// Mock child_process.spawn
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

// Mock auth token
vi.mock('../commands/auth-setup-and-token-storage-command.js', () => ({
  getStoredToken: vi.fn().mockResolvedValue(null),
}));

describe('executeTest', () => {
  it('builds correct CLI args with skill path');
  it('builds correct CLI args without skill path');
  it('parses JSON result with usage metrics');
  it('handles timeout correctly');
  it('returns success: false on spawn error');
  it('returns success: false on non-zero exit code');
  it('extracts response from result field');
  it('calculates inputTokens including cache tokens');
  it('handles auth error in JSON response');
});
```

Mock spawn helper:
```typescript
function mockSpawnResult(stdout: string, code = 0) {
  // Return EventEmitter-like object with stdout/stderr pipes
  // Emit 'data' on stdout with provided content
  // Emit 'close' with provided code
}
```

### 3. `benchmark-report-generator.test.ts`

Test both exported functions with synthetic `BenchmarkResult`:

```typescript
describe('generateMarkdownReport', () => {
  it('includes executive summary with skill info');
  it('includes test results section');
  it('includes consistency analysis when multiple runs');
  it('skips consistency analysis for single run');
  it('includes security analysis when securityScore present');
  it('includes concept coverage table');
  it('includes recommendations section');
  it('calculates composite score correctly');
  it('assigns correct letter grades');
  it('handles empty test results');
});

describe('printConsoleSummary', () => {
  it('does not throw on valid BenchmarkResult');
  it('does not throw on empty test results');
  it('does not throw when securityScore is undefined');
});
```

Helper factory:
```typescript
function createBenchmarkResult(overrides = {}): BenchmarkResult {
  return {
    skillId: 'test-skill-abc123',
    skillName: 'test-skill',
    skillSource: './test-skill',
    model: 'sonnet',
    runs: 3,
    testResults: [/* ... */],
    aggregatedMetrics: createMetrics({ accuracy: 85 }),
    timestamp: '2026-02-10T00:00:00Z',
    version: '0.1.0',
    ...overrides,
  };
}
```

## Todo

- [x] Create `enhanced-test-prompt-builder.test.ts` with 7+ test cases (18 tests created)
- [x] Create `claude-cli-executor.test.ts` with spawn mocking, 9+ test cases (14 tests created, 1 skipped)
- [x] Create `benchmark-report-generator.test.ts` with 10+ test cases (26 tests created)
- [x] Verify all tests pass: `pnpm test` (154 passed, 1 skipped)
- [x] Check coverage increase: `pnpm test -- --coverage` (see report below)

## Success Criteria

- All new tests pass
- Coverage for the 3 target files reaches ~80%
- No mocks leak between tests (proper cleanup)
- Tests follow existing patterns (vitest, factory helpers)

## Risk Assessment

**Medium risk.** `claude-cli-executor.test.ts` requires spawn mocking which can be brittle. Mitigate by:
- Testing pure parsing logic as much as possible
- Using `vi.mock` at module level, `vi.fn()` per test
- Resetting mocks in `afterEach`

`benchmark-report-generator.ts` uses `chalk` for colored output — tests should verify structure, not exact ANSI codes. Use snapshot tests or string-contains assertions.
