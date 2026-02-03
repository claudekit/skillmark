import type { SkillSource } from '../types/index.js';
/**
 * Check if a path is a local skill source
 */
export declare function isLocalSource(source: string): boolean;
/**
 * Resolve a local skill source
 */
export declare function resolveLocalSource(source: string): Promise<SkillSource>;
/**
 * Find test files in a skill directory
 */
export declare function findTestsInSkillDir(skillPath: string): Promise<string[]>;
/**
 * Read skill metadata from SKILL.md or README.md
 */
export declare function readSkillMetadata(skillPath: string): Promise<{
    name: string;
    description: string;
} | null>;
//# sourceMappingURL=local-skill-source-handler.d.ts.map