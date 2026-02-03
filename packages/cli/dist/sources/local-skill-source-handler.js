/**
 * Local skill source handler - loads skills from local filesystem paths
 */
import { access, readdir, readFile, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
/** Files that indicate a skill directory */
const SKILL_INDICATORS = ['SKILL.md', 'skill.md', 'README.md', 'index.ts', 'index.js'];
/**
 * Check if a path is a local skill source
 */
export function isLocalSource(source) {
    // Local paths start with /, ./, ../, or are just directory names
    return (source.startsWith('/') ||
        source.startsWith('./') ||
        source.startsWith('../') ||
        source.startsWith('~') ||
        (!source.includes('://') && !source.includes('/') && !source.startsWith('skill.sh')));
}
/**
 * Resolve a local skill source
 */
export async function resolveLocalSource(source) {
    // Expand ~ to home directory
    let resolvedPath = source;
    if (source.startsWith('~')) {
        const home = process.env.HOME || process.env.USERPROFILE || '';
        resolvedPath = source.replace('~', home);
    }
    // Make absolute
    resolvedPath = resolve(resolvedPath);
    // Verify path exists
    try {
        await access(resolvedPath);
    }
    catch {
        throw new Error(`Skill path not found: ${source}`);
    }
    // Check if it's a directory or file
    const stats = await stat(resolvedPath);
    if (stats.isFile()) {
        // Single file skill (e.g., SKILL.md)
        return {
            type: 'local',
            original: source,
            localPath: resolvedPath,
            name: extractSkillName(resolvedPath),
        };
    }
    if (stats.isDirectory()) {
        // Validate it looks like a skill directory
        const isValid = await validateSkillDirectory(resolvedPath);
        if (!isValid) {
            throw new Error(`Directory does not appear to be a skill: ${source}\n` +
                `Expected one of: ${SKILL_INDICATORS.join(', ')}`);
        }
        return {
            type: 'local',
            original: source,
            localPath: resolvedPath,
            name: extractSkillName(resolvedPath),
        };
    }
    throw new Error(`Invalid skill path (not a file or directory): ${source}`);
}
/**
 * Validate that a directory contains skill files
 */
async function validateSkillDirectory(dirPath) {
    try {
        const files = await readdir(dirPath);
        return SKILL_INDICATORS.some((indicator) => files.some((f) => f.toLowerCase() === indicator.toLowerCase()));
    }
    catch {
        return false;
    }
}
/**
 * Extract skill name from path
 */
function extractSkillName(skillPath) {
    const base = basename(skillPath);
    // If it's a file, use parent directory name
    if (base.includes('.')) {
        const parentDir = basename(resolve(skillPath, '..'));
        return parentDir;
    }
    return base;
}
/**
 * Find test files in a skill directory
 */
export async function findTestsInSkillDir(skillPath) {
    const testsDir = join(skillPath, 'tests');
    try {
        await access(testsDir);
        const files = await readdir(testsDir);
        return files
            .filter((f) => f.endsWith('.md'))
            .map((f) => join(testsDir, f));
    }
    catch {
        // No tests directory, look for test files in root
        try {
            const files = await readdir(skillPath);
            return files
                .filter((f) => f.endsWith('.test.md') || f.startsWith('test-'))
                .map((f) => join(skillPath, f));
        }
        catch {
            return [];
        }
    }
}
/**
 * Read skill metadata from SKILL.md or README.md
 */
export async function readSkillMetadata(skillPath) {
    const stats = await stat(skillPath);
    const dir = stats.isDirectory() ? skillPath : resolve(skillPath, '..');
    for (const filename of ['SKILL.md', 'skill.md', 'README.md']) {
        const filePath = join(dir, filename);
        try {
            const content = await readFile(filePath, 'utf-8');
            // Extract name from first heading
            const nameMatch = content.match(/^#\s+(.+)$/m);
            const name = nameMatch ? nameMatch[1].trim() : basename(dir);
            // Extract description from first paragraph after heading
            const descMatch = content.match(/^#.+\n\n(.+?)(?:\n\n|$)/s);
            const description = descMatch ? descMatch[1].trim() : '';
            return { name, description };
        }
        catch {
            continue;
        }
    }
    return null;
}
//# sourceMappingURL=local-skill-source-handler.js.map