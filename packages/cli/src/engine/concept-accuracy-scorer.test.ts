/**
 * Tests for concept-accuracy-scorer.ts
 * Verifies scoring logic, fuzzy matching, and metric aggregation
 */
import { describe, it, expect } from 'vitest';
import {
  scoreResponse,
  aggregateMetrics,
  calculatePassRate,
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
