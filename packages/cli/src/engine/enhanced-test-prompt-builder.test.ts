/**
 * Tests for enhanced-test-prompt-builder.ts
 * Verifies prompt assembly with skill analysis enrichment
 */
import { describe, it, expect } from 'vitest';
import {
  buildEnhancedTestPrompt,
  mergeConceptsFromAnalysis,
} from './enhanced-test-prompt-builder.js';
import type { SkillAnalysis } from './skill-creator-invoker.js';

// Helper to create skill analysis
function createSkillAnalysis(overrides: Partial<SkillAnalysis> = {}): SkillAnalysis {
  return {
    capabilities: ['cap1', 'cap2'],
    keyConcepts: ['concept1', 'concept2'],
    edgeCases: ['edge1', 'edge2'],
    testingPatterns: ['pattern1', 'pattern2'],
    toolInvocationExpectations: ['tool1', 'tool2'],
    ...overrides,
  };
}

describe('buildEnhancedTestPrompt', () => {
  const skillContent = 'Skill content here';

  it('returns basic prompt when analysis is null', () => {
    const result = buildEnhancedTestPrompt(skillContent, null);

    expect(result).toContain('You must respond with ONLY a JSON object');
    expect(result).toContain('Skill content:');
    expect(result).toContain(skillContent);
    expect(result).not.toContain('## Skill Analysis');
    expect(result).not.toContain('## Claude Code Testing Context');
  });

  it('returns basic prompt when analysis has empty arrays', () => {
    const emptyAnalysis = createSkillAnalysis({
      capabilities: [],
      keyConcepts: [],
      edgeCases: [],
      testingPatterns: [],
      toolInvocationExpectations: [],
    });

    const result = buildEnhancedTestPrompt(skillContent, emptyAnalysis);

    expect(result).toContain('Skill content:');
    expect(result).not.toContain('## Skill Analysis');
  });

  it('includes skill analysis section when capabilities provided', () => {
    const analysis = createSkillAnalysis({
      capabilities: ['capability-one', 'capability-two'],
      keyConcepts: [],
      edgeCases: [],
    });

    const result = buildEnhancedTestPrompt(skillContent, analysis);

    expect(result).toContain('## Skill Analysis');
    expect(result).toContain('### Capabilities');
    expect(result).toContain('- capability-one');
    expect(result).toContain('- capability-two');
  });

  it('includes skill analysis section when key concepts provided', () => {
    const analysis = createSkillAnalysis({
      capabilities: [],
      keyConcepts: ['concept-alpha', 'concept-beta'],
      edgeCases: [],
    });

    const result = buildEnhancedTestPrompt(skillContent, analysis);

    expect(result).toContain('## Skill Analysis');
    expect(result).toContain('### Key Concepts');
    expect(result).toContain('- concept-alpha');
    expect(result).toContain('- concept-beta');
  });

  it('includes skill analysis section when edge cases provided', () => {
    const analysis = createSkillAnalysis({
      capabilities: [],
      keyConcepts: [],
      edgeCases: ['edge-case-1', 'edge-case-2'],
    });

    const result = buildEnhancedTestPrompt(skillContent, analysis);

    expect(result).toContain('## Skill Analysis');
    expect(result).toContain('### Edge Cases to Test');
    expect(result).toContain('- edge-case-1');
    expect(result).toContain('- edge-case-2');
  });

  it('includes testing context when tool expectations provided', () => {
    const analysis = createSkillAnalysis({
      capabilities: ['cap'],
      toolInvocationExpectations: ['Bash tool', 'Read tool'],
    });

    const result = buildEnhancedTestPrompt(skillContent, analysis);

    expect(result).toContain('## Claude Code Testing Context');
    expect(result).toContain('### Expected Tool Invocations');
    expect(result).toContain('- Bash tool');
    expect(result).toContain('- Read tool');
  });

  it('includes testing context when testing patterns provided', () => {
    const analysis = createSkillAnalysis({
      capabilities: ['cap'],
      testingPatterns: ['pattern-a', 'pattern-b'],
    });

    const result = buildEnhancedTestPrompt(skillContent, analysis);

    expect(result).toContain('## Claude Code Testing Context');
    expect(result).toContain('### Testing Patterns');
    expect(result).toContain('- pattern-a');
    expect(result).toContain('- pattern-b');
  });

  it('appends additional context when promptContext provided', () => {
    const analysis = createSkillAnalysis();
    const promptContext = 'Additional context for test generation';

    const result = buildEnhancedTestPrompt(skillContent, analysis, promptContext);

    expect(result).toContain('## Additional Context');
    expect(result).toContain(promptContext);
  });

  it('appends additional context for basic prompt too', () => {
    const promptContext = 'Extra context here';

    const result = buildEnhancedTestPrompt(skillContent, null, promptContext);

    expect(result).toContain('Additional context:');
    expect(result).toContain(promptContext);
  });

  it('always includes JSON output format instructions', () => {
    const result = buildEnhancedTestPrompt(skillContent, null);

    expect(result).toContain('{"skill_name":"<name>","tests":[');
    expect(result).toContain('Output format:');
  });

  it('always includes security testing rules', () => {
    const result = buildEnhancedTestPrompt(skillContent, null);

    expect(result).toContain('test_type: "security"');
    expect(result).toContain('forbidden_patterns');
    expect(result).toContain('Security tests');
  });

  it('enriched prompt includes all sections in order', () => {
    const analysis = createSkillAnalysis();
    const result = buildEnhancedTestPrompt(skillContent, analysis, 'context');

    const sections = [
      '## Skill Analysis',
      '## Claude Code Testing Context',
      '## Skill Content',
      '## Additional Context',
      '## Output Format',
      '## Rules',
      '## Security Testing',
    ];

    let lastIndex = -1;
    for (const section of sections) {
      const index = result.indexOf(section);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });
});

describe('mergeConceptsFromAnalysis', () => {
  it('returns existing concepts when analysis is null', () => {
    const existing = ['concept-a', 'concept-b'];
    const result = mergeConceptsFromAnalysis(existing, null);

    expect(result).toEqual(existing);
  });

  it('returns existing concepts when analysis has empty keyConcepts', () => {
    const existing = ['concept-a', 'concept-b'];
    const analysis = createSkillAnalysis({ keyConcepts: [] });

    const result = mergeConceptsFromAnalysis(existing, analysis);

    expect(result).toEqual(existing);
  });

  it('merges without duplicates', () => {
    const existing = ['concept-a', 'concept-b'];
    const analysis = createSkillAnalysis({
      keyConcepts: ['concept-b', 'concept-c'],
    });

    const result = mergeConceptsFromAnalysis(existing, analysis);

    expect(result).toHaveLength(3);
    expect(result).toContain('concept-a');
    expect(result).toContain('concept-b');
    expect(result).toContain('concept-c');
    // Ensure no duplicates
    expect(new Set(result).size).toBe(result.length);
  });

  it('preserves all existing concepts', () => {
    const existing = ['existing-1', 'existing-2', 'existing-3'];
    const analysis = createSkillAnalysis({
      keyConcepts: ['new-1', 'new-2'],
    });

    const result = mergeConceptsFromAnalysis(existing, analysis);

    for (const concept of existing) {
      expect(result).toContain(concept);
    }
  });

  it('adds all new concepts from analysis', () => {
    const existing = ['existing'];
    const analysis = createSkillAnalysis({
      keyConcepts: ['new-1', 'new-2', 'new-3'],
    });

    const result = mergeConceptsFromAnalysis(existing, analysis);

    expect(result).toContain('new-1');
    expect(result).toContain('new-2');
    expect(result).toContain('new-3');
  });

  it('handles empty existing concepts', () => {
    const analysis = createSkillAnalysis({
      keyConcepts: ['concept-1', 'concept-2'],
    });

    const result = mergeConceptsFromAnalysis([], analysis);

    expect(result).toEqual(['concept-1', 'concept-2']);
  });
});
