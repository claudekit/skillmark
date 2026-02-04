#!/usr/bin/env python3
"""
Skill content collector for test generation.

Collects and formats skill content (SKILL.md, references/, scripts/)
for analysis by Claude CLI to generate test files.
"""

import re
from pathlib import Path
from typing import Optional

from encoding_utils import read_text_utf8


class SkillContentCollector:
    """Collects skill content for test generation."""

    def __init__(self, skill_path: str | Path):
        self.skill_path = Path(skill_path).resolve()
        self.skill_md_path = self.skill_path / "SKILL.md"

    def validate(self) -> tuple[bool, str]:
        """Validate skill has required SKILL.md with YAML frontmatter."""
        if not self.skill_path.exists():
            return False, f"Skill path not found: {self.skill_path}"

        if not self.skill_md_path.exists():
            return False, f"SKILL.md not found in {self.skill_path}"

        content = read_text_utf8(self.skill_md_path)
        if not content.startswith("---"):
            return False, "SKILL.md missing YAML frontmatter"

        match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
        if not match:
            return False, "Invalid YAML frontmatter format"

        frontmatter = match.group(1)
        if "name:" not in frontmatter:
            return False, "Missing 'name' in frontmatter"
        if "description:" not in frontmatter:
            return False, "Missing 'description' in frontmatter"

        return True, "Valid"

    def get_skill_name(self) -> Optional[str]:
        """Extract skill name from SKILL.md frontmatter."""
        if not self.skill_md_path.exists():
            return None

        content = read_text_utf8(self.skill_md_path)
        match = re.search(r"^name:\s*(.+)$", content, re.MULTILINE)
        return match.group(1).strip() if match else None

    def collect_skill_md(self) -> str:
        """Read SKILL.md content."""
        return read_text_utf8(self.skill_md_path)

    def collect_references(self) -> dict[str, str]:
        """Collect all markdown files from references/ directory."""
        refs_dir = self.skill_path / "references"
        refs = {}

        if refs_dir.exists():
            for md_file in refs_dir.glob("*.md"):
                refs[md_file.name] = read_text_utf8(md_file)

        return refs

    def collect_scripts(self) -> dict[str, str]:
        """Collect Python scripts from scripts/ directory (first 100 lines)."""
        scripts_dir = self.skill_path / "scripts"
        scripts = {}

        if scripts_dir.exists():
            for py_file in scripts_dir.glob("*.py"):
                content = read_text_utf8(py_file)
                # Limit to first 100 lines to reduce token usage
                lines = content.split("\n")[:100]
                scripts[py_file.name] = "\n".join(lines)

        return scripts

    def collect_all(self) -> dict:
        """Collect all skill content for Claude analysis."""
        return {
            "skill_name": self.get_skill_name(),
            "skill_md": self.collect_skill_md(),
            "references": self.collect_references(),
            "scripts": self.collect_scripts(),
        }

    def format_for_prompt(self) -> str:
        """Format collected content as a prompt-friendly string."""
        content = self.collect_all()
        parts = []

        parts.append(f"# Skill: {content['skill_name']}\n")
        parts.append("## SKILL.md\n```markdown\n" + content["skill_md"] + "\n```\n")

        if content["references"]:
            parts.append("## Reference Files\n")
            for name, text in content["references"].items():
                parts.append(f"### {name}\n```markdown\n{text}\n```\n")

        if content["scripts"]:
            parts.append("## Scripts (first 100 lines each)\n")
            for name, text in content["scripts"].items():
                parts.append(f"### {name}\n```python\n{text}\n```\n")

        return "\n".join(parts)
