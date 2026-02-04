#!/usr/bin/env python3
"""
Analyze context engineering skill benchmark results.
Compares ck-context-engineering (monolithic) vs external repo (modular) architectures.
"""
import json
import os
import re
from datetime import datetime
from pathlib import Path
from statistics import mean
from typing import Dict, Optional

LOG_DIR = Path("/tmp/ck-context-benchmark")
REPORTS_DIR = Path("/Users/duynguyen/www/claudekit/skill-validation/plans/reports")

TASK_NAMES = [
    "context-degradation-diagnosis",
    "multi-agent-architecture-design",
    "token-optimization-strategy",
    "memory-system-implementation",
    "evaluation-framework",
]


def parse_json_output(json_file: Path) -> Dict:
    """Parse Claude CLI JSON output for metrics."""
    result = {
        "tokens_input": 0,
        "tokens_output": 0,
        "tokens_total": 0,
        "tokens_cache_read": 0,
        "tokens_cache_creation": 0,
        "duration_ms": 0,
        "num_turns": 0,
        "cost_usd": 0,
        "session_id": "",
        "response_text": "",
    }

    try:
        content = json_file.read_text().strip()
        if not content:
            return result

        data = json.loads(content)
        if isinstance(data, dict):
            # Extract metrics from Claude CLI JSON output
            result["session_id"] = data.get("session_id", "")
            result["duration_ms"] = data.get("duration_ms", 0)
            result["num_turns"] = data.get("num_turns", 0)
            result["cost_usd"] = data.get("total_cost_usd", 0)
            result["response_text"] = data.get("result", "")

            # Token usage
            usage = data.get("usage", {})
            result["tokens_input"] = usage.get("input_tokens", 0)
            result["tokens_output"] = usage.get("output_tokens", 0)
            result["tokens_cache_read"] = usage.get("cache_read_input_tokens", 0)
            result["tokens_cache_creation"] = usage.get("cache_creation_input_tokens", 0)

            # Total = input + output + cache
            result["tokens_total"] = (
                result["tokens_input"]
                + result["tokens_output"]
                + result["tokens_cache_read"]
                + result["tokens_cache_creation"]
            )

    except json.JSONDecodeError as e:
        print(f"JSON parse error for {json_file}: {e}")
    except Exception as e:
        print(f"Error parsing {json_file}: {e}")

    return result


def analyze_skill_type(skill_type: str) -> Dict:
    """Analyze all tasks for a skill type by reading JSON outputs."""
    results = {
        "tasks": {},
        "total_tokens": 0,
        "total_duration_ms": 0,
        "total_cost_usd": 0,
        "avg_tokens_per_task": 0,
    }

    for task_id, task_name in enumerate(TASK_NAMES):
        json_file = LOG_DIR / f"{skill_type}-task-{task_id}.json"

        task_result = {
            "name": task_name,
            "tokens": 0,
            "tokens_input": 0,
            "tokens_output": 0,
            "duration_ms": 0,
            "cost_usd": 0,
            "num_turns": 0,
        }

        if json_file.exists():
            parsed = parse_json_output(json_file)
            task_result["tokens"] = parsed["tokens_total"]
            task_result["tokens_input"] = parsed["tokens_input"]
            task_result["tokens_output"] = parsed["tokens_output"]
            task_result["tokens_cache_read"] = parsed["tokens_cache_read"]
            task_result["duration_ms"] = parsed["duration_ms"]
            task_result["cost_usd"] = parsed["cost_usd"]
            task_result["num_turns"] = parsed["num_turns"]
            task_result["session_id"] = parsed["session_id"]

        results["tasks"][task_id] = task_result
        results["total_tokens"] += task_result["tokens"]
        results["total_duration_ms"] += task_result["duration_ms"]
        results["total_cost_usd"] += task_result["cost_usd"]

    if len(TASK_NAMES) > 0:
        results["avg_tokens_per_task"] = results["total_tokens"] / len(TASK_NAMES)

    return results


def run_verification() -> Dict:
    """Run verification script and return results."""
    import subprocess
    import sys

    verify_script = Path(__file__).parent / "verify-context-engineering-skill-benchmark-responses.py"
    if verify_script.exists():
        try:
            result = subprocess.run(
                [sys.executable, str(verify_script)],
                capture_output=True,
                text=True,
            )
            # Extract JSON from output
            output = result.stdout
            if "JSON Results:" in output:
                json_part = output.split("JSON Results:")[-1].strip()
                return json.loads(json_part)
        except Exception as e:
            print(f"Verification error: {e}")
    return {}


def generate_report(local_results: Dict, external_results: Dict, verification: Dict) -> str:
    """Generate markdown comparison report."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    date_slug = datetime.now().strftime("%y%m%d-%H%M")

    l_dur = local_results.get('total_duration_ms', 0) / 1000
    e_dur = external_results.get('total_duration_ms', 0) / 1000
    l_cost = local_results.get('total_cost_usd', 0)
    e_cost = external_results.get('total_cost_usd', 0)

    report = f"""# Context Engineering Skill Benchmark Report

**Date:** {timestamp}
**Comparison:** ck-context-engineering (monolithic) vs Agent-Skills-for-Context-Engineering (modular)

## Summary

| Metric | Local (Monolithic) | External (Modular) | Diff |
|--------|-------------------|-------------------|------|
| Total Tokens | {local_results['total_tokens']:,} | {external_results['total_tokens']:,} | {((external_results['total_tokens'] - local_results['total_tokens']) / max(local_results['total_tokens'], 1) * 100):+.1f}% |
| Avg Tokens/Task | {local_results['avg_tokens_per_task']:,.0f} | {external_results['avg_tokens_per_task']:,.0f} | {((external_results['avg_tokens_per_task'] - local_results['avg_tokens_per_task']) / max(local_results['avg_tokens_per_task'], 1) * 100):+.1f}% |
| Total Duration | {l_dur:.1f}s | {e_dur:.1f}s | {((e_dur - l_dur) / max(l_dur, 0.1) * 100):+.1f}% |
| Total Cost | ${l_cost:.4f} | ${e_cost:.4f} | {((e_cost - l_cost) / max(l_cost, 0.0001) * 100):+.1f}% |

## Accuracy Comparison

"""
    # Add verification results
    if verification:
        local_acc = []
        external_acc = []

        report += "| Task | Local Accuracy | External Accuracy | Winner |\n"
        report += "|------|---------------|------------------|--------|\n"

        for task_id in range(5):
            local_task = verification.get("local", {}).get(str(task_id), {})
            external_task = verification.get("external", {}).get(str(task_id), {})

            l_acc = local_task.get("accuracy", 0) * 100
            e_acc = external_task.get("accuracy", 0) * 100
            local_acc.append(l_acc)
            external_acc.append(e_acc)

            winner = "Tie"
            if l_acc > e_acc:
                winner = "Local"
            elif e_acc > l_acc:
                winner = "External"

            task_name = TASK_NAMES[task_id] if task_id < len(TASK_NAMES) else f"Task {task_id}"
            report += f"| {task_name} | {l_acc:.0f}% | {e_acc:.0f}% | {winner} |\n"

        if local_acc and external_acc:
            report += f"| **Average** | **{mean(local_acc):.1f}%** | **{mean(external_acc):.1f}%** | "
            if mean(local_acc) > mean(external_acc):
                report += "**Local** |\n"
            elif mean(external_acc) > mean(local_acc):
                report += "**External** |\n"
            else:
                report += "**Tie** |\n"

    report += """
## Task Details

### Local (Monolithic) Skill

| Task | Tokens | Duration | Cost | Turns |
|------|--------|----------|------|-------|
"""
    for task_id, task_data in local_results["tasks"].items():
        dur = task_data.get('duration_ms', 0) / 1000
        cost = task_data.get('cost_usd', 0)
        turns = task_data.get('num_turns', 0)
        report += f"| {task_data['name']} | {task_data['tokens']:,} | {dur:.1f}s | ${cost:.4f} | {turns} |\n"

    report += "\n### External (Modular) Skills\n\n"
    report += "| Task | Tokens | Duration | Cost | Turns |\n"
    report += "|------|--------|----------|------|-------|\n"
    for task_id, task_data in external_results["tasks"].items():
        dur = task_data.get('duration_ms', 0) / 1000
        cost = task_data.get('cost_usd', 0)
        turns = task_data.get('num_turns', 0)
        report += f"| {task_data['name']} | {task_data['tokens']:,} | {dur:.1f}s | ${cost:.4f} | {turns} |\n"

    report += "\n"

    # Conclusions
    local_wins = 0
    external_wins = 0

    if local_results["total_tokens"] < external_results["total_tokens"]:
        local_wins += 1
    elif external_results["total_tokens"] < local_results["total_tokens"]:
        external_wins += 1

    if verification:
        local_avg = mean([verification.get("local", {}).get(str(i), {}).get("accuracy", 0) for i in range(5)])
        external_avg = mean([verification.get("external", {}).get(str(i), {}).get("accuracy", 0) for i in range(5)])
        if local_avg > external_avg:
            local_wins += 1
        elif external_avg > local_avg:
            external_wins += 1

    winner = "Tie"
    if local_wins > external_wins:
        winner = "Local (Monolithic)"
    elif external_wins > local_wins:
        winner = "External (Modular)"

    report += f"""## Conclusions

**Winner: {winner}**

### Architectural Trade-offs

| Aspect | Monolithic | Modular |
|--------|-----------|---------|
| Activation | Single skill | Multiple skills |
| Token overhead | Lower (one SKILL.md) | Higher (multiple SKILL.md) |
| Flexibility | Broad coverage | Focused per topic |
| Maintenance | Centralized | Distributed |

### Recommendations

| Use Case | Recommended |
|----------|-------------|
| General context questions | Monolithic |
| Deep-dive specific topic | Modular |
| Token-constrained env | Monolithic |
| Team specialization | Modular |
"""

    return report


def main():
    if not LOG_DIR.exists():
        print(f"Log directory not found: {LOG_DIR}")
        print("Run the benchmark first.")
        return

    print("Analyzing local skill results...")
    local_results = analyze_skill_type("local")

    print("Analyzing external skill results...")
    external_results = analyze_skill_type("external")

    print("Running verification...")
    verification = run_verification()

    print("Generating report...")
    report = generate_report(local_results, external_results, verification)

    # Save report
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    date_slug = datetime.now().strftime("%y%m%d-%H%M")
    report_path = REPORTS_DIR / f"benchmark-{date_slug}-context-engineering-skill-comparison.md"
    report_path.write_text(report)

    print(f"\nReport saved: {report_path}")
    print("\n" + "=" * 60)
    print(report)


if __name__ == "__main__":
    main()
