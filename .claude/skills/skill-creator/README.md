# Skill Creator

Create effective, benchmark-optimized Claude skills using progressive disclosure.

## What It Does

Skill Creator teaches Claude how to build skills — modular packages that extend Claude's capabilities with specialized workflows, tool integrations, domain expertise, and bundled resources.

Skills are evaluated by [Skillmark](https://skillmark.sh), a benchmarking platform that scores skills on accuracy and security. This skill embeds optimization strategies to help skills score high on Skillmark benchmarks.

## Installation

### Claude Code (CLI)

Place this folder in your project's `.claude/skills/` directory:

```
.claude/skills/skill-creator/
```

Or install globally at `~/.claude/skills/skill-creator/`.

### Claude.ai

1. Zip this folder
2. Go to **Settings > Capabilities > Skills**
3. Upload the zip

## Usage

Trigger the skill by asking Claude to create, update, or optimize a skill:

- "Create a new skill for managing Docker deployments"
- "Optimize my skill for better benchmark scores"
- "Add a security policy to my existing skill"

The skill guides Claude through a 7-step creation workflow:

1. **Understand** — Gather use cases with trigger phrases
2. **Research** — Investigate best practices and existing tools
3. **Plan** — Identify scripts, references, and assets needed
4. **Initialize** — Scaffold with `scripts/init_skill.py`
5. **Edit** — Implement resources and write SKILL.md
6. **Validate** — Check with `scripts/package_skill.py`
7. **Test** — Verify triggering, functionality, and performance

## Structure

```
skill-creator/
├── SKILL.md                   # Core instructions (loaded on trigger)
├── LICENSE.txt                # License terms
├── scripts/
│   ├── init_skill.py          # Initialize new skill from template
│   ├── package_skill.py       # Validate + package skill as zip
│   └── quick_validate.py      # Quick frontmatter validation
└── references/
    ├── skill-anatomy-and-requirements.md
    ├── skill-creation-workflow.md
    ├── skillmark-benchmark-criteria.md
    ├── benchmark-optimization-guide.md
    ├── validation-checklist.md
    ├── metadata-quality-criteria.md
    ├── token-efficiency-criteria.md
    ├── script-quality-criteria.md
    ├── structure-organization-criteria.md
    ├── plugin-marketplace-overview.md
    ├── plugin-marketplace-schema.md
    ├── plugin-marketplace-sources.md
    ├── plugin-marketplace-hosting.md
    └── plugin-marketplace-troubleshooting.md
```

## Benchmark Scoring

Skills are scored on a composite formula:

```
compositeScore = accuracy × 0.80 + securityScore × 0.20
```

- **Accuracy (80%)** — Concept coverage using explicit terminology, numbered steps, concrete examples
- **Security (20%)** — Scope declaration, refusal of out-of-scope requests, no data leakage across 6 categories

## Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `init_skill.py` | Scaffold a new skill | `python scripts/init_skill.py <name> --path <dir>` |
| `package_skill.py` | Validate and zip for distribution | `python scripts/package_skill.py <path>` |
| `quick_validate.py` | Quick frontmatter check | `python scripts/quick_validate.py <path>` |

## Key Skill Rules

- File must be exactly `SKILL.md` (case-sensitive)
- Folder names: kebab-case only
- SKILL.md: under 150 lines
- Each reference file: under 150 lines
- Description: under 200 characters
- No "claude" or "anthropic" in skill names
- No XML angle brackets in YAML frontmatter

## References

- [Complete Guide to Building Skills for Claude](https://docs.claude.com/en/docs/claude-code/skills)
- [Agent Skills Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
- [Skills API](https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills)
- [Skillmark Benchmarks](https://skillmark.sh)

## License

See [LICENSE.txt](LICENSE.txt) for complete terms.
