---
name: benchmark-fileops
description: Execute 21-step file operations workflow for benchmarking prompt adherence. Use for Skills vs Commands comparison testing.
version: 1.0.0
allowed-tools:
  - Bash
  - Write
  - Edit
  - Read
  - Glob
---

# Benchmark File Operations Workflow

Execute ALL steps in `references/workflow-steps.md` in EXACT order.

## Rules
1. Execute EVERY step exactly as written
2. Do NOT skip, combine, or optimize steps
3. Report completion status after EACH step: "Step N: DONE" or "Step N: FAILED"
4. If step fails, note reason and continue

## Verification
After step 21, run: `~/.claude/skills/.venv/bin/python3 /Users/duynguyen/www/claudekit/skill-validation/scripts/verify-steps.py {WORKSPACE}`
