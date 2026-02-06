/**
 * Publish results command - uploads benchmark results to leaderboard API
 */
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import type { BenchmarkResult, PublishOptions } from '../types/index.js';

/** Default API endpoint */
const DEFAULT_ENDPOINT = 'https://skillmark.sh/api';

/** Test file structure for upload */
interface TestFileUpload {
  name: string;
  content: string;
}

/** Extended publish options for auto-publish */
export interface AutoPublishOptions {
  apiKey: string;
  endpoint?: string;
  testsPath?: string;
}

/**
 * Execute the publish command
 */
export async function publishResults(
  resultPath: string,
  options: PublishOptions
): Promise<void> {
  const spinner = ora();

  try {
    // 1. Load result file
    spinner.start('Loading result file...');
    const fullPath = resolve(resultPath);
    const content = await readFile(fullPath, 'utf-8');
    const result: BenchmarkResult = JSON.parse(content);
    spinner.succeed(`Loaded: ${result.skillName} (${result.model})`);

    // 2. Validate result
    spinner.start('Validating result...');
    validateResult(result);
    spinner.succeed('Result validated');

    // 3. Upload to API
    spinner.start('Uploading to leaderboard...');
    const endpoint = options.endpoint || DEFAULT_ENDPOINT;
    const response = await uploadResult(result, options.apiKey, endpoint);
    spinner.succeed('Uploaded successfully');

    // 4. Display result
    console.log(chalk.green('\n✓ Result published to leaderboard\n'));
    console.log(`${chalk.gray('Skill:')}     ${result.skillName}`);
    console.log(`${chalk.gray('Accuracy:')} ${result.aggregatedMetrics.accuracy.toFixed(1)}%`);
    console.log(`${chalk.gray('Model:')}    ${result.model}`);

    if (response.leaderboardUrl) {
      console.log(`\n${chalk.blue('View leaderboard:')} ${response.leaderboardUrl}`);
    }

    if (response.rank) {
      console.log(`${chalk.gray('Rank:')}     #${response.rank}`);
    }
  } catch (error) {
    spinner.fail('Publish failed');
    throw error;
  }
}

/**
 * Validate result before publishing
 */
function validateResult(result: BenchmarkResult): void {
  // Check required fields
  if (!result.skillId) {
    throw new Error('Invalid result: missing skillId');
  }
  if (!result.skillName) {
    throw new Error('Invalid result: missing skillName');
  }
  if (!result.model || !['haiku', 'sonnet', 'opus'].includes(result.model)) {
    throw new Error('Invalid result: invalid model');
  }
  if (!result.aggregatedMetrics) {
    throw new Error('Invalid result: missing aggregatedMetrics');
  }
  if (!result.hash) {
    throw new Error('Invalid result: missing verification hash');
  }
  if (!result.version) {
    throw new Error('Invalid result: missing version');
  }

  // Validate metrics ranges
  const m = result.aggregatedMetrics;
  if (m.accuracy < 0 || m.accuracy > 100) {
    throw new Error('Invalid result: accuracy out of range');
  }
  if (m.tokensTotal < 0) {
    throw new Error('Invalid result: negative token count');
  }
  if (m.costUsd < 0) {
    throw new Error('Invalid result: negative cost');
  }
}

/**
 * Upload result to API with full metrics
 */
async function uploadResult(
  result: BenchmarkResult,
  apiKey: string,
  endpoint: string
): Promise<{ leaderboardUrl?: string; rank?: number }> {
  const url = `${endpoint}/results`;

  // Extract test files from result's test definitions
  const testFiles = await extractTestFilesFromResult(result);

  // Detect skill.sh link
  const skillshLink = detectSkillshLink(result.skillSource);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Skillmark-Version': result.version,
    },
    body: JSON.stringify({
      skillId: result.skillId,
      skillName: result.skillName,
      source: result.skillSource,
      model: result.model,
      accuracy: result.aggregatedMetrics.accuracy,
      tokensTotal: result.aggregatedMetrics.tokensTotal,
      tokensInput: result.aggregatedMetrics.tokensInput,
      tokensOutput: result.aggregatedMetrics.tokensOutput,
      durationMs: result.aggregatedMetrics.durationMs,
      costUsd: result.aggregatedMetrics.costUsd,
      toolCount: result.aggregatedMetrics.toolCount,
      runs: result.runs,
      hash: result.hash,
      timestamp: result.timestamp,
      rawJson: JSON.stringify(result),
      testFiles: testFiles.length > 0 ? testFiles : undefined,
      skillshLink: skillshLink || undefined,
      securityScore: result.securityScore?.securityScore ?? undefined,
      securityJson: result.securityScore ? JSON.stringify(result.securityScore) : undefined,
      repoUrl: result.repoUrl || undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<{ leaderboardUrl?: string; rank?: number }>;
}

/**
 * Extract test files from result's test definitions (source paths)
 */
async function extractTestFilesFromResult(result: BenchmarkResult): Promise<TestFileUpload[]> {
  const files: TestFileUpload[] = [];
  const seen = new Set<string>();

  for (const tr of result.testResults) {
    const sourcePath = tr.test.sourcePath;
    if (!sourcePath || seen.has(sourcePath)) continue;
    seen.add(sourcePath);

    try {
      const content = await readFile(sourcePath, 'utf-8');
      files.push({ name: basename(sourcePath), content });
    } catch {
      // File may not exist (result from different machine) — skip
    }
  }

  return files;
}

/**
 * Publish results with auto-key (from run command with --publish flag)
 * Includes test files and skill.sh link detection
 */
export async function publishResultsWithAutoKey(
  result: BenchmarkResult,
  options: AutoPublishOptions
): Promise<void> {
  const spinner = ora();

  try {
    // 1. Validate result
    spinner.start('Validating result...');
    validateResult(result);
    spinner.succeed('Result validated');

    // 2. Load test files if path provided
    let testFiles: TestFileUpload[] = [];
    if (options.testsPath) {
      spinner.start('Loading test files...');
      testFiles = await loadTestFiles(options.testsPath);
      spinner.succeed(`Loaded ${testFiles.length} test file(s)`);
    }

    // 3. Detect skill.sh link
    const skillshLink = detectSkillshLink(result.skillSource);

    // 4. Upload to API
    spinner.start('Uploading to leaderboard...');
    const endpoint = options.endpoint || DEFAULT_ENDPOINT;
    const response = await uploadResultWithExtras(
      result,
      options.apiKey,
      endpoint,
      testFiles,
      skillshLink
    );
    spinner.succeed('Uploaded successfully');

    // 5. Display result
    console.log(chalk.green('\n✓ Result published to leaderboard\n'));
    console.log(`${chalk.gray('Skill:')}     ${result.skillName}`);
    console.log(`${chalk.gray('Accuracy:')} ${result.aggregatedMetrics.accuracy.toFixed(1)}%`);
    console.log(`${chalk.gray('Model:')}    ${result.model}`);

    if (response.submitter?.github) {
      console.log(`${chalk.gray('Submitter:')} @${response.submitter.github}`);
    }

    if (response.leaderboardUrl) {
      console.log(`\n${chalk.blue('View leaderboard:')} ${response.leaderboardUrl}`);
    }

    if (response.rank) {
      console.log(`${chalk.gray('Rank:')}     #${response.rank}`);
    }
  } catch (error) {
    spinner.fail('Publish failed');
    throw error;
  }
}

/**
 * Load test files from directory
 */
async function loadTestFiles(testsPath: string): Promise<TestFileUpload[]> {
  const fullPath = resolve(testsPath);
  const files: TestFileUpload[] = [];

  try {
    const entries = await readdir(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = join(fullPath, entry.name);
        const content = await readFile(filePath, 'utf-8');
        files.push({
          name: entry.name,
          content,
        });
      }
    }
  } catch {
    // Directory doesn't exist or can't be read, return empty
  }

  return files;
}

/**
 * Detect if source is from skill.sh registry and return link
 */
function detectSkillshLink(source: string): string | null {
  // Check for skill.sh pattern: skill.sh/user/skill-name
  const skillshMatch = source.match(/^skill\.sh\/([^/]+)\/([^/]+)$/i);
  if (skillshMatch) {
    return `https://skill.sh/${skillshMatch[1]}/${skillshMatch[2]}`;
  }

  // Check for full URL pattern
  const urlMatch = source.match(/^https?:\/\/skill\.sh\/([^/]+)\/([^/]+)/i);
  if (urlMatch) {
    return `https://skill.sh/${urlMatch[1]}/${urlMatch[2]}`;
  }

  return null;
}

/**
 * Upload result with test files and skill.sh link
 */
async function uploadResultWithExtras(
  result: BenchmarkResult,
  apiKey: string,
  endpoint: string,
  testFiles: TestFileUpload[],
  skillshLink: string | null
): Promise<{
  leaderboardUrl?: string;
  rank?: number;
  submitter?: { github: string; avatar: string | null };
}> {
  const url = `${endpoint}/results`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Skillmark-Version': result.version,
    },
    body: JSON.stringify({
      skillId: result.skillId,
      skillName: result.skillName,
      source: result.skillSource,
      model: result.model,
      accuracy: result.aggregatedMetrics.accuracy,
      tokensTotal: result.aggregatedMetrics.tokensTotal,
      tokensInput: result.aggregatedMetrics.tokensInput,
      tokensOutput: result.aggregatedMetrics.tokensOutput,
      durationMs: result.aggregatedMetrics.durationMs,
      costUsd: result.aggregatedMetrics.costUsd,
      toolCount: result.aggregatedMetrics.toolCount,
      runs: result.runs,
      hash: result.hash,
      timestamp: result.timestamp,
      rawJson: JSON.stringify(result),
      testFiles: testFiles.length > 0 ? testFiles : undefined,
      skillshLink: skillshLink || undefined,
      securityScore: result.securityScore?.securityScore ?? undefined,
      securityJson: result.securityScore ? JSON.stringify(result.securityScore) : undefined,
      repoUrl: result.repoUrl || undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<{
    leaderboardUrl?: string;
    rank?: number;
    submitter?: { github: string; avatar: string | null };
  }>;
}

/**
 * Verify API key is valid
 */
export async function verifyApiKey(
  apiKey: string,
  endpoint: string = DEFAULT_ENDPOINT
): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
