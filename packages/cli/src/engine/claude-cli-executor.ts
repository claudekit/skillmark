/**
 * Claude CLI executor - invokes Claude CLI and captures output
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { TestDefinition, TranscriptEntry } from '../types/index.js';
import { getStoredToken } from '../commands/auth-setup-and-token-storage-command.js';

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

/** Model name mapping for Claude CLI */
const MODEL_MAP: Record<string, string> = {
  haiku: 'claude-3-5-haiku-latest',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514',
};

/**
 * Execute a test against Claude CLI with a skill
 */
export async function executeTest(
  test: TestDefinition,
  skillPath: string,
  model: 'haiku' | 'sonnet' | 'opus',
  workDir: string
): Promise<ExecutionResult> {
  const sessionId = randomUUID();
  const transcriptDir = join(workDir, '.skillmark-transcripts');
  const transcriptPath = join(transcriptDir, `${sessionId}.jsonl`);

  await mkdir(transcriptDir, { recursive: true });

  const startTime = Date.now();
  const modelId = MODEL_MAP[model];

  // Build Claude CLI command
  // -p is the print mode flag that takes the prompt as argument
  const args = [
    '-p', test.prompt,  // Print mode with prompt - non-interactive
    '--model', modelId,
    '--output-format', 'json',
    '--max-turns', '50',
    '--dangerously-skip-permissions',  // Skip permission prompts for benchmarks
  ];

  // Add skill if provided
  if (skillPath) {
    args.push('--allowedTools', `Skill(${skillPath})`);
  }

  try {
    // 2x timeout multiplier — agent tests often need extra time for multi-step work
    const result = await runClaudeCli(args, workDir, test.timeout * 2000);
    const durationMs = Date.now() - startTime;

    // Parse the JSON result from Claude CLI
    const cliResult = parseCliResult(result.stdout);

    return {
      response: cliResult.response,
      transcriptPath,
      transcript: [],  // Simplified - we use the result JSON directly
      inputTokens: cliResult.inputTokens,
      outputTokens: cliResult.outputTokens,
      costUsd: cliResult.costUsd,
      durationMs,
      toolCount: cliResult.toolCount,
      success: true,
    };
  } catch (error) {
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
async function runClaudeCli(
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string }> {
  // Get stored OAuth token
  const storedToken = await getStoredToken();

  // Prepare environment with token if available
  const env = { ...process.env };
  if (storedToken) {
    env.CLAUDE_CODE_OAUTH_TOKEN = storedToken;
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('claude', args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],  // ignore stdin to prevent hanging
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

      // Check for auth errors in JSON response (Claude CLI returns error in JSON, not stderr)
      if (stdout) {
        try {
          const result = JSON.parse(stdout);
          if (result.is_error && result.result) {
            const errorMsg = result.result;
            if (errorMsg.includes('Invalid API key') || errorMsg.includes('/login')) {
              reject(new Error(`Authentication required. Run 'skillmark auth' to authenticate.`));
              return;
            }
            if (result.is_error) {
              reject(new Error(`Claude CLI error: ${errorMsg}`));
              return;
            }
          }
        } catch {
          // Not JSON, continue with normal handling
        }
      }

      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        // Include stdout in error for better diagnostics when stderr is empty
        const errorDetail = stderr || stdout.slice(0, 200) || 'No error details';
        reject(new Error(`Claude CLI exited with code ${code}: ${errorDetail}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/** Claude CLI result JSON structure */
interface CliResultJson {
  type: string;
  subtype?: string;
  result?: string;
  is_error?: boolean;
  total_cost_usd?: number;
  num_turns?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

/**
 * Parse Claude CLI JSON result output
 */
function parseCliResult(output: string): {
  response: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  toolCount: number;
} {
  try {
    // Find the JSON result in the output (may have other text before it)
    const jsonMatch = output.match(/\{[\s\S]*"type"\s*:\s*"result"[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback: try parsing the whole output as JSON
      const parsed = JSON.parse(output.trim()) as CliResultJson;
      return extractFromCliResult(parsed);
    }

    const parsed = JSON.parse(jsonMatch[0]) as CliResultJson;
    return extractFromCliResult(parsed);
  } catch {
    // Return empty result if parsing fails
    return { response: '', inputTokens: 0, outputTokens: 0, costUsd: 0, toolCount: 0 };
  }
}

function extractFromCliResult(result: CliResultJson): {
  response: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  toolCount: number;
} {
  const usage = result.usage || {};
  const inputTokens =
    (usage.input_tokens || 0) +
    (usage.cache_creation_input_tokens || 0) +
    (usage.cache_read_input_tokens || 0);

  return {
    response: result.result || '',
    inputTokens,
    outputTokens: usage.output_tokens || 0,
    costUsd: result.total_cost_usd || 0,
    toolCount: result.num_turns || 0,  // num_turns as proxy for tool usage
  };
}

/**
 * Parse JSONL output from Claude CLI (legacy)
 */
function parseJsonlOutput(output: string): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  const lines = output.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as TranscriptEntry;
      entries.push(entry);
    } catch {
      // Skip non-JSON lines
    }
  }

  return entries;
}

/**
 * Extract metrics from transcript entries
 */
function extractMetrics(transcript: TranscriptEntry[]): {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  toolCount: number;
} {
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  let toolCount = 0;

  for (const entry of transcript) {
    if (entry.inputTokens) inputTokens += entry.inputTokens;
    if (entry.outputTokens) outputTokens += entry.outputTokens;
    if (entry.cacheCreationInputTokens) inputTokens += entry.cacheCreationInputTokens;
    if (entry.cacheReadInputTokens) inputTokens += entry.cacheReadInputTokens;
    if (entry.costUSD) costUsd += entry.costUSD;

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
function extractResponse(transcript: TranscriptEntry[]): string {
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
        if (textParts) return textParts;
      }
    }
  }
  return '';
}

/**
 * Clean up temporary transcript files
 */
export async function cleanupTranscripts(workDir: string): Promise<void> {
  const transcriptDir = join(workDir, '.skillmark-transcripts');
  try {
    await rm(transcriptDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
