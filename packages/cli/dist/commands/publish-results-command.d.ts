import type { PublishOptions } from '../types/index.js';
/**
 * Execute the publish command
 */
export declare function publishResults(resultPath: string, options: PublishOptions): Promise<void>;
/**
 * Verify API key is valid
 */
export declare function verifyApiKey(apiKey: string, endpoint?: string): Promise<boolean>;
//# sourceMappingURL=publish-results-command.d.ts.map