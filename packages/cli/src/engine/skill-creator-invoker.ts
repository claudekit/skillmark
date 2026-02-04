/**
 * Skill-creator invoker for enhanced test generation.
 *
 * Invokes the skill-creator skill with embedded @claude-code-guide reference
 * to analyze skills and extract capabilities, concepts, edge cases, and
 * testing patterns for generating high-quality tests.
 */
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { homedir } from 'node:os';

const execAsync = promisify(exec);

/** Analysis result from skill-creator */
export interface SkillAnalysis {
  /** Core capabilities of the skill */
  capabilities: string[];
  /** Key concepts/topics the skill covers */
  keyConcepts: string[];
  /** Potential failure scenarios to test */
  edgeCases: string[];
  /** Claude Code testing patterns and best practices */
  testingPatterns: string[];
  /** Expected tool invocations when using the skill */
  toolInvocationExpectations: string[];
}

/** Default empty analysis for graceful degradation */
const EMPTY_ANALYSIS: SkillAnalysis = {
  capabilities: [],
  keyConcepts: [],
  edgeCases: [],
  testingPatterns: [],
  toolInvocationExpectations: [],
};

/** Skill-creator installation info */
const SKILL_CREATOR_CONFIG = {
  defaultPath: join(homedir(), '.claude/skills/skill-creator'),
  installCommand:
    'npx skills add https://github.com/anthropics/claudekit-skills --skill skill-creator -a claude-code -g -y',
};

/**
 * Check if skill-creator is installed and return its path.
 * Installs it if missing.
 */
export async function ensureSkillCreatorInstalled(): Promise<string> {
  const skillPath = SKILL_CREATOR_CONFIG.defaultPath;

  try {
    await stat(join(skillPath, 'SKILL.md'));
    return skillPath;
  } catch {
    console.log('Installing skill-creator...');
    try {
      await execAsync(SKILL_CREATOR_CONFIG.installCommand, {
        timeout: 60000,
      });
      console.log('skill-creator installed successfully');
      return skillPath;
    } catch (error) {
      throw new Error(`Failed to install skill-creator: ${(error as Error).message}`);
    }
  }
}

/**
 * Build the analysis prompt that includes @claude-code-guide reference.
 *
 * Uses prompt engineering to leverage Claude's built-in subagent routing
 * for getting Claude Code testing patterns.
 */
function buildAnalysisPrompt(skillPath: string): string {
  return `Analyze the skill at ${skillPath}.

Use @"claude-code-guide (agent)" to understand Claude Code CLI patterns for testing skills.

Extract and return ONLY a JSON object with this structure:
{
  "capabilities": ["what the skill can do - list 3-6 core capabilities"],
  "keyConcepts": ["key topics/keywords the skill covers - list 5-10 concepts"],
  "edgeCases": ["failure scenarios to test - list 3-5 edge cases"],
  "testingPatterns": ["Claude Code testing best practices from claude-code-guide"],
  "toolInvocationExpectations": ["expected tool calls when using this skill"]
}

Rules:
- Read the SKILL.md file thoroughly
- Extract concepts from Key Concepts Index if present
- Identify what tools the skill might invoke (Read, Write, Bash, etc.)
- Consider common failure modes (missing files, invalid input, etc.)
- Include testing patterns from @"claude-code-guide (agent)"

Respond with ONLY the JSON object, no markdown formatting.`;
}

/**
 * Parse skill analysis from Claude CLI response.
 */
function parseAnalysisResponse(stdout: string): SkillAnalysis | null {
  try {
    // Parse outer Claude CLI JSON wrapper
    const outer = JSON.parse(stdout);

    // Extract inner result
    const result = outer.result;
    if (!result) {
      return null;
    }

    // Result might be string or object
    let analysis: SkillAnalysis;

    if (typeof result === 'string') {
      // Try to extract JSON from the string
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      analysis = result as SkillAnalysis;
    }

    // Validate required fields exist
    if (!analysis.capabilities || !Array.isArray(analysis.capabilities)) {
      return null;
    }

    // Fill in defaults for optional fields
    return {
      capabilities: analysis.capabilities || [],
      keyConcepts: analysis.keyConcepts || [],
      edgeCases: analysis.edgeCases || [],
      testingPatterns: analysis.testingPatterns || [],
      toolInvocationExpectations: analysis.toolInvocationExpectations || [],
    };
  } catch {
    return null;
  }
}

/**
 * Invoke skill-creator to analyze a skill.
 *
 * Uses Claude CLI with skill-creator to extract capabilities, concepts,
 * edge cases, and testing patterns. The prompt includes a reference to
 * @"claude-code-guide (agent)" to get Claude Code-specific testing guidance.
 *
 * @param skillPath - Path to the skill directory
 * @param skillCreatorPath - Path to skill-creator installation
 * @param timeoutMs - Timeout in milliseconds (default: 120000)
 * @returns SkillAnalysis or null if invocation fails
 */
export async function invokeSkillCreator(
  skillPath: string,
  skillCreatorPath: string,
  timeoutMs: number = 120000
): Promise<SkillAnalysis | null> {
  const prompt = buildAnalysisPrompt(skillPath);

  return new Promise((resolve) => {
    const args = [
      '-p',
      prompt,
      '--allowedTools',
      `Skill(${skillCreatorPath}),Read,Glob,Task`,
      '--output-format',
      'json',
      '--model',
      'haiku',
      '--dangerously-skip-permissions',
    ];

    console.log('Invoking skill-creator for skill analysis...');

    const proc = spawn('claude', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      console.warn(`skill-creator timeout after ${timeoutMs}ms`);
      resolve(null);
    }, timeoutMs);

    proc.on('error', (error: Error) => {
      clearTimeout(timeout);
      console.warn(`skill-creator error: ${error.message}`);
      resolve(null);
    });

    proc.on('close', (code: number) => {
      clearTimeout(timeout);

      // Check for auth errors in JSON response (Claude CLI returns error in JSON)
      if (stdout) {
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.is_error && parsed.result) {
            const errorMsg = parsed.result;
            if (errorMsg.includes('Invalid API key') || errorMsg.includes('/login')) {
              console.warn(`Authentication required: ${errorMsg}. Run 'claude /login' to authenticate.`);
            } else {
              console.warn(`skill-creator error: ${errorMsg}`);
            }
            resolve(null);
            return;
          }
        } catch {
          // Not JSON, continue
        }
      }

      if (code !== 0) {
        const errorDetail = stderr || stdout.slice(0, 200) || 'No error details';
        console.warn(`skill-creator exited with code ${code}: ${errorDetail}`);
        resolve(null);
        return;
      }

      const analysis = parseAnalysisResponse(stdout);
      if (analysis) {
        console.log(
          `Skill analysis complete: ${analysis.capabilities.length} capabilities, ` +
            `${analysis.keyConcepts.length} concepts, ${analysis.edgeCases.length} edge cases`
        );
      }
      resolve(analysis);
    });
  });
}

/**
 * Get empty analysis for graceful degradation.
 */
export function getEmptyAnalysis(): SkillAnalysis {
  return { ...EMPTY_ANALYSIS };
}
