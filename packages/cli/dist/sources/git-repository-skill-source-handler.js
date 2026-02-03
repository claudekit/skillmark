/**
 * Git repository skill source handler - clones and manages skills from git URLs
 */
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';
/** Git URL patterns */
const GIT_URL_PATTERNS = [
    /^https?:\/\/github\.com\//,
    /^https?:\/\/gitlab\.com\//,
    /^https?:\/\/bitbucket\.org\//,
    /^git@/,
    /^git:\/\//,
    /\.git$/,
];
/** Cache directory for cloned repos */
const CACHE_DIR = join(process.env.HOME || '/tmp', '.skillmark', 'git-cache');
/**
 * Check if a source is a git URL
 */
export function isGitSource(source) {
    return GIT_URL_PATTERNS.some((pattern) => pattern.test(source));
}
/**
 * Resolve a git skill source by cloning the repository
 */
export async function resolveGitSource(source) {
    // Parse git URL to extract name
    const name = extractRepoName(source);
    const cacheId = generateCacheId(source);
    const localPath = join(CACHE_DIR, cacheId);
    // Create cache directory
    await mkdir(CACHE_DIR, { recursive: true });
    // Check if already cloned (use existing cache)
    const git = simpleGit();
    try {
        // Try to update existing clone
        const existingGit = simpleGit(localPath);
        await existingGit.fetch();
        await existingGit.pull();
    }
    catch {
        // Clone fresh
        await rm(localPath, { recursive: true, force: true });
        await git.clone(source, localPath, ['--depth', '1']);
    }
    return {
        type: 'git',
        original: source,
        localPath,
        name,
    };
}
/**
 * Extract repository name from git URL
 */
function extractRepoName(url) {
    // Remove .git suffix
    let cleaned = url.replace(/\.git$/, '');
    // Extract last path segment
    const segments = cleaned.split('/').filter(Boolean);
    const name = segments[segments.length - 1] || 'unknown';
    // Handle git@ format
    if (name.includes(':')) {
        return name.split(':').pop() || 'unknown';
    }
    return name;
}
/**
 * Generate a cache ID for a git URL
 */
function generateCacheId(url) {
    // Create a deterministic but short ID from the URL
    const name = extractRepoName(url);
    const hash = simpleHash(url).toString(16).slice(0, 8);
    return `${name}-${hash}`;
}
/**
 * Simple hash function for generating cache IDs
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}
/**
 * Clean up git cache
 */
export async function cleanGitCache() {
    try {
        await rm(CACHE_DIR, { recursive: true, force: true });
    }
    catch {
        // Ignore errors
    }
}
/**
 * Clone a specific branch or tag
 */
export async function resolveGitSourceWithRef(source, ref) {
    const name = extractRepoName(source);
    const cacheId = `${generateCacheId(source)}-${ref}`;
    const localPath = join(CACHE_DIR, cacheId);
    await mkdir(CACHE_DIR, { recursive: true });
    await rm(localPath, { recursive: true, force: true });
    const git = simpleGit();
    await git.clone(source, localPath, ['--depth', '1', '--branch', ref]);
    return {
        type: 'git',
        original: `${source}#${ref}`,
        localPath,
        name: `${name}@${ref}`,
    };
}
//# sourceMappingURL=git-repository-skill-source-handler.js.map