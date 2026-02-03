import type { TranscriptEntry, BenchmarkMetrics } from '../types/index.js';
/** Parsed transcript data */
export interface ParsedTranscript {
    entries: TranscriptEntry[];
    metrics: BenchmarkMetrics;
    response: string;
    model: string;
    toolCalls: ToolCall[];
}
/** Tool call extracted from transcript */
export interface ToolCall {
    name: string;
    input: Record<string, unknown>;
    result?: string;
}
/**
 * Parse a JSONL transcript file
 */
export declare function parseTranscriptFile(filePath: string): Promise<ParsedTranscript>;
/**
 * Parse JSONL transcript content
 */
export declare function parseTranscriptContent(content: string): ParsedTranscript;
/**
 * Extract all assistant text responses (not just final)
 */
export declare function extractAllResponses(entries: TranscriptEntry[]): string[];
//# sourceMappingURL=transcript-jsonl-parser.d.ts.map