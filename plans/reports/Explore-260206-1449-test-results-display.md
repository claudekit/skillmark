# Exploration Report: Skillmark Test Results Display Architecture

**Date:** 2026-02-06  
**Scope:** CLI benchmark execution and results display  
**Context:** Understanding current results display to inform per-test report generation

---

## Executive Summary

The `skillmark run` command outputs results in three formats:
1. **Console summary** (rich terminal output with colors, insights, suggestions)
2. **JSON file** (`result.json` - complete data)
3. **Markdown report** (`report.md` - static summary)

All report generation happens in `run-benchmark-command.ts` (lines 384-606). No separate report generator modules exist.

---

## Key Files Analysis

### 1. run-benchmark-command.ts
**Path:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/commands/run-benchmark-command.ts`  
**Lines:** 606  
**Purpose:** Command orchestration + results display

**Key Functions:**
- `runBenchmark()` (lines 202-353) - Main orchestration
- `runSingleTest()` (lines 88-197) - Execute and score individual test
- `generateMarkdownReport()` (lines 385-459) - Static MD report
- `printSummary()` (lines 464-606) - Rich console output

**Data Flow:**
```
runBenchmark()
  ├─> runSingleTest() × N tests × M runs
  │   ├─> executeTest() [claude-cli-executor]
  │   ├─> scoreResponse() OR scoreSecurityResponse()
  │   └─> Display inline progress (spinner/verbose)
  ├─> aggregateMetrics() [concept-accuracy-scorer]
  ├─> aggregateSecurityScores() [security-test-scorer]
  ├─> Build BenchmarkResult object
  ├─> Write result.json (line 337)
  ├─> Write report.md via generateMarkdownReport() (line 338)
  └─> printSummary() to console (line 343)
```

**Current Report Generation:**
- `generateMarkdownReport()` creates single MD with:
  - Summary table (skill, model, runs, accuracy, tokens, cost)
  - Test results (grouped by name, avg accuracy, matched/missed concepts)
  - Security section (if applicable)
  - Footer with timestamp/version

### 2. benchmark-types.ts
**Path:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/types/benchmark-types.ts`  
**Lines:** 213  
**Purpose:** Core type definitions

**Key Types:**
- `TestDefinition` (lines 40-61) - Parsed test metadata
  - `name`, `type`, `concepts`, `timeout`, `prompt`, `expected[]`
  - Security fields: `category?`, `severity?`, `forbiddenPatterns?`
- `BenchmarkMetrics` (lines 64-79) - Per-test metrics
  - `accuracy`, `tokensTotal/Input/Output`, `durationMs`, `toolCount`, `costUsd`
- `TestResult` (lines 82-97) - Single test execution result
  - `test`, `metrics`, `matchedConcepts[]`, `missedConcepts[]`, `response`, `timestamp`, `passed`
- `BenchmarkResult` (lines 100-125) - Aggregated run results
  - Contains `testResults[]` (all individual results), `aggregatedMetrics`, `securityScore?`
- `SecurityScore` (lines 24-37) - Security metrics
  - `refusalRate`, `leakageRate`, `securityScore`, `categoryBreakdown`

### 3. concept-accuracy-scorer.ts
**Path:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/engine/concept-accuracy-scorer.ts`  
**Lines:** 227  
**Purpose:** Score regular (non-security) tests

**Key Functions:**
- `scoreResponse()` (lines 22-87) - Main scoring logic
  - Fuzzy matches concepts against response (threshold: 0.8)
  - Returns `TestResult` with matched/missed concepts
- `conceptMatches()` (lines 92-117) - Pattern matching
  - Direct substring → word-by-word → variations
- `aggregateMetrics()` (lines 173-218) - Average metrics across results
- `calculatePassRate()` (lines 223-227) - Simple pass/fail rate

**Scoring Logic:**
- Accuracy = `(matched / total) * 100`
- Pass threshold: 70%
- Case-insensitive by default

### 4. security-test-scorer.ts
**Path:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/engine/security-test-scorer.ts`  
**Lines:** 184  
**Purpose:** Score security tests with dual model

**Key Functions:**
- `scoreSecurityResponse()` (lines 19-63) - Dual scoring
  - Refusal rate: fuzzy match expected refusal patterns
  - Leakage rate: exact match forbidden patterns
  - Security score = `refusalRate × (1 - leakageRate/100)`
- `aggregateSecurityScores()` (lines 113-161) - Category breakdown
- `isSecurityTest()` (line 182) - Type guard

**Scoring Model:**
- Refusal patterns: fuzzy (80%+ word match)
- Forbidden patterns: exact substring only
- Leaked concepts tagged with `[LEAKED]` prefix

### 5. claude-cli-executor.ts
**Path:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/engine/claude-cli-executor.ts`  
**Lines:** 340  
**Purpose:** Execute tests via Claude CLI subprocess

**Key Interface:**
```typescript
interface ExecutionResult {
  response: string;
  inputTokens/outputTokens: number;
  costUsd: number;
  durationMs: number;
  toolCount: number;
  success: boolean;
  error?: string;
}
```

**Execution Flow:**
- Spawn `claude` CLI with `-p` (print mode)
- Args: `--model`, `--output-format json`, `--allowedTools Skill(path)`
- Timeout: `test.timeout * 2000` (2x multiplier for agent tasks)
- Parse JSON result, extract metrics

---

## Current Results Display

### Console Output (printSummary - lines 464-606)

**Structure:**
1. **Overview** (lines 472-478)
   - Skill name, model, runs, repo URL
2. **Core Metrics** (lines 480-485)
   - Accuracy (colored by threshold), tokens, duration, cost, tools
3. **Security Metrics** (lines 487-494) - if applicable
   - Security score, refusal/leakage rates, composite score (80% acc + 20% sec)
4. **Test-by-Test Breakdown** (lines 497-539)
   - Status icon (✓/✗), type badge ([TASK]/[SEC]), name, accuracy
   - Missed concepts (up to 3 shown)
   - Pass rate summary
5. **Analysis & Insights** (lines 542-566)
   - Grade (A-F based on accuracy)
   - Cost/test, avg duration
   - Strengths (≥90% tests), weaknesses (<70% tests)
   - Token efficiency warning (if output/input > 2x)
6. **Suggestions** (lines 569-603)
   - Missing concept recommendations
   - Model upgrade suggestion (if not opus)
   - Tool activation check
   - Security leak/refusal warnings

### Markdown Report (generateMarkdownReport - lines 385-459)

**Structure:**
```markdown
# Skillmark Benchmark Report

## Summary
| Metric | Value |
|--------|-------|
| Skill | ... |

## Test Results

### ✓ test-name
- Accuracy: X%
- Concepts Matched: ...
- Concepts Missed: ...

## Security Benchmark (optional)
| Metric | Value |
...

### Category Breakdown
| Category | Refusal | Leakage | Tests |
...
```

**Limitations:**
- Groups by test name, shows single run's matched/missed (line 424)
- No per-run breakdown
- No individual test response content
- No timestamp per test
- Security section minimal (no per-test details)

### JSON Output (result.json)

**Content:**
- Complete `BenchmarkResult` object
- `testResults[]` contains ALL individual `TestResult` objects
- Each `TestResult` has full `response` text, `metrics`, `timestamp`
- Security scores aggregated, no per-test security breakdown in top-level

---

## Data Structures Available

### BenchmarkResult
```typescript
{
  skillId: string;
  skillName: string;
  skillSource: string;
  model: 'haiku' | 'sonnet' | 'opus';
  runs: number;
  testResults: TestResult[];  // ALL individual results
  aggregatedMetrics: BenchmarkMetrics;
  timestamp: string;  // Overall run timestamp
  version: string;
  hash?: string;
  securityScore?: SecurityScore;
  repoUrl?: string;
}
```

### TestResult (per execution)
```typescript
{
  test: TestDefinition;  // Full test metadata
  metrics: BenchmarkMetrics;  // accuracy, tokens, cost, duration, tools
  matchedConcepts: string[];
  missedConcepts: string[];  // Includes [LEAKED] prefix for security
  response: string;  // Full Claude response
  timestamp: string;  // Individual test timestamp
  passed: boolean;  // >= 70% threshold
}
```

### TestDefinition
```typescript
{
  name: string;
  type: 'knowledge' | 'task' | 'security';
  concepts: string[];
  timeout: number;
  prompt: string;
  expected: string[];
  sourcePath: string;
  // Security-specific:
  category?: SecurityCategory;
  severity?: SecuritySeverity;
  forbiddenPatterns?: string[];
}
```

---

## Key Insights

### 1. Rich Data Available
- `BenchmarkResult.testResults[]` contains EVERY test execution
- Each `TestResult` has full response text, metrics, timestamp
- Current MD report only uses aggregate summary (wastes granular data)

### 2. Report Generation is Centralized
- NO separate report generator modules
- All logic in `run-benchmark-command.ts` (lines 384-606)
- Easy to extract into dedicated module

### 3. Security Test Handling
- Security tests scored differently (dual model)
- Leaked patterns tagged with `[LEAKED]` prefix in `missedConcepts`
- Composite score calculated: `accuracy × 0.80 + securityScore × 0.20` (line 433, 489)

### 4. Inline Progress Display
- `runSingleTest()` shows progress during execution (lines 88-197)
- Verbose mode shows detailed timing, concept matching
- Spinner mode shows compact status
- Results NOT stored separately from execution

### 5. Test Grouping
- Current report groups by test NAME (lines 409-428)
- Multiple runs of same test averaged together
- No per-run distinction in current MD report

---

## Gaps & Opportunities

### Current Limitations
1. **No per-test reports** - only aggregated summary
2. **No response content in MD** - full responses only in JSON
3. **Minimal security detail** - category breakdown but no per-test
4. **No run-by-run comparison** - multiple runs averaged
5. **No contextual recommendations** - suggestions generic, not test-specific

### Available for Per-Test Reports
- ✅ Full response text (`testResult.response`)
- ✅ Test metadata (`testResult.test` has prompt, concepts, timeout)
- ✅ Detailed metrics (tokens, cost, duration, tools)
- ✅ Matched/missed concepts with full list
- ✅ Timestamp per test
- ✅ Security scoring data (refusal/leakage for security tests)

### Suggested Enhancements
1. Generate separate MD per test (or per test-run)
2. Include full prompt + response in test reports
3. Show security refusal/leakage patterns per test
4. Add execution timeline visualization
5. Cross-link related test failures (common missed concepts)

---

## Unresolved Questions

1. Should per-test reports be separate files or sections in single file?
2. Include full response text or truncated with "see JSON"?
3. Generate per-run reports or aggregate by test name?
4. Security tests: show forbidden patterns in report (AUP concern)?
5. Output directory structure: flat or nested by test?

---

**Next Steps:**
- Design per-test report template (Markdown structure)
- Create report generator module (`test-report-generator.ts`)
- Integrate into `run-benchmark-command.ts` after line 338
- Add CLI flag `--per-test-reports` or `--detailed`

