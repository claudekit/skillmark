/**
 * skill.sh registry source handler - downloads skills from skill.sh registry
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SkillSource } from '../types/index.js';

/** skill.sh URL patterns */
const SKILLSH_PATTERNS = [
  /^skill\.sh\//,
  /^https?:\/\/skill\.sh\//,
  /^skillsh:/,
];

/** Cache directory for skill.sh downloads */
const CACHE_DIR = join(process.env.HOME || '/tmp', '.skillmark', 'skillsh-cache');

/** skill.sh API base URL */
const SKILLSH_API = 'https://skill.sh/api';

/**
 * Check if a source is a skill.sh reference
 */
export function isSkillshSource(source: string): boolean {
  return SKILLSH_PATTERNS.some((pattern) => pattern.test(source));
}

/**
 * Parse skill.sh reference to get user and skill name
 */
function parseSkillshRef(source: string): { user: string; name: string; version?: string } {
  // Remove prefix
  let cleaned = source
    .replace(/^skill\.sh\//, '')
    .replace(/^https?:\/\/skill\.sh\//, '')
    .replace(/^skillsh:/, '');

  // Parse user/name@version format
  const versionMatch = cleaned.match(/^(.+)@(.+)$/);
  if (versionMatch) {
    cleaned = versionMatch[1];
    const version = versionMatch[2];
    const [user, name] = cleaned.split('/');
    return { user, name, version };
  }

  const [user, name] = cleaned.split('/');
  return { user, name };
}

/**
 * Resolve a skill.sh source by downloading the skill
 */
export async function resolveSkillshSource(source: string): Promise<SkillSource> {
  const { user, name, version } = parseSkillshRef(source);
  const cacheId = version ? `${user}-${name}-${version}` : `${user}-${name}`;
  const localPath = join(CACHE_DIR, cacheId);

  await mkdir(CACHE_DIR, { recursive: true });

  try {
    // Try to fetch from skill.sh API
    const skillContent = await fetchSkillFromRegistry(user, name, version);

    // Write to cache
    await rm(localPath, { recursive: true, force: true });
    await mkdir(localPath, { recursive: true });

    // Write SKILL.md
    await writeFile(join(localPath, 'SKILL.md'), skillContent);

    return {
      type: 'skillsh',
      original: source,
      localPath,
      name: `${user}/${name}`,
    };
  } catch (error) {
    // Fallback: try to clone from GitHub if skill.sh API fails
    // Many skill.sh skills are hosted on GitHub
    const githubUrl = `https://github.com/${user}/${name}`;

    try {
      const { resolveGitSource } = await import('./git-repository-skill-source-handler.js');
      const gitSource = await resolveGitSource(githubUrl);
      return {
        ...gitSource,
        type: 'skillsh',
        original: source,
      };
    } catch {
      throw new Error(
        `Failed to fetch skill from skill.sh: ${source}\n` +
          `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Fetch skill content from skill.sh registry
 */
async function fetchSkillFromRegistry(
  user: string,
  name: string,
  version?: string
): Promise<string> {
  const url = version
    ? `${SKILLSH_API}/skills/${user}/${name}/versions/${version}`
    : `${SKILLSH_API}/skills/${user}/${name}/latest`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`skill.sh API returned ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as { content?: string; skill?: { content?: string } };
  const content = data.content || data.skill?.content;

  if (!content) {
    throw new Error('No skill content found in response');
  }

  return content;
}

/**
 * List available skills from a user on skill.sh
 */
export async function listUserSkills(user: string): Promise<string[]> {
  const url = `${SKILLSH_API}/users/${user}/skills`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as { skills?: Array<{ name: string }> };
    return data.skills?.map((s) => s.name) || [];
  } catch {
    return [];
  }
}

/**
 * Clean up skill.sh cache
 */
export async function cleanSkillshCache(): Promise<void> {
  try {
    await rm(CACHE_DIR, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}
