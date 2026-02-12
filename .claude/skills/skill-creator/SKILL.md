---
name: skill-creator
description: Create or update Claude skills. Use for new skills, skill references, skill scripts, optimizing existing skills, extending Claude's capabilities.
license: Complete terms in LICENSE.txt
version: 3.1.0
---

# Skill Creator

Create effective skills — modular packages that extend Claude's capabilities with specialized workflows, tool integrations, domain expertise, and bundled resources.

**Core principle:** Skills teach Claude *how* to perform tasks, not *what* tools do. Write for another Claude instance.

## Skill Structure

```
.claude/skills/skill-name/
├── SKILL.md          # Required. Under 150 lines. YAML frontmatter + instructions.
├── scripts/          # Optional. Deterministic code (Python/Node.js preferred).
├── references/       # Optional. Docs loaded as needed (<150 lines each).
└── assets/           # Optional. Templates, images used in output.
```

## Progressive Disclosure (3 Levels)

1. **Metadata** (name + description) — always in context, under 200 chars
2. **SKILL.md body** — loaded when skill triggers, under 150 lines
3. **Bundled resources** — loaded as needed by Claude (unlimited)

## Skill Creation Process

### Step 1: Understand Use Cases
Gather concrete examples via `AskUserQuestion`. Ask: what triggers, what workflows, what outputs.
Skip only when usage patterns already clear.

### Step 2: Research
Activate `/docs-seeker` and `/research` skills. Research best practices, existing CLI tools (`npx`/`bunx`/`pipx`), workflows, edge cases. Use parallel `WebFetch` and `Explore` subagents for multiple URLs.

### Step 3: Plan Reusable Contents
Analyze examples → identify scripts, references, assets needed. Prefer existing CLI tools over custom code. Check skills catalog to avoid duplication. See: `references/skill-design-patterns.md`

### Step 4: Initialize
```bash
scripts/init_skill.py <skill-name> --path <output-directory>
```
Skip if skill already exists. Generates SKILL.md template + example directories.

### Step 5: Edit the Skill
Start with `scripts/`, `references/`, `assets/` files. Then update SKILL.md.

**Writing rules:**
- Imperative form: "To accomplish X, do Y" (not "You should...")
- SKILL.md answers: purpose, when to use, how to use (with resource references)
- Under 150 lines. Split detailed content to `references/`
- See: `references/writing-effective-instructions.md`

**Script rules:**
- Tests required. Run until passing. Manual test with real use cases.
- Env var hierarchy: `process.env` > `$HOME/.claude/skills/${SKILL}/.env` > `$HOME/.claude/skills/.env` > `$HOME/.claude/.env` > `./.claude/skills/${SKILL}/.env` > `./.claude/skills/.env` > `./.claude/.env`
- See: `references/script-quality-criteria.md`

### Step 6: Package & Distribute
```bash
scripts/package_skill.py <path/to/skill-folder> [output-dir]
```
Validates frontmatter, naming, description (<200 chars), structure. Creates distributable zip.
See: `references/distribution-guide.md`

### Step 7: Iterate
Use skill on real tasks → notice inefficiencies → update → test again.
See: `references/testing-and-iteration.md`

## Key Requirements

- Combine related topics into single skills (e.g., cloudflare+docker → `devops`)
- SKILL.md: **under 150 lines**. References: **under 150 lines each**
- Description: **under 200 characters**, specific triggers, not generic
- No info duplication between SKILL.md and references
- Node.js/Python scripts preferred over Bash (cross-platform)

## Reference Index

| Topic | File |
|---|---|
| Design patterns | `references/skill-design-patterns.md` |
| Writing instructions | `references/writing-effective-instructions.md` |
| YAML frontmatter | `references/yaml-frontmatter-reference.md` |
| Metadata quality | `references/metadata-quality-criteria.md` |
| Testing & iteration | `references/testing-and-iteration.md` |
| Troubleshooting | `references/troubleshooting-guide.md` |
| MCP + Skills | `references/mcp-skills-integration.md` |
| Distribution | `references/distribution-guide.md` |
| Token efficiency | `references/token-efficiency-criteria.md` |
| Script quality | `references/script-quality-criteria.md` |
| Structure | `references/structure-organization-criteria.md` |
| Validation checklist | `references/validation-checklist.md` |
| Plugin marketplaces | `references/plugin-marketplace-overview.md` |

## External References
- [Agent Skills Spec](../agent_skills_spec.md)
- [Agent Skills Docs](https://docs.claude.com/en/docs/claude-code/skills.md)
- [Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices.md)
