# Research Summary: skill.sh & AI Agent Benchmarking Framework

**Researcher:** Agent a918246
**Date:** 2026-02-03 15:28
**Duration:** Complete systematic investigation
**Output Location:** `/Users/duynguyen/www/claudekit/skill-validation/plans/reports/`

---

## Quick Answer to Research Questions

### Question 1: What is skill.sh? How does it work?

**What:** skill.sh is a three-tier bash-based benchmarking framework that compares Claude Code execution methods (Skills vs Commands vs Orchestration) across multiple dimensions.

**How It Works:**

```
Tier 1 (Runner)      → Tier 2 (Execution)      → Tier 3 (Analysis)
├─ Shell scripts     ├─ Claude CLI invocation  ├─ Verification (*.py)
├─ Isolated          ├─ Task execution         ├─ Transcript parsing
│  workspaces        ├─ JSONL transcripts      ├─ Metric extraction
├─ Parallel exec     └─ Session tracking       ├─ Statistical aggregation
└─ Log capture       └─ Report generation
```

**Key Characteristics:**
- **Deterministic + Stochastic:** Tests both simple (file ops) and complex (orchestration) tasks
- **Multi-model:** Compares Haiku, Sonnet, Opus behavior
- **Statistical:** 3-run minimum to handle LLM stochasticity (shows real variance)
- **Production-ready:** Isolated workspaces, error handling, transcript tracking

**Scripts:**
- `run-benchmark.sh` - 21-step file operations (simple, reproducible)
- `run-orchestration-benchmark-*.sh` - 4-phase greeting API (complex coordination)
- `run-context-engineering-*.sh` - 5 knowledge questions (evaluation)
- `verify-*.py` - Task-specific accuracy checks
- `analyze-*.py` - JSONL transcript parsing + report generation

---

### Question 2: Are there existing tools for benchmarking AI agent skills?

**Yes. 2025 Industry Landscape:**

| Framework | Scope | Key Metrics | Best For |
|-----------|-------|------------|----------|
| **CLASSic** | Enterprise | Cost, Latency, Accuracy, Stability, Security | Production AI systems |
| **AgentBench** | Interactive | Planning, reasoning, tool use | 8 distinct environments |
| **GAIA** | Real-world | Step-by-step planning, retrieval | Complex multi-step queries |
| **LangBench** | Conversational | Goal completion, context retention | Task-oriented dialogue |
| **DeepEval** | LLM agents | Tool correctness, argument accuracy | Specific agent components |

**Key Insight:** skill.sh aligns with CLASSic framework (5 dimensions). Modern benchmarks are **multi-dimensional** (not just accuracy).

**Comparison:**
- Industry tools = comprehensive but heavy
- skill.sh = lightweight, task-focused, extensible
- **Recommendation for CLI:** Adopt CLASSic 5-dimension model, skip heavy overhead

---

### Question 3: What metrics are commonly used to evaluate AI agent performance?

**Metric Classification (2-D Taxonomy):**

**Dimension 1: Task Completion**
- Success Rate (%) - Did task complete?
- Partial Credit - Step-level accuracy
- Quality Metrics - Response evaluation

**Dimension 2: Efficiency**
- Token Count - API cost proxy
- Wall-clock Duration - Latency
- Tool Calls - Action economy
- Cost per Task - Actual dollars

**Dimension 3: Stability (CRITICAL)**
- Stdev across N runs - Variance measurement
- Min/max spread - Outlier range
- Failure rate - Consistency
- **Why important:** LLM agents are stochastic; single-run evals are misleading

**Dimension 4: Reliability**
- Error Recovery - Can agent fix mistakes?
- Edge Case Handling - Robustness
- Timeout Behavior - Graceful degradation

**skill.sh Metrics (Real Data):**

```
File Operations (Deterministic):
  Accuracy: 95.2-100% across runs
  Tokens:   10.8K-12.4K per task
  Duration: 38-45s wall-clock
  Tools:    25-42 calls

Orchestration (Stochastic):
  Accuracy: 100% (both methods)
  Tokens:   2.67M-3.54M (3-phase implementation)
  Model effect: Sonnet ≈ Opus (Skills win)
               Haiku (Commands win)

Context Engineering (Knowledge):
  Accuracy: 90% (mono) vs 96.7% (modular)
  Tokens:   600K (mono) vs 1,066K (modular) = 44% overhead
  Trade-off: 6.7% accuracy loss for 44% cost reduction
```

**Critical Finding:** Stochasticity is Real
```
Same task, 3 runs:
Run 1: 83% accuracy
Run 2: 100% accuracy
Run 3: 100% accuracy
Mean: 94% ± 8.2%

=> Single-run benchmarks are unreliable. Use N ≥ 3.
```

---

### Question 4: What are best practices for creating reproducible AI benchmarks?

**Reproducibility Checklist (Comprehensive):**

**1. Experimental Design**
- [ ] Multiple runs (minimum 3, report stdev)
- [ ] Multiple models (Haiku/Sonnet/Opus show different patterns)
- [ ] Realistic workflows (greeting API > synthetic micro-benchmark)
- [ ] Varied task types (deterministic + stochastic + knowledge)

**2. Isolation & Contamination Prevention**
```bash
# Each run gets clean state
rm -rf $workspace              # Remove old
mkdir -p $workspace            # Fresh directory
cp -r $source $workspace       # Isolated copy
cd $workspace                  # Execute in isolation
# Use session IDs to match outputs
```

**3. Metrics Collection**
- [ ] Always: Accuracy, tokens, duration
- [ ] When possible: Tool counts, error rates, variance
- [ ] Diagnostic: Per-step accuracy for complex tasks

**4. Statistical Rigor**
- [ ] Report mean ± stdev (not just mean)
- [ ] Show min/max ranges
- [ ] Calculate effect sizes (% improvement)
- [ ] Note statistical significance (p-value if applicable)

**5. Reproducibility Logging**
```yaml
Benchmark metadata:
  timestamp: 2026-02-03T15:28:00Z
  model: sonnet
  model_date: 2025-11-01          # Version lock critical
  runs: 3
  script_version: v1.2
  python_version: 3.11.2
  environment: ~/.claude/skills/.venv
```

**6. Storage & Archival**
- [ ] Save raw transcripts (JSONL)
- [ ] Save verification outputs (JSON)
- [ ] Save markdown reports
- [ ] Save with full timestamp (YYMMDD-HHMM-slug)

**7. Failure Handling**
```python
# Don't skip on error; mark as failed
try:
    metric = parse_transcript(session_id)
except FileNotFoundError:
    metric = {"value": "N/A", "confidence": "low"}

# Continue analysis even with partial data
report metrics with confidence levels
```

**skill.sh Examples:**

✅ **Good Practice:**
```bash
# Timestamp, model, runs explicit
./run-benchmark.sh all 3 --model sonnet
# Output: benchmark-260203-1131-sonnet-fileops.md

# Multiple runs for variance
RUNS=3 (default), shows std dev in report

# Isolated workspaces
WORKSPACE_BASE="/tmp/bench-skill-$run_num"
rm -rf $workspace && mkdir -p $workspace
```

❌ **Avoid:**
- Single run (can't detect variance)
- No model versioning (results not reproducible)
- Shared workspace (contamination)
- Ignoring failed runs (bias results)

---

## Key Findings from Current Benchmarks

### Finding 1: Commands Win on Simple Tasks
**Data:** 21-step file operations (deterministic)
```
Commands: 10.8K tokens, 100% accuracy, 38s
Skills:   12.4K tokens, 95.2% accuracy, 45s
Winner:   Command (14.8% fewer tokens, 18% faster)
```
**Inference:** Simple workflows don't benefit from skill abstraction. Inline instructions reduce context switching overhead.

### Finding 2: Skills Shine with Advanced Models
**Data:** 4-phase orchestration (multi-agent coordination)
```
Haiku:   Code auto wins (simpler model needs explicit structure)
Sonnet:  /cook --auto wins (25% fewer tokens)
Opus:    /cook --auto wins (25% faster execution)
```
**Inference:** Advanced models exploit skill flexibility better. Skills provide optimization opportunities for sophisticated reasoning.

### Finding 3: Monolithic Beats Modular on Cost
**Data:** 5 context engineering questions (knowledge tasks)
```
Monolithic (1 skill):      90% accuracy, 600K tokens, $0.58
Modular (13 skills):       96.7% accuracy, 1,066K tokens, $0.89
Trade-off: 6.7% accuracy loss for 44% cost reduction
```
**Inference:** Modular designs improve accuracy via specialization but incur context-switching overhead. Choose based on priority (accuracy vs cost).

### Finding 4: Stochasticity Causes Real Variance
**Data:** Context engineering multi-agent task, 3 runs
```
Run 1: 83% accuracy
Run 2: 100% accuracy
Run 3: 100% accuracy
Mean: 94%, Stdev: 8.2%, Range: 17%
```
**Inference:** Ignoring variance = misleading results. Minimum 3 runs essential.

---

## Metrics Aligned with 2025 Standards

**CLASSic Framework (Industry Standard 2025):**

| Dimension | What to Measure | Why | skill.sh Implementation |
|-----------|-----------------|-----|------------------------|
| **Cost** | Tokens + API cost | Budget impact | Parse transcripts + calculate |
| **Latency** | Wall-clock time | User experience | Timestamp extraction from JSONL |
| **Accuracy** | Task success rate | Quality validation | Custom verify-*.py scripts |
| **Stability** | Stdev across runs | Reliability | 3+ runs, report variance |
| **Security** | Audit, no secrets | Safety | Avoid logging credentials |

**skill.sh Implements:** Cost ✅, Latency ✅, Accuracy ✅, Stability ✅, Security ✅

---

## Recommended CLI Tool Architecture

### MVP (Minimal Viable Product)

**Core Commands:**
```bash
# Run benchmark
claude-bench run fileops --model sonnet --runs 3

# Analyze results
claude-bench analyze --log-dir /tmp/ck-benchmark

# Compare against baseline
claude-bench compare --baseline old.json --current new.json

# Reproduce from session IDs
claude-bench reproduce --session-ids sessions.txt
```

**Core Metrics (Don't skip):**
1. Task accuracy (primary)
2. Token usage (cost)
3. Duration (latency)
4. Stdev (stability)

**Output Formats:**
- Markdown report (human-readable)
- JSON/JSONL (machine-readable)
- CSV (analysis-friendly)

### What NOT to Build (YAGNI)

❌ Custom web UI (markdown sufficient)
❌ Real-time dashboard (batch evaluation fine)
❌ ML performance predictor (premature)
❌ 50+ benchmarks (start with 3-5)

### Scalability Path

**Phase 1 (Now):** Local, 3 benchmarks, markdown output
**Phase 2 (Later):** Distributed runs, database backend, regression alerts
**Phase 3 (Future):** Cost optimization engine, adaptive sampling, A/B testing

---

## Token Efficiency Insights (Claude-Specific)

**Practical Findings from skill.sh:**

1. **Model Selection Matters**
   - Haiku: 15-40% cheaper but shows higher variance
   - Sonnet: Best cost/performance ratio (use for most benchmarks)
   - Opus: 2-3x cost, best for complex multi-step reasoning only

2. **Context Overhead is Real**
   - Skills add ~15% token overhead for simple tasks (reference loading)
   - Modular skills add 44% overhead vs monolithic (context switching)
   - Skills pay off only on complex/reusable tasks

3. **Quick Wins**
   - Precise prompts save 5-10% tokens vs vague instructions
   - Delegate verbose ops (tests/docs) to subagents
   - Use `defer_loading` on tools (85% potential reduction)

4. **Token Parsing**
   ```python
   # From benchmark transcripts
   total_tokens = input_tokens + output_tokens
   # Includes cache_creation, cache_read, cache_write
   # Full accounting critical for cost estimation
   ```

---

## Integration Recommendations for CLI

### Step 1: Configuration as Code
```yaml
# benchmarks.yaml
benchmarks:
  fileops:
    type: deterministic
    metrics: [accuracy, tokens, duration]
    models: [haiku, sonnet, opus]
    runs_per_model: 3

  orchestration:
    type: orchestration
    metrics: [accuracy, tokens, duration, tools]
    models: [sonnet, opus]
    runs_per_model: 3
```

### Step 2: Metric Extraction (Proven Pipeline)
```
Benchmark Runner → JSONL Transcripts → Parser → JSON Results → Report
   (shell)           (Claude API)      (Python) (structured)  (markdown)
```

### Step 3: Statistical Output
```markdown
## Results: fileops benchmark

**Accuracy:** 95.2% ± 2.1% (n=3)
**Tokens:** 12.4K ± 150 (mean ± std)
**Duration:** 45s [38s - 52s]

*Interpretation: 95% likely to succeed, tokens stable, timing variable*
```

### Step 4: Comparison Engine
```bash
# Detect improvements/regressions
./bench-cli compare \
  --baseline baseline.json \
  --current current.json \
  --significance 0.05  # Statistical test

# Output: +5.2% accuracy (p=0.032, significant)
#         +12% tokens (p=0.18, not significant)
```

---

## Unresolved Research Questions

1. **Model versioning impact:** Do benchmark results change significantly between Claude releases? Need longitudinal study.

2. **Output format brittleness:** How sensitive are verifiers to formatting changes? Should use semantic similarity?

3. **Long-running tasks:** Do metrics hold for 1-hour+ agent runs? Current benchmarks <10 min.

4. **Production validation:** Do synthetic benchmarks predict real-world performance? Need empirical study.

5. **Multi-turn degradation:** How do agents perform in 10+ turn conversations vs single-query benchmarks?

6. **Hardware dependency:** Does execution time correlate with local system load? Should normalize?

7. **Cost estimation accuracy:** Does parsed token count match actual billing in all cases (batch discounts, etc.)?

8. **Generalization across domains:** If a technique optimizes Opus, does it work equally for Sonnet/Haiku?

---

## File Reference

**Full Research Report:**
`/Users/duynguyen/www/claudekit/skill-validation/plans/reports/researcher-260203-1528-skill-sh-benchmarking-research.md`

**Sections:**
- Section 1: skill.sh Architecture (detailed)
- Section 2: Industry Benchmarks (2025 landscape)
- Section 3: Metrics & Measurement (comprehensive)
- Section 4: Reproducibility Best Practices
- Section 5: CLI Integration Patterns
- Section 6: Implementation Recommendations
- Section 7: Key Insights from Current Benchmarks
- Section 8: Recommended CLI Architecture
- Section 9: Research-Based Recommendations

**Data Sources:**
- skill-validation codebase (3 bash scripts, 6 Python scripts)
- 27 benchmark reports (various models/configurations)
- Industry research (CLASSic framework, AgentBench, GAIA, LangBench, DeepEval)
- Academic papers (arxiv.org, ACM SIGKDD)
- Claude API documentation & best practices

---

## Next Steps for Implementation

1. **Read full report** → Understand architecture deeply
2. **Extract metrics pipeline** → Adapt `analyze-*.py` for CLI
3. **Design config schema** → YAML for benchmark definitions
4. **Build report generator** → Markdown + JSON output
5. **Add statistical tests** → Significance detection
6. **Create integration tests** → Validate against known benchmarks
7. **Document CLI interface** → User-facing commands

---

**Research Complete. Ready for Implementation Planning.**
