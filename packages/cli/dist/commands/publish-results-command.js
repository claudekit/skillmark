/**
 * Publish results command - uploads benchmark results to leaderboard API
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
/** Default API endpoint */
const DEFAULT_ENDPOINT = 'https://skillmark.workers.dev/api';
/**
 * Execute the publish command
 */
export async function publishResults(resultPath, options) {
    const spinner = ora();
    try {
        // 1. Load result file
        spinner.start('Loading result file...');
        const fullPath = resolve(resultPath);
        const content = await readFile(fullPath, 'utf-8');
        const result = JSON.parse(content);
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
    }
    catch (error) {
        spinner.fail('Publish failed');
        throw error;
    }
}
/**
 * Validate result before publishing
 */
function validateResult(result) {
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
 * Upload result to API
 */
async function uploadResult(result, apiKey, endpoint) {
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
            durationMs: result.aggregatedMetrics.durationMs,
            costUsd: result.aggregatedMetrics.costUsd,
            runs: result.runs,
            hash: result.hash,
            timestamp: result.timestamp,
            rawJson: JSON.stringify(result),
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
    }
    return response.json();
}
/**
 * Verify API key is valid
 */
export async function verifyApiKey(apiKey, endpoint = DEFAULT_ENDPOINT) {
    try {
        const response = await fetch(`${endpoint}/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=publish-results-command.js.map