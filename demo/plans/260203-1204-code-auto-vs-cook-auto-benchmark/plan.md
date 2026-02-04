# Benchmark: `/code:auto` vs `/cook --auto`

## Overview

Compare the efficiency and effectiveness of two auto-execution modes:
- **`/code:auto`**: Slash command for plan-driven execution
- **`/cook --auto`**: Skill with smart intent detection in auto mode

**Status:** Planning
**Key Insight:** Previous benchmark showed Commands outperform Skills for simple deterministic tasks. This test focuses on **real implementation workflows** where the orchestration overhead may differ.

---

## Key Differences (From Analysis)

| Aspect | `/code:auto` | `/cook --auto` |
|--------|--------------|----------------|
| **Input** | Plan path required | Plan path or natural language |
| **Steps** | 5 fixed steps (0-5) | 6 steps with mode-dependent skips |
| **Research** | Never | Skipped in auto mode |
| **Review Gates** | Code review only (auto-fix) | All gates auto-approved (score≥9.5) |
| **Subagents** | project-manager, tester, code-reviewer, docs-manager, git-manager | Same + researcher, scout, planner (skipped in code mode) |
| **Phase Progression** | Configurable (all/one) | Always auto-proceeds |
| **Task Tracking** | TodoWrite | Claude Tasks (TaskCreate/Update) |

---

## Metrics

1. **Token Efficiency**: Total tokens consumed
2. **Duration**: Wall-clock time to complete
3. **Tool Calls**: Total tool invocations
4. **Subagent Calls**: Number of Task tool invocations
5. **Accuracy**: Steps completed correctly (via verification)
6. **Consistency**: Variance between runs

---

## Test Design

### Test Task: Feature Implementation

Unlike the previous 21-step file ops benchmark, this test uses a **realistic feature implementation** to stress-test the orchestration:

**Task:** Implement a simple REST API endpoint with tests

```
Feature: User greeting API
- GET /api/greet/:name → {"message": "Hello, {name}!", "timestamp": "..."}
- Include validation (name length 1-50 chars)
- Write unit tests
- Update README
```

### Plan Structure

```
plans/test-feature-greeting/
├── plan.md                      # Overview
├── phase-01-setup.md            # Create project structure
├── phase-02-implement-api.md    # Implement endpoint
├── phase-03-write-tests.md      # Unit tests
└── phase-04-documentation.md    # README update
```

### Test Matrix

| Phase | Model | Methods | Runs | Total |
|-------|-------|---------|------|-------|
| 1 | sonnet | code:auto + cook --auto | 3 each | 6 |
| 2 | haiku | code:auto + cook --auto | 3 each | 6 |
| 3 | opus | code:auto + cook --auto | 3 each | 6 |

**Total: 18 runs**

---

## Implementation Plan

### Phase 1: Create Test Infrastructure

#### 1.1 Test Feature Plan

Create a realistic 4-phase implementation plan:

```markdown
# plans/test-feature-greeting/plan.md
- Overview of the greeting API feature
- Links to phase files
- Success criteria

# phase-01-setup.md
- mkdir src/, tests/
- Create package.json with vitest
- Create src/index.ts boilerplate

# phase-02-implement-api.md
- Implement GET /api/greet/:name
- Add validation middleware
- Return JSON response

# phase-03-write-tests.md
- Unit tests for greet endpoint
- Test validation edge cases
- Coverage requirements

# phase-04-documentation.md
- Update README with API docs
- Add usage examples
```

#### 1.2 Benchmark Runner

```bash
# scripts/run-orchestration-benchmark.sh
# Usage: ./run-orchestration-benchmark.sh [code|cook|all] [runs] [--model MODEL]

# Key differences from file-ops benchmark:
# 1. Uses plan path instead of workspace
# 2. Tracks subagent calls specifically
# 3. Longer timeouts (implementation vs file ops)
```

#### 1.3 Verification Script

```python
# scripts/verify-greeting-feature.py
# Checks:
# - src/index.ts exists with endpoint code
# - tests/*.test.ts exists
# - package.json has vitest
# - README.md updated
# - All tests pass (npm test)
```

#### 1.4 Analysis Script

```python
# scripts/analyze-orchestration-benchmark.py
# Extended metrics:
# - Subagent calls breakdown (Task tool with different subagent_type)
# - Review cycle counts
# - Phase completion order
```

---

## Execution Protocol

### Pre-requisites

```bash
# 1. Clean workspace
rm -rf /tmp/bench-greeting-*

# 2. Create isolated workspaces for each run
mkdir -p /tmp/bench-greeting-{code,cook}-{1,2,3}

# 3. Copy plan to each workspace
cp -r plans/test-feature-greeting /tmp/bench-greeting-*/plans/
```

### Running Benchmarks

```bash
# Run code:auto
for i in 1 2 3; do
  claude --print --session-id "bench-code-$i" --dangerously-skip-permissions --model sonnet \
    "/code:auto plans/test-feature-greeting/plan.md Yes"
done

# Run cook --auto
for i in 1 2 3; do
  claude --print --session-id "bench-cook-$i" --dangerously-skip-permissions --model sonnet \
    "/cook --auto plans/test-feature-greeting/plan.md"
done
```

### Analysis

```bash
~/.claude/skills/.venv/bin/python3 scripts/analyze-orchestration-benchmark.py
```

---

## Expected Outcomes

### Hypothesis 1: Token Efficiency
**Expect:** `/cook --auto` uses more tokens due to:
- Skill loading overhead
- More review gates (even if auto-approved)
- Task tracking overhead (TaskCreate/Update vs TodoWrite)

### Hypothesis 2: Duration
**Expect:** Similar or `/code:auto` slightly faster:
- Both auto-proceed through phases
- `/code:auto` has simpler state machine

### Hypothesis 3: Subagent Calls
**Expect:** Similar counts:
- Both call tester, code-reviewer, docs-manager
- `/cook` may skip researcher/scout in "code" mode detection

### Hypothesis 4: Accuracy
**Expect:** Similar:
- Both execute the same plan
- Auto-fix cycles should converge to same result

---

## Report Template

```markdown
# Benchmark Report: /code:auto vs /cook --auto

**Date:** 2026-02-03
**Task:** 4-phase greeting API implementation
**Runs:** 3 per method per model

## Summary

| Model | Method | Tokens | Duration | Tools | Subagents | Accuracy |
|-------|--------|--------|----------|-------|-----------|----------|
| sonnet | code:auto | TBD | TBD | TBD | TBD | TBD |
| sonnet | cook --auto | TBD | TBD | TBD | TBD | TBD |

## Detailed Analysis

### Subagent Usage Comparison
[Table showing Task tool calls by subagent_type]

### Review Cycle Analysis
[How many auto-fix cycles were needed]

### Phase Progression
[Time per phase for each method]

## Conclusions
[Winner and reasoning]
```

---

## File Structure

```
skill-validation/
├── plans/
│   ├── 260203-1204-code-auto-vs-cook-auto-benchmark/
│   │   ├── plan.md                           # This file
│   │   └── reports/                          # Benchmark results
│   └── test-feature-greeting/                # Test plan
│       ├── plan.md
│       ├── phase-01-setup.md
│       ├── phase-02-implement-api.md
│       ├── phase-03-write-tests.md
│       └── phase-04-documentation.md
├── scripts/
│   ├── run-orchestration-benchmark.sh
│   ├── verify-greeting-feature.py
│   └── analyze-orchestration-benchmark.py
└── .claude/
    ├── commands/
    │   └── code.md                           # /code:auto command
    └── skills/
        └── cook/
            └── SKILL.md                      # /cook skill
```

---

## Critical Considerations

### 1. Fair Comparison
- Both must execute the SAME plan
- Both must run in "auto" mode (no human intervention)
- Same model for each comparison pair

### 2. Isolation
- Each run gets fresh workspace
- No shared state between runs
- Clean npm cache

### 3. Timeouts
- Implementation tasks take longer than file ops
- Set appropriate timeouts (5-10 minutes per run)

### 4. Error Handling
- Log failures separately
- Don't count failed runs in averages
- Track failure modes

---

## Next Steps

1. [ ] Create test feature plan (test-feature-greeting/)
2. [ ] Create benchmark runner script
3. [ ] Create verification script
4. [ ] Create analysis script
5. [ ] Run Phase 1 (sonnet, 6 runs)
6. [ ] Analyze and iterate
7. [ ] Run Phase 2-3 (haiku, opus)
8. [ ] Write final report

---

## Open Questions

1. Should we test with natural language input for `/cook` as well?
2. Should we include parallel mode comparison (`/cook --parallel` vs sequential)?
3. How to handle subagent failures fairly between both methods?
