/**
 * Tests for markdown-test-definition-parser.ts
 * Verifies parsing of test markdown files with YAML frontmatter
 */
import { describe, it, expect } from 'vitest';
import { parseTestContent } from './markdown-test-definition-parser.js';

describe('parseTestContent', () => {
  describe('frontmatter parsing', () => {
    it('parses name from frontmatter', () => {
      const content = `---
name: my-test
type: knowledge
---

# Prompt
What is the answer?

# Expected
- Correct response`;

      const result = parseTestContent(content, 'test.md');

      expect(result.name).toBe('my-test');
    });

    it('throws error when name is missing', () => {
      const content = `---
type: knowledge
---

# Prompt
What is the answer?

# Expected
- Correct`;

      expect(() => parseTestContent(content, 'test.md')).toThrow(
        "Test file missing required 'name' field"
      );
    });

    it('parses type with default to knowledge', () => {
      const content = `---
name: test-with-type
type: task
---

# Prompt
Do something

# Expected
- Done`;

      const result = parseTestContent(content, 'test.md');
      expect(result.type).toBe('task');

      // Test default
      const contentNoType = `---
name: test-no-type
---

# Prompt
Question?

# Expected
- Answer`;

      const resultDefault = parseTestContent(contentNoType, 'default.md');
      expect(resultDefault.type).toBe('knowledge');
    });

    it('parses timeout with default to 600', () => {
      const content = `---
name: test-timeout
timeout: 1800
---

# Prompt
Long task

# Expected
- Complete`;

      const result = parseTestContent(content, 'test.md');
      expect(result.timeout).toBe(1800);

      // Test default
      const contentNoTimeout = `---
name: test-default-timeout
---

# Prompt
Question

# Expected
- Answer`;

      const resultDefault = parseTestContent(contentNoTimeout, 'default.md');
      expect(resultDefault.timeout).toBe(600);
    });

    it('parses concepts array from frontmatter', () => {
      const content = `---
name: test-concepts
concepts:
  - orchestrator
  - consensus
  - isolation
---

# Prompt
Explain multi-agent systems

# Expected
- Covers key concepts`;

      const result = parseTestContent(content, 'test.md');

      expect(result.concepts).toContain('orchestrator');
      expect(result.concepts).toContain('consensus');
      expect(result.concepts).toContain('isolation');
    });
  });

  describe('section parsing', () => {
    it('extracts prompt from # Prompt section', () => {
      const content = `---
name: test-prompt
---

# Prompt
This is the prompt text.
It can span multiple lines.

# Expected
- Expected output`;

      const result = parseTestContent(content, 'test.md');

      expect(result.prompt).toBe('This is the prompt text.\nIt can span multiple lines.');
    });

    it('extracts prompt from # Question section as fallback', () => {
      const content = `---
name: test-question
---

# Question
What is 2 + 2?

# Expected
- 4`;

      const result = parseTestContent(content, 'test.md');

      expect(result.prompt).toBe('What is 2 + 2?');
    });

    it('throws error when prompt section is missing', () => {
      const content = `---
name: test-no-prompt
---

# Expected
- Something`;

      expect(() => parseTestContent(content, 'test.md')).toThrow(
        "Test file missing 'Prompt' or 'Question' section"
      );
    });
  });

  describe('expected patterns parsing', () => {
    it('parses checkbox items', () => {
      const content = `---
name: test-checkbox
---

# Prompt
Question?

# Expected
- [ ] First item
- [x] Second item (checked)
- [ ] Third item`;

      const result = parseTestContent(content, 'test.md');

      expect(result.expected).toContain('First item');
      expect(result.expected).toContain('Second item (checked)');
      expect(result.expected).toContain('Third item');
    });

    it('parses bullet list items', () => {
      const content = `---
name: test-bullets
---

# Prompt
Question?

# Expected
- First bullet
- Second bullet
* Asterisk bullet`;

      const result = parseTestContent(content, 'test.md');

      expect(result.expected).toContain('First bullet');
      expect(result.expected).toContain('Second bullet');
      expect(result.expected).toContain('Asterisk bullet');
    });

    it('parses numbered list items', () => {
      const content = `---
name: test-numbered
---

# Prompt
Question?

# Expected
1. First item
2. Second item
3. Third item`;

      const result = parseTestContent(content, 'test.md');

      expect(result.expected).toContain('First item');
      expect(result.expected).toContain('Second item');
      expect(result.expected).toContain('Third item');
    });

    it('extracts concepts from expected patterns with quotes', () => {
      const content = `---
name: test-quoted-concepts
---

# Prompt
Question?

# Expected
- Should mention "orchestrator" pattern
- Include "context isolation" technique`;

      const result = parseTestContent(content, 'test.md');

      expect(result.concepts).toContain('orchestrator');
      expect(result.concepts).toContain('context isolation');
    });

    it('extracts concepts from backticked terms', () => {
      const content = `---
name: test-backtick-concepts
---

# Prompt
Question?

# Expected
- Uses \`spawn\` function
- Calls \`Task\` tool`;

      const result = parseTestContent(content, 'test.md');

      expect(result.concepts).toContain('spawn');
      expect(result.concepts).toContain('Task');
    });
  });

  describe('concept deduplication', () => {
    it('removes duplicate concepts', () => {
      const content = `---
name: test-dedup
concepts:
  - orchestrator
  - consensus
---

# Prompt
Question?

# Expected
- Uses "orchestrator" pattern
- Implements "consensus"`;

      const result = parseTestContent(content, 'test.md');

      // Should have unique concepts only
      const orchestratorCount = result.concepts.filter((c) => c === 'orchestrator').length;
      expect(orchestratorCount).toBe(1);
    });
  });

  describe('sourcePath tracking', () => {
    it('includes source path in result', () => {
      const content = `---
name: test-source
---

# Prompt
Q

# Expected
- A`;

      const result = parseTestContent(content, '/path/to/test.md');

      expect(result.sourcePath).toBe('/path/to/test.md');
    });
  });
});
