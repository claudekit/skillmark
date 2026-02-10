/**
 * Tests for trigger-activation-scorer.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isTriggerTest, scoreTriggerTest, aggregateTriggerScores } from './trigger-activation-scorer.js';
import type { TestDefinition, TriggerScore } from '../types/index.js';

// Mock the executor module
vi.mock('./claude-cli-executor.js', () => ({
  executeTest: vi.fn(),
}));

import { executeTest } from './claude-cli-executor.js';

describe('isTriggerTest', () => {
  it('returns true for trigger type', () => {
    const test: TestDefinition = {
      name: 'test-trigger',
      type: 'trigger',
      concepts: ['activates-on-relevant'],
      timeout: 30,
      prompt: '',
      expected: [],
      sourcePath: '/test.md',
      positiveTriggers: ['query1'],
      negativeTriggers: ['query2'],
    };
    expect(isTriggerTest(test)).toBe(true);
  });

  it('returns false for knowledge type', () => {
    const test: TestDefinition = {
      name: 'test-knowledge',
      type: 'knowledge',
      concepts: [],
      timeout: 60,
      prompt: 'test',
      expected: [],
      sourcePath: '/test.md',
    };
    expect(isTriggerTest(test)).toBe(false);
  });

  it('returns false for task type', () => {
    const test: TestDefinition = {
      name: 'test-task',
      type: 'task',
      concepts: [],
      timeout: 60,
      prompt: 'test',
      expected: [],
      sourcePath: '/test.md',
    };
    expect(isTriggerTest(test)).toBe(false);
  });

  it('returns false for security type', () => {
    const test: TestDefinition = {
      name: 'test-security',
      type: 'security',
      concepts: [],
      timeout: 60,
      prompt: 'test',
      expected: [],
      sourcePath: '/test.md',
    };
    expect(isTriggerTest(test)).toBe(false);
  });
});

describe('scoreTriggerTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scores 100% when all positive queries activate and all negative queries ignored', async () => {
    const test: TestDefinition = {
      name: 'test-trigger',
      type: 'trigger',
      concepts: ['activates-on-relevant', 'ignores-irrelevant'],
      timeout: 30,
      prompt: '',
      expected: [],
      sourcePath: '/test.md',
      positiveTriggers: ['query1', 'query2', 'query3'],
      negativeTriggers: ['unrelated1', 'unrelated2', 'unrelated3'],
    };

    // Mock all positive triggers as activated
    vi.mocked(executeTest).mockImplementation(async (testDef) => {
      const isPositive = test.positiveTriggers?.includes(testDef.prompt);
      return {
        response: 'response',
        transcriptPath: '/transcript.jsonl',
        transcript: [],
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        durationMs: 1000,
        toolCount: isPositive ? 3 : 0, // Positive activates, negative doesn't
        success: true,
      };
    });

    const result = await scoreTriggerTest(test, '/skill', '/work');

    expect(result.triggerRate).toBe(100);
    expect(result.falsePositiveRate).toBe(0);
    expect(result.triggerScore).toBe(100);
    expect(result.queryResults).toHaveLength(6);
    expect(result.queryResults.filter(q => q.correct)).toHaveLength(6);
  });

  it('scores 0% trigger rate when no positive queries activate', async () => {
    const test: TestDefinition = {
      name: 'test-trigger',
      type: 'trigger',
      concepts: ['activates-on-relevant'],
      timeout: 30,
      prompt: '',
      expected: [],
      sourcePath: '/test.md',
      positiveTriggers: ['query1', 'query2'],
      negativeTriggers: ['unrelated1'],
    };

    // Mock all queries as NOT activated
    vi.mocked(executeTest).mockResolvedValue({
      response: 'response',
      transcriptPath: '/transcript.jsonl',
      transcript: [],
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.001,
      durationMs: 1000,
      toolCount: 0,
      success: true,
    });

    const result = await scoreTriggerTest(test, '/skill', '/work');

    expect(result.triggerRate).toBe(0);
    expect(result.falsePositiveRate).toBe(0);
    expect(result.triggerScore).toBe(0);
  });

  it('penalizes false positives in negative queries', async () => {
    const test: TestDefinition = {
      name: 'test-trigger',
      type: 'trigger',
      concepts: ['activates-on-relevant', 'ignores-irrelevant'],
      timeout: 30,
      prompt: '',
      expected: [],
      sourcePath: '/test.md',
      positiveTriggers: ['query1', 'query2'],
      negativeTriggers: ['unrelated1', 'unrelated2'],
    };

    // Mock: all positive activate, 1 negative incorrectly activates (false positive)
    vi.mocked(executeTest).mockImplementation(async (testDef) => {
      const isPositive = test.positiveTriggers?.includes(testDef.prompt);
      const isFalsePositive = testDef.prompt === 'unrelated1';
      return {
        response: 'response',
        transcriptPath: '/transcript.jsonl',
        transcript: [],
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        durationMs: 1000,
        toolCount: (isPositive || isFalsePositive) ? 3 : 0,
        success: true,
      };
    });

    const result = await scoreTriggerTest(test, '/skill', '/work');

    expect(result.triggerRate).toBe(100); // All positive activated
    expect(result.falsePositiveRate).toBe(50); // 1 out of 2 negative activated
    expect(result.triggerScore).toBe(50); // 100 * (1 - 0.5) = 50
  });

  it('handles empty positive triggers', async () => {
    const test: TestDefinition = {
      name: 'test-trigger',
      type: 'trigger',
      concepts: ['ignores-irrelevant'],
      timeout: 30,
      prompt: '',
      expected: [],
      sourcePath: '/test.md',
      positiveTriggers: [],
      negativeTriggers: ['unrelated1'],
    };

    vi.mocked(executeTest).mockResolvedValue({
      response: 'response',
      transcriptPath: '/transcript.jsonl',
      transcript: [],
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.001,
      durationMs: 1000,
      toolCount: 0,
      success: true,
    });

    const result = await scoreTriggerTest(test, '/skill', '/work');

    expect(result.triggerRate).toBe(0);
    expect(result.falsePositiveRate).toBe(0);
    expect(result.queryResults).toHaveLength(1);
  });

  it('handles empty negative triggers', async () => {
    const test: TestDefinition = {
      name: 'test-trigger',
      type: 'trigger',
      concepts: ['activates-on-relevant'],
      timeout: 30,
      prompt: '',
      expected: [],
      sourcePath: '/test.md',
      positiveTriggers: ['query1'],
      negativeTriggers: [],
    };

    vi.mocked(executeTest).mockResolvedValue({
      response: 'response',
      transcriptPath: '/transcript.jsonl',
      transcript: [],
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.001,
      durationMs: 1000,
      toolCount: 3,
      success: true,
    });

    const result = await scoreTriggerTest(test, '/skill', '/work');

    expect(result.triggerRate).toBe(100);
    expect(result.falsePositiveRate).toBe(0);
    expect(result.queryResults).toHaveLength(1);
  });

  it('records per-query results with tool counts', async () => {
    const test: TestDefinition = {
      name: 'test-trigger',
      type: 'trigger',
      concepts: ['activates-on-relevant'],
      timeout: 30,
      prompt: '',
      expected: [],
      sourcePath: '/test.md',
      positiveTriggers: ['query1'],
      negativeTriggers: ['unrelated1'],
    };

    vi.mocked(executeTest).mockImplementation(async (testDef) => {
      const isPositive = test.positiveTriggers?.includes(testDef.prompt);
      return {
        response: 'response',
        transcriptPath: '/transcript.jsonl',
        transcript: [],
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        durationMs: 1000,
        toolCount: isPositive ? 5 : 0,
        success: true,
      };
    });

    const result = await scoreTriggerTest(test, '/skill', '/work');

    expect(result.queryResults).toHaveLength(2);
    expect(result.queryResults[0]).toMatchObject({
      query: 'query1',
      expected: 'activate',
      actual: 'activated',
      correct: true,
      toolCount: 5,
    });
    expect(result.queryResults[1]).toMatchObject({
      query: 'unrelated1',
      expected: 'ignore',
      actual: 'ignored',
      correct: true,
      toolCount: 0,
    });
  });
});

describe('aggregateTriggerScores', () => {
  it('returns null for empty array', () => {
    expect(aggregateTriggerScores([])).toBeNull();
  });

  it('averages rates across multiple runs', () => {
    const scores: TriggerScore[] = [
      {
        triggerRate: 100,
        falsePositiveRate: 0,
        triggerScore: 100,
        queryResults: [],
      },
      {
        triggerRate: 80,
        falsePositiveRate: 20,
        triggerScore: 64,
        queryResults: [],
      },
      {
        triggerRate: 90,
        falsePositiveRate: 10,
        triggerScore: 81,
        queryResults: [],
      },
    ];

    const result = aggregateTriggerScores(scores);

    expect(result).not.toBeNull();
    expect(result!.triggerRate).toBe(90); // (100 + 80 + 90) / 3
    expect(result!.falsePositiveRate).toBe(10); // (0 + 20 + 10) / 3
    expect(result!.triggerScore).toBe(81); // 90 * (1 - 10/100) = 81 (recomputed from averaged rates)
  });

  it('takes query results from first run', () => {
    const queryResults = [
      {
        query: 'query1',
        expected: 'activate' as const,
        actual: 'activated' as const,
        correct: true,
        toolCount: 3,
      },
    ];

    const scores: TriggerScore[] = [
      {
        triggerRate: 100,
        falsePositiveRate: 0,
        triggerScore: 100,
        queryResults,
      },
      {
        triggerRate: 100,
        falsePositiveRate: 0,
        triggerScore: 100,
        queryResults: [],
      },
    ];

    const result = aggregateTriggerScores(scores);

    expect(result).not.toBeNull();
    expect(result!.queryResults).toEqual(queryResults);
  });
});
