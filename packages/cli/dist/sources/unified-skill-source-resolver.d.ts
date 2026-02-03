/**
 * Unified skill source resolver - routes to appropriate handler based on source type
 */
import type { SkillSource } from '../types/index.js';
/**
 * Detect source type from input string
 */
export declare function detectSourceType(source: string): 'local' | 'git' | 'skillsh' | 'unknown';
/**
 * Resolve any skill source to a local path
 */
export declare function resolveSkillSource(source: string): Promise<SkillSource>;
/**
 * Format source for display
 */
export declare function formatSourceDisplay(source: SkillSource): string;
export { isLocalSource, resolveLocalSource } from './local-skill-source-handler.js';
export { isGitSource, resolveGitSource, cleanGitCache } from './git-repository-skill-source-handler.js';
export { isSkillshSource, resolveSkillshSource, cleanSkillshCache } from './skillsh-registry-source-handler.js';
//# sourceMappingURL=unified-skill-source-resolver.d.ts.map