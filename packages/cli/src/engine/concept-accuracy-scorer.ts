/**
 * Concept accuracy scorer - calculates how well responses match expected concepts
 */
import type { TestDefinition, TestResult, BenchmarkMetrics, ConsistencyMetrics } from '../types/index.js';

/** Scoring options */
export interface ScoringOptions {
  /** Minimum similarity threshold for fuzzy matching (0-1) */
  fuzzyThreshold?: number;
  /** Whether to use case-insensitive matching */
  caseInsensitive?: boolean;
}

const DEFAULT_OPTIONS: Required<ScoringOptions> = {
  fuzzyThreshold: 0.8,
  caseInsensitive: true,
};

/**
 * Score a response against expected concepts
 */
export function scoreResponse(
  test: TestDefinition,
  response: string,
  metrics: BenchmarkMetrics,
  options: ScoringOptions = {}
): TestResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const normalizedResponse = opts.caseInsensitive ? response.toLowerCase() : response;

  const matchedConcepts: string[] = [];
  const missedConcepts: string[] = [];

  // Check each expected concept
  for (const concept of test.concepts) {
    const normalizedConcept = opts.caseInsensitive ? concept.toLowerCase() : concept;

    if (conceptMatches(normalizedResponse, normalizedConcept, opts.fuzzyThreshold)) {
      matchedConcepts.push(concept);
    } else {
      missedConcepts.push(concept);
    }
  }

  // Also check expected patterns from test definition
  for (const expected of test.expected) {
    // Parse checkbox items like "- [ ] Pattern to check"
    const checkboxMatch = expected.match(/^-\s*\[[\sx]\]\s*(.+)$/i);
    const pattern = checkboxMatch ? checkboxMatch[1] : expected;
    const normalizedPattern = opts.caseInsensitive ? pattern.toLowerCase() : pattern;

    // Skip if already in concepts
    if (test.concepts.some((c) => c.toLowerCase() === normalizedPattern)) {
      continue;
    }

    if (conceptMatches(normalizedResponse, normalizedPattern, opts.fuzzyThreshold)) {
      if (!matchedConcepts.includes(pattern)) {
        matchedConcepts.push(pattern);
      }
    } else {
      if (!missedConcepts.includes(pattern)) {
        missedConcepts.push(pattern);
      }
    }
  }

  // Calculate accuracy
  const totalConcepts = matchedConcepts.length + missedConcepts.length;
  const accuracy = totalConcepts > 0 ? (matchedConcepts.length / totalConcepts) * 100 : 0;

  // Update metrics with calculated accuracy
  const scoredMetrics: BenchmarkMetrics = {
    ...metrics,
    accuracy,
  };

  return {
    test,
    metrics: scoredMetrics,
    matchedConcepts,
    missedConcepts,
    response,
    timestamp: new Date().toISOString(),
    passed: accuracy >= 70, // Default passing threshold
  };
}

/**
 * Check if a concept is present in the response
 */
function conceptMatches(response: string, concept: string, fuzzyThreshold: number): boolean {
  // Direct substring match
  if (response.includes(concept)) {
    return true;
  }

  // Word-by-word match for multi-word concepts
  const conceptWords = concept.split(/\s+/).filter((w) => w.length > 2);
  if (conceptWords.length > 1) {
    const matchedWords = conceptWords.filter((word) => response.includes(word));
    const ratio = matchedWords.length / conceptWords.length;
    if (ratio >= fuzzyThreshold) {
      return true;
    }
  }

  // Check for synonyms/variations
  const variations = generateVariations(concept);
  for (const variation of variations) {
    if (response.includes(variation)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate common variations of a concept
 */
function generateVariations(concept: string): string[] {
  const variations: string[] = [];

  // Hyphenated vs spaced
  if (concept.includes('-')) {
    variations.push(concept.replace(/-/g, ' '));
  }
  if (concept.includes(' ')) {
    variations.push(concept.replace(/\s+/g, '-'));
  }

  // Plural/singular
  if (concept.endsWith('s') && concept.length > 3) {
    variations.push(concept.slice(0, -1));
  } else {
    variations.push(concept + 's');
  }

  // Common abbreviations
  const abbreviations: Record<string, string[]> = {
    'context': ['ctx'],
    'configuration': ['config', 'cfg'],
    'documentation': ['docs', 'doc'],
    'application': ['app'],
    'authentication': ['auth'],
    'authorization': ['authz'],
    'database': ['db'],
    'message': ['msg'],
    'response': ['resp'],
    'request': ['req'],
  };

  for (const [full, abbrs] of Object.entries(abbreviations)) {
    if (concept.includes(full)) {
      for (const abbr of abbrs) {
        variations.push(concept.replace(full, abbr));
      }
    }
    for (const abbr of abbrs) {
      if (concept.includes(abbr)) {
        variations.push(concept.replace(abbr, full));
      }
    }
  }

  return variations;
}

/**
 * Aggregate metrics from multiple test results
 */
export function aggregateMetrics(results: TestResult[]): BenchmarkMetrics {
  if (results.length === 0) {
    return {
      accuracy: 0,
      tokensTotal: 0,
      tokensInput: 0,
      tokensOutput: 0,
      durationMs: 0,
      toolCount: 0,
      costUsd: 0,
    };
  }

  const sum = results.reduce(
    (acc, r) => ({
      accuracy: acc.accuracy + r.metrics.accuracy,
      tokensTotal: acc.tokensTotal + r.metrics.tokensTotal,
      tokensInput: acc.tokensInput + r.metrics.tokensInput,
      tokensOutput: acc.tokensOutput + r.metrics.tokensOutput,
      durationMs: acc.durationMs + r.metrics.durationMs,
      toolCount: acc.toolCount + r.metrics.toolCount,
      costUsd: acc.costUsd + r.metrics.costUsd,
    }),
    {
      accuracy: 0,
      tokensTotal: 0,
      tokensInput: 0,
      tokensOutput: 0,
      durationMs: 0,
      toolCount: 0,
      costUsd: 0,
    }
  );

  const count = results.length;

  return {
    accuracy: sum.accuracy / count,
    tokensTotal: Math.round(sum.tokensTotal / count),
    tokensInput: Math.round(sum.tokensInput / count),
    tokensOutput: Math.round(sum.tokensOutput / count),
    durationMs: Math.round(sum.durationMs / count),
    toolCount: Math.round(sum.toolCount / count),
    costUsd: sum.costUsd / count,
  };
}

/**
 * Calculate pass rate from test results
 */
export function calculatePassRate(results: TestResult[]): number {
  if (results.length === 0) return 0;
  const passed = results.filter((r) => r.passed).length;
  return (passed / results.length) * 100;
}

/**
 * Compute consistency metrics from multi-run test results.
 * Returns null if all tests have only single run.
 */
export function computeConsistencyMetrics(results: TestResult[]): ConsistencyMetrics | null {
  // Group results by test name
  const byTest = new Map<string, TestResult[]>();
  for (const result of results) {
    const testName = result.test.name;
    if (!byTest.has(testName)) {
      byTest.set(testName, []);
    }
    byTest.get(testName)!.push(result);
  }

  // Filter out tests with single run
  const multiRunTests = Array.from(byTest.entries()).filter(([, runs]) => runs.length > 1);

  // Return null if no multi-run tests
  if (multiRunTests.length === 0) {
    return null;
  }

  // Compute per-test stats
  const testStats: {
    stdDev: number;
    range: number;
    conceptOverlap: number;
    isFlaky: boolean;
    name: string;
  }[] = [];

  for (const [testName, runs] of multiRunTests) {
    // Compute accuracy stats
    const accuracies = runs.map(r => r.metrics.accuracy);
    const min = Math.min(...accuracies);
    const max = Math.max(...accuracies);
    const range = max - min;
    const avg = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    const variance = accuracies.reduce((s, a) => s + (a - avg) ** 2, 0) / accuracies.length;
    const stdDev = Math.sqrt(variance);

    // Compute concept overlap
    // Intersection: concepts matched in ALL runs
    // Union: concepts matched in ANY run
    const allMatchedConcepts = runs.map(r => new Set(r.matchedConcepts));

    // Intersection: concepts present in all sets
    const intersection = new Set(
      runs[0].matchedConcepts.filter(concept =>
        allMatchedConcepts.every(set => set.has(concept))
      )
    );

    // Union: all unique concepts across all runs
    const union = new Set<string>();
    for (const conceptSet of allMatchedConcepts) {
      for (const concept of conceptSet) {
        union.add(concept);
      }
    }

    const conceptOverlap = union.size > 0 ? (intersection.size / union.size) * 100 : 100;

    // Flag as flaky if range > 20pp
    const isFlaky = range > 20;

    testStats.push({
      stdDev,
      range,
      conceptOverlap,
      isFlaky,
      name: testName,
    });
  }

  // Aggregate across all multi-run tests
  const avgStdDev = testStats.reduce((s, t) => s + t.stdDev, 0) / testStats.length;
  const avgRange = testStats.reduce((s, t) => s + t.range, 0) / testStats.length;
  const avgConceptOverlap = testStats.reduce((s, t) => s + t.conceptOverlap, 0) / testStats.length;
  const flakyTests = testStats.filter(t => t.isFlaky).map(t => t.name);

  // Consistency score: 100 - (avgStdDev * 3), clamped to [0, 100]
  const consistencyScore = Math.max(0, Math.min(100, 100 - avgStdDev * 3));

  return {
    accuracyStdDev: avgStdDev,
    accuracyRange: avgRange,
    consistencyScore,
    conceptOverlap: avgConceptOverlap,
    flakyTests,
  };
}
