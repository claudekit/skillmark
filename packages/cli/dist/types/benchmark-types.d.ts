/**
 * Core types for Skillmark benchmark system
 */
/** Test definition parsed from markdown frontmatter */
export interface TestDefinition {
    /** Unique test identifier */
    name: string;
    /** Type of test: knowledge (Q&A) or task (execution) */
    type: 'knowledge' | 'task';
    /** Concepts to check in response */
    concepts: string[];
    /** Timeout in seconds */
    timeout: number;
    /** The prompt to send to Claude */
    prompt: string;
    /** Expected response patterns/criteria */
    expected: string[];
    /** Source file path */
    sourcePath: string;
}
/** Metrics collected from a single benchmark run */
export interface BenchmarkMetrics {
    /** Accuracy percentage (concepts matched / total) */
    accuracy: number;
    /** Total tokens consumed */
    tokensTotal: number;
    /** Input tokens */
    tokensInput: number;
    /** Output tokens */
    tokensOutput: number;
    /** Wall-clock time in milliseconds */
    durationMs: number;
    /** Number of tool calls made */
    toolCount: number;
    /** Estimated API cost in USD */
    costUsd: number;
}
/** Result of a single test execution */
export interface TestResult {
    /** Test definition */
    test: TestDefinition;
    /** Collected metrics */
    metrics: BenchmarkMetrics;
    /** Concepts that were matched */
    matchedConcepts: string[];
    /** Concepts that were missed */
    missedConcepts: string[];
    /** Claude's response */
    response: string;
    /** Run timestamp */
    timestamp: string;
    /** Whether the test passed accuracy threshold */
    passed: boolean;
}
/** Aggregated results across multiple runs */
export interface BenchmarkResult {
    /** Skill identifier */
    skillId: string;
    /** Skill name */
    skillName: string;
    /** Skill source (local path, git URL, or skill.sh path) */
    skillSource: string;
    /** Model used for benchmark */
    model: 'haiku' | 'sonnet' | 'opus';
    /** Number of runs performed */
    runs: number;
    /** Individual test results */
    testResults: TestResult[];
    /** Aggregated metrics (averaged across runs) */
    aggregatedMetrics: BenchmarkMetrics;
    /** Benchmark timestamp */
    timestamp: string;
    /** Skillmark CLI version */
    version: string;
    /** Hash for result verification */
    hash?: string;
}
/** Skill source types */
export type SkillSourceType = 'local' | 'git' | 'skillsh';
/** Parsed skill source information */
export interface SkillSource {
    /** Source type */
    type: SkillSourceType;
    /** Original input (path, URL, or skill.sh identifier) */
    original: string;
    /** Resolved local path (after clone if needed) */
    localPath: string;
    /** Skill name extracted from source */
    name: string;
}
/** CLI run command options */
export interface RunOptions {
    /** Path to test suite */
    tests: string;
    /** Model to use */
    model: 'haiku' | 'sonnet' | 'opus';
    /** Number of iterations */
    runs: number;
    /** Output directory */
    output: string;
    /** Show verbose progress output */
    verbose?: boolean;
}
/** CLI publish command options */
export interface PublishOptions {
    /** API key for authentication */
    apiKey: string;
    /** API endpoint URL */
    endpoint?: string;
}
/** JSONL transcript entry from Claude CLI */
export interface TranscriptEntry {
    type: 'system' | 'human' | 'assistant' | 'result';
    message?: {
        role: string;
        content: string | Array<{
            type: string;
            text?: string;
            tool_use_id?: string;
        }>;
        model?: string;
    };
    costUSD?: number;
    durationMs?: number;
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
}
/** Leaderboard entry from API */
export interface LeaderboardEntry {
    skillId: string;
    skillName: string;
    source: string;
    bestAccuracy: number;
    bestModel: string;
    avgTokens: number;
    avgCost: number;
    lastTested: string;
    totalRuns: number;
}
//# sourceMappingURL=benchmark-types.d.ts.map