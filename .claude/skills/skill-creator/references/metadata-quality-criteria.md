# Metadata Quality Criteria

Metadata determines when Claude activates the skill. Poor metadata = wrong activation or missed activation.

## Name Field

**Format:** kebab-case, lowercase. Must match folder name. Cannot contain "claude" or "anthropic" (reserved).

**Good:** `pdf-editor`, `bigquery-analyst`, `frontend-webapp-builder`
**Bad:** `helper` (generic), `mySkill` (wrong case), `pdf` (too short)

## Description Field

**Constraint:** Under 200 characters. Structure: `[What it does] + [When to use it] + [Key capabilities]`

### Good Descriptions

```yaml
# Specific + triggers + capabilities
description: Build React/TypeScript frontends with modern patterns. Use for components, Suspense, lazy loading, performance optimization.

# Includes user trigger phrases
description: Manages Linear project workflows including sprint planning, task creation, status tracking. Use when user mentions "sprint" or "create tickets".

# Clear value proposition with triggers
description: End-to-end customer onboarding for PayFlow. Handles account creation, payment setup. Use when user says "onboard customer" or "set up subscription".

# File-type specific
description: Analyzes Figma design files and generates developer handoff docs. Use when user uploads .fig files or asks for "design specs".
```

### Bad Descriptions

```yaml
description: Helps with projects.                              # Too vague, no triggers
description: Creates sophisticated documentation systems.      # No trigger phrases
description: Implements the Project entity model.              # Too technical, no user phrases
description: A skill for working with databases.               # Generic, not actionable
description: This skill helps you understand how React works.  # Educational, not actionable
```

## Trigger Precision

Description must answer: "What phrases would a user say that should trigger this skill?"

Include trigger phrases/actions. Example for `image-editor`:
- "Remove red-eye from this image"
- "Rotate this photo 90 degrees"
- "Crop the background out"

### Negative Triggers (Prevent Overtriggering)

```yaml
description: Advanced data analysis for CSV files. Use for statistical modeling, regression, clustering. Do NOT use for simple data exploration.
```

## Writing Style

- **Third-person:** "This skill should be used when..." (not "Use this skill when...")
- **Action-oriented:** Focus on tasks and outcomes, not features
- **Specific:** Mention file types, service names, concrete actions

## Testing Metadata Effectiveness

**Debug trigger issues:** Ask Claude "When would you use the [skill-name] skill?" — it quotes description back. Adjust based on what's missing.

**Test suite:** Run 10-20 queries that should/shouldn't trigger. Track activation rate (aim ~90%).

## Validation

```bash
scripts/package_skill.py <skill-path>
```

Fails if: missing name/description, description >200 chars, invalid YAML, name not kebab-case.

For full frontmatter field reference: `references/yaml-frontmatter-reference.md`
