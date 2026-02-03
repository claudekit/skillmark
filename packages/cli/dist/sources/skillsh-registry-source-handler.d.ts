import type { SkillSource } from '../types/index.js';
/**
 * Check if a source is a skill.sh reference
 */
export declare function isSkillshSource(source: string): boolean;
/**
 * Resolve a skill.sh source by downloading the skill
 */
export declare function resolveSkillshSource(source: string): Promise<SkillSource>;
/**
 * List available skills from a user on skill.sh
 */
export declare function listUserSkills(user: string): Promise<string[]>;
/**
 * Clean up skill.sh cache
 */
export declare function cleanSkillshCache(): Promise<void>;
//# sourceMappingURL=skillsh-registry-source-handler.d.ts.map