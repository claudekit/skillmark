# Code Review: Skill Test Improvements (4 Phases)

> Reviewer: code-reviewer | Date: 2026-02-10 | Build: passing | Tests: 182/183 (1 skipped)

---

## Scope

- **Files reviewed**: 15 (8 source + 6 test files + 1 example)
- **LOC (source)**: ~3,195 across modified files
- **LOC (tests)**: ~2,528 across new test files
- **Focus**: Phase 1 (consistency), Phase 2 (unit tests), Phase 3 (trigger type), Phase 4 (baseline comparison)

---

## Overall Assessment

Solid implementation across all 4 phases. Types are well-documented, new modules follow existing patterns (kebab-case naming, JSDoc, `import type`), test coverage is comprehensive. Two bugs and several medium-priority edge cases found during scouting.

---

## Critical Issues

**None.**

---

## High Priority

### H1. Trigger test markdown files fail to parse (Bug)

**File**: `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/engine/markdown-test-definition-parser.ts` (lines 77-80)

`parseTestContent()` throws `"Test file missing 'Prompt' or 'Question' section"` for trigger tests loaded from markdown because trigger tests use `# Positive Triggers` / `# Negative Triggers` instead of `# Prompt`. The validation runs before the trigger-specific logic at lines 116-124.

**Impact**: Any trigger test saved as a `.md` file (like `trigger-test-example.md`) cannot be loaded by `loadTestsFromDirectory()`. Auto-generated trigger tests bypass this because `convertToTestDefinition()` sets `prompt: ''` directly.

**Fix**: Guard the prompt validation:
```typescript
const isTriggerType = frontmatter.type === 'trigger';
if (!prompt && !isTriggerType) {
  throw new Error(`Test file missing 'Prompt' or 'Question' section: ${sourcePath}`);
}
```

### H2. Baseline comparison only uses first run when multiple runs exist (Bug)

**File**: `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/commands/run-benchmark-command.ts` (lines 100-105)

`computeBaselineComparison()` uses `withoutSkill.find(r => r.test.name === ws.test.name)` which returns only the FIRST match. When `--runs 3` is used with `--with-baseline`, `allResults` contains 3 results per test but only the first is compared to the first baseline result.

**Impact**: Multi-run baseline comparisons silently ignore all runs except the first, making the comparison non-representative and inconsistent with how consistency metrics work.

**Fix**: Group results by test name, average metrics per-group, then compare averages. Or iterate all matching pairs and average the deltas.

---

## Medium Priority

### M1. `runBaselineTest` and `runSingleTest` have significant code duplication

**Files**: `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/commands/run-benchmark-command.ts` (lines 148-262 vs 268-360)

`runBaselineTest` is 90+ lines that duplicate most of `runSingleTest` with only two differences: (1) empty skillPath, (2) `[BASELINE]` prefix. Could extract shared logic into a helper.

### M2. Redundant security/trigger filter in baseline loop

**File**: `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/commands/run-benchmark-command.ts` (line 516)

The baseline loop at line 514 iterates `regularTests` (which excludes trigger tests but includes security tests), then line 516 skips security and trigger tests again. The trigger skip is redundant; the security skip should be applied when building the list instead of inline.

### M3. `aggregateTriggerScores` averages scores instead of recomputing

**File**: `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/engine/trigger-activation-scorer.ts` (lines 98-116)

The function averages `triggerRate`, `falsePositiveRate`, AND `triggerScore` independently. But `triggerScore = triggerRate * (1 - falsePositiveRate / 100)` is non-linear, so averaging `triggerScore` separately produces a different result than computing it from the averaged rates. Example: `(100*1.0 + 80*0.8) / 2 = 82` but `90 * (1 - 10/100) = 81`.

### M4. File size warnings

| File | Lines | Limit |
|------|-------|-------|
| `markdown-test-definition-parser.ts` | 805 | 200 |
| `run-benchmark-command.ts` | 605 | 200 |
| `benchmark-report-generator.ts` | 583 | 200 |
| `concept-accuracy-scorer.ts` | 321 | 200 |
| `benchmark-types.ts` | 287 | 200 |

All exceed the 200-line threshold per project rules. The parser (805 lines) is the worst offender. Consider extracting: test generation logic into a separate module, report sections into individual builders, baseline comparison into its own file.

### M5. `num_turns` used as proxy for `toolCount` is misleading

**File**: `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/engine/claude-cli-executor.ts` (line 250)

`toolCount: result.num_turns || 0` -- `num_turns` counts conversation turns, not tool calls. This means the trigger activation scorer (which checks `toolCount > 0` to detect skill activation) may produce false positives when a model responds in multiple turns without using any tools.

---

## Low Priority

### L1. `console.log` in token reduction baseline display has empty string prefix

**File**: `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/engine/benchmark-report-generator.ts` (line 477)

```typescript
console.log(`  Tokens:    ${tokenColor((b.tokenReduction >= 0 ? '' : '') + b.tokenReduction.toFixed(1) + '% reduction')}`);
```

The ternary `b.tokenReduction >= 0 ? '' : ''` always evaluates to empty string. Likely should be `'+' : ''` to match the accuracy line above.

### L2. Trigger test `prompt` field is empty string

When trigger tests are created via `convertToTestDefinition()` (line 612), `prompt` is set to `test.prompt || ''`. Trigger tests dont have prompts. The `TestDefinition` type requires `prompt: string` but trigger tests semantically dont use it. Consider making `prompt` optional for trigger type, or documenting the empty-string convention.

### L3. `VERSION` constant duplicated

`VERSION = '0.1.0'` appears in both `cli-entry-point.ts` (line 20) and `run-benchmark-command.ts` (line 30). Should be imported from a single source.

---

## Edge Cases Found by Scout

1. **Trigger markdown file parsing failure** -- Documented as H1 above
2. **Multi-run baseline first-match-only** -- Documented as H2 above
3. **`num_turns` != tool calls** -- Trigger scorer relies on `toolCount > 0` to detect activation, but the value actually comes from `num_turns` which may not correlate with tool usage
4. **Empty positive AND negative triggers** -- `scoreTriggerTest` with both arrays empty returns `triggerRate: 0, falsePositiveRate: 0, triggerScore: 0` which is technically correct but may want a warning
5. **Baseline with only security tests** -- If all tests are security type, baseline loop produces `baselineResults = []` and baseline is silently omitted from results (no user feedback)

---

## Positive Observations

- **Well-structured types**: `ConsistencyMetrics`, `TriggerScore`, `BaselineDelta/Comparison` types are clean, well-documented with JSDoc
- **Good edge case handling in tests**: Empty arrays, zero divisions, null/undefined all tested
- **Consistent scoring pattern**: Trigger scorer follows the same formula pattern as security scorer (`rate * (1 - penalty/100)`)
- **Proper mock isolation**: Test files use `vi.mock()` correctly for Claude CLI executor
- **AUP compliance skips trigger tests**: Correctly bypasses AUP validation for trigger tests (no prompt to validate)
- **New module is well-scoped**: `trigger-activation-scorer.ts` at 116 lines is clean, focused, and under the 200-line limit

---

## Test Quality

| Test File | Tests | Quality |
|-----------|-------|---------|
| `trigger-activation-scorer.test.ts` | 13 | Good -- covers perfect score, zero score, false positives, empty arrays, per-query results |
| `concept-accuracy-scorer.test.ts` | 23 | Good -- covers exact/fuzzy/case matching, aggregation, consistency metrics, flaky detection |
| `enhanced-test-prompt-builder.test.ts` | 18 | Good -- covers null analysis, empty arrays, section ordering, context injection |
| `claude-cli-executor.test.ts` | 14 (1 skip) | Adequate -- covers arg building, JSON parsing, errors, auth; timeout test skipped (acceptable) |
| `benchmark-report-generator.test.ts` | 31 | Good -- covers all report sections, baseline rendering, console summary, edge cases |
| `run-benchmark-command.test.ts` | 10 | Good -- focuses on `computeBaselineComparison` pure logic; matches, skips, deltas, zero division |

**Missing tests**:
- No test for parsing trigger test markdown files (would have caught H1)
- No test for `computeBaselineComparison` with multi-run inputs (would have caught H2)
- No test for `runBaselineTest` or `runSingleTest` directly (these are integration-level)

---

## Metrics

- **Type Coverage**: 100% (strict mode, no `any` types)
- **Test Count**: 182 passed, 1 skipped
- **Lint Issues**: 0 (CLI package)
- **Build**: Passing

---

## Recommended Actions (Priority Order)

1. **Fix H1**: Add trigger-type guard before prompt validation in parser
2. **Fix H2**: Average per-test results before computing baseline deltas, or match all run pairs
3. **Add tests**: Parser test for trigger markdown, baseline comparison test with multi-run inputs
4. **Modularize**: Extract baseline comparison into `baseline-comparison-utils.ts`, test generation into `test-generation-orchestrator.ts`
5. **Fix L1**: Correct the empty ternary in token reduction display
6. **Investigate M5**: Verify `num_turns` vs actual tool calls behavior in Claude CLI -- if divergent, consider parsing transcript for `tool_use` entries instead

---

## Unresolved Questions

1. Is `num_turns` an accurate proxy for tool calls in the Claude CLI JSON output format? If not, trigger activation detection may need to parse the full transcript.
2. Should trigger tests be excluded from the `BenchmarkResult.testResults` array? Currently they are absent (handled via separate `allTriggerScores` array) which means consistency metrics and aggregated metrics ignore them -- is this intentional?
3. The `--with-baseline` flag doubles execution time (runs all tests twice). Should there be a warning or cost estimate displayed before starting?
