# Skillmark Test Definition Architecture Exploration

**Date:** 2026-02-06  
**Focus:** Test definition markdown structure, test file references in results, and test file serving capability

---

## 1. Test Definition Structure

### 1.1 TestDefinition Type
**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/types/benchmark-types.ts` (lines 40-61)

```typescript
export interface TestDefinition {
  name: string;                           // Unique test identifier
  type: 'knowledge' | 'task' | 'security'; // Test category
  concepts: string[];                    // Concepts to check in response
  timeout: number;                       // Timeout in seconds
  prompt: string;                        // The prompt to send to Claude
  expected: string[];                    // Expected response patterns/criteria
  sourcePath: string;                    // *** SOURCE FILE PATH ***
  category?: SecurityCategory;           // Security test category (security type only)
  severity?: SecuritySeverity;           // Security test severity (security type only)
  forbiddenPatterns?: string[];          // Patterns that must NOT appear (security only)
}
```

**Key Finding:** `sourcePath` stores the absolute file path to the test markdown file.

---

## 2. Markdown Test File Format

### 2.1 Parsing & Structure
**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/engine/markdown-test-definition-parser.ts`

Test files use YAML frontmatter + markdown sections:

```markdown
---
name: test-name
type: knowledge | task | security
concepts:
  - concept1
  - concept2
timeout: 600
category: prompt-injection  # Security tests only
severity: critical          # Security tests only
---

# Prompt
Test question/task here

# Expected
- [ ] Concept 1
- [ ] Concept 2

# Expected Refusal   # For security tests only
- Expected refusal pattern

# Forbidden Patterns # For security tests only
- Pattern that must NOT appear
```

### 2.2 Parsing Functions
- `parseTestFile(filePath)` (line 55): Reads file from disk and parses
- `parseTestContent(content, sourcePath)` (line 63): Parses string content with optional path
- `loadTestsFromDirectory(dirPath)` (line 213): Loads all `.md` files from directory
- `discoverTests(skillPath, generateOptions)` (line 242): Auto-discovers tests in skill directory

---

## 3. How Test Results Reference Test Files

### 3.1 TestResult Type
**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/types/benchmark-types.ts` (lines 82-97)

```typescript
export interface TestResult {
  test: TestDefinition;                 // *** FULL TEST DEFINITION ***
  metrics: BenchmarkMetrics;
  matchedConcepts: string[];
  missedConcepts: string[];
  response: string;
  timestamp: string;
  passed: boolean;
}
```

**Key Finding:** TestResult stores the entire TestDefinition object, including `sourcePath`.

### 3.2 BenchmarkResult Type
**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/types/benchmark-types.ts` (lines 100-125)

```typescript
export interface BenchmarkResult {
  skillId: string;
  skillName: string;
  skillSource: string;
  model: 'haiku' | 'sonnet' | 'opus';
  runs: number;
  testResults: TestResult[];            // *** CONTAINS TEST DEFINITIONS WITH PATHS ***
  aggregatedMetrics: BenchmarkMetrics;
  timestamp: string;
  version: string;
  hash?: string;
  securityScore?: SecurityScore;
  repoUrl?: string;
}
```

**Data Flow:** BenchmarkResult → testResults[] → TestDefinition → sourcePath

---

## 4. Test File Storage & Retrieval

### 4.1 Local Execution Flow
**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/commands/run-benchmark-command.ts`

1. Tests are loaded from local filesystem (lines 238-267)
2. Each test's `sourcePath` is set when parsing (absolute file path)
3. Results are written to JSON: `result.json` and `report.md`
4. Test file content is NOT stored in result JSON by default

### 4.2 Test File Upload on Publish
**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/cli/src/commands/publish-results-command.ts` (lines 168-186)

```typescript
async function extractTestFilesFromResult(result: BenchmarkResult): Promise<TestFileUpload[]> {
  const files: TestFileUpload[] = [];
  const seen = new Set<string>();

  for (const tr of result.testResults) {
    const sourcePath = tr.test.sourcePath;  // *** READS FROM TESULT ***
    if (!sourcePath || seen.has(sourcePath)) continue;
    seen.add(sourcePath);

    try {
      const content = await readFile(sourcePath, 'utf-8');  // *** READS FILE FROM DISK ***
      files.push({ name: basename(sourcePath), content });
    } catch {
      // File may not exist (result from different machine) — skip
    }
  }

  return files;
}
```

**Key Finding:** When publishing results, the CLI:
1. Extracts `sourcePath` from each TestDefinition in result
2. Reads the markdown file content from disk
3. Uploads test files as JSON array to API

---

## 5. API Test File Storage & Serving

### 5.1 Database Schema
**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/webapp/src/db/migrations/001-add-github-oauth-and-user-session-tables.sql` (line 11)

```sql
ALTER TABLE results ADD COLUMN test_files TEXT;  -- JSON array of test file contents
```

**Storage:** Test files stored as JSON string in `results.test_files` column.

### 5.2 API Submission Structure
**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/webapp/src/routes/api-endpoints-handler.ts` (lines 12-38)

```typescript
interface ResultPayload {
  skillId: string;
  skillName: string;
  source: string;
  model: string;
  accuracy: number;
  tokensTotal: number;
  // ... other fields ...
  rawJson?: string;                    // Full BenchmarkResult JSON
  testFiles?: Array<{ name: string; content: string }>;  // *** TEST FILE CONTENTS ***
  skillshLink?: string;
  securityScore?: number;
  securityJson?: string;
  repoUrl?: string;
}
```

### 5.3 Result Insertion (POST /api/results)
**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/webapp/src/routes/api-endpoints-handler.ts` (lines 86-113)

```typescript
await c.env.DB.prepare(`
  INSERT INTO results (
    id, skill_id, model, accuracy, tokens_total, tokens_input, tokens_output,
    duration_ms, cost_usd, tool_count, runs, hash, raw_json,
    submitter_github, test_files, skillsh_link,
    security_score, security_json, repo_url
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).bind(
  resultId,
  payload.skillId,
  payload.model,
  // ... other values ...
  payload.testFiles ? JSON.stringify(payload.testFiles) : null,  // *** STORED AS JSON ***
  // ...
).run();
```

---

## 6. Test File Serving Endpoints

### 6.1 GET /api/result/:id - Full Result Details
**File:** `/Users/duynguyen/www/claudekit/skillmark/packages/webapp/src/routes/api-endpoints-handler.ts` (lines 254-271)

```typescript
apiRouter.get('/result/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB.prepare(`
      SELECT raw_json FROM results WHERE id = ?
    `).bind(id).first();

    if (!result?.raw_json) {
      return c.json({ error: 'Result not found or no detailed data available' }, 404);
    }

    return c.json(JSON.parse(result.raw_json as string));
  } catch (error) {
    console.error('Error fetching result detail:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
```

**Returns:** Full BenchmarkResult including:
- All TestResult objects (with TestDefinition + sourcePath)
- Full response texts
- Metrics

**NOTE:** Does NOT directly return test_files column. Would need new endpoint.

### 6.2 Endpoint Opportunity: GET /api/result/:id/tests
**MISSING:** No dedicated endpoint to serve test_files directly.

Could be implemented as:
```typescript
apiRouter.get('/result/:id/tests', async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT test_files FROM results WHERE id = ?
  `).bind(id).first();
  
  if (!result?.test_files) {
    return c.json({ error: 'No test files available' }, 404);
  }
  
  return c.json(JSON.parse(result.test_files as string));
});
```

---

## 7. Key Data Structures Summary

### 7.1 File Path References
| Component | Where Stored | Type | Access |
|-----------|--------------|------|--------|
| Test markdown path | TestDefinition.sourcePath | string (absolute path) | Local execution |
| Test file contents | results.test_files (DB) | JSON array | API: GET /api/result/:id (via raw_json) |
| Full benchmark result | results.raw_json (DB) | JSON string | API: GET /api/result/:id |

### 7.2 Test Content Retrieval Methods

**Local (CLI):**
- Read directly from `sourcePath` (filesystem)
- Used during benchmark execution

**Remote (API):**
- Via `/api/result/:id` → parse `raw_json` → `testResults[].test.sourcePath` (paths only, not content)
- Via `/api/result/:id` → NOT stored separately, but embedded in raw_json
- `test_files` column stores actual file contents if uploaded

---

## 8. Type Hierarchy

```
BenchmarkResult (result.json)
├── testResults: TestResult[]
│   ├── test: TestDefinition
│   │   └── sourcePath: string    ← Reference to markdown file
│   ├── metrics: BenchmarkMetrics
│   ├── response: string
│   └── ...
└── aggregatedMetrics: BenchmarkMetrics

results table (Database)
├── raw_json: TEXT             ← Serialized BenchmarkResult
├── test_files: TEXT           ← JSON: [{name, content}, ...]
├── skillsh_link: TEXT
├── security_json: TEXT
└── ...
```

---

## 9. Current Implementation Status

✓ **Implemented:**
- Test definition parsing from markdown
- sourcePath stored in TestDefinition
- Test file extraction on publish (reads from disk by path)
- Test files uploaded to API and stored in DB
- GET /api/result/:id returns full result with all test data

⚠️ **Partial/Missing:**
- No dedicated endpoint for test_files retrieval
- Test file content requires parsing raw_json
- sourcePath useful for local execution but less useful from remote API (file may not exist on client)

---

## 10. Usage Patterns

### Pattern 1: Local Benchmark Execution
```
1. discoverTests() → Load TestDefinition[] from skill directory
2. executeTest() → Use prompt from TestDefinition
3. Results written with full TestDefinition (including sourcePath)
4. publishResults() → Read test files by sourcePath, upload content
```

### Pattern 2: Remote Result Retrieval
```
1. GET /api/result/{resultId}
2. Parse raw_json → BenchmarkResult
3. Access testResults[].test → Full TestDefinition with sourcePath
4. sourcePath available but files may not exist remotely
```

### Pattern 3: Test File Serving (Current Implementation)
```
1. Test files uploaded as part of results publishing
2. Stored in results.test_files as JSON
3. Can be accessed via GET /api/result/:id → raw_json → no direct test_files field exposure
```

---

## File Locations

| File | Purpose |
|------|---------|
| `/packages/cli/src/types/benchmark-types.ts` | Type definitions (TestDefinition, TestResult, BenchmarkResult) |
| `/packages/cli/src/engine/markdown-test-definition-parser.ts` | Test file parsing & loading |
| `/packages/cli/src/commands/run-benchmark-command.ts` | Benchmark execution & result generation |
| `/packages/cli/src/commands/publish-results-command.ts` | Result publishing & test file extraction |
| `/packages/webapp/src/routes/api-endpoints-handler.ts` | API endpoints |
| `/packages/webapp/src/db/d1-database-schema.sql` | Database schema |
| `/packages/webapp/src/db/migrations/001-add-github-oauth-and-user-session-tables.sql` | test_files column definition |

---

## Unresolved Questions

1. **Test File Serving:** Is there a need for a dedicated `/api/result/:id/tests` endpoint, or should test retrieval always go through `/api/result/:id` and parse raw_json?

2. **File Path Utility:** When retrieving results via API, is the `sourcePath` field in TestDefinition useful? It's absolute local path that won't exist on remote clients.

3. **Test File Updates:** If test markdown files are updated after benchmark execution, how should the system handle this? (Store by hash vs. by path)

4. **Security Considerations:** Should test file content be sensitive? Are there cases where tests should be private vs. public?

5. **Archive Strategy:** For very old results, should test_files be archived separately, or kept in database indefinitely?

