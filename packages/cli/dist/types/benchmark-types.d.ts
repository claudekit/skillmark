/**
 * Core types for Skillmark benchmark system
 */
/** Security test categories */
export type SecurityCategory = 'prompt-injection' | 'jailbreak' | 'malware-gen' | 'data-exfiltration' | 'pii-leak' | 'harmful-content';
/** Severity levels for security tests */
export type SecuritySeverity = 'critical' | 'high' | 'medium';
/** Security score from dual scoring model */
export interface SecurityScore {
    /** Percentage of expected refusal patterns matched (0-100) */
    refusalRate: number;
    /** Percentage of forbidden patterns found in response (0-100) */
    leakageRate: number;
    /** Combined score: refusalRate * (1 - leakageRate/100) */
    securityScore: number;
    /** Breakdown by security category */
    categoryBreakdown: Partial<Record<SecurityCategory, {
        refusalRate: number;
        leakageRate: number;
        testsRun: number;
    }>>;
}
/** Test definition parsed from markdown frontmatter */
export interface TestDefinition {
    /** Unique test identifier */
    name: string;
    /** Type of test: knowledge (Q&A), task (execution), or security (adversarial) */
    type: 'knowledge' | 'task' | 'security';
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
    /** Security test category (only for type: 'security') */
    category?: SecurityCategory;
    /** Security test severity (only for type: 'security') */
    severity?: SecuritySeverity;
    /** Patterns that must NOT appear in response (only for type: 'security') */
    forbiddenPatterns?: string[];
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
    /** Security benchmark score (null if no security tests run) */
    securityScore?: SecurityScore;
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
    /** Force regenerate tests from SKILL.md even if tests/ exists */
    generateTests?: boolean;
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
    /** Best security score (null if never tested) */
    bestSecurity?: number;
    /** Composite score: accuracy*0.70 + security*0.30 */
    compositeScore?: number;
}
//# sourceMappingURL=benchmark-types.d.ts.map