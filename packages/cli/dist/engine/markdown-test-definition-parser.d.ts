import type { TestDefinition } from '../types/index.js';
/**
 * Parse a single test file
 */
export declare function parseTestFile(filePath: string): Promise<TestDefinition>;
/**
 * Parse test content from string
 */
export declare function parseTestContent(content: string, sourcePath?: string): TestDefinition;
/**
 * Load all test files from a directory
 */
export declare function loadTestsFromDirectory(dirPath: string): Promise<TestDefinition[]>;
/**
 * Auto-discover test files from skill directory
 */
export declare function discoverTests(skillPath: string, generateOptions?: {
    promptContext?: string;
    model?: string;
}): Promise<TestDefinition[]>;
/**
 * Auto-generate tests from SKILL.md using Claude Code CLI with structured JSON output.
 *
 * Enhanced flow:
 * 1. Try to invoke skill-creator with @claude-code-guide for skill analysis
 * 2. Build enhanced prompt with analysis (capabilities, concepts, edge cases)
 * 3. If analysis fails, gracefully degrade to basic prompt
 * 4. Generate tests via Claude CLI
 */
export declare function generateTestsFromSkillMd(skillPath: string, options?: {
    promptContext?: string;
    model?: string;
    outputDir?: string;
}): Promise<TestDefinition[]>;
//# sourceMappingURL=markdown-test-definition-parser.d.ts.map