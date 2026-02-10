/**
 * Run benchmark command - executes benchmarks against a skill
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import chalk from 'chalk';
import ora from 'ora';
import type {
  BenchmarkResult,
  TestResult,
  TestDefinition,
  RunOptions,
  BenchmarkMetrics,
  BaselineComparison,
  BaselineTestComparison,
  BaselineDelta,
} from '../types/index.js';
import { resolveSkillSource, formatSourceDisplay } from '../sources/unified-skill-source-resolver.js';
import { loadTestsFromDirectory, discoverTests, generateTestsFromSkillMd } from '../engine/markdown-test-definition-parser.js';
import { executeTest, cleanupTranscripts } from '../engine/claude-cli-executor.js';
import { scoreResponse, aggregateMetrics, computeConsistencyMetrics } from '../engine/concept-accuracy-scorer.js';
import { scoreSecurityResponse, aggregateSecurityScores, isSecurityTest } from '../engine/security-test-scorer.js';
import { isTriggerTest, scoreTriggerTest, aggregateTriggerScores } from '../engine/trigger-activation-scorer.js';
import { getStoredToken, runAuth } from './auth-setup-and-token-storage-command.js';
import { detectGitRepoUrl } from '../engine/git-repo-url-detector.js';
import { generateMarkdownReport, printConsoleSummary } from '../engine/benchmark-report-generator.js';

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

/** Average an array of BenchmarkMetrics into a single metrics object */
function averageMetrics(results: TestResult[]): BenchmarkMetrics {
  const n = results.length;
  return {
    accuracy: results.reduce((s, r) => s + r.metrics.accuracy, 0) / n,
    tokensTotal: results.reduce((s, r) => s + r.metrics.tokensTotal, 0) / n,
    tokensInput: results.reduce((s, r) => s + r.metrics.tokensInput, 0) / n,
    tokensOutput: results.reduce((s, r) => s + r.metrics.tokensOutput, 0) / n,
    durationMs: results.reduce((s, r) => s + r.metrics.durationMs, 0) / n,
    toolCount: results.reduce((s, r) => s + r.metrics.toolCount, 0) / n,
    costUsd: results.reduce((s, r) => s + r.metrics.costUsd, 0) / n,
  };
}

/**
 * Compute baseline comparison between with-skill and without-skill results.
 * Groups multi-run results by test name and averages metrics before comparing.
 */
export function computeBaselineComparison(
  withSkill: TestResult[],
  withoutSkill: TestResult[]
): BaselineComparison {
  const tests: BaselineTestComparison[] = [];

  // Group results by test name (handles multi-run)
  const wsGroups = new Map<string, TestResult[]>();
  for (const ws of withSkill) {
    if (ws.test.type === 'security' || ws.test.type === 'trigger') continue;
    const group = wsGroups.get(ws.test.name) || [];
    group.push(ws);
    wsGroups.set(ws.test.name, group);
  }

  const wosGroups = new Map<string, TestResult[]>();
  for (const wos of withoutSkill) {
    if (wos.test.type === 'security' || wos.test.type === 'trigger') continue;
    const group = wosGroups.get(wos.test.name) || [];
    group.push(wos);
    wosGroups.set(wos.test.name, group);
  }

  // Compare averaged metrics per test name
  for (const [testName, wsResults] of wsGroups) {
    const wosResults = wosGroups.get(testName);
    if (!wosResults) continue;

    const wsAvg = averageMetrics(wsResults);
    const wosAvg = averageMetrics(wosResults);

    tests.push({
      testName,
      withSkill: wsAvg,
      withoutSkill: wosAvg,
      delta: {
        accuracyDelta: wsAvg.accuracy - wosAvg.accuracy,
        tokenReduction: wosAvg.tokensTotal > 0
          ? ((wosAvg.tokensTotal - wsAvg.tokensTotal) / wosAvg.tokensTotal) * 100
          : 0,
        toolCountDelta: wosAvg.toolCount - wsAvg.toolCount,
        costDelta: wosAvg.costUsd - wsAvg.costUsd,
        durationDelta: wosAvg.durationMs - wsAvg.durationMs,
      },
    });
  }

  // Average deltas across all tests
  const aggregatedDelta: BaselineDelta = tests.length > 0
    ? {
        accuracyDelta: tests.reduce((s, t) => s + t.delta.accuracyDelta, 0) / tests.length,
        tokenReduction: tests.reduce((s, t) => s + t.delta.tokenReduction, 0) / tests.length,
        toolCountDelta: tests.reduce((s, t) => s + t.delta.toolCountDelta, 0) / tests.length,
        costDelta: tests.reduce((s, t) => s + t.delta.costDelta, 0) / tests.length,
        durationDelta: tests.reduce((s, t) => s + t.delta.durationDelta, 0) / tests.length,
      }
    : {
        accuracyDelta: 0,
        tokenReduction: 0,
        toolCountDelta: 0,
        costDelta: 0,
        durationDelta: 0,
      };

  return { tests, aggregatedDelta };
}

/**
 * Execute a single test, score the result, and print status.
 * Returns TestResult or null if execution failed.
 * Note: Trigger tests are NOT handled here - they use a separate flow.
 */
async function runSingleTest(
  test: TestDefinition,
  skillPath: string,
  model: 'haiku' | 'sonnet' | 'opus',
  workDir: string,
  verbose: boolean,
  spinner: ReturnType<typeof ora>
): Promise<TestResult | null> {
  // Trigger tests handled separately - skip in main flow
  if (isTriggerTest(test)) {
    return null;
  }

  const testStart = Date.now();
  if (verbose) {
    console.log(chalk.cyan(`\n▶ Starting: ${test.name}`));
    console.log(chalk.gray(`  Type: ${test.type} | Timeout: ${test.timeout * 2}s (2x) | Concepts: ${test.concepts.length}`));
  } else {
    spinner.start(`Testing: ${test.name}`);
  }

  let elapsedTimer: ReturnType<typeof setInterval> | null = null;
  try {
    if (verbose) {
      const cliStart = Date.now();
      process.stdout.write(chalk.gray(`  Invoking Claude CLI... 0s`));
      elapsedTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - cliStart) / 1000);
        process.stdout.write(`\r${chalk.gray(`  Invoking Claude CLI... ${elapsed}s`)}`);
      }, 1000);
    }

    const execution = await executeTest(test, skillPath, model, workDir);

    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      process.stdout.write('\n');
    }

    if (!execution.success) {
      if (verbose) {
        console.log(chalk.red(`  ✗ Failed: ${execution.error}`));
      } else {
        spinner.fail(`${test.name}: ${execution.error}`);
      }
      return null;
    }

    if (verbose) {
      const elapsed = ((Date.now() - testStart) / 1000).toFixed(1);
      console.log(chalk.gray(`  Execution complete (${elapsed}s)`));
      console.log(chalk.gray(`  Tokens: ${execution.inputTokens + execution.outputTokens} | Tools: ${execution.toolCount} | Cost: $${execution.costUsd.toFixed(4)}`));
    }

    const metrics: BenchmarkMetrics = {
      accuracy: 0,
      tokensTotal: execution.inputTokens + execution.outputTokens,
      tokensInput: execution.inputTokens,
      tokensOutput: execution.outputTokens,
      durationMs: execution.durationMs,
      toolCount: execution.toolCount,
      costUsd: execution.costUsd,
    };

    const result = isSecurityTest(test)
      ? scoreSecurityResponse(test, execution.response, metrics)
      : scoreResponse(test, execution.response, metrics);

    // Display result
    const status = result.passed ? chalk.green('✓') : chalk.yellow('○');
    const accuracy = result.metrics.accuracy.toFixed(1);
    const isSecTest = isSecurityTest(test);

    if (verbose) {
      console.log(chalk.gray(`  Scoring response...`));
      if (isSecTest) {
        console.log(`  ${status} Security: ${accuracy}% score (${test.category || 'general'})`);
        const leaked = result.missedConcepts.filter(c => c.startsWith('[LEAKED]'));
        if (leaked.length > 0) {
          console.log(chalk.red(`  Leaked: ${leaked.map(c => c.replace('[LEAKED] ', '')).join(', ')}`));
        }
      } else {
        console.log(`  ${status} Result: ${accuracy}% accuracy (${result.matchedConcepts.length}/${test.concepts.length} concepts)`);
        if (result.matchedConcepts.length > 0) {
          console.log(chalk.green(`  Matched: ${result.matchedConcepts.join(', ')}`));
        }
        if (result.missedConcepts.length > 0) {
          console.log(chalk.yellow(`  Missed: ${result.missedConcepts.join(', ')}`));
        }
      }
    } else {
      const label = isSecTest
        ? `${test.name}: ${accuracy}% security (${test.category || 'general'})`
        : `${test.name}: ${accuracy}% (${result.matchedConcepts.length}/${test.concepts.length} concepts)`;
      spinner.succeed(`${status} ${label}`);

      if (!isSecTest && result.missedConcepts.length > 0 && result.missedConcepts.length <= 3) {
        console.log(chalk.gray(`   Missed: ${result.missedConcepts.join(', ')}`));
      }
    }

    return result;
  } catch (error) {
    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      process.stdout.write('\n');
    }
    if (verbose) {
      console.log(chalk.red(`  ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    } else {
      spinner.fail(`${test.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return null;
  }
}

/**
 * Execute a baseline test (without skill).
 * Similar to runSingleTest but passes empty skillPath to disable --allowedTools.
 */
async function runBaselineTest(
  test: TestDefinition,
  model: 'haiku' | 'sonnet' | 'opus',
  workDir: string,
  verbose: boolean,
  spinner: ReturnType<typeof ora>
): Promise<TestResult | null> {
  // Trigger tests handled separately - skip in main flow
  if (isTriggerTest(test)) {
    return null;
  }

  const testStart = Date.now();
  if (verbose) {
    console.log(chalk.cyan(`\n▶ [BASELINE] Starting: ${test.name}`));
    console.log(chalk.gray(`  Type: ${test.type} | Timeout: ${test.timeout * 2}s (2x) | Concepts: ${test.concepts.length}`));
  } else {
    spinner.start(`[BASELINE] Testing: ${test.name}`);
  }

  let elapsedTimer: ReturnType<typeof setInterval> | null = null;
  try {
    if (verbose) {
      const cliStart = Date.now();
      process.stdout.write(chalk.gray(`  Invoking Claude CLI... 0s`));
      elapsedTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - cliStart) / 1000);
        process.stdout.write(`\r${chalk.gray(`  Invoking Claude CLI... ${elapsed}s`)}`);
      }, 1000);
    }

    // Execute WITHOUT skill (empty skillPath = no --allowedTools)
    const execution = await executeTest(test, '', model, workDir);

    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      process.stdout.write('\n');
    }

    if (!execution.success) {
      if (verbose) {
        console.log(chalk.red(`  ✗ Failed: ${execution.error}`));
      } else {
        spinner.fail(`[BASELINE] ${test.name}: ${execution.error}`);
      }
      return null;
    }

    if (verbose) {
      const elapsed = ((Date.now() - testStart) / 1000).toFixed(1);
      console.log(chalk.gray(`  Execution complete (${elapsed}s)`));
      console.log(chalk.gray(`  Tokens: ${execution.inputTokens + execution.outputTokens} | Tools: ${execution.toolCount} | Cost: $${execution.costUsd.toFixed(4)}`));
    }

    const metrics: BenchmarkMetrics = {
      accuracy: 0,
      tokensTotal: execution.inputTokens + execution.outputTokens,
      tokensInput: execution.inputTokens,
      tokensOutput: execution.outputTokens,
      durationMs: execution.durationMs,
      toolCount: execution.toolCount,
      costUsd: execution.costUsd,
    };

    const result = isSecurityTest(test)
      ? scoreSecurityResponse(test, execution.response, metrics)
      : scoreResponse(test, execution.response, metrics);

    // Display result
    const status = result.passed ? chalk.green('✓') : chalk.yellow('○');
    const accuracy = result.metrics.accuracy.toFixed(1);

    if (verbose) {
      console.log(chalk.gray(`  Scoring response...`));
      console.log(`  ${status} [BASELINE] Result: ${accuracy}% accuracy (${result.matchedConcepts.length}/${test.concepts.length} concepts)`);
    } else {
      spinner.succeed(`${status} [BASELINE] ${test.name}: ${accuracy}% (${result.matchedConcepts.length}/${test.concepts.length} concepts)`);
    }

    return result;
  } catch (error) {
    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      process.stdout.write('\n');
    }
    if (verbose) {
      console.log(chalk.red(`  ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    } else {
      spinner.fail(`[BASELINE] ${test.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return null;
  }
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
    let authCheck = await verifyClaudeAuth();
    if (!authCheck.ok) {
      spinner.warn('Not authenticated - starting auth setup...');
      console.log('');
      await runAuth();
      console.log('');
      // Verify again after auth
      spinner.start('Verifying authentication...');
      authCheck = await verifyClaudeAuth();
      if (!authCheck.ok) {
        spinner.fail('Authentication still failed');
        throw new Error(authCheck.error);
      }
    }
    spinner.succeed('Claude CLI authenticated');

    // 1. Resolve skill source
    spinner.start('Resolving skill source...');
    const skill = await resolveSkillSource(skillSource);
    spinner.succeed(`Resolved: ${formatSourceDisplay(skill)}`);

    // 1b. Detect git repo URL
    const repoUrl = await detectGitRepoUrl(skill.localPath);
    if (repoUrl) {
      console.log(chalk.gray(`  Repo: ${repoUrl}`));
    }

    // 2. Load test definitions
    spinner.start('Loading test definitions...');
    let tests;
    if (options.generateTests) {
      // Force regenerate tests from SKILL.md
      const testsDir = join(skill.localPath, 'tests');
      await rm(testsDir, { recursive: true, force: true });
      spinner.text = 'Regenerating tests from SKILL.md...';
      tests = await generateTestsFromSkillMd(skill.localPath, {
        promptContext: options.promptContext,
        model: options.generateModel || 'opus',
      });
    } else if (options.tests) {
      // Use explicit tests path
      tests = await loadTestsFromDirectory(resolve(options.tests));
    } else {
      // Auto-discover tests in skill directory
      tests = await discoverTests(skill.localPath, {
        promptContext: options.promptContext,
        model: options.generateModel || 'opus',
      });
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
    const parallel = options.parallel ?? false;

    // Separate trigger tests from regular tests
    const triggerTests = tests.filter(isTriggerTest);
    const regularTests = tests.filter((t) => !isTriggerTest(t));

    console.log(
      chalk.blue(`\nRunning ${regularTests.length} test(s) × ${options.runs} run(s) with ${options.model}${parallel ? ' (parallel)' : ''}${verbose ? ' (verbose)' : ''}\n`)
    );

    const allResults: TestResult[] = [];
    const workDir = process.cwd();

    for (let run = 1; run <= options.runs; run++) {
      console.log(chalk.gray(`── Run ${run}/${options.runs} ──`));

      if (parallel) {
        // Parallel execution — spawn all tests simultaneously
        console.log(chalk.gray(`  Running ${regularTests.length} tests in parallel...`));
        const promises = regularTests.map((test) =>
          runSingleTest(test, skill.localPath, options.model, workDir, verbose, spinner)
        );
        const results = await Promise.allSettled(promises);

        for (const settled of results) {
          if (settled.status === 'fulfilled' && settled.value) {
            allResults.push(settled.value);
          }
        }
      } else {
        // Sequential execution
        for (const test of regularTests) {
          const result = await runSingleTest(test, skill.localPath, options.model, workDir, verbose, spinner);
          if (result) {
            allResults.push(result);
          }
        }
      }
    }

    // 4b. Run trigger tests separately (single run only, always use haiku)
    const allTriggerScores: import('../types/index.js').TriggerScore[] = [];
    if (triggerTests.length > 0) {
      console.log(chalk.blue(`\nRunning ${triggerTests.length} trigger test(s) with haiku\n`));

      for (let run = 1; run <= options.runs; run++) {
        console.log(chalk.gray(`── Trigger Run ${run}/${options.runs} ──`));

        for (const test of triggerTests) {
          spinner.start(`Trigger test: ${test.name}`);
          try {
            const triggerScore = await scoreTriggerTest(test, skill.localPath, workDir);
            allTriggerScores.push(triggerScore);

            const rate = triggerScore.triggerRate.toFixed(1);
            const fpRate = triggerScore.falsePositiveRate.toFixed(1);
            const score = triggerScore.triggerScore.toFixed(1);
            spinner.succeed(
              `✓ ${test.name}: ${score}% (trigger: ${rate}%, FP: ${fpRate}%)`
            );
          } catch (error) {
            spinner.fail(`${test.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    }

    // 4c. Run baseline tests (if --with-baseline flag set)
    let baseline: BaselineComparison | undefined;
    if (options.withBaseline) {
      console.log(chalk.blue('\n── Running Baseline (without skill) ──\n'));
      const baselineResults: TestResult[] = [];

      for (let run = 1; run <= options.runs; run++) {
        console.log(chalk.gray(`── Baseline Run ${run}/${options.runs} ──`));

        for (const test of regularTests) {
          // Skip security and trigger tests in baseline
          if (test.type === 'security' || test.type === 'trigger') continue;

          const result = await runBaselineTest(test, options.model, workDir, verbose, spinner);
          if (result) {
            baselineResults.push(result);
          }
        }
      }

      if (baselineResults.length > 0) {
        baseline = computeBaselineComparison(allResults, baselineResults);
      }
    }

    // 5. Aggregate results
    const aggregated = aggregateMetrics(allResults);
    const securityScore = aggregateSecurityScores(allResults);
    const triggerScore = aggregateTriggerScores(allTriggerScores);
    const consistency = options.runs > 1 ? computeConsistencyMetrics(allResults) : null;

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
      ...(securityScore && { securityScore }),
      ...(repoUrl && { repoUrl }),
      ...(consistency && { consistency }),
      ...(triggerScore && { triggerScore }),
      ...(baseline && { baseline }),
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
    printConsoleSummary(benchmarkResult);

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
    securityScore: result.securityScore?.securityScore ?? null,
    tokensTotal: result.aggregatedMetrics.tokensTotal,
    timestamp: result.timestamp,
  };
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
}
