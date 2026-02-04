---
name: context-engineering
description: >-
  Check context usage limits, monitor time remaining, optimize token consumption, debug context failures.
  Use when asking about context percentage, rate limits, usage warnings, context optimization, agent architectures, memory systems.
version: 1.0.0
---

# Context Engineering

Context engineering curates the smallest high-signal token set for LLM tasks. The goal: maximize reasoning quality while minimizing token usage.

## When to Activate

- Designing/debugging agent systems
- Context limits constrain performance
- Optimizing cost/latency
- Building multi-agent coordination
- Implementing memory systems
- Evaluating agent performance
- Developing LLM-powered pipelines

## Core Principles

1. **Context quality > quantity** - High-signal tokens beat exhaustive content
2. **Attention is finite** - U-shaped curve favors beginning/end positions
3. **Progressive disclosure** - Load information just-in-time
4. **Isolation prevents degradation** - Partition work across sub-agents
5. **Measure before optimizing** - Know your baseline

**IMPORTANT:**
- Sacrifice grammar for the sake of concision.
- Ensure token efficiency while maintaining high quality.
- Pass these rules to subagents.

## Quick Reference

| Topic | Key Terms | Reference |
|-------|-----------|-----------|
| **Fundamentals** | context anatomy, attention mechanics, position encoding | [context-fundamentals.md](./references/context-fundamentals.md) |
| **Degradation** | lost-in-middle, poisoning, attention decay | [context-degradation.md](./references/context-degradation.md) |
| **Optimization** | compaction, **observation masking**, **KV-cache**, prefix caching | [context-optimization.md](./references/context-optimization.md) |
| **Compression** | summarization, progressive disclosure, truncation | [context-compression.md](./references/context-compression.md) |
| **Memory** | RAG, embeddings, knowledge graphs, vector DB | [memory-systems.md](./references/memory-systems.md) |
| **Multi-Agent** | orchestrator, **consensus**, **15x token cost**, handoff, delegation | [multi-agent-patterns.md](./references/multi-agent-patterns.md) |
| **Evaluation** | LLM-as-Judge, probe-based, needle-in-haystack | [evaluation.md](./references/evaluation.md) |
| **Tool Design** | tool consolidation, description engineering | [tool-design.md](./references/tool-design.md) |
| **Pipelines** | batch processing, project development | [project-development.md](./references/project-development.md) |
| **Runtime** | usage limits, context window monitoring | [runtime-awareness.md](./references/runtime-awareness.md) |

## Key Concepts Index

- **Multi-agent**: orchestrator/supervisor patterns, consensus mechanisms, voting, 15x token economics, context isolation, handoff protocols, specialization
- **Optimization**: compaction triggers (70-80%), observation masking (tool outputs), KV-cache/prefix caching, progressive disclosure, priority preservation
- **Memory**: short-term (session), long-term (persistent), RAG retrieval, vector embeddings, knowledge graphs, cross-session persistence
- **Evaluation**: token metrics, quality metrics, LLM-as-Judge, probe-based testing, baseline comparison, degradation detection

## Key Metrics

- **Token utilization**: Warning at 70%, trigger optimization at 80%
- **Token variance**: Explains 80% of agent performance variance
- **Multi-agent cost**: ~15x single agent baseline
- **Compaction target**: 50-70% reduction, <5% quality loss
- **Cache hit target**: 70%+ for stable workloads

## Four-Bucket Strategy

1. **Write**: Save context externally (scratchpads, files)
2. **Select**: Pull only relevant context (retrieval, filtering)
3. **Compress**: Reduce tokens while preserving info (summarization)
4. **Isolate**: Split across sub-agents (partitioning)

## Anti-Patterns

- Exhaustive context over curated context
- Critical info in middle positions
- No compaction triggers before limits
- Single agent for parallelizable tasks
- Tools without clear descriptions

## Guidelines

1. Place critical info at beginning/end of context
2. Implement compaction at 70-80% utilization
3. Use sub-agents for context isolation, not role-play
4. Design tools with 4-question framework (what, when, inputs, returns)
5. Optimize for tokens-per-task, not tokens-per-request
6. Validate with probe-based evaluation
7. Monitor KV-cache hit rates in production
8. Start minimal, add complexity only when proven necessary

## Runtime Awareness

The system automatically injects usage awareness via PostToolUse hook:

```xml
<usage-awareness>
Claude Usage Limits: 5h=45%, 7d=32%
Context Window Usage: 67%
</usage-awareness>
```

**Thresholds:**
- 70%: WARNING - consider optimization/compaction
- 90%: CRITICAL - immediate action needed

**Data Sources:**
- Usage limits: Anthropic OAuth API (`https://api.anthropic.com/api/oauth/usage`)
- Context window: Statusline temp file (`/tmp/ck-context-{session_id}.json`)

## Scripts

- [context_analyzer.py](./scripts/context_analyzer.py) - Context health analysis, degradation detection
- [compression_evaluator.py](./scripts/compression_evaluator.py) - Compression quality evaluation
