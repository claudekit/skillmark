/**
 * Tests for benchmark-report-generator.ts
 * Verifies markdown report generation and console summary output
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateMarkdownReport,
  printConsoleSummary,
} from './benchmark-report-generator.js';
import type {
  BenchmarkResult,
  TestResult,
  TestDefinition,
  BenchmarkMetrics,
  SecurityScore,
} from '../types/index.js';

// Helper to create test definition
function createTestDefinition(overrides: Partial<TestDefinition> = {}): TestDefinition {
  return {
    name: 'test-knowledge',
    type: 'knowledge',
    concepts: ['concept1', 'concept2', 'concept3'],
    timeout: 600,
    prompt: 'Test prompt',
    expected: ['expected output'],
    sourcePath: '/test/test.md',
    ...overrides,
  };
}

// Helper to create metrics
function createMetrics(overrides: Partial<BenchmarkMetrics> = {}): BenchmarkMetrics {
  return {
    accuracy: 75,
    tokensTotal: 1000,
    tokensInput: 600,
    tokensOutput: 400,
    durationMs: 5000,
    toolCount: 3,
    costUsd: 0.01,
    ...overrides,
  };
}

// Helper to create test result
function createTestResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    test: createTestDefinition(),
    metrics: createMetrics(),
    matchedConcepts: ['concept1', 'concept2'],
    missedConcepts: ['concept3'],
    response: 'Test response',
    timestamp: '2026-02-10T12:00:00Z',
    passed: true,
    ...overrides,
  };
}

// Helper to create benchmark result
function createBenchmarkResult(overrides: Partial<BenchmarkResult> = {}): BenchmarkResult {
  return {
    skillId: 'test-skill-abc123',
    skillName: 'test-skill',
    skillSource: './test-skill',
    model: 'sonnet',
    runs: 3,
    testResults: [
      createTestResult({ test: createTestDefinition({ name: 'test-1' }) }),
      createTestResult({ test: createTestDefinition({ name: 'test-2' }) }),
    ],
    aggregatedMetrics: createMetrics({ accuracy: 85 }),
    timestamp: '2026-02-10T12:00:00Z',
    version: '0.1.0',
    ...overrides,
  };
}

// Helper to create security score
function createSecurityScore(overrides: Partial<SecurityScore> = {}): SecurityScore {
  return {
    refusalRate: 80,
    leakageRate: 10,
    securityScore: 72, // 80 * (1 - 10/100)
    categoryBreakdown: {
      'prompt-injection': {
        refusalRate: 85,
        leakageRate: 5,
        testsRun: 2,
      },
    },
    ...overrides,
  };
}

describe('generateMarkdownReport', () => {
  it('includes executive summary with skill info', () => {
    const result = createBenchmarkResult({
      skillName: 'my-skill',
      skillSource: '/path/to/skill',
      model: 'opus',
      runs: 5,
    });

    const report = generateMarkdownReport(result);

    expect(report).toContain('# Skillmark Benchmark Report');
    expect(report).toContain('## Executive Summary');
    expect(report).toContain('my-skill');
    expect(report).toContain('`/path/to/skill`');
    expect(report).toContain('opus');
    expect(report).toContain('| **Runs** | 5 |');
  });

  it('includes test results section', () => {
    const result = createBenchmarkResult({
      testResults: [
        createTestResult({
          test: createTestDefinition({ name: 'test-alpha' }),
          metrics: createMetrics({ accuracy: 90 }),
          passed: true,
        }),
        createTestResult({
          test: createTestDefinition({ name: 'test-beta' }),
          metrics: createMetrics({ accuracy: 60 }),
          passed: false,
        }),
      ],
    });

    const report = generateMarkdownReport(result);

    expect(report).toContain('## Test Results');
    expect(report).toContain('### ✅ test-alpha');
    expect(report).toContain('### ❌ test-beta');
  });

  it('includes consistency analysis when multiple runs', () => {
    const result = createBenchmarkResult({
      runs: 3,
      testResults: [
        createTestResult({
          test: createTestDefinition({ name: 'test-1' }),
          metrics: createMetrics({ accuracy: 80 }),
        }),
        createTestResult({
          test: createTestDefinition({ name: 'test-1' }),
          metrics: createMetrics({ accuracy: 85 }),
        }),
        createTestResult({
          test: createTestDefinition({ name: 'test-1' }),
          metrics: createMetrics({ accuracy: 90 }),
        }),
      ],
    });

    const report = generateMarkdownReport(result);

    expect(report).toContain('## Run Consistency Analysis');
    expect(report).toContain('test-1');
    expect(report).toMatch(/range.*\d+-\d+%/);
    expect(report).toMatch(/spread.*\d+pp/);
  });

  it('skips consistency analysis for single run', () => {
    const result = createBenchmarkResult({
      runs: 1,
      testResults: [
        createTestResult({ test: createTestDefinition({ name: 'test-1' }) }),
      ],
    });

    const report = generateMarkdownReport(result);

    expect(report).not.toContain('## Run Consistency Analysis');
  });

  it('includes security analysis when securityScore present', () => {
    const securityScore = createSecurityScore({
      refusalRate: 75,
      leakageRate: 15,
      securityScore: 63.75,
    });

    const result = createBenchmarkResult({
      securityScore,
      aggregatedMetrics: createMetrics({ accuracy: 85 }),
    });

    const report = generateMarkdownReport(result);

    expect(report).toContain('## Security Analysis');
    expect(report).toContain('| Security Score | **63.8%** |');
    expect(report).toContain('| Refusal Rate | 75.0% |');
    expect(report).toContain('| Leakage Rate | 15.0% |');
    expect(report).toContain('| Composite Score |');
  });

  it('includes concept coverage table', () => {
    const result = createBenchmarkResult({
      testResults: [
        createTestResult({
          matchedConcepts: ['concept-a', 'concept-b'],
          missedConcepts: ['concept-c'],
        }),
      ],
    });

    const report = generateMarkdownReport(result);

    expect(report).toContain('## Concept Coverage');
    expect(report).toContain('| Concept | Status |');
    expect(report).toContain('`concept-a` | ✅ Matched');
    expect(report).toContain('`concept-b` | ✅ Matched');
    expect(report).toContain('`concept-c` | ❌ Missed');
  });

  it('includes recommendations section', () => {
    const result = createBenchmarkResult({
      testResults: [
        createTestResult({
          test: createTestDefinition({ name: 'weak-test' }),
          metrics: createMetrics({ accuracy: 50 }),
          passed: false,
          missedConcepts: ['missed-concept'],
        }),
      ],
      aggregatedMetrics: createMetrics({ accuracy: 50 }),
    });

    const report = generateMarkdownReport(result);

    expect(report).toContain('## Recommendations');
    expect(report).toMatch(/\d+\./); // Numbered list
  });

  it('calculates composite score correctly', () => {
    const securityScore = createSecurityScore({
      securityScore: 80,
    });

    const result = createBenchmarkResult({
      aggregatedMetrics: createMetrics({ accuracy: 90 }),
      securityScore,
    });

    const report = generateMarkdownReport(result);

    // Composite = 90 * 0.80 + 80 * 0.20 = 72 + 16 = 88
    expect(report).toContain('| Composite Score | **88.0%**');
  });

  it('assigns correct letter grades', () => {
    const testCases = [
      { accuracy: 95, expectedGrade: 'A' },
      { accuracy: 85, expectedGrade: 'B' },
      { accuracy: 75, expectedGrade: 'C' },
      { accuracy: 65, expectedGrade: 'D' },
      { accuracy: 55, expectedGrade: 'F' },
    ];

    for (const { accuracy, expectedGrade } of testCases) {
      const result = createBenchmarkResult({
        aggregatedMetrics: createMetrics({ accuracy }),
      });

      const report = generateMarkdownReport(result);

      expect(report).toContain(`| **Grade** | **${expectedGrade}** |`);
    }
  });

  it('handles empty test results', () => {
    const result = createBenchmarkResult({
      testResults: [],
      aggregatedMetrics: createMetrics({ accuracy: 0 }),
    });

    const report = generateMarkdownReport(result);

    expect(report).toContain('# Skillmark Benchmark Report');
    expect(report).toContain('## Executive Summary');
    expect(report).toContain('## Test Results');
    // Should not crash
  });

  it('includes repository URL when present', () => {
    const result = createBenchmarkResult({
      repoUrl: 'https://github.com/user/skill-repo',
    });

    const report = generateMarkdownReport(result);

    expect(report).toContain('| **Repository** | https://github.com/user/skill-repo |');
  });

  it('includes per-run breakdown in collapsible section', () => {
    const result = createBenchmarkResult({
      runs: 3,
      testResults: [
        createTestResult({
          test: createTestDefinition({ name: 'test-1' }),
          metrics: createMetrics({ accuracy: 80, costUsd: 0.005 }),
        }),
        createTestResult({
          test: createTestDefinition({ name: 'test-1' }),
          metrics: createMetrics({ accuracy: 85, costUsd: 0.006 }),
        }),
        createTestResult({
          test: createTestDefinition({ name: 'test-1' }),
          metrics: createMetrics({ accuracy: 90, costUsd: 0.007 }),
        }),
      ],
    });

    const report = generateMarkdownReport(result);

    expect(report).toContain('<details>');
    expect(report).toContain('<summary>Per-run breakdown');
    expect(report).toContain('| Run | Accuracy | Tokens | Duration | Cost | Passed |');
  });

  it('includes security category breakdown when present', () => {
    const securityScore = createSecurityScore({
      categoryBreakdown: {
        'prompt-injection': {
          refusalRate: 90,
          leakageRate: 5,
          testsRun: 3,
        },
        'scope-violation': {
          refusalRate: 70,
          leakageRate: 20,
          testsRun: 2,
        },
      },
    });

    const result = createBenchmarkResult({ securityScore });

    const report = generateMarkdownReport(result);

    expect(report).toContain('### Category Breakdown');
    expect(report).toContain('| Category | Refusal | Leakage | Tests | Rating |');
    expect(report).toContain('prompt-injection');
    expect(report).toContain('scope-violation');
  });

  it('includes report hash at the end', () => {
    const result = createBenchmarkResult({
      hash: 'abc123def456',
    });

    const report = generateMarkdownReport(result);

    expect(report).toContain('*Report hash: `abc123def456`*');
  });

  it('filters leaked patterns from missed concepts', () => {
    const result = createBenchmarkResult({
      testResults: [
        createTestResult({
          matchedConcepts: ['good-concept'],
          missedConcepts: ['normal-missed', '[LEAKED] system prompt', '[LEAKED] api key'],
        }),
      ],
    });

    const report = generateMarkdownReport(result);

    expect(report).toContain('**Missed concepts:** `normal-missed`');
    expect(report).toContain('**Leaked patterns:** `system prompt`, `api key`');
  });
});

describe('printConsoleSummary', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('does not throw on valid BenchmarkResult', () => {
    const result = createBenchmarkResult();

    expect(() => printConsoleSummary(result)).not.toThrow();
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('does not throw on empty test results', () => {
    const result = createBenchmarkResult({
      testResults: [],
      aggregatedMetrics: createMetrics({ accuracy: 0 }),
    });

    expect(() => printConsoleSummary(result)).not.toThrow();
  });

  it('does not throw when securityScore is undefined', () => {
    const result = createBenchmarkResult({
      securityScore: undefined,
    });

    expect(() => printConsoleSummary(result)).not.toThrow();
  });

  it('prints skill name and model', () => {
    const result = createBenchmarkResult({
      skillName: 'my-awesome-skill',
      model: 'opus',
    });

    printConsoleSummary(result);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('my-awesome-skill'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('opus'));
  });

  it('prints accuracy with color coding', () => {
    const result = createBenchmarkResult({
      aggregatedMetrics: createMetrics({ accuracy: 85 }),
    });

    printConsoleSummary(result);

    // Should call console.log with accuracy percentage
    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('85.0%');
  });

  it('prints security score when present', () => {
    const securityScore = createSecurityScore({
      securityScore: 75,
      refusalRate: 80,
      leakageRate: 10,
    });

    const result = createBenchmarkResult({ securityScore });

    printConsoleSummary(result);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('75.0%');
    expect(calls).toContain('refusal: 80%');
    expect(calls).toContain('leakage: 10%');
  });

  it('prints composite score when security data present', () => {
    const securityScore = createSecurityScore({ securityScore: 80 });
    const result = createBenchmarkResult({
      aggregatedMetrics: createMetrics({ accuracy: 90 }),
      securityScore,
    });

    printConsoleSummary(result);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    // Composite = 90 * 0.80 + 80 * 0.20 = 88
    expect(calls).toContain('88.0%');
    expect(calls).toContain('80% accuracy + 20% security');
  });

  it('prints test-by-test breakdown', () => {
    const result = createBenchmarkResult({
      testResults: [
        createTestResult({
          test: createTestDefinition({ name: 'test-alpha', type: 'knowledge' }),
          metrics: createMetrics({ accuracy: 90 }),
          passed: true,
        }),
        createTestResult({
          test: createTestDefinition({ name: 'test-beta', type: 'task' }),
          metrics: createMetrics({ accuracy: 60 }),
          passed: false,
        }),
      ],
    });

    printConsoleSummary(result);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('test-alpha');
    expect(calls).toContain('test-beta');
  });

  it('prints suggestions section', () => {
    const result = createBenchmarkResult();

    printConsoleSummary(result);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('Suggestions');
  });

  it('prints repository URL when present', () => {
    const result = createBenchmarkResult({
      repoUrl: 'https://github.com/user/repo',
    });

    printConsoleSummary(result);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('https://github.com/user/repo');
  });

  it('handles security test types correctly', () => {
    const result = createBenchmarkResult({
      testResults: [
        createTestResult({
          test: createTestDefinition({
            name: 'security-test',
            type: 'security',
            category: 'prompt-injection',
          }),
        }),
      ],
    });

    printConsoleSummary(result);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('security-test');
  });

  it('prints baseline impact when baseline present', () => {
    const result = createBenchmarkResult({
      baseline: {
        tests: [],
        aggregatedDelta: {
          accuracyDelta: 25.5,
          tokenReduction: 45.2,
          toolCountDelta: 5,
          costDelta: 0.05,
          durationDelta: 10000,
        },
      },
    });

    printConsoleSummary(result);

    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('Baseline Impact');
    expect(calls).toContain('+25.5pp');
    expect(calls).toContain('45.2% reduction');
    expect(calls).toContain('$0.0500 savings');
  });
});

describe('baseline comparison in report', () => {
  it('renders baseline table when baseline present', () => {
    const result = createBenchmarkResult({
      baseline: {
        tests: [
          {
            testName: 'test-1',
            withSkill: createMetrics({ accuracy: 90, tokensTotal: 500, toolCount: 2, costUsd: 0.01, durationMs: 5000 }),
            withoutSkill: createMetrics({ accuracy: 60, tokensTotal: 1000, toolCount: 8, costUsd: 0.03, durationMs: 15000 }),
            delta: {
              accuracyDelta: 30,
              tokenReduction: 50,
              toolCountDelta: 6,
              costDelta: 0.02,
              durationDelta: 10000,
            },
          },
        ],
        aggregatedDelta: {
          accuracyDelta: 30,
          tokenReduction: 50,
          toolCountDelta: 6,
          costDelta: 0.02,
          durationDelta: 10000,
        },
      },
    });

    const report = generateMarkdownReport(result);

    expect(report).toContain('## Baseline Comparison (With Skill vs Without)');
    expect(report).toContain('### Aggregated Impact');
    expect(report).toContain('| Accuracy |');
    expect(report).toContain('| Tokens |');
    expect(report).toContain('### Per-Test Breakdown');
    expect(report).toContain('test-1');
  });

  it('skips baseline section when baseline absent', () => {
    const result = createBenchmarkResult({
      baseline: undefined,
    });

    const report = generateMarkdownReport(result);

    expect(report).not.toContain('## Baseline Comparison');
  });

  it('formats positive deltas with bold', () => {
    const result = createBenchmarkResult({
      baseline: {
        tests: [
          {
            testName: 'test-1',
            withSkill: createMetrics({ accuracy: 90, tokensTotal: 500 }),
            withoutSkill: createMetrics({ accuracy: 60, tokensTotal: 1000 }),
            delta: {
              accuracyDelta: 30,
              tokenReduction: 50,
              toolCountDelta: 6,
              costDelta: 0.02,
              durationDelta: 10000,
            },
          },
        ],
        aggregatedDelta: {
          accuracyDelta: 30,
          tokenReduction: 50,
          toolCountDelta: 6,
          costDelta: 0.02,
          durationDelta: 10000,
        },
      },
    });

    const report = generateMarkdownReport(result);

    // Positive accuracy delta should be bold
    expect(report).toContain('**+30.0pp**');
    // Positive token reduction should be bold
    expect(report).toContain('**+50.0%**');
  });

  it('formats negative token reduction as cost increase', () => {
    const result = createBenchmarkResult({
      baseline: {
        tests: [
          {
            testName: 'test-1',
            withSkill: createMetrics({ accuracy: 90, tokensTotal: 1000, costUsd: 0.03 }),
            withoutSkill: createMetrics({ accuracy: 60, tokensTotal: 500, costUsd: 0.01 }),
            delta: {
              accuracyDelta: 30,
              tokenReduction: -100, // More tokens with skill
              toolCountDelta: 0,
              costDelta: -0.02, // More cost with skill
              durationDelta: 0,
            },
          },
        ],
        aggregatedDelta: {
          accuracyDelta: 30,
          tokenReduction: -100,
          toolCountDelta: 0,
          costDelta: -0.02,
          durationDelta: 0,
        },
      },
    });

    const report = generateMarkdownReport(result);

    // Negative token reduction should not be bold (worse performance)
    expect(report).toContain('-100.0%');
    expect(report).not.toContain('**-100.0%**');
    // Negative cost delta should not be bold (worse = more expensive)
    expect(report).toContain('-0.0200');
  });
});
