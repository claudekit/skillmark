# Research Report: skill.sh & AI Agent Skill Benchmarking

**Date:** 2026-02-03
**Time:** 15:28
**Status:** Complete research synthesis
**Token Efficiency:** Research maintained token discipline throughout

---

## Executive Summary

This research synthesizes findings on:
1. **skill.sh architecture** - A bash-based skill benchmarking framework
2. **Existing AI benchmarking tools** - Industry-standard evaluation methods
3. **Key metrics for agent evaluation** - Reproducible measurement approaches
4. **Best practices** - Practical recommendations for CLI integration

**Key Finding:** skill.sh implements a pragmatic approach to agent performance comparison (Skills vs Commands vs Orchestration), validated against emerging 2025 industry standards. The framework's metrics align with CLASSic (Cost, Latency, Accuracy, Stability, Security) framework adopted across enterprise AI evaluation.

---

## Section 1: Understanding skill.sh

### 1.1 What is skill.sh?

**Definition:** skill.sh is an experimental benchmarking framework for comparing Claude Code execution methods:
- **Skills** (dedicated .claude/skills/ modules with reusable reference files)
- **Commands** (slash commands with inline instructions)
- **Orchestration** (multi-phase agent coordination with subagents)

**Location:** `/Users/duynguyen/www/claudekit/skill-validation/scripts/`

**Architecture:**
```
skill.sh ecosystem:
├── run-benchmark.sh                    # File operations (21-step deterministic)
├── run-orchestration-benchmark-*.sh    # Multi-agent coordination (4-phase greeting API)
├── run-context-engineering-*.sh        # Knowledge evaluation (5 context questions)
├── verify-*.py                         # Verification & accuracy measurement
└── analyze-*.py                        # Results aggregation & reporting
```

### 1.2 How skill.sh Works

**Three-tier Execution Model:**

**Tier 1: Benchmark Runner (Shell Script)**
- Creates isolated workspaces for each run (prevents interference)
- Invokes Claude CLI with `--dangerously-skip-permissions` flag
- Captures stdout/stderr logs to `/tmp/ck-benchmark`
- Tracks session IDs for transcript matching
- Supports parallel execution with process tracking (`PIDS` array)

**Tier 2: Claude Execution**
- Receives task prompt via CLI
- Activates skill/command/orchestration handler
- Executes deterministic or agentic workflows
- Generates transcript (JSONL) automatically

**Tier 3: Analysis Pipeline**
- **Verification Phase:** Python scripts check task completion accuracy
  - File ops: verify 21 steps completed correctly
  - Greeting API: check 4-phase implementation
  - Context engineering: measure response quality

- **Analysis Phase:** Parse JSONL transcripts for metrics
  - Token usage (input/output/total)
  - Duration (wall-clock time)
  - Tool call counts by type
  - Statistical aggregation (mean, stdev)

### 1.3 Output Structure

**Results Location:** `/tmp/ck-benchmark/` + `/Users/duynguyen/www/claudekit/skill-validation/plans/reports/`

**Files Generated:**
```
benchmark-YYMMDD-HHMM-{slug}.md
├── Cross-method comparison tables
├── Per-model performance (Haiku/Sonnet/Opus)
├── Per-task accuracy breakdown
├── Statistical analysis (mean/std dev)
└── Actionable recommendations
```

---

## Section 2: Existing AI Agent Benchmarking Tools & Standards

### 2.1 Industry Benchmarks (2025 Landscape)

**Authoritative Frameworks:**

| Framework | Focus | Metrics | Use Case |
|-----------|-------|---------|----------|
| **CLASSic** | Comprehensive | Cost, Latency, Accuracy, Stability, Security | Enterprise AI agents |
| **AgentBench** | Interactive simulation | Planning, reasoning, tool use, decision-making | 8 distinct environments |
| **GAIA** | Real-world complexity | Step-by-step planning, multi-modal retrieval | Complex query solving |
| **LangBench** | Conversational agents | Goal completion, context retention, error recovery | Task-oriented dialogue |

**Architecture-Informed Evaluation (New 2025):** Recent work connects agent behaviors directly to evaluation metrics, enabling "structured, reproducible, and diagnostic" assessment by making metric selection explicit rather than ad-hoc.

### 2.2 Key Evaluation Dimensions

**Two-Dimensional Taxonomy:**
1. **What to evaluate:** Agent behavior, capabilities, reliability, safety
2. **How to evaluate:** Interaction modes, datasets, metric computation, tooling

**Common Metrics:**
- **Success Rate (SR):** Task completion percentage
- **Task Goal Completion (TGC):** Multi-step objective fulfillment
- **Tool Correctness:** Individual action layer evaluation
- **Argument Correctness:** Parameter accuracy for tool calls
- **Accuracy:** End-to-end task correctness
- **Token Efficiency:** Cost per successful task
- **Latency:** Wall-clock execution time
- **Stability:** Variance across multiple runs (stochasticity handling)

### 2.3 Reproducibility Challenges

**Critical Issue:** LLM agents are inherently stochastic. Evaluation requires:
- **Multiple trials per task** (minimum 3 runs recommended)
- **Consistency measurement** (stdev analysis)
- **Variance tracking** (detect occasional failures)

**skill.sh Approach:**
- Default 3 runs per method (supports N-run parametrization)
- Parallel execution option for scalability
- Statistical aggregation (mean, stdev) in reports
- Individual session tracking for reproducibility

**Example Data** (from benchmark-260203-1502):
```
Multi-agent design task:
- Run 1: 83% accuracy
- Run 2: 100% accuracy
- Run 3: 100% accuracy
- Mean: 94% (shows improvement over baseline)
- Shows real stochasticity + recovery pattern
```

---

## Section 3: Metrics & Measurement Strategies

### 3.1 Classification: Dimension-Specific Metrics

**Dimension 1: Accuracy Metrics**
- Task completion (binary: pass/fail)
- Partial credit (step-level accuracy)
- Quality assessment (response evaluation)
- End-to-end success rate

**Dimension 2: Efficiency Metrics**
- Token usage (input + output + cache)
- Wall-clock duration (seconds/milliseconds)
- Tool call count (action economy)
- Cost per task ($)

**Dimension 3: Stability Metrics**
- Standard deviation across runs
- Min/max performance spread
- Failure rate distribution
- Variance reduction over iterations

**Dimension 4: Reliability Metrics**
- Error recovery (can agent fix mistakes?)
- Edge case handling
- Timeout behavior
- Graceful degradation

### 3.2 skill.sh Metrics in Practice

**File Operations Benchmark (21-step deterministic task):**
```
Accuracy: 95.2% (Skill) vs 100% (Command)
Tokens:   12.4k (Skill) vs 10.8k (Command) = 14.8% overhead
Duration: 45s (Skill) vs 38s (Command) = 18.4% slower
Tools:    42 calls (Skill) vs 36 calls (Command)

Winner: Command (3/3 metrics)
Inference: Skills add indirection cost for simple tasks
```

**Orchestration Benchmark (4-phase multi-agent coordination):**
```
Cross-model comparison (3 runs each):
- Haiku:  Tie (code:auto slightly faster)
- Sonnet: /cook --auto wins (25% fewer tokens)
- Opus:   /cook --auto wins (25% faster)

Winner: /cook --auto (2/3 models)
Inference: Advanced models benefit from skill optimization
```

**Context Engineering Benchmark (5 knowledge tasks):**
```
Accuracy:   90% (monolithic) vs 96.7% (modular, 13 skills)
Tokens:     600K (mono) vs 1,066K (modular) = 44% savings
Cost:       $0.58 (mono) vs $0.89 (modular) = 35% savings

Trade-off: 6.7% accuracy loss vs 44% cost reduction
Inference: Monolithic design optimal for cost-sensitive applications
```

### 3.3 Metric Collection Mechanism

**JSONL Transcript Parsing:**
```python
# From analyze-benchmark-results.py
for line in transcript_file:
    obj = json.loads(line)

    # Extract token usage
    if "message.usage" in obj:
        input_tokens += obj["message"]["usage"]["input_tokens"]
        output_tokens += obj["message"]["usage"]["output_tokens"]

    # Count tool invocations
    if "message.content[].type" == "tool_use":
        tool_counts[tool_name] += 1

    # Calculate duration from timestamps
    duration_ms = (last_ts - first_ts).total_seconds() * 1000
```

**Verification Python Scripts:**
```python
# From verify-steps.py
checks = [
    (1, "directory exists", path.is_dir()),
    (15, "file modified correctly", content_check()),
    # ... 21 total checks
]
accuracy = passed / total_checks
```

---

## Section 4: Best Practices for Reproducible Benchmarks

### 4.1 Benchmark Design Principles

**YAGNI Principle Applied:**
- Test deterministic tasks (file ops) vs stochastic (orchestration)
- Don't over-engineer: simple shell scripts win for reproducibility
- Avoid synthetic micro-benchmarks; use realistic workflows

**KISS Applied:**
- 21-step file operations = digestible, reproducible
- 4-phase greeting API = real-world feature scenario
- 5 context questions = knowledge domain evaluation

**DRY Applied:**
- Reusable verification scripts
- Common metric extraction (`parse_transcript()` function)
- Shared analysis pipeline

### 4.2 Experimental Design

**Proper Baseline Comparisons:**
- Always include 3+ runs minimum (handles LLM stochasticity)
- Test across model sizes (Haiku/Sonnet/Opus)
- Compare against established baseline methods

**skill.sh Example:**
```bash
# Run 3 iterations per method per model
./run-benchmark.sh all 3 --model sonnet   # 6 runs total
./run-benchmark.sh all 3 --model opus     # 6 runs total
./run-benchmark.sh all 3 --model haiku    # 6 runs total
# 18 total runs for statistical validity
```

**Isolation & Contamination Prevention:**
```bash
# Each run gets fresh workspace
workspace="$WORKSPACE_BASE-skill-$run_num"
rm -rf "$workspace"                    # Clean state
mkdir -p "$workspace"
cp -r "$PROJECT_DIR" "$workspace"      # Isolated copy
cd "$workspace"                        # Run in isolation
```

### 4.3 Metrics Collection Best Practices

**What to Measure:**
1. **Primary metric:** Task success (accuracy)
2. **Secondary metrics:** Tokens, time, tools
3. **Variance metrics:** Stdev, min/max ranges
4. **Diagnostic metrics:** Per-step accuracy for complex tasks

**How to Store Results:**
```
benchmark-YYMMDD-HHMM-{task}.md
├── Configuration (model, runs, parameters)
├── Summary statistics (mean, stdev, range)
├── Per-run breakdowns (detailed results)
├── Per-task analysis (for multi-step tasks)
├── Cross-model comparison (if applicable)
└── Actionable recommendations
```

**Statistical Rigor:**
- Report mean ± stdev (not just mean)
- Show min/max ranges
- Note outliers
- Calculate effect sizes (% improvement)

### 4.4 Reproducibility Checklist

**Before Running Benchmark:**
- [ ] Lock model versions (CLI --model flag)
- [ ] Document environment (Python version, package versions)
- [ ] Record timestamp of experiment
- [ ] Save benchmark script version used
- [ ] Document any manual overrides

**During Execution:**
- [ ] Capture all session IDs (for transcript matching)
- [ ] Log start/end times
- [ ] Monitor for failures (continue on error, don't skip)
- [ ] Save raw output logs
- [ ] Use `set -e` to catch bash errors

**After Execution:**
- [ ] Verify transcript files exist (check `~/.claude/projects/`)
- [ ] Spot-check parsed metrics (sanity-check token counts)
- [ ] Compare against previous baselines
- [ ] Note any anomalies
- [ ] Archive full results with timestamps

### 4.5 Token Efficiency Best Practices (Claude-specific)

**Reduce Wasted Context:**
1. **Precise requests:** "Add input validation to login function" vs "Improve code"
2. **Delegate verbose operations:** Run tests/docs in subagents (summaries return to main thread)
3. **Avoid context bloat:** Exclude irrelevant files via CLAUDE.md
4. **Use defer_loading:** Mark tools with `defer_loading: true` for on-demand discovery (85% reduction possible)

**Model Selection:**
- Haiku: Cost-optimal for simple deterministic tasks
- Sonnet: Best performance/cost balance for most workflows
- Opus: Reserve for architectural decisions + multi-step reasoning

**Specific to Benchmarking:**
- Run benchmarks in subagents to contain transcript overhead
- Summarize results in main thread
- Use Sonnet for most benchmarks (Haiku too variable, Opus unnecessarily expensive)

---

## Section 5: Integrating into a CLI Tool

### 5.1 CLI Command Structure

**Proposed Architecture:**

```bash
# Simple cases
claude-bench run fileops --model sonnet --runs 3
claude-bench run greeting --model opus --runs 5
claude-bench run context-engineering --model sonnet --runs 3

# Advanced
claude-bench compare --baseline fileops-baseline.json --current fileops-current.json
claude-bench analyze --log-dir /tmp/benchmark --output-format markdown
claude-bench reproduce --session-ids sessions.txt --transcript-dir ~/.claude/projects/
```

**Core Subcommands:**
- `run` - Execute benchmark
- `verify` - Check accuracy post-run
- `analyze` - Parse transcripts & generate report
- `compare` - Diff results against baseline
- `reproduce` - Re-run specific sessions

### 5.2 Configuration Management

**Config File Format (YAML/JSON):**
```yaml
benchmarks:
  fileops:
    type: deterministic
    steps: 21
    metrics: [accuracy, tokens, duration, tool_count]
    models: [haiku, sonnet, opus]
    runs_per_model: 3

  greeting-api:
    type: orchestration
    phases: 4
    metrics: [accuracy, tokens, duration]
    models: [sonnet, opus]
    runs_per_model: 3

  context-engineering:
    type: knowledge
    tasks: 5
    metrics: [accuracy, tokens]
    models: [sonnet]
    runs_per_model: 3
```

**Parameterization:**
- Allow override: `claude-bench run --config custom.yaml --model opus`
- Support matrix: `--models haiku,sonnet,opus --runs 5`
- Filter metrics: `--metrics accuracy,tokens` (skip duration if not needed)

### 5.3 Output Standardization

**Consistent Report Structure:**

```markdown
# Benchmark Report: {task-name}
**Date:** {ISO-8601}
**Model:** {model}
**Runs:** {N}

## Summary Table
| Metric | Value | Baseline | Δ |
|--------|-------|----------|---|

## Per-Run Breakdown
| Run | Accuracy | Tokens | Duration |
|-----|----------|--------|----------|

## Statistical Analysis
- Mean accuracy: X ± σ
- Token efficiency: Tokens/step
- Time efficiency: Steps/second

## Recommendations
Based on CLASSic dimensions...
```

**Machine-Readable Output (JSON/JSONL):**
```json
{
  "benchmark": "fileops",
  "model": "sonnet",
  "runs": 3,
  "results": [
    {"run": 1, "accuracy": 1.0, "tokens": 10800, "duration_s": 38},
    {"run": 2, "accuracy": 1.0, "tokens": 10600, "duration_s": 39},
    {"run": 3, "accuracy": 1.0, "tokens": 10900, "duration_s": 37}
  ],
  "statistics": {
    "accuracy": {"mean": 1.0, "stdev": 0.0},
    "tokens": {"mean": 10767, "stdev": 150},
    "duration_s": {"mean": 38.0, "stdev": 1.0}
  }
}
```

### 5.4 Integration Patterns

**Pattern 1: Standalone Benchmarks**
```bash
# Run isolated benchmark
./benchmark-cli run fileops --output report.md --json results.json
# Output: report.md + results.json
```

**Pattern 2: CI/CD Integration**
```bash
# In GitHub Actions
- run: ./benchmark-cli run fileops --baseline main-results.json --fail-on-regression 5%
# Fails if accuracy drops >5% from main
```

**Pattern 3: Continuous Monitoring**
```bash
# Scheduled benchmarks
*/6 * * * * /usr/local/bin/benchmark-cli run \
  --all-benchmarks \
  --models sonnet,opus \
  --output-dir s3://benchmarks/$(date +%Y%m%d-%H%M)
```

**Pattern 4: Comparison Engine**
```bash
# Compare two approaches
./benchmark-cli compare \
  --baseline /code:auto results.json \
  --candidate /cook --auto results.json \
  --significance-level 0.05  # Statistical test
```

---

## Section 6: Practical Implementation Recommendations

### 6.1 Metrics Priority for CLI

**Tier 1 (Always Measure):**
- Task accuracy (success rate)
- Token usage (cost proxy)
- Execution time (latency)

**Tier 2 (When Possible):**
- Tool call counts (action economy)
- Error rates (robustness)
- Stdev/variance (stability)

**Tier 3 (Specialized):**
- Per-step accuracy (diagnostic)
- Memory usage (for long-running agents)
- Cost breakdown (per model)

### 6.2 Sampling Strategy

**Default Settings:**
- 3 runs per configuration (minimum for statistical validity)
- Parallel execution (speeds total runtime)
- All models (Haiku/Sonnet/Opus) unless specified

**Advanced:**
- Support adaptive sampling (increase N if high variance detected)
- Abort early if pattern clear (e.g., 100% accuracy in all 3 runs)
- Confidence intervals instead of just mean ± stdev

### 6.3 Failure Handling

**Graceful Degradation:**
```python
# If transcript not found, estimate from logs
if transcript.exists():
    metrics = parse_transcript(transcript)
else:
    metrics = estimate_from_logs(output_log)  # Fallback

# Report confidence level
results["token_usage"]["confidence"] = "high" # transcript
results["token_usage"]["confidence"] = "estimated"  # from logs
```

**Missing Data:**
- Mark as NaN or "unavailable"
- Don't skip benchmarks due to missing one metric
- Report what was successfully measured

### 6.4 Extensibility

**Plugin Architecture:**
```python
# Easy to add custom verifiers
class FileOpsVerifier:
    def verify(self, workspace) -> dict:
        # Return {"passed": 0, "failed": 0, "accuracy": 0.95}

class CustomBenchmark(Benchmark):
    verifier_class = FileOpsVerifier
    metrics = ["accuracy", "tokens", "duration"]
```

---

## Section 7: Key Insights from Current Benchmarks

### 7.1 Commands Win on Simple Tasks

**Data:** File operations benchmark (21 deterministic steps)
```
Commands: 10.8k tokens, 100% accuracy, 38s
Skills:   12.4k tokens, 95.2% accuracy, 45s
Winner:   Command (overhead reduction = 14.8% tokens, 18% time)
```

**Insight:** Simple, structured workflows don't benefit from skill abstraction. Inline commands reduce context switching.

### 7.2 Skills Shine with Advanced Models

**Data:** Orchestration benchmark (4-phase multi-agent)
```
Haiku:   Code auto wins (simpler model needs explicit structure)
Sonnet:  Cook (skill) wins by 25% tokens
Opus:    Cook (skill) wins by 25% time
```

**Insight:** Sophisticated models optimize skill context better. Skills provide flexibility that advanced models exploit.

### 7.3 Monolithic > Modular for Cost

**Data:** Context engineering benchmark (5 knowledge tasks)
```
Monolithic (1 skill):      90% accuracy, 600K tokens, $0.58
Modular (13 skills):       96.7% accuracy, 1,066K tokens, $0.89
Trade-off:  6.7% accuracy loss for 44% cost reduction
```

**Insight:** Modular designs help accuracy (specialized prompts) but increase token overhead (context switching between skills). Choose based on priority.

### 7.4 Stochasticity is Real

**Data:** Context engineering multi-agent task across 3 runs
```
Run 1: 83% accuracy
Run 2: 100% accuracy
Run 3: 100% accuracy
Mean: 94% (±8.2% stdev)
```

**Insight:** Single-run benchmarks are misleading. Always use N≥3 runs. Stochasticity can cause 17% swing in accuracy.

---

## Section 8: Recommended CLI Tool Architecture

### 8.1 Minimal Viable Implementation

**Core Features (MVP):**
```
1. Run benchmark             (execute ./scripts/run-*.sh)
2. Parse results             (call analyze-*.py)
3. Format report             (markdown output)
4. Compare against baseline  (simple JSON diff)
```

**Code Structure:**
```python
class BenchmarkRunner:
    def run(self, benchmark_name, model, runs=3):
        # 1. Invoke shell script
        # 2. Collect session IDs
        # 3. Run verifiers
        # 4. Parse transcripts
        # 5. Generate report

class BenchmarkAnalyzer:
    def parse_results(self, log_dir):
        # Extract metrics from JSONL transcripts

class ReportGenerator:
    def markdown(self, results):
        # Format as markdown table
```

**Execution:**
```bash
python3 bench-cli.py run --task fileops --model sonnet
# Output: plans/reports/benchmark-260203-1234-fileops.md
```

### 8.2 What NOT to Build (YAGNI)

- ❌ Custom web UI (markdown reports sufficient)
- ❌ Real-time monitoring dashboard (batch evaluation is fine)
- ❌ ML model to predict performance (overkill for current use case)
- ❌ Support for 50+ benchmarks (start with 3-5 core scenarios)

### 8.3 Scalability Path

**Phase 1 (Current):**
- Local execution only
- 3 benchmarks (fileops, orchestration, context-engineering)
- Markdown + JSON output

**Phase 2 (Future):**
- Distributed runs (fan-out multiple machines)
- Database backend (track trends over time)
- Regression detection (alert on performance drops)
- Automated report distribution

**Phase 3 (Advanced):**
- Cost optimization recommendations engine
- Adaptive sampling (adjust run count based on variance)
- A/B testing framework

---

## Section 9: Research-Based Recommendations

### 9.1 For Tool Developers

**Based on CLASSic Framework (2025 standard):**

| Dimension | Recommendation | Tool Feature |
|-----------|----------------|--------------|
| **Cost** | Track tokens + actual API costs | Parse usage from transcripts |
| **Latency** | Measure wall-clock time per task | Timestamp extraction from JSONL |
| **Accuracy** | Task-specific verifiers (not generic) | Custom verify-*.py per benchmark |
| **Stability** | Minimum 3 runs, report stdev | Parametrized run count + stats |
| **Security** | Audit log access, no credential logging | Avoid logging sensitive data |

**Actionable:** Implement all 5 dimensions; don't skip "stability" (stochasticity is real).

### 9.2 For Benchmark Design

**Key Principles:**
1. **Use realistic workflows** (greeting API > synthetic micro-benchmark)
2. **Vary task types** (deterministic + stochastic + knowledge)
3. **Test across model sizes** (Haiku, Sonnet, Opus show different patterns)
4. **Measure multiple metrics** (accuracy alone is incomplete)
5. **Report variance** (stdev, ranges, confidence intervals)

### 9.3 For Token Optimization

**skill.sh Findings + Industry Best Practices:**

**Quick Wins:**
- Use Sonnet for benchmarking (optimal cost/performance)
- Delegate verbose operations to subagents
- Use precise, specific prompts (avoid vague instructions)

**Medium Effort:**
- Implement selective context loading (defer_loading)
- Cache common reference files
- Profile token usage per component

**Long Term:**
- Train custom models on domain-specific tasks
- Build specialized agents for recurring patterns
- Use retrieval-based architectures (RAG) for large knowledge bases

---

## Unresolved Questions

1. **Reproducibility across Claude API versions:** How stable are benchmarks as Claude models are updated? Should we version benchmarks by model date?

2. **Cross-model generalization:** If a technique optimizes Opus, does it work equally well for Sonnet/Haiku? Need framework to predict.

3. **Benchmark brittleness:** How sensitive are verifiers to output format changes? Should we use semantic similarity instead of exact matching?

4. **Cost estimation accuracy:** Current approach parses API transcripts. Does this match actual billing for all cases (e.g., batch processing discounts)?

5. **Long-running task evaluation:** Current benchmarks complete in <10 minutes. How do metrics differ for 1-hour+ agent tasks?

6. **Real-world validation:** All benchmarks are synthetic. Do results predict actual performance on production tasks?

7. **Multi-turn interaction effects:** Benchmarks run single queries. How do agents degrade with accumulated context in multi-turn conversations?

8. **Hardware dependency:** Does benchmark execution time depend on local system load? Should we normalize or use cloud runners?

---

## Sources

- [Best AI Agent Evaluation Benchmarks: 2025 Complete Guide](https://o-mega.ai/articles/the-best-ai-agent-evals-and-benchmarks-full-2025-guide)
- [Benchmarking AI Agents in 2025: Top Tools, Metrics & Performance Testing Strategies](https://metadesignsolutions.com/benchmarking-ai-agents-in-2025-top-tools-metrics-performance-testing-strategies/)
- [Top 50 AI Model Benchmarks & Evaluation Metrics (2025 Guide)](https://o-mega.ai/articles/top-50-ai-model-evals-full-list-of-benchmarks-october-2025)
- [AI Evaluation Metrics 2025: Tested by Conversation Experts](https://masterofcode.com/blog/ai-agent-evaluation)
- [Evaluating AI Agents in 2025 - by Nilesh Barla](https://labs.adaline.ai/p/evaluating-ai-agents-in-2025)
- [Evaluation and Benchmarking of LLM Agents: A Survey](https://arxiv.org/html/2507.21504v1)
- [Toward Architecture-Aware Evaluation Metrics for LLM Agents](https://arxiv.org/html/2601.19583)
- [DeepEval by Confident AI - The LLM Evaluation Framework](https://deepeval.com/guides/guides-ai-agent-evaluation)
- [LLM Agent Evaluation: Assessing Tool Use, Task Completion, Agentic Reasoning](https://www.confident-ai.com/blog/llm-agent-evaluation-complete-guide)
- [Optimizing Token Efficiency in Claude Code Workflows](https://medium.com/@pierreyohann16/optimizing-token-efficiency-in-claude-code-workflows-managing-large-model-context-protocol-f41eafdab423)
- [Token-efficient tool use - Claude Docs](https://docs.claude.com/en/docs/agents-and-tools/tool-use/token-efficient-tool-use)
- [Claude Code Token Limits: A Guide for Engineering Leaders](https://www.faros.ai/blog/claude-code-token-limits)
