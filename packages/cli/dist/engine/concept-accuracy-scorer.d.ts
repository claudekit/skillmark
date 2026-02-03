/**
 * Concept accuracy scorer - calculates how well responses match expected concepts
 */
import type { TestDefinition, TestResult, BenchmarkMetrics } from '../types/index.js';
/** Scoring options */
export interface ScoringOptions {
    /** Minimum similarity threshold for fuzzy matching (0-1) */
    fuzzyThreshold?: number;
    /** Whether to use case-insensitive matching */
    caseInsensitive?: boolean;
}
/**
 * Score a response against expected concepts
 */
export declare function scoreResponse(test: TestDefinition, response: string, metrics: BenchmarkMetrics, options?: ScoringOptions): TestResult;
/**
 * Aggregate metrics from multiple test results
 */
export declare function aggregateMetrics(results: TestResult[]): BenchmarkMetrics;
/**
 * Calculate pass rate from test results
 */
export declare function calculatePassRate(results: TestResult[]): number;
//# sourceMappingURL=concept-accuracy-scorer.d.ts.map