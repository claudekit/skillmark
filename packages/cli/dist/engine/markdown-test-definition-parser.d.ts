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
export declare function discoverTests(skillPath: string): Promise<TestDefinition[]>;
//# sourceMappingURL=markdown-test-definition-parser.d.ts.map