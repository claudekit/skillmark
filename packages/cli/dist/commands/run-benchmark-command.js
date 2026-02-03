/**
 * Run benchmark command - executes benchmarks against a skill
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import chalk from 'chalk';
import ora from 'ora';
import { resolveSkillSource, formatSourceDisplay } from '../sources/unified-skill-source-resolver.js';
import { loadTestsFromDirectory, discoverTests } from '../engine/markdown-test-definition-parser.js';
import { executeTest, cleanupTranscripts } from '../engine/claude-cli-executor.js';
import { scoreResponse, aggregateMetrics } from '../engine/concept-accuracy-scorer.js';
/** CLI version */
const VERSION = '0.1.0';
/**
 * Execute the run command
 */
export async function runBenchmark(skillSource, options) {
    const spinner = ora();
    try {
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
        }
        else {
            // Auto-discover tests in skill directory
            tests = await discoverTests(skill.localPath);
        }
        if (tests.length === 0) {
            spinner.fail('No test files found');
            throw new Error('No test files found. Specify --tests <path> or add tests/ directory to skill.');
        }
        spinner.succeed(`Loaded ${tests.length} test(s)`);
        // 3. Create output directory
        const outputDir = resolve(options.output);
        await mkdir(outputDir, { recursive: true });
        // 4. Run benchmarks
        console.log(chalk.blue(`\nRunning ${tests.length} test(s) × ${options.runs} run(s) with ${options.model}\n`));
        const allResults = [];
        const workDir = process.cwd();
        for (let run = 1; run <= options.runs; run++) {
            console.log(chalk.gray(`── Run ${run}/${options.runs} ──`));
            for (const test of tests) {
                spinner.start(`Testing: ${test.name}`);
                try {
                    const execution = await executeTest(test, skill.localPath, options.model, workDir);
                    if (!execution.success) {
                        spinner.fail(`${test.name}: ${execution.error}`);
                        continue;
                    }
                    // Calculate metrics
                    const metrics = {
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
                    spinner.succeed(`${status} ${test.name}: ${accuracy}% (${result.matchedConcepts.length}/${test.concepts.length} concepts)`);
                    // Show missed concepts if any
                    if (result.missedConcepts.length > 0 && result.missedConcepts.length <= 3) {
                        console.log(chalk.gray(`   Missed: ${result.missedConcepts.join(', ')}`));
                    }
                }
                catch (error) {
                    spinner.fail(`${test.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        }
        // 5. Aggregate results
        const aggregated = aggregateMetrics(allResults);
        const benchmarkResult = {
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
    }
    catch (error) {
        spinner.fail('Benchmark failed');
        throw error;
    }
}
/**
 * Create a unique skill ID
 */
function createSkillId(name, source) {
    const hash = createHash('sha256')
        .update(`${name}:${source}`)
        .digest('hex')
        .slice(0, 12);
    return `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${hash}`;
}
/**
 * Generate verification hash for result
 */
function generateResultHash(result) {
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
function generateMarkdownReport(result) {
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
    const byTest = new Map();
    for (const r of result.testResults) {
        const existing = byTest.get(r.test.name) || [];
        existing.push(r);
        byTest.set(r.test.name, existing);
    }
    for (const [testName, results] of byTest) {
        const avgAccuracy = results.reduce((sum, r) => sum + r.metrics.accuracy, 0) / results.length;
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
function printSummary(result) {
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
//# sourceMappingURL=run-benchmark-command.js.map