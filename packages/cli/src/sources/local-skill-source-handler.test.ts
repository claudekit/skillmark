/**
 * Tests for local-skill-source-handler.ts
 * Verifies local path detection and validation
 */
import { describe, it, expect } from 'vitest';
import { isLocalSource } from './local-skill-source-handler.js';

describe('isLocalSource', () => {
  describe('absolute paths', () => {
    it('returns true for paths starting with /', () => {
      expect(isLocalSource('/Users/me/skill')).toBe(true);
      expect(isLocalSource('/home/user/.claude/skills/test')).toBe(true);
      expect(isLocalSource('/')).toBe(true);
    });
  });

  describe('relative paths', () => {
    it('returns true for paths starting with ./', () => {
      expect(isLocalSource('./skill')).toBe(true);
      expect(isLocalSource('./path/to/skill')).toBe(true);
    });

    it('returns true for paths starting with ../', () => {
      expect(isLocalSource('../skill')).toBe(true);
      expect(isLocalSource('../../skills/test')).toBe(true);
    });
  });

  describe('home directory paths', () => {
    it('returns true for paths starting with ~', () => {
      expect(isLocalSource('~/.claude/skills/my-skill')).toBe(true);
      expect(isLocalSource('~/skills')).toBe(true);
    });
  });

  describe('simple directory names', () => {
    it('returns true for names without slashes or protocols', () => {
      expect(isLocalSource('my-skill')).toBe(true);
      expect(isLocalSource('test-skill-v2')).toBe(true);
      expect(isLocalSource('skill_name')).toBe(true);
    });
  });

  describe('non-local sources', () => {
    it('returns false for URLs with protocol', () => {
      expect(isLocalSource('https://github.com/user/repo')).toBe(false);
      expect(isLocalSource('git://github.com/user/repo')).toBe(false);
      expect(isLocalSource('http://example.com/skill')).toBe(false);
    });

    it('returns false for skill.sh references', () => {
      expect(isLocalSource('skill.sh/user/my-skill')).toBe(false);
      expect(isLocalSource('skill.sh/org/test')).toBe(false);
    });

    it('returns false for paths with slashes that look like org/repo', () => {
      // These are treated as potential git shorthand (user/repo)
      expect(isLocalSource('user/repo')).toBe(false);
      expect(isLocalSource('org/skill-name')).toBe(false);
    });
  });
});
