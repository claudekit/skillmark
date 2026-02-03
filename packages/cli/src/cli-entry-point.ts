#!/usr/bin/env node
/**
 * Skillmark CLI - Agent skill benchmarking tool
 *
 * Commands:
 *   run <skill>      - Run benchmark against a skill
 *   publish <result> - Upload results to leaderboard
 *   leaderboard      - View skill rankings
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { runBenchmark } from './commands/run-benchmark-command.js';
import { publishResults } from './commands/publish-results-command.js';
import { viewLeaderboard } from './commands/view-leaderboard-command.js';

const VERSION = '0.1.0';

const program = new Command();

program
  .name('skillmark')
  .description('Agent skill benchmarking platform with CLI and public leaderboards')
  .version(VERSION);

// Run benchmark command
program
  .command('run')
  .description('Run benchmark against a skill')
  .argument('<skill-source>', 'Skill source (local path, git URL, or skill.sh reference)')
  .option('-t, --tests <path>', 'Path to test suite directory', './tests')
  .option('-m, --model <model>', 'Model to use (haiku|sonnet|opus)', 'sonnet')
  .option('-r, --runs <n>', 'Number of iterations', '3')
  .option('-o, --output <dir>', 'Output directory', './skillmark-results')
  .action(async (skillSource: string, options) => {
    try {
      // Validate model
      const model = options.model.toLowerCase();
      if (!['haiku', 'sonnet', 'opus'].includes(model)) {
        console.error(chalk.red(`Invalid model: ${options.model}`));
        console.error('Valid models: haiku, sonnet, opus');
        process.exit(1);
      }

      // Parse runs
      const runs = parseInt(options.runs, 10);
      if (isNaN(runs) || runs < 1) {
        console.error(chalk.red(`Invalid runs value: ${options.runs}`));
        process.exit(1);
      }

      await runBenchmark(skillSource, {
        tests: options.tests,
        model: model as 'haiku' | 'sonnet' | 'opus',
        runs,
        output: options.output,
      });
    } catch (error) {
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

// Publish results command
program
  .command('publish')
  .description('Upload benchmark results to leaderboard')
  .argument('<result-file>', 'Path to result.json file')
  .requiredOption('-k, --api-key <key>', 'Your skillmark API key')
  .option('-e, --endpoint <url>', 'API endpoint URL')
  .action(async (resultFile: string, options) => {
    try {
      await publishResults(resultFile, {
        apiKey: options.apiKey,
        endpoint: options.endpoint,
      });
    } catch (error) {
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

// Leaderboard command
program
  .command('leaderboard')
  .description('View skill rankings')
  .argument('[skill-name]', 'Optional skill name to view details')
  .option('-l, --limit <n>', 'Number of entries to show', '20')
  .option('-e, --endpoint <url>', 'API endpoint URL')
  .action(async (skillName: string | undefined, options) => {
    try {
      await viewLeaderboard(skillName, {
        endpoint: options.endpoint,
        limit: parseInt(options.limit, 10),
      });
    } catch (error) {
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

// Parse and execute
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.bold('\n  Skillmark') + chalk.gray(' - Agent skill benchmarking\n'));
  console.log('  ' + chalk.gray('Examples:'));
  console.log('    ' + chalk.cyan('skillmark run') + ' ~/.claude/skills/my-skill');
  console.log('    ' + chalk.cyan('skillmark run') + ' https://github.com/user/skill --model opus');
  console.log('    ' + chalk.cyan('skillmark publish') + ' ./skillmark-results/result.json --api-key <key>');
  console.log('    ' + chalk.cyan('skillmark leaderboard'));
  console.log('');
  program.outputHelp();
}
