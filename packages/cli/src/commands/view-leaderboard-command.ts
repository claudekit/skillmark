/**
 * View leaderboard command - displays skill rankings from API
 */
import chalk from 'chalk';
import ora from 'ora';
import type { LeaderboardEntry } from '../types/index.js';

/** Default API endpoint */
const DEFAULT_ENDPOINT = 'https://skillmark.sh/api';

/**
 * Execute the leaderboard command
 */
export async function viewLeaderboard(
  skillName?: string,
  options: { endpoint?: string; limit?: number } = {}
): Promise<void> {
  const spinner = ora();

  try {
    const endpoint = options.endpoint || DEFAULT_ENDPOINT;
    const limit = options.limit || 20;

    if (skillName) {
      // Show specific skill details
      spinner.start(`Fetching details for ${skillName}...`);
      const skill = await fetchSkillDetails(skillName, endpoint);
      spinner.stop();
      displaySkillDetails(skill);
    } else {
      // Show leaderboard
      spinner.start('Fetching leaderboard...');
      const entries = await fetchLeaderboard(endpoint, limit);
      spinner.stop();
      displayLeaderboard(entries);
    }
  } catch (error) {
    spinner.fail('Failed to fetch leaderboard');
    throw error;
  }
}

/**
 * Fetch leaderboard from API
 */
async function fetchLeaderboard(
  endpoint: string,
  limit: number
): Promise<LeaderboardEntry[]> {
  const url = `${endpoint}/leaderboard?limit=${limit}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error (${response.status}): ${response.statusText}`);
  }

  const data = await response.json() as { entries: LeaderboardEntry[] };
  return data.entries || [];
}

/**
 * Fetch specific skill details from API
 */
async function fetchSkillDetails(
  skillName: string,
  endpoint: string
): Promise<LeaderboardEntry & { history?: Array<{ date: string; accuracy: number }> }> {
  const url = `${endpoint}/skill/${encodeURIComponent(skillName)}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Skill not found: ${skillName}`);
    }
    throw new Error(`API error (${response.status}): ${response.statusText}`);
  }

  return response.json() as Promise<LeaderboardEntry & { history?: Array<{ date: string; accuracy: number }> }>;
}

/**
 * Display leaderboard table
 */
function displayLeaderboard(entries: LeaderboardEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.yellow('\nNo benchmark results found.\n'));
    console.log('Run a benchmark and publish results to appear on the leaderboard:');
    console.log(chalk.gray('  skillmark run <skill-path>'));
    console.log(chalk.gray('  skillmark publish ./skillmark-results/result.json --api-key <key>'));
    return;
  }

  console.log(chalk.bold('\n═══ Skillmark Leaderboard ═══\n'));

  // Header
  console.log(
    chalk.gray(
      padRight('#', 4) +
        padRight('Skill', 30) +
        padRight('Accuracy', 10) +
        padRight('Model', 10) +
        padRight('Tokens', 12) +
        padRight('Cost', 10) +
        'Last Tested'
    )
  );
  console.log(chalk.gray('─'.repeat(100)));

  // Rows
  entries.forEach((entry, index) => {
    const rank = String(index + 1);
    const accuracy = `${entry.bestAccuracy.toFixed(1)}%`;
    const tokens = entry.avgTokens.toLocaleString();
    const cost = `$${entry.avgCost.toFixed(4)}`;
    const lastTested = formatDate(entry.lastTested);

    // Color accuracy
    const accuracyColored =
      entry.bestAccuracy >= 90
        ? chalk.green(accuracy)
        : entry.bestAccuracy >= 70
        ? chalk.yellow(accuracy)
        : chalk.red(accuracy);

    console.log(
      padRight(rank, 4) +
        padRight(truncate(entry.skillName, 28), 30) +
        padRight(accuracyColored, 10 + (accuracyColored.length - accuracy.length)) +
        padRight(entry.bestModel, 10) +
        padRight(tokens, 12) +
        padRight(cost, 10) +
        chalk.gray(lastTested)
    );
  });

  console.log(chalk.gray('\n─'.repeat(100)));
  console.log(chalk.gray(`Showing top ${entries.length} skills\n`));
}

/**
 * Display skill details
 */
function displaySkillDetails(
  skill: LeaderboardEntry & { history?: Array<{ date: string; accuracy: number }> }
): void {
  console.log(chalk.bold(`\n═══ ${skill.skillName} ═══\n`));

  console.log(`${chalk.gray('Source:')}       ${skill.source}`);
  console.log(`${chalk.gray('Best Accuracy:')} ${chalk.green(skill.bestAccuracy.toFixed(1) + '%')}`);
  console.log(`${chalk.gray('Best Model:')}    ${skill.bestModel}`);
  console.log(`${chalk.gray('Avg Tokens:')}    ${skill.avgTokens.toLocaleString()}`);
  console.log(`${chalk.gray('Avg Cost:')}      $${skill.avgCost.toFixed(4)}`);
  console.log(`${chalk.gray('Total Runs:')}    ${skill.totalRuns}`);
  console.log(`${chalk.gray('Last Tested:')}   ${formatDate(skill.lastTested)}`);

  // Show history if available
  if (skill.history && skill.history.length > 0) {
    console.log(chalk.bold('\nRecent Results:\n'));

    for (const h of skill.history.slice(0, 10)) {
      const bar = '█'.repeat(Math.round(h.accuracy / 5));
      const accuracyColor =
        h.accuracy >= 90 ? chalk.green : h.accuracy >= 70 ? chalk.yellow : chalk.red;
      console.log(
        `  ${chalk.gray(formatDate(h.date))} ${accuracyColor(bar)} ${h.accuracy.toFixed(1)}%`
      );
    }
  }

  console.log('');
}

/**
 * Pad string to right
 */
function padRight(str: string, length: number): string {
  return str.padEnd(length);
}

/**
 * Truncate string with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * Format ISO date to readable format
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  } catch {
    return isoDate;
  }
}
