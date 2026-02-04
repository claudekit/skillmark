/**
 * Skill content collector for test generation.
 *
 * Collects and formats skill content (SKILL.md, references/, scripts/)
 * for analysis by Claude CLI to generate test files.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import matter from 'gray-matter';

/** Collected skill content for Claude analysis */
export interface SkillContent {
  /** Skill name from frontmatter */
  skillName: string;
  /** Full SKILL.md content */
  skillMd: string;
  /** Reference files (filename -> content) */
  references: Map<string, string>;
  /** Script files (filename -> first 100 lines) */
  scripts: Map<string, string>;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  message: string;
}

/**
 * Skill content collector - gathers skill files for test generation
 */
export class SkillContentCollector {
  private skillPath: string;
  private skillMdPath: string;

  constructor(skillPath: string) {
    this.skillPath = skillPath;
    this.skillMdPath = join(skillPath, 'SKILL.md');
  }

  /**
   * Validate skill has required SKILL.md with YAML frontmatter
   */
  async validate(): Promise<ValidationResult> {
    try {
      await stat(this.skillPath);
    } catch {
      return { valid: false, message: `Skill path not found: ${this.skillPath}` };
    }

    try {
      await stat(this.skillMdPath);
    } catch {
      return { valid: false, message: `SKILL.md not found in ${this.skillPath}` };
    }

    const content = await readFile(this.skillMdPath, 'utf-8');

    if (!content.startsWith('---')) {
      return { valid: false, message: 'SKILL.md missing YAML frontmatter' };
    }

    try {
      const { data: frontmatter } = matter(content);

      if (!frontmatter.name) {
        return { valid: false, message: "Missing 'name' in frontmatter" };
      }

      if (!frontmatter.description) {
        return { valid: false, message: "Missing 'description' in frontmatter" };
      }

      return { valid: true, message: 'Valid' };
    } catch {
      return { valid: false, message: 'Invalid YAML frontmatter format' };
    }
  }

  /**
   * Extract skill name from SKILL.md frontmatter
   */
  async getSkillName(): Promise<string | null> {
    try {
      const content = await readFile(this.skillMdPath, 'utf-8');
      const { data: frontmatter } = matter(content);
      return frontmatter.name || null;
    } catch {
      return null;
    }
  }

  /**
   * Read SKILL.md content
   */
  async collectSkillMd(): Promise<string> {
    return readFile(this.skillMdPath, 'utf-8');
  }

  /**
   * Collect all markdown files from references/ directory
   */
  async collectReferences(): Promise<Map<string, string>> {
    const refs = new Map<string, string>();
    const refsDir = join(this.skillPath, 'references');

    try {
      const entries = await readdir(refsDir);

      for (const entry of entries) {
        if (extname(entry) === '.md') {
          const filePath = join(refsDir, entry);
          const content = await readFile(filePath, 'utf-8');
          refs.set(entry, content);
        }
      }
    } catch {
      // references/ directory doesn't exist - that's okay
    }

    return refs;
  }

  /**
   * Collect Python scripts from scripts/ directory (first 100 lines)
   */
  async collectScripts(): Promise<Map<string, string>> {
    const scripts = new Map<string, string>();
    const scriptsDir = join(this.skillPath, 'scripts');

    try {
      const entries = await readdir(scriptsDir);

      for (const entry of entries) {
        if (extname(entry) === '.py') {
          const filePath = join(scriptsDir, entry);
          const content = await readFile(filePath, 'utf-8');
          // Limit to first 100 lines to reduce token usage
          const lines = content.split('\n').slice(0, 100);
          scripts.set(entry, lines.join('\n'));
        }
      }
    } catch {
      // scripts/ directory doesn't exist - that's okay
    }

    return scripts;
  }

  /**
   * Collect all skill content for Claude analysis
   */
  async collectAll(): Promise<SkillContent> {
    const [skillName, skillMd, references, scripts] = await Promise.all([
      this.getSkillName(),
      this.collectSkillMd(),
      this.collectReferences(),
      this.collectScripts(),
    ]);

    return {
      skillName: skillName || 'unknown-skill',
      skillMd,
      references,
      scripts,
    };
  }

  /**
   * Format collected content as a prompt-friendly string
   */
  async formatForPrompt(): Promise<string> {
    const content = await this.collectAll();
    const parts: string[] = [];

    parts.push(`# Skill: ${content.skillName}\n`);
    parts.push('## SKILL.md\n```markdown\n' + content.skillMd + '\n```\n');

    if (content.references.size > 0) {
      parts.push('## Reference Files\n');
      for (const [name, text] of content.references) {
        parts.push(`### ${name}\n\`\`\`markdown\n${text}\n\`\`\`\n`);
      }
    }

    if (content.scripts.size > 0) {
      parts.push('## Scripts (first 100 lines each)\n');
      for (const [name, text] of content.scripts) {
        parts.push(`### ${name}\n\`\`\`python\n${text}\n\`\`\`\n`);
      }
    }

    return parts.join('\n');
  }
}
