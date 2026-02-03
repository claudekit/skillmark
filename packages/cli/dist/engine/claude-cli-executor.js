/**
 * Claude CLI executor - invokes Claude CLI and captures output
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
/** Model name mapping for Claude CLI */
const MODEL_MAP = {
    haiku: 'claude-3-5-haiku-latest',
    sonnet: 'claude-sonnet-4-20250514',
    opus: 'claude-opus-4-20250514',
};
/**
 * Execute a test against Claude CLI with a skill
 */
export async function executeTest(test, skillPath, model, workDir) {
    const sessionId = randomUUID();
    const transcriptDir = join(workDir, '.skillmark-transcripts');
    const transcriptPath = join(transcriptDir, `${sessionId}.jsonl`);
    await mkdir(transcriptDir, { recursive: true });
    const startTime = Date.now();
    const modelId = MODEL_MAP[model];
    // Build Claude CLI command
    const args = [
        '--print',
        '--model', modelId,
        '--output-format', 'json',
        '--max-turns', '50',
    ];
    // Add skill if provided
    if (skillPath) {
        args.push('--allowedTools', `Skill(${skillPath})`);
    }
    // Add the prompt
    args.push('--prompt', test.prompt);
    try {
        const result = await runClaudeCli(args, workDir, test.timeout * 1000);
        const durationMs = Date.now() - startTime;
        // Parse the JSONL output from Claude CLI
        const transcript = parseJsonlOutput(result.stdout);
        // Extract metrics from transcript
        const metrics = extractMetrics(transcript);
        // Extract response text
        const response = extractResponse(transcript);
        return {
            response,
            transcriptPath,
            transcript,
            inputTokens: metrics.inputTokens,
            outputTokens: metrics.outputTokens,
            costUsd: metrics.costUsd,
            durationMs,
            toolCount: metrics.toolCount,
            success: true,
        };
    }
    catch (error) {
        return {
            response: '',
            transcriptPath,
            transcript: [],
            inputTokens: 0,
            outputTokens: 0,
            costUsd: 0,
            durationMs: Date.now() - startTime,
            toolCount: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Run Claude CLI as a subprocess
 */
async function runClaudeCli(args, cwd, timeoutMs) {
    return new Promise((resolve, reject) => {
        const proc = spawn('claude', args, {
            cwd,
            env: { ...process.env },
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        const timeout = setTimeout(() => {
            proc.kill('SIGTERM');
            reject(new Error(`Execution timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        proc.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
                resolve({ stdout, stderr });
            }
            else {
                reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
            }
        });
        proc.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}
/**
 * Parse JSONL output from Claude CLI
 */
function parseJsonlOutput(output) {
    const entries = [];
    const lines = output.split('\n').filter((line) => line.trim());
    for (const line of lines) {
        try {
            const entry = JSON.parse(line);
            entries.push(entry);
        }
        catch {
            // Skip non-JSON lines
        }
    }
    return entries;
}
/**
 * Extract metrics from transcript entries
 */
function extractMetrics(transcript) {
    let inputTokens = 0;
    let outputTokens = 0;
    let costUsd = 0;
    let toolCount = 0;
    for (const entry of transcript) {
        if (entry.inputTokens)
            inputTokens += entry.inputTokens;
        if (entry.outputTokens)
            outputTokens += entry.outputTokens;
        if (entry.cacheCreationInputTokens)
            inputTokens += entry.cacheCreationInputTokens;
        if (entry.cacheReadInputTokens)
            inputTokens += entry.cacheReadInputTokens;
        if (entry.costUSD)
            costUsd += entry.costUSD;
        // Count tool uses
        if (entry.type === 'assistant' && entry.message?.content) {
            const content = entry.message.content;
            if (Array.isArray(content)) {
                toolCount += content.filter((c) => c.type === 'tool_use').length;
            }
        }
    }
    return { inputTokens, outputTokens, costUsd, toolCount };
}
/**
 * Extract final response text from transcript
 */
function extractResponse(transcript) {
    // Get last assistant message
    for (let i = transcript.length - 1; i >= 0; i--) {
        const entry = transcript[i];
        if (entry.type === 'assistant' && entry.message?.content) {
            const content = entry.message.content;
            if (typeof content === 'string') {
                return content;
            }
            if (Array.isArray(content)) {
                const textParts = content
                    .filter((c) => c.type === 'text' && c.text)
                    .map((c) => c.text)
                    .join('\n');
                if (textParts)
                    return textParts;
            }
        }
    }
    return '';
}
/**
 * Clean up temporary transcript files
 */
export async function cleanupTranscripts(workDir) {
    const transcriptDir = join(workDir, '.skillmark-transcripts');
    try {
        await rm(transcriptDir, { recursive: true, force: true });
    }
    catch {
        // Ignore cleanup errors
    }
}
//# sourceMappingURL=claude-cli-executor.js.map