/**
 * Auth command - setup Claude CLI authentication for skillmark
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import chalk from 'chalk';

/** Config file location */
const CONFIG_DIR = join(homedir(), '.skillmark');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface SkillmarkConfig {
  claudeOAuthToken?: string;
}

/**
 * Load skillmark config
 */
export async function loadConfig(): Promise<SkillmarkConfig> {
  try {
    const content = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Save skillmark config
 */
async function saveConfig(config: SkillmarkConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Get stored OAuth token
 */
export async function getStoredToken(): Promise<string | undefined> {
  // Check env var first
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return process.env.CLAUDE_CODE_OAUTH_TOKEN;
  }
  // Check config file
  const config = await loadConfig();
  return config.claudeOAuthToken;
}

/**
 * Run the auth setup flow
 */
export async function runAuth(): Promise<void> {
  console.log(chalk.blue('Setting up Claude CLI authentication for skillmark...\n'));

  // Check if already authenticated
  const existingToken = await getStoredToken();
  if (existingToken) {
    const isValid = await testToken(existingToken);
    if (isValid) {
      console.log(chalk.green('✓ Already authenticated'));
      console.log(chalk.gray(`  Token stored in: ${CONFIG_FILE}`));
      return;
    }
    console.log(chalk.yellow('Existing token invalid, re-authenticating...\n'));
  }

  console.log(chalk.gray('This will open your browser for authentication.\n'));

  // Run claude setup-token and capture output
  const token = await runSetupToken();

  if (!token) {
    console.log(chalk.red('\n✗ Authentication failed'));
    console.log(chalk.gray('  You can manually run: claude setup-token'));
    console.log(chalk.gray('  Then set: export CLAUDE_CODE_OAUTH_TOKEN=<token>'));
    process.exit(1);
  }

  // Save token to config
  const config = await loadConfig();
  config.claudeOAuthToken = token;
  await saveConfig(config);

  console.log(chalk.green('\n✓ Authentication successful'));
  console.log(chalk.gray(`  Token saved to: ${CONFIG_FILE}`));
  console.log(chalk.gray('  You can now run: skillmark run <skill>'));
}

/**
 * Run claude setup-token and capture the generated token
 */
async function runSetupToken(): Promise<string | null> {
  return new Promise((resolve) => {
    // Run setup-token with inherited stdio so user can interact
    const proc = spawn('claude', ['setup-token'], {
      stdio: ['inherit', 'pipe', 'inherit'],
    });

    let stdout = '';

    proc.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      // Print to console so user sees the output
      process.stdout.write(text);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }

      // Extract token from output
      // Format: "sk-ant-oat01-..." on its own line
      const tokenMatch = stdout.match(/sk-ant-oat01-[A-Za-z0-9_-]+/);
      if (tokenMatch) {
        resolve(tokenMatch[0]);
      } else {
        resolve(null);
      }
    });

    proc.on('error', () => {
      resolve(null);
    });
  });
}

/**
 * Test if a token is valid
 */
async function testToken(token: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('claude', ['-p', 'Say OK', '--output-format', 'json', '--model', 'haiku'], {
      env: { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: token },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    proc.stdout.on('data', (data) => { stdout += data.toString(); });

    const timeout = setTimeout(() => {
      proc.kill();
      resolve(false);
    }, 30000);

    proc.on('close', () => {
      clearTimeout(timeout);
      try {
        const result = JSON.parse(stdout);
        resolve(!result.is_error);
      } catch {
        resolve(false);
      }
    });

    proc.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

/**
 * Show auth status
 */
export async function showAuthStatus(): Promise<void> {
  const token = await getStoredToken();

  if (!token) {
    console.log(chalk.yellow('Not authenticated'));
    console.log(chalk.gray('  Run: skillmark auth'));
    return;
  }

  const isValid = await testToken(token);
  if (isValid) {
    console.log(chalk.green('✓ Authenticated'));
    const source = process.env.CLAUDE_CODE_OAUTH_TOKEN ? 'env var' : CONFIG_FILE;
    console.log(chalk.gray(`  Token source: ${source}`));
  } else {
    console.log(chalk.red('✗ Token invalid or expired'));
    console.log(chalk.gray('  Run: skillmark auth'));
  }
}
