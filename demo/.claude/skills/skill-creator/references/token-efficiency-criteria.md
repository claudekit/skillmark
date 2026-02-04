# Token Efficiency Criteria

Skills use progressive disclosure to minimize context window usage.

## Three-Level Loading

1. **Metadata** - Always loaded (~200 chars)
2. **SKILL.md body** - Loaded when skill triggers (<150 lines)
3. **Bundled resources** - Loaded as needed (unlimited for scripts)

## Size Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Description | <200 chars | In YAML frontmatter |
| SKILL.md | <150 lines | Core instructions only |
| Each reference file | <150 lines | Split if larger |
| Scripts | No limit | Executed, not loaded into context |

## SKILL.md Content Strategy

**Include in SKILL.md:**
- Purpose (2-3 sentences)
- When to use (trigger conditions)
- Quick reference for common workflows
- Pointers to resources (scripts, references, assets)

**Move to references/:**
- Detailed documentation
- Database schemas
- API specs
- Step-by-step guides
- Examples and templates
- Best practices

## No Duplication Rule

Information lives in ONE place:
- Either in SKILL.md
- Or in references/

**Bad:** Schema overview in SKILL.md + detailed schema in references/schema.md
**Good:** Brief mention in SKILL.md + full schema only in references/schema.md

## Splitting Large Files

If reference exceeds 150 lines, split by logical boundaries:

```
references/
├── api-endpoints-auth.md      # Auth endpoints
├── api-endpoints-users.md     # User endpoints
├── api-endpoints-payments.md  # Payment endpoints
```

Include grep patterns in SKILL.md for discoverability:

```markdown
## API Documentation
- Auth: `references/api-endpoints-auth.md`
- Users: `references/api-endpoints-users.md`
- Payments: `references/api-endpoints-payments.md`
```

## Progressive Disclosure Best Practices

Benchmark data shows 10-15% accuracy loss when key terms aren't surfaced in SKILL.md.

### Problem
Claude may not load reference files if SKILL.md doesn't contain trigger keywords.

### Solution
1. **Quick Reference Table** - Add "Key Terms" column with 3-5 keywords per topic
2. **Key Concepts Index** - List all important terms grouped by topic
3. **Reference Headers** - Start each file with `**Key concepts**: term1, term2, term3`

### Example

**SKILL.md:**
```markdown
| Topic | Key Terms | Reference |
|-------|-----------|-----------|
| **Multi-Agent** | orchestrator, **consensus**, **15x cost** | multi-agent.md |

## Key Concepts Index
- **Multi-agent**: orchestrator, consensus, 15x token cost, handoff
```

**references/multi-agent.md:**
```markdown
# Multi-Agent Patterns
**Key concepts**: orchestrator, consensus, voting, 15x economics, handoff
```

## Scripts: Best Token Efficiency

Scripts execute without loading into context.

**When to use scripts:**
- Repetitive code patterns
- Deterministic operations
- Complex transformations

**Example:** PDF rotation via `scripts/rotate_pdf.py` vs rewriting rotation code each time.
