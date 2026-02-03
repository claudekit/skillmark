/**
 * API key configuration reader for Skillmark CLI
 * Reads API key from multiple sources with priority:
 * 1. SKILLMARK_API_KEY environment variable
 * 2. ~/.skillmarkrc config file
 * 3. ~/.claude/.env file
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const ENV_VAR_NAME = 'SKILLMARK_API_KEY';
const SKILLMARKRC_FILE = '.skillmarkrc';
const CLAUDE_ENV_FILE = '.claude/.env';

export interface ApiKeyConfig {
  apiKey: string;
  source: 'env' | 'skillmarkrc' | 'claude-env';
}

/**
 * Read API key from configured sources
 * Priority: env > ~/.skillmarkrc > ~/.claude/.env
 */
export async function readApiKeyConfig(): Promise<ApiKeyConfig | null> {
  // 1. Check environment variable
  const envKey = process.env[ENV_VAR_NAME];
  if (envKey && envKey.trim()) {
    return { apiKey: envKey.trim(), source: 'env' };
  }

  const home = homedir();

  // 2. Check ~/.skillmarkrc
  try {
    const skillmarkrcPath = join(home, SKILLMARKRC_FILE);
    const content = await readFile(skillmarkrcPath, 'utf-8');
    const key = parseConfigFile(content);
    if (key) {
      return { apiKey: key, source: 'skillmarkrc' };
    }
  } catch {
    // File doesn't exist or can't be read, continue
  }

  // 3. Check ~/.claude/.env
  try {
    const claudeEnvPath = join(home, CLAUDE_ENV_FILE);
    const content = await readFile(claudeEnvPath, 'utf-8');
    const key = parseEnvFile(content, ENV_VAR_NAME);
    if (key) {
      return { apiKey: key, source: 'claude-env' };
    }
  } catch {
    // File doesn't exist or can't be read, continue
  }

  return null;
}

/**
 * Parse skillmarkrc config file
 * Format: key=value or api_key=value
 */
function parseConfigFile(content: string): string | null {
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse key=value
    const match = trimmed.match(/^(?:api_key|apiKey|key)\s*=\s*(.+)$/i);
    if (match) {
      const value = match[1].trim();
      // Remove quotes if present
      return value.replace(/^["']|["']$/g, '');
    }
  }

  return null;
}

/**
 * Parse .env file for specific key
 */
function parseEnvFile(content: string, keyName: string): string | null {
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=value
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match && match[1].trim() === keyName) {
      const value = match[2].trim();
      // Remove quotes if present
      return value.replace(/^["']|["']$/g, '');
    }
  }

  return null;
}

/**
 * Get human-readable description of config source
 */
export function getConfigSourceDescription(source: ApiKeyConfig['source']): string {
  switch (source) {
    case 'env':
      return `SKILLMARK_API_KEY environment variable`;
    case 'skillmarkrc':
      return `~/${SKILLMARKRC_FILE}`;
    case 'claude-env':
      return `~/${CLAUDE_ENV_FILE}`;
  }
}
