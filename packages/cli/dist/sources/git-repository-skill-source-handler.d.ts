import type { SkillSource } from '../types/index.js';
/**
 * Check if a source is a git URL
 */
export declare function isGitSource(source: string): boolean;
/**
 * Resolve a git skill source by cloning the repository
 */
export declare function resolveGitSource(source: string): Promise<SkillSource>;
/**
 * Clean up git cache
 */
export declare function cleanGitCache(): Promise<void>;
/**
 * Clone a specific branch or tag
 */
export declare function resolveGitSourceWithRef(source: string, ref: string): Promise<SkillSource>;
//# sourceMappingURL=git-repository-skill-source-handler.d.ts.map