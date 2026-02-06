/**
 * Markdown test definition parser - parses test files with YAML frontmatter
 * and auto-generates tests from SKILL.md when no tests exist.
 *
 * Enhanced generation uses skill-creator + @claude-code-guide for better
 * test quality via concept extraction and testing pattern awareness.
 */
import { readFile, readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import matter from 'gray-matter';
import { SkillContentCollector } from './skill-content-collector.js';
import { withRetry } from './retry-with-degrade-utils.js';
import { getStoredToken } from '../commands/auth-setup-and-token-storage-command.js';
import { ensureSkillCreatorInstalled, invokeSkillCreator, } from './skill-creator-invoker.js';
import { buildEnhancedTestPrompt } from './enhanced-test-prompt-builder.js';
/** Default values for test definitions */
const DEFAULTS = {
    type: 'knowledge',
    timeout: 600, // 10 minutes - agent tests can be multi-step
    concepts: [],
};
/**
 * Parse a single test file
 */
export async function parseTestFile(filePath) {
    const content = await readFile(filePath, 'utf-8');
    return parseTestContent(content, filePath);
}
/**
 * Parse test content from string
 */
export function parseTestContent(content, sourcePath = 'unknown') {
    const { data: frontmatter, content: body } = matter(content);
    // Validate required fields
    if (!frontmatter.name) {
        throw new Error(`Test file missing required 'name' field: ${sourcePath}`);
    }
    // Parse sections from body
    const sections = parseSections(body);
    // Extract prompt
    const prompt = sections.prompt || sections.question || '';
    if (!prompt) {
        throw new Error(`Test file missing 'Prompt' or 'Question' section: ${sourcePath}`);
    }
    // Extract expected patterns
    const expectedSection = sections.expected || sections.criteria || '';
    const expected = parseExpectedPatterns(expectedSection);
    // Extract security-specific sections
    const forbiddenSection = sections['forbidden patterns'] || '';
    const forbiddenPatterns = forbiddenSection
        ? parseExpectedPatterns(forbiddenSection)
        : undefined;
    // Use 'Expected Refusal' section for security tests
    const isSecurityTest = frontmatter.type === 'security';
    if (isSecurityTest && sections['expected refusal']) {
        const refusalPatterns = parseExpectedPatterns(sections['expected refusal']);
        expected.push(...refusalPatterns);
    }
    // Combine frontmatter concepts with expected patterns
    const concepts = [
        ...(frontmatter.concepts || []),
        ...extractConceptsFromExpected(expected),
    ];
    return {
        name: frontmatter.name,
        type: frontmatter.type || DEFAULTS.type,
        concepts: [...new Set(concepts)], // Deduplicate
        timeout: frontmatter.timeout || DEFAULTS.timeout,
        prompt: prompt.trim(),
        expected,
        sourcePath,
        ...(frontmatter.category && { category: frontmatter.category }),
        ...(frontmatter.severity && { severity: frontmatter.severity }),
        ...(forbiddenPatterns?.length && { forbiddenPatterns }),
    };
}
/**
 * Parse markdown sections (# Heading -> content)
 */
function parseSections(content) {
    const sections = {};
    const lines = content.split('\n');
    let currentSection = '';
    let currentContent = [];
    for (const line of lines) {
        const headingMatch = line.match(/^#+\s+(.+)$/);
        if (headingMatch) {
            // Save previous section
            if (currentSection) {
                sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
            }
            currentSection = headingMatch[1];
            currentContent = [];
        }
        else {
            currentContent.push(line);
        }
    }
    // Save last section
    if (currentSection) {
        sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
    }
    return sections;
}
/**
 * Parse expected patterns from section content
 */
function parseExpectedPatterns(content) {
    const patterns = [];
    const lines = content.split('\n');
    for (const line of lines) {
        // Parse checkbox items: - [ ] Pattern or - [x] Pattern
        const checkboxMatch = line.match(/^-\s*\[[\sx]\]\s*(.+)$/);
        if (checkboxMatch) {
            patterns.push(checkboxMatch[1].trim());
            continue;
        }
        // Parse bullet items: - Pattern or * Pattern
        const bulletMatch = line.match(/^[-*]\s+(.+)$/);
        if (bulletMatch) {
            patterns.push(bulletMatch[1].trim());
            continue;
        }
        // Parse numbered items: 1. Pattern
        const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
        if (numberedMatch) {
            patterns.push(numberedMatch[1].trim());
        }
    }
    return patterns;
}
/**
 * Extract key concepts from expected patterns
 */
function extractConceptsFromExpected(patterns) {
    const concepts = [];
    for (const pattern of patterns) {
        // Extract quoted terms
        const quoted = pattern.match(/"([^"]+)"/g);
        if (quoted) {
            concepts.push(...quoted.map((q) => q.replace(/"/g, '')));
        }
        // Extract backticked terms
        const backticked = pattern.match(/`([^`]+)`/g);
        if (backticked) {
            concepts.push(...backticked.map((b) => b.replace(/`/g, '')));
        }
        // Extract parenthetical clarifications like "concept (detail)"
        const parenthetical = pattern.match(/(\w+(?:\s+\w+)?)\s*\([^)]+\)/g);
        if (parenthetical) {
            concepts.push(...parenthetical.map((p) => p.replace(/\s*\([^)]+\)/, '').trim()));
        }
    }
    return concepts;
}
/**
 * Load all test files from a directory
 */
export async function loadTestsFromDirectory(dirPath) {
    const tests = [];
    try {
        const entries = await readdir(dirPath);
        for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const stats = await stat(fullPath);
            if (stats.isFile() && extname(entry) === '.md') {
                try {
                    const test = await parseTestFile(fullPath);
                    tests.push(test);
                }
                catch (error) {
                    console.warn(`Skipping invalid test file ${entry}: ${error}`);
                }
            }
        }
    }
    catch (error) {
        throw new Error(`Failed to load tests from ${dirPath}: ${error}`);
    }
    return tests;
}
/**
 * Auto-discover test files from skill directory
 */
export async function discoverTests(skillPath, generateOptions) {
    // Check common test locations
    const testLocations = [
        join(skillPath, 'tests'),
        join(skillPath, 'test'),
        join(skillPath, '__tests__'),
        skillPath, // Look for *.test.md in root
    ];
    for (const location of testLocations) {
        try {
            const stats = await stat(location);
            if (stats.isDirectory()) {
                const tests = await loadTestsFromDirectory(location);
                if (tests.length > 0) {
                    return tests;
                }
            }
        }
        catch {
            continue;
        }
    }
    // No tests found - auto-generate from SKILL.md
    const skillMdPath = join(skillPath, 'SKILL.md');
    try {
        await stat(skillMdPath);
        return generateTestsFromSkillMd(skillPath, generateOptions);
    }
    catch {
        return [];
    }
}
/**
 * Prompt template for test generation - requests JSON-only output
 */
const TEST_GENERATION_PROMPT = `You must respond with ONLY a JSON object. No explanation, no markdown code blocks, just raw JSON.

Generate tests for this skill. Output format:
{"skill_name":"<name>","tests":[{"name":"<skill>-<topic>","test_type":"knowledge"|"task","concepts":["..."],"timeout":600|1800,"prompt":"...","expected_items":["..."]}]}

Rules:
- 2-4 tests, at least 1 knowledge + 1 task
- Extract concepts from Key Concepts Index or section headers
- timeout: 600 (knowledge/10min), 1800 (task/30min)
- 4-8 expected_items per test

Skill content:
{skill_content}

JSON:`;
/**
 * Extract JSON from Claude CLI response - handles various formats
 */
function extractJsonFromResponse(text) {
    // Patterns to try in order of preference
    const patterns = [
        /```json\s*\n([\s\S]*?)\n```/, // ```json ... ```
        /```\s*\n([\s\S]*?)\n```/, // ``` ... ```
        /\{[\s\S]*\}/, // Raw JSON object
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const jsonStr = match[1] ?? match[0];
            // Validate it's actual JSON
            try {
                JSON.parse(jsonStr);
                return jsonStr;
            }
            catch {
                continue;
            }
        }
    }
    return null;
}
/**
 * Spawn Claude CLI with JSON output format
 */
async function invokeClaudeCliWithJson(prompt, model = 'sonnet', timeoutMs = 180000) {
    const { spawn } = await import('node:child_process');
    // Get stored OAuth token
    const storedToken = await getStoredToken();
    const env = { ...process.env };
    if (storedToken) {
        env.CLAUDE_CODE_OAUTH_TOKEN = storedToken;
    }
    return new Promise((resolve) => {
        const args = [
            '-p', prompt,
            '--output-format', 'json',
            '--model', model,
            '--dangerously-skip-permissions',
        ];
        console.log(`Invoking Claude CLI (${model})...`);
        const proc = spawn('claude', args, {
            env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        const timeout = setTimeout(() => {
            proc.kill('SIGTERM');
            console.warn(`Claude CLI timeout after ${timeoutMs}ms`);
            resolve(null);
        }, timeoutMs);
        proc.on('error', (error) => {
            clearTimeout(timeout);
            console.warn(`Claude CLI error: ${error.message}`);
            resolve(null);
        });
        proc.on('close', (code) => {
            clearTimeout(timeout);
            // First try to parse stdout for error details (Claude CLI returns errors in JSON)
            if (stdout) {
                try {
                    const parsed = JSON.parse(stdout);
                    if (parsed.is_error && parsed.result) {
                        const errorMsg = parsed.result;
                        if (errorMsg.includes('Invalid API key') || errorMsg.includes('/login')) {
                            console.warn(`Authentication required: ${errorMsg}. Run 'claude /login' to authenticate.`);
                        }
                        else {
                            console.warn(`Claude CLI error: ${errorMsg}`);
                        }
                        resolve(null);
                        return;
                    }
                }
                catch {
                    // Not JSON, continue
                }
            }
            if (code !== 0) {
                const errorDetail = stderr || stdout.slice(0, 200) || 'No error details';
                console.warn(`Claude CLI exited with code ${code}: ${errorDetail}`);
                resolve(null);
                return;
            }
            try {
                // Parse the outer JSON response from Claude CLI
                // Format: {"type": "result", "subtype": "success", "result": <actual_result>}
                const response = JSON.parse(stdout);
                if (response.result !== undefined) {
                    const inner = response.result;
                    // Result might be a JSON string that needs parsing
                    if (typeof inner === 'string') {
                        // Try extracting JSON from markdown code blocks
                        const jsonStr = extractJsonFromResponse(inner);
                        if (jsonStr) {
                            try {
                                const parsed = JSON.parse(jsonStr);
                                resolve(parsed.tests || null);
                                return;
                            }
                            catch {
                                // Fall through
                            }
                        }
                        // Try direct parsing
                        try {
                            const parsed = JSON.parse(inner);
                            resolve(parsed.tests || null);
                            return;
                        }
                        catch {
                            console.warn(`Could not parse JSON from response: ${inner.slice(0, 300)}`);
                            resolve(null);
                            return;
                        }
                    }
                    // inner is already an object
                    const innerObj = inner;
                    resolve(innerObj.tests || null);
                    return;
                }
                // Response might be the direct output
                resolve(response.tests || null);
            }
            catch (error) {
                console.warn(`Failed to parse Claude response: ${error}`);
                resolve(null);
            }
        });
    });
}
/**
 * Format a generated test into skillmark test.md format
 */
function formatTestToMarkdown(test) {
    const lines = [
        '---',
        `name: ${test.name}`,
        `type: ${test.test_type}`,
        'concepts:',
    ];
    for (const concept of test.concepts) {
        lines.push(`  - ${concept}`);
    }
    lines.push(`timeout: ${test.timeout}`);
    if (test.category) {
        lines.push(`category: ${test.category}`);
    }
    if (test.severity) {
        lines.push(`severity: ${test.severity}`);
    }
    lines.push('---');
    lines.push('');
    lines.push('# Prompt');
    lines.push('');
    lines.push(test.prompt);
    lines.push('');
    lines.push('# Expected');
    lines.push('');
    lines.push('The response should cover:');
    for (const item of test.expected_items) {
        lines.push(`- [ ] ${item}`);
    }
    if (test.forbidden_patterns?.length) {
        lines.push('');
        lines.push('# Forbidden Patterns');
        lines.push('');
        for (const pattern of test.forbidden_patterns) {
            lines.push(`- ${pattern}`);
        }
    }
    lines.push('');
    return lines.join('\n');
}
/**
 * Convert generated test to TestDefinition
 */
function convertToTestDefinition(test, testsDir) {
    const filename = `${test.name}-test.md`;
    return {
        name: test.name,
        type: test.test_type,
        concepts: test.concepts,
        timeout: test.timeout,
        prompt: test.prompt,
        expected: test.expected_items,
        sourcePath: join(testsDir, filename),
        ...(test.category && { category: test.category }),
        ...(test.severity && { severity: test.severity }),
        ...(test.forbidden_patterns?.length && { forbiddenPatterns: test.forbidden_patterns }),
    };
}
/**
 * Perform enhanced skill analysis using skill-creator with @claude-code-guide.
 *
 * Returns analysis with capabilities, concepts, edge cases, and testing patterns.
 * Returns null if skill-creator is unavailable or analysis fails.
 */
async function performEnhancedSkillAnalysis(skillPath) {
    try {
        // Ensure skill-creator is installed
        const skillCreatorPath = await ensureSkillCreatorInstalled();
        // Invoke skill-creator with retry (1 retry attempt)
        const analysis = await withRetry(() => invokeSkillCreator(skillPath, skillCreatorPath), {
            maxRetries: 1,
            delayMs: 2000,
            onRetry: (attempt, error) => {
                console.log(`Retrying skill analysis (attempt ${attempt + 1}): ${error.message}`);
            },
        });
        return analysis;
    }
    catch (error) {
        console.warn(`Enhanced analysis unavailable: ${error.message}`);
        return null;
    }
}
/**
 * Auto-generate tests from SKILL.md using Claude Code CLI with structured JSON output.
 *
 * Enhanced flow:
 * 1. Try to invoke skill-creator with @claude-code-guide for skill analysis
 * 2. Build enhanced prompt with analysis (capabilities, concepts, edge cases)
 * 3. If analysis fails, gracefully degrade to basic prompt
 * 4. Generate tests via Claude CLI
 */
export async function generateTestsFromSkillMd(skillPath, options) {
    const testsDir = options?.outputDir || join(skillPath, 'tests');
    const genModel = options?.model || 'opus';
    console.log('Generating tests using Claude Code CLI (enhanced mode)...');
    // Validate and collect skill content
    const collector = new SkillContentCollector(skillPath);
    const validation = await collector.validate();
    if (!validation.valid) {
        console.warn(`Invalid skill: ${validation.message}`);
        return generateFallbackTests(skillPath);
    }
    const skillName = await collector.getSkillName();
    console.log(`Analyzing skill: ${skillName}`);
    // Attempt enhanced skill analysis (with graceful degradation)
    console.log('Attempting enhanced skill analysis with skill-creator...');
    const analysis = await performEnhancedSkillAnalysis(skillPath);
    if (analysis) {
        console.log('Enhanced analysis successful - using enriched prompt');
    }
    else {
        console.log('Enhanced analysis unavailable - using basic prompt');
    }
    // Collect and format skill content for prompt
    const skillContent = await collector.formatForPrompt();
    // Build prompt (enhanced with analysis or basic fallback)
    const prompt = buildEnhancedTestPrompt(skillContent, analysis, options?.promptContext);
    // Invoke Claude CLI with JSON output
    const generatedTests = await invokeClaudeCliWithJson(prompt, genModel);
    if (!generatedTests || generatedTests.length === 0) {
        console.warn('No tests generated from Claude CLI');
        return generateFallbackTests(skillPath);
    }
    console.log(`Generated ${generatedTests.length} tests`);
    // Create tests directory
    await mkdir(testsDir, { recursive: true });
    // Write test files and collect TestDefinitions
    const tests = [];
    let written = 0;
    for (const test of generatedTests) {
        const filename = `${test.name}-test.md`;
        const filepath = join(testsDir, filename);
        try {
            await stat(filepath);
            console.log(`Skipping existing: ${filename}`);
        }
        catch {
            // File doesn't exist, create it
            const content = formatTestToMarkdown(test);
            await writeFile(filepath, content, 'utf-8');
            console.log(`Created: ${filename}`);
            written++;
        }
        tests.push(convertToTestDefinition(test, testsDir));
    }
    console.log(`Summary: ${written} created, ${generatedTests.length - written} skipped`);
    console.log(`Output directory: ${testsDir}`);
    return tests;
}
/**
 * Generate fallback tests when Claude CLI fails
 */
async function generateFallbackTests(skillPath) {
    const skillMdPath = join(skillPath, 'SKILL.md');
    console.log('Falling back to basic test generation...');
    try {
        const content = await readFile(skillMdPath, 'utf-8');
        const { data: frontmatter } = matter(content);
        const skillName = frontmatter.name || 'skill';
        const desc = frontmatter.description || '';
        const tests = [{
                name: `${skillName}-basic-usage`,
                type: 'task',
                prompt: `Activate and use the skill "${skillName}" at ${skillPath}. ${desc}`,
                expected: ['Skill activates correctly', 'Produces relevant output', 'No errors'],
                timeout: 600,
                concepts: ['basic-usage'],
                sourcePath: skillMdPath,
            }];
        console.log(`Generated ${tests.length} fallback test(s)`);
        return tests;
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=markdown-test-definition-parser.js.map