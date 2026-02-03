import type { BenchmarkResult, PublishOptions } from '../types/index.js';
/** Extended publish options for auto-publish */
export interface AutoPublishOptions {
    apiKey: string;
    endpoint?: string;
    testsPath?: string;
}
/**
 * Execute the publish command
 */
export declare function publishResults(resultPath: string, options: PublishOptions): Promise<void>;
/**
 * Publish results with auto-key (from run command with --publish flag)
 * Includes test files and skill.sh link detection
 */
export declare function publishResultsWithAutoKey(result: BenchmarkResult, options: AutoPublishOptions): Promise<void>;
/**
 * Verify API key is valid
 */
export declare function verifyApiKey(apiKey: string, endpoint?: string): Promise<boolean>;
//# sourceMappingURL=publish-results-command.d.ts.map