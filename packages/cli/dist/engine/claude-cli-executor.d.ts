import type { TestDefinition, TranscriptEntry } from '../types/index.js';
/** Result from executing a single test */
export interface ExecutionResult {
    /** Claude's response text */
    response: string;
    /** Path to JSONL transcript */
    transcriptPath: string;
    /** Parsed transcript entries */
    transcript: TranscriptEntry[];
    /** Total input tokens */
    inputTokens: number;
    /** Total output tokens */
    outputTokens: number;
    /** Total cost in USD */
    costUsd: number;
    /** Duration in milliseconds */
    durationMs: number;
    /** Number of tool calls */
    toolCount: number;
    /** Whether execution succeeded */
    success: boolean;
    /** Error message if failed */
    error?: string;
}
/**
 * Execute a test against Claude CLI with a skill
 */
export declare function executeTest(test: TestDefinition, skillPath: string, model: 'haiku' | 'sonnet' | 'opus', workDir: string): Promise<ExecutionResult>;
/**
 * Clean up temporary transcript files
 */
export declare function cleanupTranscripts(workDir: string): Promise<void>;
//# sourceMappingURL=claude-cli-executor.d.ts.map