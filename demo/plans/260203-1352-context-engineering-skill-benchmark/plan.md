# Benchmark: ck-context-engineering vs Agent-Skills-for-Context-Engineering

## Overview

Compare two context engineering skill architectures:
- **Local**: `ck-context-engineering` - Monolithic skill (1 SKILL.md + 10 refs + 2 scripts)
- **External**: `muratcankoylan/Agent-Skills-for-Context-Engineering` - Modular skills (13 separate skills)

**Goal**: Measure which architecture enables better task completion for context engineering questions.

## Architectural Comparison

| Aspect | ck-context-engineering | External Repo |
|--------|----------------------|---------------|
| Structure | Monolithic | Modular (13 skills) |
| SKILL.md lines | ~108 | ~50-80 each |
| Total references | 10 files | Distributed per skill |
| Scripts | 2 (analyzer, evaluator) | Varied per skill |
| Loading | Single activation | Multiple activations |
| Scope | Broad coverage | Focused per skill |

## Test Tasks

### Task 1: Context Degradation Diagnosis
**Prompt**: "My agent loses important instructions after 50+ turns. Diagnose the issue and recommend fixes."

**Expected Coverage**:
- Lost-in-middle problem
- Attention mechanics
- Compaction strategies
- Position encoding effects

### Task 2: Multi-Agent Architecture Design
**Prompt**: "Design a 3-agent system for code review: one for security, one for performance, one for style. How should they coordinate?"

**Expected Coverage**:
- Orchestrator pattern
- Context isolation benefits
- Token economics
- Consensus mechanisms

### Task 3: Token Optimization Strategy
**Prompt**: "My agent uses 85% context at turn 20. How do I extend the conversation without quality loss?"

**Expected Coverage**:
- Compaction triggers
- Observation masking
- KV-cache optimization
- Progressive disclosure

### Task 4: Memory System Implementation
**Prompt**: "Implement cross-session memory for a coding assistant that remembers user preferences and project context."

**Expected Coverage**:
- Memory types (short/long-term)
- Persistence strategies
- RAG integration
- Knowledge graphs

### Task 5: Evaluation Framework
**Prompt**: "How do I measure if my agent's context management is effective? What metrics matter?"

**Expected Coverage**:
- Token utilization metrics
- Quality preservation
- LLM-as-Judge
- Probe-based evaluation

## Metrics

1. **Accuracy**: Correct concepts mentioned / expected concepts
2. **Token Efficiency**: Tokens consumed per task
3. **Depth**: Level of actionable detail provided
4. **Reference Quality**: Relevance of cited references

## Test Matrix

| Task | Skill Version | Model | Runs |
|------|---------------|-------|------|
| All 5 | ck-local | sonnet | 1 |
| All 5 | external | sonnet | 1 |

## Execution Protocol

### Phase 1: Setup

1. Clone external repo skills to local test directory
2. Create isolated test workspaces
3. Configure skill activation paths

### Phase 2: Run Tests

```bash
# Local skill test
for task in 1 2 3 4 5; do
  claude --session "ck-local-task-$task" \
    --skill-path .claude/skills/ck-context-engineering \
    "[TASK PROMPT]"
done

# External skill test
for task in 1 2 3 4 5; do
  claude --session "external-task-$task" \
    --skill-path /tmp/external-context-skills \
    "[TASK PROMPT]"
done
```

### Phase 3: Analyze

- Extract token counts from transcripts
- Score accuracy against expected concepts
- Measure reference utilization
- Generate comparison report

## Expected Outcomes

### Hypothesis 1: Modular Advantage
External repo's modular structure may enable more focused responses with less token overhead per specific topic.

### Hypothesis 2: Monolithic Convenience
ck-context-engineering's single activation may provide broader coverage with less skill-discovery overhead.

### Hypothesis 3: Script Advantage
ck-context-engineering's included scripts (analyzer, evaluator) may provide practical value external repo lacks.

## Files Created

| File | Purpose | Status |
|------|---------|--------|
| `scripts/run-context-engineering-skill-benchmark.sh` | Test runner | ✅ |
| `scripts/verify-context-engineering-skill-benchmark-responses.py` | Response verification | ✅ |
| `scripts/analyze-context-engineering-skill-benchmark.py` | Results analysis | ✅ |
| External skills | Cloned at runtime to /tmp | Auto |

## Success Criteria

Benchmark is successful if:
1. Both skill sets complete all 5 tasks
2. Token counts are comparable (<50% variance)
3. Accuracy scores are measurable
4. Clear winner emerges or trade-offs documented
