/**
 * Enhanced test prompt builder for skill test generation.
 *
 * Builds enriched prompts by combining skill content with analysis
 * from skill-creator (capabilities, concepts, edge cases, testing patterns).
 */
import type { SkillAnalysis } from './skill-creator-invoker.js';

/**
 * Format skill analysis section for the prompt.
 */
function formatSkillAnalysis(analysis: SkillAnalysis): string {
  const sections: string[] = [];

  if (analysis.capabilities.length > 0) {
    sections.push('### Capabilities');
    for (const cap of analysis.capabilities) {
      sections.push(`- ${cap}`);
    }
  }

  if (analysis.keyConcepts.length > 0) {
    sections.push('\n### Key Concepts');
    for (const concept of analysis.keyConcepts) {
      sections.push(`- ${concept}`);
    }
  }

  if (analysis.edgeCases.length > 0) {
    sections.push('\n### Edge Cases to Test');
    for (const edge of analysis.edgeCases) {
      sections.push(`- ${edge}`);
    }
  }

  return sections.join('\n');
}

/**
 * Format Claude Code testing context section.
 */
function formatTestingContext(analysis: SkillAnalysis): string {
  const sections: string[] = [];

  if (analysis.testingPatterns.length > 0) {
    sections.push('### Testing Patterns');
    for (const pattern of analysis.testingPatterns) {
      sections.push(`- ${pattern}`);
    }
  }

  if (analysis.toolInvocationExpectations.length > 0) {
    sections.push('\n### Expected Tool Invocations');
    for (const tool of analysis.toolInvocationExpectations) {
      sections.push(`- ${tool}`);
    }
  }

  return sections.join('\n');
}

/**
 * Build enhanced prompt with skill analysis context.
 *
 * When analysis is available, enriches the prompt with:
 * - Extracted capabilities and concepts
 * - Edge cases to consider
 * - Claude Code testing patterns
 * - Expected tool invocations
 *
 * When analysis is null (graceful degradation), builds basic prompt.
 *
 * @param skillContent - Formatted skill content from SkillContentCollector
 * @param analysis - SkillAnalysis from skill-creator, or null for basic mode
 * @returns Enhanced prompt string for test generation
 */
export function buildEnhancedTestPrompt(
  skillContent: string,
  analysis: SkillAnalysis | null
): string {
  const hasAnalysis = analysis && (
    analysis.capabilities.length > 0 ||
    analysis.keyConcepts.length > 0 ||
    analysis.edgeCases.length > 0
  );

  if (!hasAnalysis) {
    // Fallback to basic prompt (same as original TEST_GENERATION_PROMPT)
    return buildBasicTestPrompt(skillContent);
  }

  const skillAnalysisSection = formatSkillAnalysis(analysis!);
  const testingContextSection = formatTestingContext(analysis!);

  return `You must respond with ONLY a JSON object. No explanation, no markdown code blocks, just raw JSON.

## Skill Analysis
${skillAnalysisSection}

## Claude Code Testing Context
${testingContextSection}

## Skill Content
${skillContent}

## Output Format
{"skill_name":"<name>","tests":[{
  "name":"<skill>-<topic>",
  "test_type":"knowledge"|"task",
  "concepts":["extracted from analysis above"],
  "timeout":120|180,
  "prompt":"...",
  "expected_items":["..."]
}]}

## Rules
- Generate 2-4 tests: at least 1 knowledge + 1 task test
- Use concepts from the Skill Analysis section above
- Consider edge cases listed above when designing tests
- Include expected tool invocations in task test expected_items
- timeout: 120 (knowledge), 180 (task)
- 4-8 expected_items per test
- Test names should be descriptive: <skill-name>-<topic>

JSON:`;
}

/**
 * Build basic test prompt without analysis (graceful degradation).
 */
function buildBasicTestPrompt(skillContent: string): string {
  return `You must respond with ONLY a JSON object. No explanation, no markdown code blocks, just raw JSON.

Generate tests for this skill. Output format:
{"skill_name":"<name>","tests":[{"name":"<skill>-<topic>","test_type":"knowledge"|"task","concepts":["..."],"timeout":120|180,"prompt":"...","expected_items":["..."]}]}

Rules:
- 2-4 tests, at least 1 knowledge + 1 task
- Extract concepts from Key Concepts Index or section headers
- timeout: 120 (knowledge), 180 (task)
- 4-8 expected_items per test

Skill content:
${skillContent}

JSON:`;
}

/**
 * Extract concepts from analysis for test definition.
 *
 * Merges key concepts from analysis with any existing concepts.
 */
export function mergeConceptsFromAnalysis(
  existingConcepts: string[],
  analysis: SkillAnalysis | null
): string[] {
  if (!analysis || analysis.keyConcepts.length === 0) {
    return existingConcepts;
  }

  const merged = new Set([...existingConcepts, ...analysis.keyConcepts]);
  return Array.from(merged);
}
