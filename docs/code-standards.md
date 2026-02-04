# Skillmark - Code Standards & Conventions

## TypeScript Configuration

**Target:** ES2020 (Node.js 18+)
**Module System:** ESM (import/export)
**Strict Mode:** Enabled

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "declaration": true,
    "sourceMap": true
  }
}
```

## File Naming Conventions

### TypeScript/JavaScript Files
- **kebab-case** with descriptive, self-documenting names
- Long names OK if they clarify purpose
- Pattern: `{module}-{component}-{purpose}.ts`

**Examples:**
- `markdown-test-definition-parser.ts` ✓
- `concept-accuracy-scorer.ts` ✓
- `enhanced-test-prompt-builder.ts` ✓
- `github-oauth-authentication-handler.ts` ✓
- `retry-with-degrade-utils.ts` ✓

**Anti-patterns:**
- `parser.ts` ✗ (too generic)
- `TestParser.ts` ✗ (use camelCase in file name, not PascalCase)
- `test_parser.ts` ✗ (snake_case discouraged)

### Directories
- **kebab-case** for directories
- Plural nouns for collections: `commands/`, `sources/`, `types/`
- Singular for specialized: `config/`, `engine/`

**Structure:**
```
src/
├── commands/           # CLI command implementations
├── engine/            # Core benchmarking logic
├── sources/           # Skill source handlers
├── config/            # Configuration utilities
└── types/             # TypeScript type definitions
```

## Code Organization

### Module Structure

Each file should export:
1. **Named exports** for functions/classes
2. **Interface/type definitions** at top
3. **Implementation** in middle
4. **Error handling** integrated throughout

**Template:**
```typescript
/**
 * Module purpose - one line summary
 */

/** Type/interface definitions */
export interface SomeType {
  field: string;
}

/**
 * Function description
 * @param input - parameter description
 * @returns what it returns
 */
export async function someFunction(input: SomeType): Promise<string> {
  // implementation
}

/**
 * Helper function
 */
function helperFunction(): void {
  // implementation
}
```

### Import Organization

Order: 1) Node built-ins, 2) External packages, 3) Internal modules

```typescript
// Node built-ins
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

// External packages
import chalk from 'chalk';
import ora from 'ora';
import type { Command } from 'commander';

// Internal modules
import type { BenchmarkResult, TestDefinition } from '../types/index.js';
import { resolveSkillSource } from '../sources/unified-skill-source-resolver.js';
```

### Type Imports
Use `import type` for TypeScript-only imports:
```typescript
import type { BenchmarkMetrics } from '../types/benchmark-types.js';
```

## Naming Conventions

### Variables & Functions
- **camelCase** for variables and functions
- **UPPER_SNAKE_CASE** for constants
- **PascalCase** for classes and interfaces

**Examples:**
```typescript
// Variables
const testDirectory = './tests';
let runCount = 0;

// Functions
async function loadTestDefinitions(path: string): Promise<TestDefinition[]> {
  // ...
}

// Constants
const DEFAULT_MODEL = 'opus';
const ACCURACY_THRESHOLD = 0.7;
const VERSION = '0.1.0';

// Interfaces
interface TestDefinition { ... }
class BenchmarkExecutor { ... }
```

### Boolean Naming
Prefix with `is`, `has`, `should`, `can`:
```typescript
const isVerbose = options.verbose ?? false;
const hasTests = tests.length > 0;
const shouldRetry = error.retryable;
const canExecute = permission.execute;
```

### Private Members
Use TypeScript `private` keyword (no `_` prefix):
```typescript
class TestRunner {
  private testCache: Map<string, TestDefinition> = new Map();

  private async loadFromCache(key: string): Promise<TestDefinition> {
    // ...
  }
}
```

## Commenting Standards

### JSDoc Comments
Required for:
- Exported functions/classes
- Complex logic (>5 lines)
- Non-obvious parameters

**Format:**
```typescript
/**
 * Load test definitions from a directory
 * Recursively scans for *.md files and parses YAML frontmatter
 *
 * @param dirPath - Directory containing markdown test files
 * @returns Array of parsed test definitions
 * @throws Error if directory doesn't exist or parsing fails
 */
export async function loadTestsFromDirectory(dirPath: string): Promise<TestDefinition[]> {
  // implementation
}
```

### Inline Comments
Use for "why", not "what":
```typescript
// Good: explains the reasoning
const accuracy = (matchedConcepts / totalConcepts) * 100;
// Threshold of 70% matches average skill assessment standards

// Bad: obvious from code
const accuracy = (matchedConcepts / totalConcepts) * 100; // multiply by 100
```

### Section Comments
Separate logical sections in longer functions:
```typescript
export async function runBenchmark(skill: SkillSource, options: RunOptions): Promise<BenchmarkResult> {
  // ─── Validation ─────────────────────────
  if (!options.tests && !options.output) {
    throw new Error('Missing required options');
  }

  // ─── Test Loading ───────────────────────
  const tests = await loadTestsFromDirectory(options.tests);

  // ─── Execution Loop ─────────────────────
  for (const test of tests) {
    // ...
  }
}
```

## Error Handling

### Error Types
Create domain-specific error classes:
```typescript
export class TestDefinitionError extends Error {
  constructor(message: string, public filePath: string) {
    super(message);
    this.name = 'TestDefinitionError';
  }
}

export class SkillSourceError extends Error {
  constructor(message: string, public source: string) {
    super(message);
    this.name = 'SkillSourceError';
  }
}
```

### Try-Catch Pattern
```typescript
export async function executeTest(test: TestDefinition): Promise<TestResult | null> {
  try {
    const execution = await spawnClaudeProcess(test);
    return parseResult(execution);
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.error(`Test ${test.name} timed out after ${test.timeout}s`);
    } else if (error instanceof ProcessError) {
      console.error(`Claude CLI failed: ${error.message}`);
    } else {
      console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  }
}
```

### Error Propagation
Let errors bubble up unless explicitly handling:
```typescript
export async function publishResults(result: BenchmarkResult, apiKey: string): Promise<void> {
  // Validate early, throw if invalid
  if (!apiKey || apiKey.length < 32) {
    throw new Error('Invalid API key format');
  }

  // Let network errors propagate to caller
  const response = await fetch('https://api.skillmark.sh/results', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(result),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
}
```

## Async/Await Patterns

### Always Await Promises
```typescript
// Good
const tests = await loadTestsFromDirectory(dir);
const result = await executeTest(test);

// Bad - missing await
const tests = loadTestsFromDirectory(dir); // returns Promise, not array!
```

### Error Context
Add context to async errors:
```typescript
export async function resolveSkillSource(source: string): Promise<SkillSource> {
  try {
    if (source.startsWith('http')) {
      return await cloneGitRepository(source);
    }
    return resolveLocalPath(source);
  } catch (error) {
    throw new SkillSourceError(
      `Failed to resolve skill source: ${source}`,
      source
    );
  }
}
```

### Promise.all for Parallel Work
```typescript
// Execute all tests in parallel, then collect results
const results = await Promise.all(
  tests.map(test => executeTest(test))
);
```

## Type System

### Use Union Types for Variants
```typescript
// Good
type SkillSourceType = 'local' | 'git' | 'skillsh';
type ModelType = 'haiku' | 'sonnet' | 'opus';

// Instead of enums (more flexible)
export interface SkillSource {
  type: SkillSourceType;
  // ...
}
```

### Use `unknown` for External Data
```typescript
// Data from API/file system is unknown until validated
export function parseJSON(data: unknown): BenchmarkResult {
  if (!isValidBenchmarkResult(data)) {
    throw new Error('Invalid benchmark result structure');
  }
  return data as BenchmarkResult;
}

function isValidBenchmarkResult(data: unknown): data is BenchmarkResult {
  return (
    typeof data === 'object' &&
    data !== null &&
    'skillId' in data &&
    'results' in data
  );
}
```

### Avoid `any`
```typescript
// Bad
function process(data: any): any {
  return data.foo;
}

// Good
function process(data: Record<string, unknown>): string {
  if (typeof data === 'object' && 'foo' in data) {
    return String(data.foo);
  }
  throw new Error('Invalid data structure');
}
```

## Function Design

### Keep Functions Small
- Target: <50 lines
- One responsibility per function
- Extract complex logic to helpers

### Function Signatures
```typescript
/**
 * Load tests from directory
 * - Single parameter when possible
 * - Use options object for >2 parameters
 */
export async function loadTestsFromDirectory(dirPath: string): Promise<TestDefinition[]> {
  // ...
}

export async function executeTest(
  test: TestDefinition,
  skillPath: string,
  model: 'haiku' | 'sonnet' | 'opus'
): Promise<TestExecutionResult> {
  // ...
}

// Better: use options object
export interface ExecuteOptions {
  test: TestDefinition;
  skillPath: string;
  model: 'haiku' | 'sonnet' | 'opus';
  timeout?: number;
  verbose?: boolean;
}

export async function executeTest(options: ExecuteOptions): Promise<TestExecutionResult> {
  // ...
}
```

## Class Design

### Use Classes for Stateful Logic
```typescript
export class BenchmarkExecutor {
  private testCache: Map<string, TestDefinition> = new Map();
  private resultBuffer: TestResult[] = [];

  constructor(
    private skillPath: string,
    private model: ModelType
  ) {}

  async execute(tests: TestDefinition[]): Promise<BenchmarkResult> {
    // Complex stateful logic
  }

  private async executeWithCache(test: TestDefinition): Promise<TestResult> {
    // Private helper
  }
}
```

### Avoid Classes for Utils
Use functions instead:
```typescript
// Good: simple functions
export function scoreResponse(response: string, concepts: string[]): number {
  // ...
}

export function aggregateMetrics(results: TestResult[]): BenchmarkMetrics {
  // ...
}

// Not ideal: unnecessary class
export class Scorer {
  static score(response: string, concepts: string[]): number { ... }
}
```

## Testing Patterns

### Test File Naming
- Source: `src/engine/markdown-test-definition-parser.ts`
- Test: `src/engine/markdown-test-definition-parser.test.ts`

### Test Structure
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTestsFromDirectory } from './markdown-test-definition-parser';

describe('loadTestsFromDirectory', () => {
  let tempDir: string;

  beforeEach(() => {
    // Setup
  });

  it('should load markdown files with YAML frontmatter', async () => {
    const tests = await loadTestsFromDirectory(tempDir);
    expect(tests).toHaveLength(1);
    expect(tests[0].name).toBe('test-name');
  });

  it('should throw error for invalid YAML', async () => {
    await expect(loadTestsFromDirectory(invalidDir)).rejects.toThrow();
  });
});
```

## Performance Considerations

### Avoid N+1 Queries
```typescript
// Bad: separate query per test
for (const test of tests) {
  const cached = await getFromCache(test.id); // N queries
}

// Good: batch queries
const cached = await getFromCacheBatch(tests.map(t => t.id)); // 1 query
```

### Use Streaming for Large Files
```typescript
// Bad: load entire file into memory
const content = await readFile(largePath, 'utf-8');
const lines = content.split('\n');

// Good: stream large files
const stream = createReadStream(largePath);
for await (const chunk of stream) {
  processChunk(chunk);
}
```

### Cache Deterministically
```typescript
function getCacheKey(source: string): string {
  // Always return same key for same input
  const hash = createHash('sha256').update(source).digest('hex');
  return hash.substring(0, 12);
}
```

## CLI-Specific Patterns

### Command Exit Codes
```typescript
export async function runCommand(): Promise<number> {
  try {
    await executeLogic();
    console.log(chalk.green('✓ Success'));
    return 0; // Exit code 0
  } catch (error) {
    console.error(chalk.red(`✗ Error: ${error instanceof Error ? error.message : String(error)}`));
    return 1; // Exit code 1
  }
}
```

### Spinner/Progress
```typescript
import ora from 'ora';

const spinner = ora();

spinner.start('Loading tests...');
// ... do work
spinner.succeed('Loaded 5 tests');

// Or on error
spinner.fail('Could not load tests: reason');
```

### Colored Output
```typescript
import chalk from 'chalk';

console.log(chalk.blue('ℹ Info message'));
console.log(chalk.green('✓ Success message'));
console.log(chalk.yellow('⚠ Warning message'));
console.log(chalk.red('✗ Error message'));
console.log(chalk.gray('Details...'));
```

## Security Best Practices

### API Key Handling
```typescript
// Never log API keys
console.log(`Using API key: ${apiKey}`); // Bad!
console.log('API key configured'); // Good

// Hash keys for comparison
import { createHash } from 'node:crypto';
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
```

### Command Injection Prevention
```typescript
// Bad: string concatenation with user input
exec(`git clone ${userInput}`);

// Good: use argument array
execFile('git', ['clone', userInput]);

// With simple-git (recommended)
import { simpleGit } from 'simple-git';
await simpleGit().clone(userInput, destination);
```

### Timeout on External Commands
```typescript
// Always set timeout for subprocess operations
const timeout = 30000; // 30 seconds
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeout);

try {
  await executeCliCommand(controller.signal);
} finally {
  clearTimeout(timeoutId);
}
```

## Documentation Requirements

### README in Each Package
```markdown
# @skillmark/cli

Node.js CLI for Skillmark benchmarking.

## Installation

## Usage

## API Reference

## Development
```

### CHANGELOG.md
Track version changes:
```markdown
# Changelog

## [0.1.0] - 2025-02-04

### Added
- Initial CLI implementation
- Benchmark execution engine
- Result publishing

### Changed
- Updated dependencies

### Fixed
- Test timeout handling

### Security
- API key hashing
```

## Code Review Checklist

Before submitting PR:
- [ ] No `any` types used
- [ ] JSDoc comments on exported functions
- [ ] Error handling for all async operations
- [ ] File names follow kebab-case convention
- [ ] No hardcoded values (use constants)
- [ ] Tests pass: `pnpm test`
- [ ] Linting passes: `pnpm lint`
- [ ] No sensitive data in code/logs
- [ ] Performance acceptable for expected workload

---

**Last Updated:** February 2025
**Version Alignment:** 0.1.0
