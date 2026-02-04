/**
 * Retry-then-degrade utilities for graceful error handling.
 *
 * Provides retry logic with exponential backoff and graceful
 * degradation when operations fail after exhausting retries.
 */

/** Options for retry behavior */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 1) */
  maxRetries?: number;
  /** Initial delay between retries in milliseconds (default: 1000) */
  delayMs?: number;
  /** Whether to use exponential backoff (default: false) */
  exponentialBackoff?: boolean;
  /** Optional callback for logging retry attempts */
  onRetry?: (attempt: number, error: Error) => void;
}

/** Default retry options */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 1,
  delayMs: 1000,
  exponentialBackoff: false,
};

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and graceful degradation.
 *
 * Attempts the function up to maxRetries times. If all attempts fail,
 * returns null instead of throwing, allowing callers to gracefully
 * degrade to fallback behavior.
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Result of fn, or null if all attempts fail
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => invokeSkillCreator(skillPath),
 *   { maxRetries: 1, delayMs: 1000 }
 * );
 *
 * if (!result) {
 *   // Gracefully degrade to basic generation
 *   return generateFallbackTests(skillPath);
 * }
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T | null> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === opts.maxRetries;

      if (opts.onRetry && !isLastAttempt) {
        opts.onRetry(attempt + 1, error as Error);
      }

      if (isLastAttempt) {
        console.warn(
          `Failed after ${attempt + 1} attempt(s), degrading gracefully: ${(error as Error).message}`
        );
        return null;
      }

      // Calculate delay with optional exponential backoff
      const delay = opts.exponentialBackoff
        ? opts.delayMs * Math.pow(2, attempt)
        : opts.delayMs;

      await sleep(delay);
    }
  }

  return null;
}

/**
 * Execute multiple functions with retry, returning the first successful result.
 *
 * Tries each function in order, applying retry logic to each.
 * Returns the first successful result, or null if all fail.
 *
 * @param fns - Array of async functions to try in order
 * @param options - Retry configuration for each function
 * @returns First successful result, or null if all fail
 */
export async function withRetryChain<T>(
  fns: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<T | null> {
  for (const fn of fns) {
    const result = await withRetry(fn, options);
    if (result !== null) {
      return result;
    }
  }
  return null;
}
