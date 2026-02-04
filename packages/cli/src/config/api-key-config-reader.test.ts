/**
 * Tests for api-key-config-reader.ts
 * Verifies API key config source descriptions and priority logic
 */
import { describe, it, expect } from 'vitest';
import { getConfigSourceDescription } from './api-key-config-reader.js';

describe('getConfigSourceDescription', () => {
  it('returns env variable description for env source', () => {
    const result = getConfigSourceDescription('env');
    expect(result).toBe('SKILLMARK_API_KEY environment variable');
  });

  it('returns skillmarkrc path for skillmarkrc source', () => {
    const result = getConfigSourceDescription('skillmarkrc');
    expect(result).toBe('~/.skillmarkrc');
  });

  it('returns claude env path for claude-env source', () => {
    const result = getConfigSourceDescription('claude-env');
    expect(result).toBe('~/.claude/.env');
  });
});
