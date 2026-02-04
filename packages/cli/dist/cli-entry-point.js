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
import { publishResults, publishResultsWithAutoKey } from './commands/publish-results-command.js';
import { viewLeaderboard } from './commands/view-leaderboard-command.js';
import { readApiKeyConfig, getConfigSourceDescription } from './config/api-key-config-reader.js';
import { runAuth, showAuthStatus } from './commands/auth-setup-and-token-storage-command.js';
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
    .option('-t, --tests <path>', 'Path to test suite directory (default: <skill>/tests)')
    .option('-m, --model <model>', 'Model to use (haiku|sonnet|opus)', 'opus')
    .option('-r, --runs <n>', 'Number of iterations', '3')
    .option('-o, --output <dir>', 'Output directory', './skillmark-results')
    .option('-p, --publish', 'Auto-publish results after benchmark completes')
    .option('-k, --api-key <key>', 'API key for publishing (or use config/env)')
    .option('-e, --endpoint <url>', 'API endpoint URL for publishing')
    .option('-v, --verbose', 'Show detailed progress for each test step')
    .action(async (skillSource, options) => {
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
        // Run benchmark
        const result = await runBenchmark(skillSource, {
            tests: options.tests,
            model: model,
            runs,
            output: options.output,
            verbose: options.verbose,
        });
        // Auto-publish if requested
        if (options.publish) {
            console.log(chalk.blue('\n📤 Publishing results...\n'));
            // Get API key from option or config
            let apiKey = options.apiKey;
            let keySource = 'command line';
            if (!apiKey) {
                const config = await readApiKeyConfig();
                if (config) {
                    apiKey = config.apiKey;
                    keySource = getConfigSourceDescription(config.source);
                }
            }
            if (!apiKey) {
                console.error(chalk.red('No API key found.'));
                console.error(chalk.gray('Provide via --api-key, SKILLMARK_API_KEY env, or ~/.skillmarkrc'));
                console.error(chalk.gray('\nGet your API key at: https://skillmark.sh/login'));
                process.exit(1);
            }
            console.log(chalk.gray(`Using API key from ${keySource}`));
            await publishResultsWithAutoKey(result, {
                apiKey,
                endpoint: options.endpoint,
                testsPath: options.tests,
            });
        }
    }
    catch (error) {
        console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
        process.exit(1);
    }
});
// Publish results command
program
    .command('publish')
    .description('Upload benchmark results to leaderboard')
    .argument('<result-file>', 'Path to result.json file')
    .option('-k, --api-key <key>', 'Your skillmark API key (or use config/env)')
    .option('-e, --endpoint <url>', 'API endpoint URL')
    .action(async (resultFile, options) => {
    try {
        // Get API key from option or config
        let apiKey = options.apiKey;
        if (!apiKey) {
            const config = await readApiKeyConfig();
            if (config) {
                apiKey = config.apiKey;
                console.log(chalk.gray(`Using API key from ${getConfigSourceDescription(config.source)}`));
            }
        }
        if (!apiKey) {
            console.error(chalk.red('No API key found.'));
            console.error(chalk.gray('Provide via --api-key, SKILLMARK_API_KEY env, or ~/.skillmarkrc'));
            console.error(chalk.gray('\nGet your API key at: https://skillmark.sh/login'));
            process.exit(1);
        }
        await publishResults(resultFile, {
            apiKey,
            endpoint: options.endpoint,
        });
    }
    catch (error) {
        console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
        process.exit(1);
    }
});
// Auth command - setup Claude CLI OAuth token (required for running benchmarks)
program
    .command('auth')
    .description('Setup Claude CLI authentication (required for running benchmarks)')
    .option('-s, --status', 'Check authentication status')
    .action(async (options) => {
    try {
        if (options.status) {
            await showAuthStatus();
        }
        else {
            await runAuth();
        }
    }
    catch (error) {
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
        process.exit(1);
    }
});
// Login command - save Skillmark API key (for publishing results)
program
    .command('login')
    .description('Save Skillmark API key to ~/.skillmarkrc (for publishing)')
    .argument('<api-key>', 'Your Skillmark API key (get it at https://skillmark.sh/login)')
    .action(async (apiKey) => {
    const { writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { homedir } = await import('node:os');
    try {
        const rcPath = join(homedir(), '.skillmarkrc');
        await writeFile(rcPath, `api_key=${apiKey}\n`, 'utf-8');
        console.log(chalk.green('✓ API key saved to ~/.skillmarkrc'));
        console.log(chalk.gray('\nYou can now use: skillmark run <skill> --publish'));
    }
    catch (error) {
        console.error(chalk.red(`Error saving API key: ${error instanceof Error ? error.message : error}`));
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
    .action(async (skillName, options) => {
    try {
        await viewLeaderboard(skillName, {
            endpoint: options.endpoint,
            limit: parseInt(options.limit, 10),
        });
    }
    catch (error) {
        console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
        process.exit(1);
    }
});
// ASCII logo
const LOGO = `
${chalk.gray('███████╗██╗  ██╗██╗██╗     ██╗     ███╗   ███╗ █████╗ ██████╗ ██╗  ██╗')}
${chalk.gray('██╔════╝██║ ██╔╝██║██║     ██║     ████╗ ████║██╔══██╗██╔══██╗██║ ██╔╝')}
${chalk.white('███████╗█████╔╝ ██║██║     ██║     ██╔████╔██║███████║██████╔╝█████╔╝')}
${chalk.gray('╚════██║██╔═██╗ ██║██║     ██║     ██║╚██╔╝██║██╔══██║██╔══██╗██╔═██╗')}
${chalk.gray('███████║██║  ██╗██║███████╗███████╗██║ ╚═╝ ██║██║  ██║██║  ██║██║  ██╗')}
${chalk.gray('╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝')}
`;
// Show logo and help if no command
if (!process.argv.slice(2).length) {
    console.log(LOGO);
    console.log(chalk.gray('  Agent Skill Benchmarking Platform\n'));
    console.log('  ' + chalk.gray('Examples:'));
    console.log('    ' + chalk.cyan('skillmark run') + ' ~/.claude/skills/my-skill');
    console.log('    ' + chalk.cyan('skillmark run') + ' ./skill --model opus --publish');
    console.log('    ' + chalk.cyan('skillmark publish') + ' ./result.json');
    console.log('    ' + chalk.cyan('skillmark leaderboard'));
    console.log('');
    program.outputHelp();
    process.exit(0);
}
// Parse and execute
program.parse();
//# sourceMappingURL=cli-entry-point.js.map