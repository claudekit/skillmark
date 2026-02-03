/**
 * JSONL transcript parser - extracts metrics and data from Claude CLI transcripts
 */
import { readFile } from 'node:fs/promises';
/**
 * Parse a JSONL transcript file
 */
export async function parseTranscriptFile(filePath) {
    const content = await readFile(filePath, 'utf-8');
    return parseTranscriptContent(content);
}
/**
 * Parse JSONL transcript content
 */
export function parseTranscriptContent(content) {
    const entries = [];
    const lines = content.split('\n').filter((line) => line.trim());
    for (const line of lines) {
        try {
            const entry = JSON.parse(line);
            entries.push(entry);
        }
        catch {
            // Skip non-JSON lines (like progress indicators)
        }
    }
    const metrics = calculateMetrics(entries);
    const response = extractFinalResponse(entries);
    const model = extractModel(entries);
    const toolCalls = extractToolCalls(entries);
    return { entries, metrics, response, model, toolCalls };
}
/**
 * Calculate aggregate metrics from transcript entries
 */
function calculateMetrics(entries) {
    let tokensInput = 0;
    let tokensOutput = 0;
    let costUsd = 0;
    let durationMs = 0;
    let toolCount = 0;
    for (const entry of entries) {
        // Accumulate tokens
        if (entry.inputTokens)
            tokensInput += entry.inputTokens;
        if (entry.outputTokens)
            tokensOutput += entry.outputTokens;
        if (entry.cacheCreationInputTokens)
            tokensInput += entry.cacheCreationInputTokens;
        if (entry.cacheReadInputTokens)
            tokensInput += entry.cacheReadInputTokens;
        // Accumulate cost
        if (entry.costUSD)
            costUsd += entry.costUSD;
        // Accumulate duration
        if (entry.durationMs)
            durationMs += entry.durationMs;
        // Count tool uses in assistant messages
        if (entry.type === 'assistant' && entry.message?.content) {
            const content = entry.message.content;
            if (Array.isArray(content)) {
                toolCount += content.filter((c) => c.type === 'tool_use').length;
            }
        }
    }
    const tokensTotal = tokensInput + tokensOutput;
    return {
        accuracy: 0, // Calculated separately by scorer
        tokensTotal,
        tokensInput,
        tokensOutput,
        durationMs,
        toolCount,
        costUsd,
    };
}
/**
 * Extract the final response text from transcript
 */
function extractFinalResponse(entries) {
    // Iterate backwards to find last assistant message with text
    for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.type === 'assistant' && entry.message?.content) {
            const content = entry.message.content;
            if (typeof content === 'string') {
                return content;
            }
            if (Array.isArray(content)) {
                const textParts = content
                    .filter((c) => c.type === 'text' && c.text)
                    .map((c) => c.text);
                if (textParts.length > 0) {
                    return textParts.join('\n');
                }
            }
        }
    }
    return '';
}
/**
 * Extract model from transcript
 */
function extractModel(entries) {
    for (const entry of entries) {
        if (entry.message?.model) {
            return entry.message.model;
        }
    }
    return 'unknown';
}
/**
 * Extract tool calls from transcript
 */
function extractToolCalls(entries) {
    const toolCalls = [];
    const pendingCalls = new Map();
    for (const entry of entries) {
        if (entry.type === 'assistant' && entry.message?.content) {
            const content = entry.message.content;
            if (Array.isArray(content)) {
                for (const item of content) {
                    if (item.type === 'tool_use') {
                        const call = {
                            name: item.name,
                            input: item.input,
                        };
                        const id = item.id;
                        pendingCalls.set(id, call);
                        toolCalls.push(call);
                    }
                }
            }
        }
        // Match tool results
        if (entry.type === 'result' && entry.message?.content) {
            const content = entry.message.content;
            if (Array.isArray(content)) {
                for (const item of content) {
                    if (item.type === 'tool_result' && item.tool_use_id) {
                        const call = pendingCalls.get(item.tool_use_id);
                        if (call) {
                            call.result = item.text;
                        }
                    }
                }
            }
        }
    }
    return toolCalls;
}
/**
 * Extract all assistant text responses (not just final)
 */
export function extractAllResponses(entries) {
    const responses = [];
    for (const entry of entries) {
        if (entry.type === 'assistant' && entry.message?.content) {
            const content = entry.message.content;
            if (typeof content === 'string') {
                responses.push(content);
            }
            else if (Array.isArray(content)) {
                const textParts = content
                    .filter((c) => c.type === 'text' && c.text)
                    .map((c) => c.text);
                if (textParts.length > 0) {
                    responses.push(textParts.join('\n'));
                }
            }
        }
    }
    return responses;
}
//# sourceMappingURL=transcript-jsonl-parser.js.map