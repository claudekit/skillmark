/**
 * Detects the git remote URL from a directory if it's a git repository.
 */
import { spawn } from 'node:child_process';

/**
 * Detect git remote origin URL from a directory.
 * Returns null if not a git repo or no remote found.
 */
export async function detectGitRepoUrl(dirPath: string): Promise<string | null> {
  try {
    const url = await runGitCommand(['config', '--get', 'remote.origin.url'], dirPath);
    if (!url) return null;

    // Normalize SSH URLs to HTTPS for display
    return normalizeGitUrl(url.trim());
  } catch {
    return null;
  }
}

/**
 * Normalize git URLs to HTTPS format for consistent display.
 * Converts SSH (git@github.com:user/repo.git) to HTTPS.
 */
function normalizeGitUrl(url: string): string {
  // SSH format: git@github.com:user/repo.git
  const sshMatch = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return `https://${sshMatch[1]}/${sshMatch[2]}`;
  }

  // Already HTTPS - strip .git suffix
  return url.replace(/\.git$/, '');
}

function runGitCommand(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
    });

    let stdout = '';
    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`git exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}
