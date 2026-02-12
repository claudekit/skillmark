/**
 * Tests for concept-accuracy-scorer.ts
 * Verifies scoring logic, fuzzy matching, and metric aggregation
 */
import { describe, it, expect } from 'vitest';
import {
  scoreResponse,
  aggregateMetrics,
  calculatePassRate,
  computeConsistencyMetrics,
} from './concept-accuracy-scorer.js';
import type { TestDefinition, TestResult, BenchmarkMetrics } from '../types/index.js';

// Helper to create test definition
function createTestDefinition(overrides: Partial<TestDefinition> = {}): TestDefinition {
  return {
    name: 'test-concept-matching',
    type: 'knowledge',
    concepts: ['orchestrator', 'context isolation', 'consensus'],
    timeout: 600,
    prompt: 'How do multi-agent systems work?',
    expected: ['coordination pattern', 'message passing'],
    sourcePath: '/test/test.md',
    ...overrides,
  };
}

// Helper to create metrics
function createMetrics(overrides: Partial<BenchmarkMetrics> = {}): BenchmarkMetrics {
  return {
    accuracy: 0,
    tokensTotal: 1000,
    tokensInput: 800,
    tokensOutput: 200,
    durationMs: 5000,
    toolCount: 3,
    costUsd: 0.01,
    ...overrides,
  };
}

describe('scoreResponse', () => {
  describe('exact matching', () => {
    it('matches concepts that appear exactly in response', () => {
      const test = createTestDefinition({
        concepts: ['orchestrator', 'consensus'],
        expected: [],
      });
      const response = 'The orchestrator pattern uses consensus for decisions';
      const metrics = createMetrics();

      const result = scoreResponse(test, response, metrics);

      expect(result.matchedConcepts).toContain('orchestrator');
      expect(result.matchedConcepts).toContain('consensus');
      expect(result.missedConcepts).toHaveLength(0);
      expect(result.metrics.accuracy).toBe(100);
    });

    it('tracks missed concepts', () => {
      const test = createTestDefinition({
        concepts: ['orchestrator', 'blockchain', 'consensus'],
        expected: [],
      });
      const response = 'The orchestrator pattern coordinates agents';
      const metrics = createMetrics();

      const result = scoreResponse(test, response, metrics);

      expect(result.matchedConcepts).toContain('orchestrator');
      expect(result.missedConcepts).toContain('blockchain');
      expect(result.missedConcepts).toContain('consensus');
    });
  });

  describe('case insensitive matching', () => {
    it('matches regardless of case by default', () => {
      const test = createTestDefinition({
        concepts: ['Orchestrator', 'CONSENSUS'],
        expected: [],
      });
      const response = 'The orchestrator uses consensus mechanisms';
      const metrics = createMetrics();

      const result = scoreResponse(test, response, metrics);

      expect(result.matchedConcepts).toHaveLength(2);
      expect(result.metrics.accuracy).toBe(100);
    });
  });

  describe('fuzzy matching', () => {
    it('matches hyphenated vs spaced variations', () => {
      const test = createTestDefinition({
        concepts: ['context-isolation'],
        expected: [],
      });
      const response = 'We use context isolation for safety';
      const metrics = createMetrics();

      const result = scoreResponse(test, response, metrics);

      expect(result.matchedConcepts).toContain('context-isolation');
    });

    it('matches plurals', () => {
      const test = createTestDefinition({
        concepts: ['agents'],
        expected: [],
      });
      const response = 'Each agent has its own context';
      const metrics = createMetrics();

      const result = scoreResponse(test, response, metrics);

      expect(result.matchedConcepts).toContain('agents');
    });

    it('matches common abbreviations', () => {
      const test = createTestDefinition({
        concepts: ['configuration'],
        expected: [],
      });
      const response = 'The config file specifies settings';
      const metrics = createMetrics();

      const result = scoreResponse(test, response, metrics);

      expect(result.matchedConcepts).toContain('configuration');
    });
  });

  describe('expected patterns', () => {
    it('parses checkbox items from expected', () => {
      const test = createTestDefinition({
        concepts: [],
        expected: ['- [ ] Uses message passing', '- [x] Handles failures'],
      });
      const response = 'The system uses message passing and handles failures gracefully';
      const metrics = createMetrics();

      const result = scoreResponse(test, response, metrics);

      expect(result.matchedConcepts).toContain('Uses message passing');
      expect(result.matchedConcepts).toContain('Handles failures');
    });
  });

  describe('accuracy calculation', () => {
    it('calculates accuracy as matched / total * 100', () => {
      const test = createTestDefinition({
        concepts: ['orchestrator', 'consensus', 'blockchain', 'kubernetes'],
        expected: [],
      });
      // Only 'orchestrator' and 'consensus' appear in response
      const response = 'The orchestrator uses consensus for coordination';
      const metrics = createMetrics();

      const result = scoreResponse(test, response, metrics);

      expect(result.metrics.accuracy).toBe(50); // 2/4 * 100
    });

    it('returns 0 accuracy when no concepts', () => {
      const test = createTestDefinition({
        concepts: [],
        expected: [],
      });
      const response = 'Some response';
      const metrics = createMetrics();

      const result = scoreResponse(test, response, metrics);

      expect(result.metrics.accuracy).toBe(0);
    });
  });

  describe('pass/fail threshold', () => {
    it('passes when accuracy >= 70%', () => {
      const test = createTestDefinition({
        concepts: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
        expected: [],
      });
      // Match 7 out of 10 = 70%
      const response = 'a b c d e f g';
      const metrics = createMetrics();

      const result = scoreResponse(test, response, metrics);

      expect(result.passed).toBe(true);
    });

    it('fails when accuracy < 70%', () => {
      const test = createTestDefinition({
        concepts: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
        expected: [],
      });
      // Match 6 out of 10 = 60%
      const response = 'a b c d e f';
      const metrics = createMetrics();

      const result = scoreResponse(test, response, metrics);

      expect(result.passed).toBe(false);
    });
  });
});

describe('aggregateMetrics', () => {
  it('returns zero metrics for empty results', () => {
    const result = aggregateMetrics([]);

    expect(result.accuracy).toBe(0);
    expect(result.tokensTotal).toBe(0);
    expect(result.durationMs).toBe(0);
    expect(result.costUsd).toBe(0);
  });

  it('averages metrics across multiple results', () => {
    const results: TestResult[] = [
      {
        test: createTestDefinition(),
        metrics: createMetrics({ accuracy: 80, tokensTotal: 1000, costUsd: 0.10 }),
        matchedConcepts: [],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
      {
        test: createTestDefinition(),
        metrics: createMetrics({ accuracy: 60, tokensTotal: 2000, costUsd: 0.20 }),
        matchedConcepts: [],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: false,
      },
    ];

    const aggregated = aggregateMetrics(results);

    expect(aggregated.accuracy).toBe(70); // (80 + 60) / 2
    expect(aggregated.tokensTotal).toBe(1500); // (1000 + 2000) / 2
    expect(aggregated.costUsd).toBeCloseTo(0.15, 10); // (0.10 + 0.20) / 2
  });
});

describe('calculatePassRate', () => {
  it('returns 0 for empty results', () => {
    expect(calculatePassRate([])).toBe(0);
  });

  it('calculates percentage of passed tests', () => {
    const results: TestResult[] = [
      { passed: true } as TestResult,
      { passed: true } as TestResult,
      { passed: false } as TestResult,
      { passed: true } as TestResult,
    ];

    expect(calculatePassRate(results)).toBe(75); // 3/4 * 100
  });

  it('returns 100 when all tests pass', () => {
    const results: TestResult[] = [
      { passed: true } as TestResult,
      { passed: true } as TestResult,
    ];

    expect(calculatePassRate(results)).toBe(100);
  });

  it('returns 0 when all tests fail', () => {
    const results: TestResult[] = [
      { passed: false } as TestResult,
      { passed: false } as TestResult,
    ];

    expect(calculatePassRate(results)).toBe(0);
  });
});

describe('computeConsistencyMetrics', () => {
  it('returns null for single-run results', () => {
    const results: TestResult[] = [
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 80 }),
        matchedConcepts: ['orchestrator'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
      {
        test: createTestDefinition({ name: 'test-2' }),
        metrics: createMetrics({ accuracy: 70 }),
        matchedConcepts: ['consensus'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
    ];

    const consistency = computeConsistencyMetrics(results);

    expect(consistency).toBeNull();
  });

  it('computes stdDev and range across runs', () => {
    const results: TestResult[] = [
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 80 }),
        matchedConcepts: ['orchestrator'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 90 }),
        matchedConcepts: ['orchestrator'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 70 }),
        matchedConcepts: ['orchestrator'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
    ];

    const consistency = computeConsistencyMetrics(results);

    expect(consistency).not.toBeNull();
    expect(consistency!.accuracyRange).toBe(20); // 90 - 70
    // StdDev calculation: avg = 80, variance = ((80-80)^2 + (90-80)^2 + (70-80)^2) / 3 = 200/3 = 66.67, stdDev = sqrt(66.67) ≈ 8.16
    expect(consistency!.accuracyStdDev).toBeCloseTo(8.16, 1);
  });

  it('flags flaky tests with >20pp range', () => {
    const results: TestResult[] = [
      {
        test: createTestDefinition({ name: 'stable-test' }),
        metrics: createMetrics({ accuracy: 80 }),
        matchedConcepts: ['orchestrator'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
      {
        test: createTestDefinition({ name: 'stable-test' }),
        metrics: createMetrics({ accuracy: 85 }),
        matchedConcepts: ['orchestrator'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
      {
        test: createTestDefinition({ name: 'flaky-test' }),
        metrics: createMetrics({ accuracy: 50 }),
        matchedConcepts: ['consensus'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: false,
      },
      {
        test: createTestDefinition({ name: 'flaky-test' }),
        metrics: createMetrics({ accuracy: 90 }),
        matchedConcepts: ['consensus'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
    ];

    const consistency = computeConsistencyMetrics(results);

    expect(consistency).not.toBeNull();
    expect(consistency!.flakyTests).toContain('flaky-test');
    expect(consistency!.flakyTests).not.toContain('stable-test');
  });

  it('computes concept overlap percentage', () => {
    const results: TestResult[] = [
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 80 }),
        matchedConcepts: ['orchestrator', 'consensus'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 85 }),
        matchedConcepts: ['orchestrator', 'consensus', 'context isolation'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 75 }),
        matchedConcepts: ['orchestrator'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
    ];

    const consistency = computeConsistencyMetrics(results);

    expect(consistency).not.toBeNull();
    // Intersection: 'orchestrator' (present in all 3)
    // Union: 'orchestrator', 'consensus', 'context isolation' (3 total)
    // Overlap: 1/3 = 33.33%
    expect(consistency!.conceptOverlap).toBeCloseTo(33.33, 1);
  });

  it('returns consistencyScore clamped to [0, 100]', () => {
    // Test with low stdDev (high consistency)
    const stableResults: TestResult[] = [
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 80 }),
        matchedConcepts: ['orchestrator'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 82 }),
        matchedConcepts: ['orchestrator'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
    ];

    const stableConsistency = computeConsistencyMetrics(stableResults);
    expect(stableConsistency).not.toBeNull();
    expect(stableConsistency!.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(stableConsistency!.consistencyScore).toBeLessThanOrEqual(100);
    expect(stableConsistency!.consistencyScore).toBeGreaterThan(90); // Should be high

    // Test with high stdDev (low consistency) - should clamp to 0
    const unstableResults: TestResult[] = [
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 10 }),
        matchedConcepts: [],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: false,
      },
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 90 }),
        matchedConcepts: ['orchestrator'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
    ];

    const unstableConsistency = computeConsistencyMetrics(unstableResults);
    expect(unstableConsistency).not.toBeNull();
    expect(unstableConsistency!.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(unstableConsistency!.consistencyScore).toBeLessThanOrEqual(100);
  });

  it('handles multiple tests with different run counts', () => {
    const results: TestResult[] = [
      // Test 1: 3 runs
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 80 }),
        matchedConcepts: ['orchestrator'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 85 }),
        matchedConcepts: ['orchestrator'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
      {
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 75 }),
        matchedConcepts: ['orchestrator'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
      // Test 2: 1 run (should be ignored)
      {
        test: createTestDefinition({ name: 'test-2' }),
        metrics: createMetrics({ accuracy: 90 }),
        matchedConcepts: ['consensus'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
      // Test 3: 2 runs
      {
        test: createTestDefinition({ name: 'test-3' }),
        metrics: createMetrics({ accuracy: 60 }),
        matchedConcepts: ['context isolation'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: false,
      },
      {
        test: createTestDefinition({ name: 'test-3' }),
        metrics: createMetrics({ accuracy: 70 }),
        matchedConcepts: ['context isolation'],
        missedConcepts: [],
        response: '',
        timestamp: new Date().toISOString(),
        passed: true,
      },
    ];

    const consistency = computeConsistencyMetrics(results);

    expect(consistency).not.toBeNull();
    // Should compute metrics only from test-1 (3 runs) and test-3 (2 runs)
    // test-2 with 1 run should be ignored
  });
});
