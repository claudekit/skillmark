/**
 * Markdown test definition parser - parses test files with YAML frontmatter
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import matter from 'gray-matter';
import type { TestDefinition } from '../types/index.js';

/** Default values for test definitions */
const DEFAULTS = {
  type: 'knowledge' as const,
  timeout: 120,
  concepts: [] as string[],
};

/**
 * Parse a single test file
 */
export async function parseTestFile(filePath: string): Promise<TestDefinition> {
  const content = await readFile(filePath, 'utf-8');
  return parseTestContent(content, filePath);
}

/**
 * Parse test content from string
 */
export function parseTestContent(content: string, sourcePath: string = 'unknown'): TestDefinition {
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
  };
}

/**
 * Parse markdown sections (# Heading -> content)
 */
function parseSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = content.split('\n');

  let currentSection = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#+\s+(.+)$/);
    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
      }
      currentSection = headingMatch[1];
      currentContent = [];
    } else {
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
function parseExpectedPatterns(content: string): string[] {
  const patterns: string[] = [];
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
function extractConceptsFromExpected(patterns: string[]): string[] {
  const concepts: string[] = [];

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
export async function loadTestsFromDirectory(dirPath: string): Promise<TestDefinition[]> {
  const tests: TestDefinition[] = [];

  try {
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stats = await stat(fullPath);

      if (stats.isFile() && extname(entry) === '.md') {
        try {
          const test = await parseTestFile(fullPath);
          tests.push(test);
        } catch (error) {
          console.warn(`Skipping invalid test file ${entry}: ${error}`);
        }
      }
    }
  } catch (error) {
    throw new Error(`Failed to load tests from ${dirPath}: ${error}`);
  }

  return tests;
}

/**
 * Auto-discover test files from skill directory
 */
export async function discoverTests(skillPath: string): Promise<TestDefinition[]> {
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
    } catch {
      continue;
    }
  }

  // No tests found - auto-generate from SKILL.md
  const skillMdPath = join(skillPath, 'SKILL.md');
  try {
    await stat(skillMdPath);
    return generateTestsFromSkillMd(skillPath, skillMdPath);
  } catch {
    return [];
  }
}

/**
 * Spawn Claude CLI to generate tests (returns promise)
 */
async function spawnClaudeCli(prompt: string, cwd: string, timeout: number = 300000): Promise<string> {
  const { spawn } = await import('node:child_process');

  return new Promise((resolve, reject) => {
    const args = [
      '-p', prompt,  // Print mode with prompt - non-interactive, exits after completion
      '--dangerously-skip-permissions',  // Skip permission prompts
      '--max-turns', '50',  // Limit agentic turns
    ];

    console.log('Spawning Claude CLI...');

    const proc = spawn('claude', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],  // ignore stdin to prevent hanging
      timeout,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;
      // Stream progress to console
      process.stdout.write(chunk);
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (error: Error) => {
      reject(new Error(`Failed to spawn Claude CLI: ${error.message}`));
    });

    proc.on('close', (code: number) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Auto-generate tests from SKILL.md using Claude Code CLI
 */
async function generateTestsFromSkillMd(skillPath: string, skillMdPath: string): Promise<TestDefinition[]> {
  const { mkdir } = await import('node:fs/promises');

  const testsDir = join(skillPath, 'tests');

  console.log('Generating tests using Claude Code CLI...');

  // Create tests directory
  await mkdir(testsDir, { recursive: true });

  // Build prompt for Claude CLI
  const prompt = `Read the skill at ${skillMdPath} and generate 3-5 comprehensive test files in ${testsDir}.

IMPORTANT: Use the Write tool to create each test file directly.

Use this EXACT test format for each .md file:
---
name: descriptive-test-name
type: task
concepts: [concept1, concept2]
timeout: 120
---

# Prompt
A specific question or task that tests a particular aspect of the skill.

# Expected
- [ ] First expected outcome or behavior
- [ ] Second expected outcome or behavior
- [ ] Third expected outcome (if applicable)

Generate tests that cover:
1. Basic usage - core functionality test
2. Edge cases - unusual inputs or scenarios
3. Error handling - invalid inputs, missing data
4. Advanced scenarios - complex use cases

Name files like: 01-basic-usage.md, 02-edge-cases.md, 03-error-handling.md

After creating all test files, list what was created.`;

  try {
    // Spawn Claude CLI with proper flags
    await spawnClaudeCli(prompt, skillPath, 300000);

    console.log('\nClaude CLI completed. Loading generated tests...');

    // Load the generated tests
    const tests = await loadTestsFromDirectory(testsDir);

    if (tests.length > 0) {
      console.log(`Loaded ${tests.length} generated test(s)`);
      return tests;
    }
  } catch (error) {
    console.warn(`Claude CLI test generation failed: ${error}`);
    console.log('Falling back to basic test generation...');
  }

  // Fallback: generate basic test from SKILL.md metadata
  const content = await readFile(skillMdPath, 'utf-8');
  const nameMatch = content.match(/^name:\s*(.+)$/m) || content.match(/^#\s+(.+)$/m);
  const skillName = nameMatch?.[1]?.trim() || 'skill';
  const descMatch = content.match(/^description:\s*(.+)$/m);
  const desc = descMatch?.[1]?.trim() || '';

  const tests: TestDefinition[] = [{
    name: `${skillName}-basic-usage`,
    type: 'task',
    prompt: `Activate and use the skill "${skillName}" at ${skillPath}. ${desc}`,
    expected: ['Skill activates correctly', 'Produces relevant output', 'No errors'],
    timeout: 120,
    concepts: ['basic-usage'],
    sourcePath: skillMdPath,
  }];

  console.log(`Generated ${tests.length} fallback test(s)`);
  return tests;
}
