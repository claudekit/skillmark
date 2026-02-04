/**
 * Run benchmark command - executes benchmarks against a skill
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import chalk from 'chalk';
import ora from 'ora';
import type {
  BenchmarkResult,
  TestResult,
  RunOptions,
  BenchmarkMetrics,
} from '../types/index.js';
import { resolveSkillSource, formatSourceDisplay } from '../sources/unified-skill-source-resolver.js';
import { loadTestsFromDirectory, discoverTests } from '../engine/markdown-test-definition-parser.js';
import { executeTest, cleanupTranscripts } from '../engine/claude-cli-executor.js';
import { scoreResponse, aggregateMetrics } from '../engine/concept-accuracy-scorer.js';
import { getStoredToken } from './auth-setup-and-token-storage-command.js';

/** CLI version */
const VERSION = '0.1.0';

/**
 * Verify Claude CLI authentication before running benchmarks
 */
async function verifyClaudeAuth(): Promise<{ ok: boolean; error?: string; token?: string }> {
  const { spawn } = await import('node:child_process');

  // Get stored token (from env or config file)
  const storedToken = await getStoredToken();

  return new Promise((resolve) => {
    // Prepare environment with token if available
    const env = { ...process.env };
    if (storedToken) {
      env.CLAUDE_CODE_OAUTH_TOKEN = storedToken;
    }

    // Quick test with minimal prompt
    const proc = spawn('claude', ['-p', 'Say OK', '--output-format', 'json', '--model', 'haiku'], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000,
    });

    let stdout = '';
    proc.stdout.on('data', (data) => { stdout += data.toString(); });

    const timeout = setTimeout(() => {
      proc.kill();
      resolve({ ok: false, error: 'Authentication check timed out' });
    }, 30000);

    proc.on('close', () => {
      clearTimeout(timeout);
      try {
        const result = JSON.parse(stdout);
        if (result.is_error && result.result?.includes('Invalid API key')) {
          resolve({
            ok: false,
            error: `Claude CLI not authenticated.\n` +
              `  Run: skillmark auth\n` +
              `  Or set CLAUDE_CODE_OAUTH_TOKEN environment variable.`,
          });
          return;
        }
        resolve({ ok: true, token: storedToken });
      } catch {
        resolve({ ok: true, token: storedToken }); // Assume ok if we can't parse
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ ok: false, error: `Claude CLI not found: ${err.message}` });
    });
  });
}

/**
 * Execute the run command
 */
export async function runBenchmark(
  skillSource: string,
  options: RunOptions
): Promise<BenchmarkResult> {
  const spinner = ora();

  try {
    // 0. Verify Claude CLI authentication
    spinner.start('Verifying Claude CLI authentication...');
    const authCheck = await verifyClaudeAuth();
    if (!authCheck.ok) {
      spinner.fail('Authentication failed');
      throw new Error(authCheck.error);
    }
    spinner.succeed('Claude CLI authenticated');

    // 1. Resolve skill source
    spinner.start('Resolving skill source...');
    const skill = await resolveSkillSource(skillSource);
    spinner.succeed(`Resolved: ${formatSourceDisplay(skill)}`);

    // 2. Load test definitions
    spinner.start('Loading test definitions...');
    let tests;
    if (options.tests) {
      // Use explicit tests path
      tests = await loadTestsFromDirectory(resolve(options.tests));
    } else {
      // Auto-discover tests in skill directory
      tests = await discoverTests(skill.localPath);
    }

    if (tests.length === 0) {
      spinner.fail('No test files found');
      throw new Error(
        'No test files found. Specify --tests <path> or add tests/ directory to skill.'
      );
    }
    spinner.succeed(`Loaded ${tests.length} test(s)`);

    // 3. Create output directory
    const outputDir = resolve(options.output);
    await mkdir(outputDir, { recursive: true });

    // 4. Run benchmarks
    const verbose = options.verbose ?? false;
    console.log(
      chalk.blue(`\nRunning ${tests.length} test(s) × ${options.runs} run(s) with ${options.model}${verbose ? ' (verbose)' : ''}\n`)
    );

    const allResults: TestResult[] = [];
    const workDir = process.cwd();

    for (let run = 1; run <= options.runs; run++) {
      console.log(chalk.gray(`── Run ${run}/${options.runs} ──`));

      for (const test of tests) {
        const testStart = Date.now();
        if (verbose) {
          console.log(chalk.cyan(`\n▶ Starting: ${test.name}`));
          console.log(chalk.gray(`  Type: ${test.type} | Timeout: ${test.timeout}s | Concepts: ${test.concepts.length}`));
        } else {
          spinner.start(`Testing: ${test.name}`);
        }

        try {
          if (verbose) {
            console.log(chalk.gray(`  Invoking Claude CLI...`));
          }

          const execution = await executeTest(test, skill.localPath, options.model, workDir);

          if (!execution.success) {
            if (verbose) {
              console.log(chalk.red(`  ✗ Failed: ${execution.error}`));
            } else {
              spinner.fail(`${test.name}: ${execution.error}`);
            }
            continue;
          }

          if (verbose) {
            const elapsed = ((Date.now() - testStart) / 1000).toFixed(1);
            console.log(chalk.gray(`  Execution complete (${elapsed}s)`));
            console.log(chalk.gray(`  Tokens: ${execution.inputTokens + execution.outputTokens} | Tools: ${execution.toolCount} | Cost: $${execution.costUsd.toFixed(4)}`));
          }

          // Calculate metrics
          const metrics: BenchmarkMetrics = {
            accuracy: 0, // Calculated by scorer
            tokensTotal: execution.inputTokens + execution.outputTokens,
            tokensInput: execution.inputTokens,
            tokensOutput: execution.outputTokens,
            durationMs: execution.durationMs,
            toolCount: execution.toolCount,
            costUsd: execution.costUsd,
          };

          // Score response
          const result = scoreResponse(test, execution.response, metrics);
          allResults.push(result);

          // Display result
          const status = result.passed ? chalk.green('✓') : chalk.yellow('○');
          const accuracy = result.metrics.accuracy.toFixed(1);

          if (verbose) {
            console.log(chalk.gray(`  Scoring response...`));
            console.log(`  ${status} Result: ${accuracy}% accuracy (${result.matchedConcepts.length}/${test.concepts.length} concepts)`);
            if (result.matchedConcepts.length > 0) {
              console.log(chalk.green(`  Matched: ${result.matchedConcepts.join(', ')}`));
            }
            if (result.missedConcepts.length > 0) {
              console.log(chalk.yellow(`  Missed: ${result.missedConcepts.join(', ')}`));
            }
          } else {
            spinner.succeed(
              `${status} ${test.name}: ${accuracy}% (${result.matchedConcepts.length}/${test.concepts.length} concepts)`
            );

            // Show missed concepts if any
            if (result.missedConcepts.length > 0 && result.missedConcepts.length <= 3) {
              console.log(chalk.gray(`   Missed: ${result.missedConcepts.join(', ')}`));
            }
          }
        } catch (error) {
          if (verbose) {
            console.log(chalk.red(`  ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
          } else {
            spinner.fail(`${test.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    }

    // 5. Aggregate results
    const aggregated = aggregateMetrics(allResults);

    const benchmarkResult: BenchmarkResult = {
      skillId: createSkillId(skill.name, skill.original),
      skillName: skill.name,
      skillSource: skill.original,
      model: options.model,
      runs: options.runs,
      testResults: allResults,
      aggregatedMetrics: aggregated,
      timestamp: new Date().toISOString(),
      version: VERSION,
    };

    // Add verification hash
    benchmarkResult.hash = generateResultHash(benchmarkResult);

    // 6. Write outputs
    spinner.start('Writing results...');

    const jsonPath = join(outputDir, 'result.json');
    const mdPath = join(outputDir, 'report.md');

    await writeFile(jsonPath, JSON.stringify(benchmarkResult, null, 2));
    await writeFile(mdPath, generateMarkdownReport(benchmarkResult));

    spinner.succeed(`Results saved to ${outputDir}`);

    // 7. Print summary
    printSummary(benchmarkResult);

    // Cleanup
    await cleanupTranscripts(workDir);

    return benchmarkResult;
  } catch (error) {
    spinner.fail('Benchmark failed');
    throw error;
  }
}

/**
 * Create a unique skill ID
 */
function createSkillId(name: string, source: string): string {
  const hash = createHash('sha256')
    .update(`${name}:${source}`)
    .digest('hex')
    .slice(0, 12);
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${hash}`;
}

/**
 * Generate verification hash for result
 */
function generateResultHash(result: BenchmarkResult): string {
  const data = {
    skillId: result.skillId,
    model: result.model,
    runs: result.runs,
    accuracy: result.aggregatedMetrics.accuracy,
    tokensTotal: result.aggregatedMetrics.tokensTotal,
    timestamp: result.timestamp,
  };
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(result: BenchmarkResult): string {
  const m = result.aggregatedMetrics;

  let md = `# Skillmark Benchmark Report

## Summary

| Metric | Value |
|--------|-------|
| Skill | ${result.skillName} |
| Source | ${result.skillSource} |
| Model | ${result.model} |
| Runs | ${result.runs} |
| Accuracy | ${m.accuracy.toFixed(1)}% |
| Total Tokens | ${m.tokensTotal.toLocaleString()} |
| Duration | ${(m.durationMs / 1000).toFixed(1)}s |
| Cost | $${m.costUsd.toFixed(4)} |
| Tool Calls | ${m.toolCount} |

## Test Results

`;

  // Group results by test name
  const byTest = new Map<string, TestResult[]>();
  for (const r of result.testResults) {
    const existing = byTest.get(r.test.name) || [];
    existing.push(r);
    byTest.set(r.test.name, existing);
  }

  for (const [testName, results] of byTest) {
    const avgAccuracy =
      results.reduce((sum, r) => sum + r.metrics.accuracy, 0) / results.length;
    const status = avgAccuracy >= 70 ? '✓' : '○';

    md += `### ${status} ${testName}

- **Accuracy**: ${avgAccuracy.toFixed(1)}%
- **Concepts Matched**: ${results[0].matchedConcepts.join(', ') || 'None'}
- **Concepts Missed**: ${results[0].missedConcepts.join(', ') || 'None'}

`;
  }

  md += `---

*Generated by Skillmark v${result.version} at ${result.timestamp}*
`;

  return md;
}

/**
 * Print summary to console
 */
function printSummary(result: BenchmarkResult): void {
  const m = result.aggregatedMetrics;

  console.log(chalk.bold('\n═══ Benchmark Summary ═══\n'));

  console.log(`${chalk.gray('Skill:')}      ${result.skillName}`);
  console.log(`${chalk.gray('Model:')}      ${result.model}`);
  console.log(`${chalk.gray('Runs:')}       ${result.runs}`);
  console.log('');

  const accuracyColor = m.accuracy >= 80 ? chalk.green : m.accuracy >= 60 ? chalk.yellow : chalk.red;
  console.log(`${chalk.gray('Accuracy:')}   ${accuracyColor(m.accuracy.toFixed(1) + '%')}`);
  console.log(`${chalk.gray('Tokens:')}     ${m.tokensTotal.toLocaleString()} (in: ${m.tokensInput.toLocaleString()}, out: ${m.tokensOutput.toLocaleString()})`);
  console.log(`${chalk.gray('Duration:')}   ${(m.durationMs / 1000).toFixed(1)}s`);
  console.log(`${chalk.gray('Cost:')}       $${m.costUsd.toFixed(4)}`);
  console.log(`${chalk.gray('Tools:')}      ${m.toolCount} calls`);

  console.log(chalk.gray('\n═════════════════════════\n'));
}
