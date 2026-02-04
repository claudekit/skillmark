import { describe, it, expect } from 'vitest';
import { BenchmarkApp } from '../src/main';

describe('BenchmarkApp', () => {
  it('should create instance with name', () => {
    const app = new BenchmarkApp('test-app');
    expect(app.getName()).toBe('test-app');
  });

  it('should have default version', () => {
    const app = new BenchmarkApp('test-app');
    expect(app.getVersion()).toBe('1.0.0');
  });

  it('should accept custom version', () => {
    const app = new BenchmarkApp('test-app', '2.0.0');
    expect(app.getVersion()).toBe('2.0.0');
  });
});
