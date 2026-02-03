/**
 * Unified skill source resolver - routes to appropriate handler based on source type
 */
import type { SkillSource } from '../types/index.js';
import { isLocalSource, resolveLocalSource } from './local-skill-source-handler.js';
import { isGitSource, resolveGitSource } from './git-repository-skill-source-handler.js';
import { isSkillshSource, resolveSkillshSource } from './skillsh-registry-source-handler.js';

/**
 * Detect source type from input string
 */
export function detectSourceType(source: string): 'local' | 'git' | 'skillsh' | 'unknown' {
  if (isSkillshSource(source)) return 'skillsh';
  if (isGitSource(source)) return 'git';
  if (isLocalSource(source)) return 'local';
  return 'unknown';
}

/**
 * Resolve any skill source to a local path
 */
export async function resolveSkillSource(source: string): Promise<SkillSource> {
  const sourceType = detectSourceType(source);

  switch (sourceType) {
    case 'local':
      return resolveLocalSource(source);

    case 'git':
      return resolveGitSource(source);

    case 'skillsh':
      return resolveSkillshSource(source);

    case 'unknown':
    default:
      // Try local first, then git
      try {
        return await resolveLocalSource(source);
      } catch {
        try {
          return await resolveGitSource(`https://github.com/${source}`);
        } catch {
          throw new Error(
            `Unable to resolve skill source: ${source}\n` +
              'Expected: local path, git URL, or skill.sh reference'
          );
        }
      }
  }
}

/**
 * Format source for display
 */
export function formatSourceDisplay(source: SkillSource): string {
  switch (source.type) {
    case 'local':
      return `Local: ${source.localPath}`;
    case 'git':
      return `Git: ${source.original}`;
    case 'skillsh':
      return `skill.sh: ${source.original}`;
    default:
      return source.original;
  }
}

// Re-export individual handlers for direct use
export { isLocalSource, resolveLocalSource } from './local-skill-source-handler.js';
export { isGitSource, resolveGitSource, cleanGitCache } from './git-repository-skill-source-handler.js';
export { isSkillshSource, resolveSkillshSource, cleanSkillshCache } from './skillsh-registry-source-handler.js';
