#!/usr/bin/env python3
"""
Analyze benchmark results for /code:auto vs /cook --auto comparison.

Extended metrics:
- Token usage (from transcripts)
- Duration (wall-clock and transcript timestamps)
- Tool calls breakdown
- Subagent calls (Task tool invocations by subagent_type)
- Review cycle counts
- Accuracy from verification results

Usage: python3 analyze-orchestration-benchmark-code-auto-vs-cook-auto.py
"""
import json
from pathlib import Path
from statistics import mean, stdev
from datetime import datetime
from collections import defaultdict
import re

LOG_DIR = Path("/tmp/ck-orchestration-benchmark")
REPORT_DIR = Path("/Users/duynguyen/www/claudekit/skill-validation/plans/reports")
TRANSCRIPT_DIR = Path.home() / ".claude/projects/-Users-duynguyen-www-claudekit-skill-validation"


def parse_transcript(session_id: str) -> dict:
    """Parse Claude transcript to extract comprehensive metrics."""
    transcript_path = TRANSCRIPT_DIR / f"{session_id}.jsonl"
    if not transcript_path.exists():
        # Try alternative paths (workspace-based)
        for alt_dir in Path.home().glob(".claude/projects/*bench-greeting*"):
            alt_path = alt_dir / f"{session_id}.jsonl"
            if alt_path.exists():
                transcript_path = alt_path
                break

    if not transcript_path.exists():
        print(f"Transcript not found: {session_id}")
        return empty_metrics()

    metrics = {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "duration_ms": 0,
        "tool_counts": defaultdict(int),
        "subagent_counts": defaultdict(int),
        "review_cycles": 0,
        "task_creates": 0,
        "task_updates": 0,
    }

    first_ts = None
    last_ts = None

    try:
        for line in transcript_path.read_text().splitlines():
            if not line.strip():
                continue
            try:
                obj = json.loads(line)

                # Track timestamps
                ts = obj.get("timestamp")
                if ts:
                    if first_ts is None:
                        first_ts = ts
                    last_ts = ts

                # Token usage from message.usage
                if "message" in obj and isinstance(obj["message"], dict):
                    usage = obj["message"].get("usage", {})
                    if usage:
                        metrics["input_tokens"] += usage.get("input_tokens", 0)
                        metrics["input_tokens"] += usage.get("cache_creation_input_tokens", 0)
                        metrics["input_tokens"] += usage.get("cache_read_input_tokens", 0)
                        metrics["output_tokens"] += usage.get("output_tokens", 0)

                    # Count tool uses from content blocks
                    content = obj["message"].get("content", [])
                    for block in content:
                        if isinstance(block, dict) and block.get("type") == "tool_use":
                            tool_name = block.get("name", "unknown")
                            metrics["tool_counts"][tool_name] += 1

                            # Track subagent calls (Task tool)
                            if tool_name == "Task":
                                tool_input = block.get("input", {})
                                subagent_type = tool_input.get("subagent_type", "unknown")
                                metrics["subagent_counts"][subagent_type] += 1

                                # Track review cycles (code-reviewer invocations)
                                if subagent_type == "code-reviewer":
                                    metrics["review_cycles"] += 1

                            # Track task management
                            elif tool_name == "TaskCreate":
                                metrics["task_creates"] += 1
                            elif tool_name == "TaskUpdate":
                                metrics["task_updates"] += 1

            except json.JSONDecodeError:
                continue

    except Exception as e:
        print(f"Error parsing transcript {session_id}: {e}")
        return empty_metrics()

    # Calculate duration
    if first_ts and last_ts:
        try:
            t1 = datetime.fromisoformat(first_ts.replace("Z", "+00:00"))
            t2 = datetime.fromisoformat(last_ts.replace("Z", "+00:00"))
            metrics["duration_ms"] = int((t2 - t1).total_seconds() * 1000)
        except Exception:
            pass

    metrics["total_tokens"] = metrics["input_tokens"] + metrics["output_tokens"]
    metrics["tool_counts"] = dict(metrics["tool_counts"])
    metrics["subagent_counts"] = dict(metrics["subagent_counts"])

    return metrics


def empty_metrics() -> dict:
    """Return empty metrics structure."""
    return {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "duration_ms": 0,
        "tool_counts": {},
        "subagent_counts": {},
        "review_cycles": 0,
        "task_creates": 0,
        "task_updates": 0,
    }


def load_session_ids(method: str) -> list:
    """Load session IDs from session file."""
    session_file = LOG_DIR / f"{method}-sessions.txt"
    if not session_file.exists():
        return []
    return [s.strip() for s in session_file.read_text().splitlines() if s.strip()]


def load_verification(method: str, run_num: int) -> dict:
    """Load verification results for a run."""
    verify_file = LOG_DIR / f"bench-greeting-{method}-{run_num}-verify.json"
    if not verify_file.exists():
        return {"accuracy": 0, "passed": 0, "total": 0}

    try:
        content = verify_file.read_text()
        # Find JSON in output (may have other text)
        match = re.search(r'\{[^{}]*"accuracy"[^{}]*\}', content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return json.loads(content)
    except Exception:
        return {"accuracy": 0, "passed": 0, "total": 0}


def load_walltime(method: str, run_num: int) -> int:
    """Load wall-clock time for a run."""
    walltime_file = LOG_DIR / f"{method}-{run_num}-walltime.txt"
    if not walltime_file.exists():
        return 0
    try:
        return int(walltime_file.read_text().strip())
    except Exception:
        return 0


def categorize_runs() -> dict:
    """Categorize and parse all benchmark runs."""
    results = {"code": [], "cook": []}

    for method in ["code", "cook"]:
        sessions = load_session_ids(method)
        for i, session_id in enumerate(sessions, 1):
            metrics = parse_transcript(session_id)
            if metrics["total_tokens"] > 0:
                verification = load_verification(method, i)
                walltime = load_walltime(method, i)

                run_data = {
                    "run": i,
                    "session_id": session_id,
                    "tokens": metrics["total_tokens"],
                    "input_tokens": metrics["input_tokens"],
                    "output_tokens": metrics["output_tokens"],
                    "duration_ms": metrics["duration_ms"],
                    "walltime_s": walltime,
                    "tool_count": sum(metrics["tool_counts"].values()),
                    "tool_breakdown": metrics["tool_counts"],
                    "subagent_count": sum(metrics["subagent_counts"].values()),
                    "subagent_breakdown": metrics["subagent_counts"],
                    "review_cycles": metrics["review_cycles"],
                    "task_creates": metrics["task_creates"],
                    "task_updates": metrics["task_updates"],
                    "accuracy": verification.get("accuracy", 0),
                    "checks_passed": verification.get("passed", 0),
                    "checks_total": verification.get("total", 0),
                }
                results[method].append(run_data)

    return results


def calc_stats(values: list) -> dict:
    """Calculate statistics."""
    if not values:
        return {"avg": 0, "std": 0, "min": 0, "max": 0}
    return {
        "avg": mean(values),
        "std": stdev(values) if len(values) > 1 else 0,
        "min": min(values),
        "max": max(values)
    }


def generate_report(results: dict, model: str = "default") -> str:
    """Generate comprehensive markdown report."""
    report = []
    report.append("# Benchmark Report: /code:auto vs /cook --auto")
    report.append("")
    report.append(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    report.append(f"**Model:** {model}")
    report.append("**Task:** 4-phase greeting API implementation")
    report.append("")

    # Summary table
    report.append("## Summary")
    report.append("")
    report.append("| Method | Runs | Tokens (avg±std) | Duration (avg) | Tools | Subagents | Accuracy |")
    report.append("|--------|------|------------------|----------------|-------|-----------|----------|")

    for method in ["code", "cook"]:
        runs = results[method]
        method_name = "/code:auto" if method == "code" else "/cook --auto"
        if not runs:
            report.append(f"| {method_name} | 0 | - | - | - | - | - |")
            continue

        tokens = calc_stats([r["tokens"] for r in runs])
        duration = calc_stats([r["duration_ms"] for r in runs])
        tools = calc_stats([r["tool_count"] for r in runs])
        subagents = calc_stats([r["subagent_count"] for r in runs])
        accuracy = calc_stats([r["accuracy"] * 100 for r in runs])

        report.append(
            f"| {method_name} | {len(runs)} | "
            f"{tokens['avg']:,.0f}±{tokens['std']:,.0f} | "
            f"{duration['avg']/1000:.1f}s | "
            f"{tools['avg']:.0f} | "
            f"{subagents['avg']:.0f} | "
            f"{accuracy['avg']:.1f}% |"
        )

    report.append("")

    # Detailed runs
    report.append("## Detailed Results")
    report.append("")

    for method in ["code", "cook"]:
        runs = results[method]
        method_name = "/code:auto" if method == "code" else "/cook --auto"
        if not runs:
            continue

        report.append(f"### {method_name} Runs")
        report.append("")
        report.append("| Run | Tokens | Duration | Tools | Subagents | Review Cycles | Accuracy |")
        report.append("|-----|--------|----------|-------|-----------|---------------|----------|")

        for r in runs:
            report.append(
                f"| {r['run']} | {r['tokens']:,} | "
                f"{r['duration_ms']/1000:.1f}s | "
                f"{r['tool_count']} | "
                f"{r['subagent_count']} | "
                f"{r['review_cycles']} | "
                f"{r['accuracy']*100:.1f}% |"
            )

        report.append("")

        # Subagent breakdown for first run
        if runs and runs[0].get("subagent_breakdown"):
            report.append("**Subagent usage (Run 1):**")
            for agent, count in sorted(runs[0]["subagent_breakdown"].items()):
                report.append(f"- {agent}: {count}")
            report.append("")

        # Tool breakdown for first run
        if runs and runs[0].get("tool_breakdown"):
            report.append("**Tool usage (Run 1):**")
            for tool, count in sorted(runs[0]["tool_breakdown"].items()):
                report.append(f"- {tool}: {count}")
            report.append("")

    # Comparison
    if results["code"] and results["cook"]:
        report.append("## Comparison")
        report.append("")

        code_tokens = mean([r["tokens"] for r in results["code"]])
        cook_tokens = mean([r["tokens"] for r in results["cook"]])
        token_diff = ((cook_tokens - code_tokens) / code_tokens * 100) if code_tokens else 0

        code_duration = mean([r["duration_ms"] for r in results["code"]])
        cook_duration = mean([r["duration_ms"] for r in results["cook"]])
        duration_diff = ((cook_duration - code_duration) / code_duration * 100) if code_duration else 0

        code_tools = mean([r["tool_count"] for r in results["code"]])
        cook_tools = mean([r["tool_count"] for r in results["cook"]])
        tools_diff = ((cook_tools - code_tools) / code_tools * 100) if code_tools else 0

        code_subagents = mean([r["subagent_count"] for r in results["code"]])
        cook_subagents = mean([r["subagent_count"] for r in results["cook"]])
        subagents_diff = ((cook_subagents - code_subagents) / code_subagents * 100) if code_subagents else 0

        code_accuracy = mean([r["accuracy"] for r in results["code"]])
        cook_accuracy = mean([r["accuracy"] for r in results["cook"]])
        accuracy_diff = ((cook_accuracy - code_accuracy) / code_accuracy * 100) if code_accuracy else 0

        report.append("| Metric | /code:auto | /cook --auto | Diff |")
        report.append("|--------|------------|--------------|------|")
        report.append(f"| Tokens | {code_tokens:,.0f} | {cook_tokens:,.0f} | {'+' if token_diff > 0 else ''}{token_diff:.1f}% |")
        report.append(f"| Duration | {code_duration/1000:.1f}s | {cook_duration/1000:.1f}s | {'+' if duration_diff > 0 else ''}{duration_diff:.1f}% |")
        report.append(f"| Tools | {code_tools:.0f} | {cook_tools:.0f} | {'+' if tools_diff > 0 else ''}{tools_diff:.1f}% |")
        report.append(f"| Subagents | {code_subagents:.0f} | {cook_subagents:.0f} | {'+' if subagents_diff > 0 else ''}{subagents_diff:.1f}% |")
        report.append(f"| Accuracy | {code_accuracy*100:.1f}% | {cook_accuracy*100:.1f}% | {'+' if accuracy_diff > 0 else ''}{accuracy_diff:.1f}% |")
        report.append("")

        # Determine winner (lower tokens/duration/tools is better, higher accuracy is better)
        code_wins = sum([
            token_diff > 0,      # cook uses more tokens → code wins
            duration_diff > 0,  # cook takes longer → code wins
            tools_diff > 0,     # cook uses more tools → code wins
            accuracy_diff < 0,  # cook has lower accuracy → code wins
        ])
        cook_wins = 4 - code_wins

        winner = "/code:auto" if code_wins > cook_wins else "/cook --auto" if cook_wins > code_wins else "Tie"

        report.append("## Conclusions")
        report.append("")
        report.append(f"**Winner: {winner}** ({code_wins}/4 metrics favor /code:auto, {cook_wins}/4 favor /cook --auto)")
        report.append("")

        if winner == "/code:auto":
            report.append("/code:auto demonstrates better efficiency due to:")
            report.append("- Simpler state machine with fixed 5-step workflow")
            report.append("- No skill loading/parsing overhead")
            report.append("- Direct plan execution without intent detection")
        elif winner == "/cook --auto":
            report.append("/cook --auto demonstrates better efficiency due to:")
            report.append("- Smart mode detection optimizes workflow")
            report.append("- Task tracking provides better coordination")
            report.append("- Reference file architecture for complex instructions")
        else:
            report.append("Results are comparable - both methods perform similarly for this task type.")

        report.append("")

        # Observations
        report.append("**Observations:**")
        if abs(token_diff) < 10:
            report.append("- Token usage is comparable between methods")
        else:
            report.append(f"- {'/code:auto' if token_diff > 0 else '/cook --auto'} is more token-efficient")
        if abs(duration_diff) < 10:
            report.append("- Execution time is comparable between methods")
        else:
            report.append(f"- {'/code:auto' if duration_diff > 0 else '/cook --auto'} executes faster")
        if abs(subagents_diff) < 10:
            report.append("- Subagent usage is similar")
        else:
            report.append(f"- {'/code:auto' if subagents_diff > 0 else '/cook --auto'} uses fewer subagents")
        report.append("")

    else:
        report.append("## Conclusions")
        report.append("")
        report.append("*Insufficient data for comparison*")
        report.append("")

    return "\n".join(report)


def main():
    results = categorize_runs()

    code_count = len(results["code"])
    cook_count = len(results["cook"])
    print(f"Found {code_count} /code:auto runs, {cook_count} /cook --auto runs")

    if not (code_count or cook_count):
        print("No benchmark logs found. Run benchmarks first.")
        return

    # Read model from metadata
    model = "default"
    model_file = LOG_DIR / "model.txt"
    if model_file.exists():
        model = model_file.read_text().strip()

    report = generate_report(results, model)

    # Save report
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime('%y%m%d-%H%M')
    report_path = REPORT_DIR / f"benchmark-{timestamp}-{model}-orchestration-code-auto-vs-cook-auto.md"
    report_path.write_text(report)

    print(f"\nReport saved: {report_path}")
    print("\n" + "=" * 60)
    print(report)


if __name__ == "__main__":
    main()
