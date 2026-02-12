# Brainstorm: Skill Test Improvements from Anthropic Guide

## Problem Statement

Skillmark CLI benchmarks skills with 3 test types (`knowledge`, `task`, `security`) but Anthropic's official guide recommends 3 testing categories that map differently: **triggering tests**, **functional tests**, **performance comparison**. Current gaps: no trigger testing, no baseline comparison, no consistency/variance scoring, and several untested modules.

## Source

Analysis of `docs/complete-guide-to-building-skills-for-claude.md` (Anthropic's official guide) vs current test suite.

---

## Improvement 1: New `trigger` Test Type

### What the Guide Says
> Test that skills load on relevant queries and DON'T load on irrelevant ones. Test paraphrased requests too.

### Approach: Real Claude CLI Invocations

**New test type in `benchmark-types.ts`:**
```typescript
type: 'knowledge' | 'task' | 'security' | 'trigger'
```

**Test definition format:**
```yaml
---
name: trigger-project-setup
type: trigger
concepts: [activates-on-relevant, ignores-irrelevant]
timeout: 30
---

# Positive Triggers
- "Help me set up a new workspace"
- "I need to create a project"
- "Initialize a project for Q4 planning"

# Negative Triggers
- "What's the weather today?"
- "Help me write Python code"
- "Create a spreadsheet"
```

**Execution:** For each query, invoke Claude CLI with the skill enabled. Check if response references the skill's domain or uses skill-specific tools.

**Scoring:**
- `triggerRate`: % positive queries that activated the skill
- `falsePositiveRate`: % negative queries that incorrectly activated
- `triggerScore`: `triggerRate × (1 - falsePositiveRate / 100)`

**Key files to modify:**
- `benchmark-types.ts` — add `trigger` to TestDefinition type union, add TriggerScore interface
- `markdown-test-definition-parser.ts` — parse `# Positive Triggers` and `# Negative Triggers` sections
- New scorer: `trigger-activation-scorer.ts` — analyze Claude response for skill activation signals
- `run-benchmark-command.ts` — route trigger tests to new scorer
- `enhanced-test-prompt-builder.ts` — generate trigger tests from SKILL.md description field

**Risks:**
- Detecting "did the skill activate?" from response text is heuristic. Could check tool call logs or look for skill-specific patterns.
- Each trigger query = 1 Claude CLI invocation. 6 queries × 3 runs = 18 invocations per trigger test. Keep query count low.

**Mitigation:** Use haiku model for trigger tests (fast/cheap). Parse `toolCount` from execution result — if skill tools were called, it triggered.

---

## Improvement 2: Performance Baseline Comparison

### What the Guide Says
> Compare same task with and without the skill. Count tool calls, tokens consumed, back-and-forth messages.

### Approach: Same Prompt, No Skill Flag

**New CLI flag:** `--with-baseline` on `skillmark run`

**Execution flow:**
1. Run each test normally (with skill via `--allowedTools "Skill(/path)"`)
2. Run same prompt again WITHOUT the skill flag
3. Compare metrics side-by-side

**New types in `benchmark-types.ts`:**
```typescript
interface BaselineComparison {
  withSkill: BenchmarkMetrics;
  withoutSkill: BenchmarkMetrics;
  improvement: {
    accuracyDelta: number;      // positive = skill helped
    tokenReduction: number;     // % fewer tokens
    toolCountDelta: number;     // fewer tool calls
    costDelta: number;          // $ saved
    durationDelta: number;      // ms faster
  };
}
```

**Report output addition:**
```
## Baseline Comparison
| Metric        | With Skill | Without Skill | Delta    |
|---------------|-----------|---------------|----------|
| Accuracy      | 92%       | 61%           | +31%     |
| Tokens        | 4,200     | 11,800        | -64%     |
| Tool Calls    | 3         | 12            | -75%     |
| Cost          | $0.08     | $0.22         | -64%     |
```

**Key files to modify:**
- `benchmark-types.ts` — add BaselineComparison, add `withBaseline` to RunOptions
- `cli-entry-point.ts` — add `--with-baseline` flag
- `run-benchmark-command.ts` — orchestrate dual execution loop
- `claude-cli-executor.ts` — support execution without skill flag (already possible, just omit `--allowedTools`)

**Risks:**
- Doubles execution time and cost when baseline enabled
- Without skill, Claude may not understand the task at all → accuracy could be 0%, making comparison trivial

**Mitigation:** Baseline is opt-in flag. Skip baseline for security tests (not meaningful without skill context).

---

## Improvement 3: Consistency/Variance Scoring

### What the Guide Says
> Run same request 3-5 times. Compare outputs for structural consistency and quality.

### Approach: Add Variance Metrics to Existing Multi-Run Aggregation

Currently, Skillmark averages metrics across runs. It should also compute **variance** to detect flaky skills.

**New metrics in `benchmark-types.ts`:**
```typescript
interface ConsistencyMetrics {
  accuracyStdDev: number;       // Standard deviation across runs
  accuracyRange: number;        // max - min accuracy
  consistencyScore: number;     // 100 - (stdDev * penalty)
  conceptOverlap: number;       // % concepts matched in ALL runs vs ANY run
  flakyTests: string[];         // Test names with >20% accuracy variance
}
```

**Scoring logic:**
- `consistencyScore = Math.max(0, 100 - accuracyStdDev * 3)` — penalize high variance
- `conceptOverlap`: If run1 matches concepts [A,B,C], run2 matches [A,B,D], overlap = 66% (2 of 3 unique)
- Flag test as "flaky" if accuracy range > 20 points across runs

**Report output addition:**
```
## Consistency Analysis
- Accuracy std dev: 4.2 (Good: <10)
- Concept overlap: 88% (Good: >80%)
- Flaky tests: none
- Consistency score: 87/100
```

**Key files to modify:**
- `benchmark-types.ts` — add ConsistencyMetrics
- `concept-accuracy-scorer.ts` — return per-concept match list (not just count) for overlap calc
- `run-benchmark-command.ts` — compute variance after all runs, include in report
- No new dependencies needed — just `Math.sqrt()` for std dev

**Risks:** Low. This is purely additive analysis on existing data. No new CLI invocations.

---

## Improvement 4: Unit Test Coverage Gaps

### Missing Tests (Prioritized)

| File | Lines | Priority | Why |
|------|-------|----------|-----|
| `enhanced-test-prompt-builder.ts` | ~150 | **High** | Core test gen logic, untested |
| `run-benchmark-command.ts` | ~400 | **Medium** | Orchestration, hard to unit test (needs mocking) |
| `claude-cli-executor.ts` | ~200 | **Medium** | Subprocess spawning, needs integration test strategy |
| `unified-skill-source-resolver.ts` (git URLs) | ~50 | **Low** | Edge cases in URL detection |
| `publish-results-command.ts` | ~100 | **Low** | API client, mock HTTP |

### Approach

**enhanced-test-prompt-builder.test.ts:**
- Test prompt assembly with/without skill analysis context
- Test model selection routing
- Test prompt context injection
- Mock: skill analysis response only

**run-benchmark-command.test.ts:**
- Test metric aggregation logic (extract to pure function first)
- Test report markdown generation
- Test scoring routing by test type
- Mock: executor results

**claude-cli-executor.test.ts:**
- Test command-line argument construction
- Test JSON output parsing
- Test timeout handling
- Test auth token resolution
- Mock: `child_process.spawn`

---

## Recommended Implementation Order

1. **Consistency scoring** (lowest effort, immediate value, no new CLI invocations)
2. **Unit test coverage** (fills gaps, improves confidence for subsequent changes)
3. **Trigger test type** (new capability, moderate effort)
4. **Performance baseline** (highest effort, doubles cost, most impactful for skill marketing)

## Success Criteria

- All 4 features pass `pnpm test`
- Trigger tests generate from SKILL.md description automatically
- Consistency score appears in benchmark report
- Baseline comparison opt-in with `--with-baseline`
- Unit test coverage increases by ~15-20%

## Unresolved Questions

1. **Trigger detection signal**: Tool call count > 0? Skill-specific keywords in response? Or parse Claude's internal "skill activated" metadata?
2. **Baseline fairness**: Without the skill, Claude has no domain context. Is 0% accuracy baseline meaningful or noise?
3. **Consistency threshold**: What stdDev value = "flaky"? Need empirical data from real benchmarks to calibrate.
4. **Composite score update**: Should trigger and consistency scores factor into the composite formula? Current: `accuracy × 0.80 + security × 0.20`
