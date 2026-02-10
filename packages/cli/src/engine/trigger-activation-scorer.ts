/**
 * Trigger activation scorer - validates skill activation on relevant/irrelevant queries.
 *
 * Detects activation by checking toolCount > 0 from Claude CLI execution.
 * Computes trigger rate (positive accuracy) and false positive rate (negative errors).
 */
import type { TestDefinition, TriggerScore } from '../types/index.js';
import { executeTest } from './claude-cli-executor.js';

/**
 * Check if a test is a trigger test
 */
export function isTriggerTest(test: TestDefinition): boolean {
  return test.type === 'trigger';
}

/**
 * Score trigger activation across positive/negative queries.
 *
 * Runs each query through Claude CLI with haiku model (fast/cheap).
 * Checks toolCount > 0 to detect activation.
 *
 * @param test - Trigger test definition with positiveTriggers and negativeTriggers
 * @param skillPath - Path to skill directory
 * @param workDir - Working directory for execution
 * @returns TriggerScore with rates and per-query results
 */
export async function scoreTriggerTest(
  test: TestDefinition,
  skillPath: string,
  workDir: string
): Promise<TriggerScore> {
  const queryResults: TriggerScore['queryResults'] = [];

  // Run positive triggers
  for (const query of test.positiveTriggers || []) {
    const result = await executeTest(
      { ...test, prompt: query, timeout: 30 },
      skillPath,
      'haiku',
      workDir
    );
    const activated = result.success && result.toolCount > 0;
    queryResults.push({
      query,
      expected: 'activate',
      actual: activated ? 'activated' : 'ignored',
      correct: activated,
      toolCount: result.toolCount,
    });
  }

  // Run negative triggers
  for (const query of test.negativeTriggers || []) {
    const result = await executeTest(
      { ...test, prompt: query, timeout: 30 },
      skillPath,
      'haiku',
      workDir
    );
    const activated = result.success && result.toolCount > 0;
    queryResults.push({
      query,
      expected: 'ignore',
      actual: activated ? 'activated' : 'ignored',
      correct: !activated, // Correct if NOT activated
      toolCount: result.toolCount,
    });
  }

  // Calculate rates
  const positiveResults = queryResults.filter((q) => q.expected === 'activate');
  const negativeResults = queryResults.filter((q) => q.expected === 'ignore');

  const triggerRate =
    positiveResults.length > 0
      ? (positiveResults.filter((q) => q.correct).length / positiveResults.length) * 100
      : 0;

  const falsePositiveRate =
    negativeResults.length > 0
      ? (negativeResults.filter((q) => !q.correct).length / negativeResults.length) * 100
      : 0;

  const triggerScore = triggerRate * (1 - falsePositiveRate / 100);

  return { triggerRate, falsePositiveRate, triggerScore, queryResults };
}

/**
 * Aggregate trigger scores from multiple runs.
 *
 * Averages rates across all runs and merges query results.
 *
 * @param scores - Array of TriggerScore objects from multiple runs
 * @returns Aggregated TriggerScore or null if no scores provided
 */
export function aggregateTriggerScores(scores: TriggerScore[]): TriggerScore | null {
  if (scores.length === 0) return null;

  // Average rates across runs, recompute triggerScore from averaged rates
  const avgTriggerRate = scores.reduce((sum, s) => sum + s.triggerRate, 0) / scores.length;
  const avgFalsePositiveRate =
    scores.reduce((sum, s) => sum + s.falsePositiveRate, 0) / scores.length;
  const avgTriggerScore = avgTriggerRate * (1 - avgFalsePositiveRate / 100);

  // Merge query results from all runs (take first run as representative)
  const queryResults = scores[0].queryResults;

  return {
    triggerRate: avgTriggerRate,
    falsePositiveRate: avgFalsePositiveRate,
    triggerScore: avgTriggerScore,
    queryResults,
  };
}
