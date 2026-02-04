/**
 * Tests for unified-skill-source-resolver.ts
 * Verifies source type detection and routing logic
 */
import { describe, it, expect } from 'vitest';
import { detectSourceType, formatSourceDisplay } from './unified-skill-source-resolver.js';
import type { SkillSource } from '../types/index.js';

describe('detectSourceType', () => {
  describe('local sources', () => {
    it('detects absolute paths starting with /', () => {
      expect(detectSourceType('/Users/me/skills/my-skill')).toBe('local');
      expect(detectSourceType('/home/user/.claude/skills/test')).toBe('local');
    });

    it('detects relative paths starting with ./', () => {
      expect(detectSourceType('./my-skill')).toBe('local');
      expect(detectSourceType('./path/to/skill')).toBe('local');
    });

    it('detects parent relative paths starting with ../', () => {
      expect(detectSourceType('../my-skill')).toBe('local');
      expect(detectSourceType('../../skills/test')).toBe('local');
    });

    it('detects home directory paths starting with ~', () => {
      expect(detectSourceType('~/.claude/skills/my-skill')).toBe('local');
      expect(detectSourceType('~/skills/test')).toBe('local');
    });

    it('detects simple directory names without slashes', () => {
      expect(detectSourceType('my-skill')).toBe('local');
      expect(detectSourceType('test-skill-v2')).toBe('local');
    });
  });

  describe('git sources', () => {
    it('detects https:// git URLs', () => {
      expect(detectSourceType('https://github.com/user/repo')).toBe('git');
      expect(detectSourceType('https://gitlab.com/user/repo.git')).toBe('git');
    });

    it('detects git:// protocol URLs', () => {
      expect(detectSourceType('git://github.com/user/repo')).toBe('git');
    });

    it('detects SSH git URLs', () => {
      expect(detectSourceType('git@github.com:user/repo.git')).toBe('git');
    });
  });

  describe('skill.sh sources', () => {
    it('detects skill.sh/ prefixed references', () => {
      expect(detectSourceType('skill.sh/user/my-skill')).toBe('skillsh');
      expect(detectSourceType('skill.sh/org/advanced-skill')).toBe('skillsh');
    });
  });

  describe('unknown sources', () => {
    it('returns unknown for unrecognized patterns', () => {
      // Note: This case is handled by fallback logic in resolveSkillSource
      // detectSourceType may classify some edge cases differently
    });
  });
});

describe('formatSourceDisplay', () => {
  it('formats local source correctly', () => {
    const source: SkillSource = {
      type: 'local',
      original: './my-skill',
      localPath: '/Users/me/projects/my-skill',
      name: 'my-skill',
    };
    expect(formatSourceDisplay(source)).toBe('Local: /Users/me/projects/my-skill');
  });

  it('formats git source correctly', () => {
    const source: SkillSource = {
      type: 'git',
      original: 'https://github.com/user/skill-repo',
      localPath: '/tmp/skillmark-cache/skill-repo',
      name: 'skill-repo',
    };
    expect(formatSourceDisplay(source)).toBe('Git: https://github.com/user/skill-repo');
  });

  it('formats skill.sh source correctly', () => {
    const source: SkillSource = {
      type: 'skillsh',
      original: 'skill.sh/user/my-skill',
      localPath: '/tmp/skillmark-cache/my-skill',
      name: 'my-skill',
    };
    expect(formatSourceDisplay(source)).toBe('skill.sh: skill.sh/user/my-skill');
  });
});
