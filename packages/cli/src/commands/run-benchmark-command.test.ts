/**
 * Tests for run-benchmark-command.ts
 * Focuses on baseline comparison computation logic
 */
import { describe, it, expect } from 'vitest';
import { computeBaselineComparison } from './run-benchmark-command.js';
import type {
  TestResult,
  TestDefinition,
  BenchmarkMetrics,
} from '../types/index.js';

// Helper to create test definition
function createTestDefinition(overrides: Partial<TestDefinition> = {}): TestDefinition {
  return {
    name: 'test-knowledge',
    type: 'knowledge',
    concepts: ['concept1', 'concept2'],
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
    matchedConcepts: ['concept1'],
    missedConcepts: ['concept2'],
    response: 'Test response',
    timestamp: '2026-02-10T12:00:00Z',
    passed: true,
    ...overrides,
  };
}

describe('computeBaselineComparison', () => {
  it('matches tests by name', () => {
    const withSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 90 }),
      }),
      createTestResult({
        test: createTestDefinition({ name: 'test-2' }),
        metrics: createMetrics({ accuracy: 80 }),
      }),
    ];

    const withoutSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 60 }),
      }),
      createTestResult({
        test: createTestDefinition({ name: 'test-2' }),
        metrics: createMetrics({ accuracy: 50 }),
      }),
    ];

    const comparison = computeBaselineComparison(withSkill, withoutSkill);

    expect(comparison.tests).toHaveLength(2);
    expect(comparison.tests[0].testName).toBe('test-1');
    expect(comparison.tests[1].testName).toBe('test-2');
  });

  it('skips security tests', () => {
    const withSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'security-test', type: 'security' }),
        metrics: createMetrics({ accuracy: 90 }),
      }),
      createTestResult({
        test: createTestDefinition({ name: 'knowledge-test', type: 'knowledge' }),
        metrics: createMetrics({ accuracy: 85 }),
      }),
    ];

    const withoutSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'security-test', type: 'security' }),
        metrics: createMetrics({ accuracy: 60 }),
      }),
      createTestResult({
        test: createTestDefinition({ name: 'knowledge-test', type: 'knowledge' }),
        metrics: createMetrics({ accuracy: 50 }),
      }),
    ];

    const comparison = computeBaselineComparison(withSkill, withoutSkill);

    expect(comparison.tests).toHaveLength(1);
    expect(comparison.tests[0].testName).toBe('knowledge-test');
  });

  it('skips trigger tests', () => {
    const withSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'trigger-test', type: 'trigger' }),
        metrics: createMetrics({ accuracy: 90 }),
      }),
      createTestResult({
        test: createTestDefinition({ name: 'task-test', type: 'task' }),
        metrics: createMetrics({ accuracy: 85 }),
      }),
    ];

    const withoutSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'trigger-test', type: 'trigger' }),
        metrics: createMetrics({ accuracy: 60 }),
      }),
      createTestResult({
        test: createTestDefinition({ name: 'task-test', type: 'task' }),
        metrics: createMetrics({ accuracy: 50 }),
      }),
    ];

    const comparison = computeBaselineComparison(withSkill, withoutSkill);

    expect(comparison.tests).toHaveLength(1);
    expect(comparison.tests[0].testName).toBe('task-test');
  });

  it('calculates accuracy delta correctly', () => {
    const withSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 90 }),
      }),
    ];

    const withoutSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 60 }),
      }),
    ];

    const comparison = computeBaselineComparison(withSkill, withoutSkill);

    expect(comparison.tests[0].delta.accuracyDelta).toBe(30); // 90 - 60
  });

  it('calculates token reduction percentage', () => {
    const withSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ tokensTotal: 500 }),
      }),
    ];

    const withoutSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ tokensTotal: 1000 }),
      }),
    ];

    const comparison = computeBaselineComparison(withSkill, withoutSkill);

    // (1000 - 500) / 1000 * 100 = 50%
    expect(comparison.tests[0].delta.tokenReduction).toBe(50);
  });

  it('handles zero baseline tokens without division error', () => {
    const withSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ tokensTotal: 500 }),
      }),
    ];

    const withoutSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ tokensTotal: 0 }),
      }),
    ];

    const comparison = computeBaselineComparison(withSkill, withoutSkill);

    expect(comparison.tests[0].delta.tokenReduction).toBe(0);
  });

  it('averages deltas across multiple tests', () => {
    const withSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 90, tokensTotal: 500, toolCount: 2, costUsd: 0.01, durationMs: 5000 }),
      }),
      createTestResult({
        test: createTestDefinition({ name: 'test-2' }),
        metrics: createMetrics({ accuracy: 80, tokensTotal: 600, toolCount: 3, costUsd: 0.015, durationMs: 6000 }),
      }),
    ];

    const withoutSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 60, tokensTotal: 1000, toolCount: 8, costUsd: 0.03, durationMs: 15000 }),
      }),
      createTestResult({
        test: createTestDefinition({ name: 'test-2' }),
        metrics: createMetrics({ accuracy: 50, tokensTotal: 1200, toolCount: 10, costUsd: 0.035, durationMs: 18000 }),
      }),
    ];

    const comparison = computeBaselineComparison(withSkill, withoutSkill);

    // Average accuracy delta: (30 + 30) / 2 = 30
    expect(comparison.aggregatedDelta.accuracyDelta).toBe(30);

    // Average token reduction: (50% + 50%) / 2 = 50%
    expect(comparison.aggregatedDelta.tokenReduction).toBe(50);

    // Average tool count delta: (6 + 7) / 2 = 6.5
    expect(comparison.aggregatedDelta.toolCountDelta).toBe(6.5);

    // Average cost delta: ((0.03 - 0.01) + (0.035 - 0.015)) / 2 = (0.02 + 0.02) / 2 = 0.02
    expect(comparison.aggregatedDelta.costDelta).toBeCloseTo(0.02, 4);

    // Average duration delta: (10000 + 12000) / 2 = 11000
    expect(comparison.aggregatedDelta.durationDelta).toBe(11000);
  });

  it('handles mismatched test names gracefully', () => {
    const withSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 90 }),
      }),
      createTestResult({
        test: createTestDefinition({ name: 'test-2' }),
        metrics: createMetrics({ accuracy: 85 }),
      }),
    ];

    const withoutSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 60 }),
      }),
      // test-2 missing in baseline
    ];

    const comparison = computeBaselineComparison(withSkill, withoutSkill);

    // Only test-1 should be included
    expect(comparison.tests).toHaveLength(1);
    expect(comparison.tests[0].testName).toBe('test-1');
  });

  it('returns empty comparison when no matching tests', () => {
    const withSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
      }),
    ];

    const withoutSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-2' }),
      }),
    ];

    const comparison = computeBaselineComparison(withSkill, withoutSkill);

    expect(comparison.tests).toHaveLength(0);
    expect(comparison.aggregatedDelta.accuracyDelta).toBe(0);
    expect(comparison.aggregatedDelta.tokenReduction).toBe(0);
  });

  it('calculates negative deltas when skill performs worse', () => {
    const withSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 50, tokensTotal: 1500, costUsd: 0.04 }),
      }),
    ];

    const withoutSkill = [
      createTestResult({
        test: createTestDefinition({ name: 'test-1' }),
        metrics: createMetrics({ accuracy: 80, tokensTotal: 1000, costUsd: 0.03 }),
      }),
    ];

    const comparison = computeBaselineComparison(withSkill, withoutSkill);

    // Negative accuracy delta (skill made it worse)
    expect(comparison.tests[0].delta.accuracyDelta).toBe(-30);

    // Negative token reduction (more tokens with skill)
    expect(comparison.tests[0].delta.tokenReduction).toBe(-50);

    // Negative cost delta (more expensive with skill)
    expect(comparison.tests[0].delta.costDelta).toBeCloseTo(-0.01, 4);
  });
});
