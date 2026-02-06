/**
 * Generate tests command - generates test files from SKILL.md without running benchmarks
 */
import { resolve, join } from 'node:path';
import { rm } from 'node:fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import type { GenerateTestsOptions } from '../types/index.js';
import { resolveSkillSource, formatSourceDisplay } from '../sources/unified-skill-source-resolver.js';
import { generateTestsFromSkillMd } from '../engine/markdown-test-definition-parser.js';

/**
 * Execute the generate-tests command
 */
export async function generateTests(
  skillSource: string,
  options: GenerateTestsOptions
): Promise<void> {
  const spinner = ora();

  try {
    // 1. Resolve skill source
    spinner.start('Resolving skill source...');
    const skill = await resolveSkillSource(skillSource);
    spinner.succeed(`Resolved: ${formatSourceDisplay(skill)}`);

    // 2. Determine output directory
    const outputDir = options.output ? resolve(options.output) : undefined;

    // 3. Clear existing tests if outputting to skill's tests/ dir
    if (!outputDir) {
      const testsDir = join(skill.localPath, 'tests');
      spinner.start('Clearing existing tests...');
      await rm(testsDir, { recursive: true, force: true });
      spinner.succeed('Cleared existing tests');
    }

    // 4. Generate tests
    spinner.start(`Generating tests using ${options.model} model...`);
    const tests = await generateTestsFromSkillMd(skill.localPath, {
      promptContext: options.promptContext,
      model: options.model,
      outputDir,
    });

    if (tests.length === 0) {
      spinner.fail('No tests generated');
      console.log(chalk.yellow('\nEnsure the skill has a valid SKILL.md with name and description frontmatter.'));
      return;
    }

    spinner.succeed(`Generated ${tests.length} test(s)`);

    // 5. Print summary
    console.log(chalk.bold('\n── Generated Tests ──\n'));
    for (const test of tests) {
      const typeColor = test.type === 'security' ? chalk.magenta : test.type === 'task' ? chalk.blue : chalk.cyan;
      console.log(`  ${typeColor(`[${test.type.toUpperCase()}]`)} ${test.name}`);
      console.log(chalk.gray(`    Concepts: ${test.concepts.length} | Timeout: ${test.timeout}s | Expected: ${test.expected.length} items`));
    }

    const targetDir = outputDir || join(skill.localPath, 'tests');
    console.log(chalk.green(`\nTests written to: ${targetDir}`));
    console.log(chalk.gray('Run benchmarks with: ') + chalk.cyan(`skillmark run ${skillSource}`));
  } catch (error) {
    spinner.fail('Test generation failed');
    throw error;
  }
}
