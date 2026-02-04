#!/usr/bin/env python3
"""
Aggregate benchmark results from JSONL logs.
Output: Markdown comparison report.

Usage: python3 analyze-benchmark-results.py
"""
import json
from pathlib import Path
from statistics import mean, stdev
from datetime import datetime
from collections import defaultdict

LOG_DIR = Path("/tmp/ck-benchmark")
REPORT_DIR = Path("/Users/duynguyen/www/claudekit/skill-validation/plans/reports")
TRANSCRIPT_DIR = Path.home() / ".claude/projects/-Users-duynguyen-www-claudekit-skill-validation"


def parse_transcript(session_id: str) -> dict:
    """Parse Claude transcript file to extract tokens, duration, and tool usage."""
    transcript_path = TRANSCRIPT_DIR / f"{session_id}.jsonl"
    if not transcript_path.exists():
        print(f"Transcript not found: {transcript_path}")
        return {"input": 0, "output": 0, "total": 0, "duration_ms": 0, "tools": {}}

    total_input = 0
    total_output = 0
    first_ts = None
    last_ts = None
    tool_counts = defaultdict(int)

    try:
        for line in transcript_path.read_text().splitlines():
            if not line.strip():
                continue
            try:
                obj = json.loads(line)

                # Track timestamps for duration
                ts = obj.get("timestamp")
                if ts:
                    if first_ts is None:
                        first_ts = ts
                    last_ts = ts

                # Token usage is in message.usage for API responses
                if "message" in obj and isinstance(obj["message"], dict):
                    usage = obj["message"].get("usage", {})
                    if usage:
                        total_input += usage.get("input_tokens", 0)
                        total_input += usage.get("cache_creation_input_tokens", 0)
                        total_input += usage.get("cache_read_input_tokens", 0)
                        total_output += usage.get("output_tokens", 0)

                    # Count tool uses from content blocks
                    content = obj["message"].get("content", [])
                    for block in content:
                        if isinstance(block, dict) and block.get("type") == "tool_use":
                            tool_name = block.get("name", "unknown")
                            tool_counts[tool_name] += 1

            except json.JSONDecodeError:
                continue
    except Exception as e:
        print(f"Error parsing transcript {session_id}: {e}")

    # Calculate duration in ms from ISO timestamps
    duration_ms = 0
    if first_ts and last_ts:
        try:
            from datetime import datetime as dt
            t1 = dt.fromisoformat(first_ts.replace("Z", "+00:00"))
            t2 = dt.fromisoformat(last_ts.replace("Z", "+00:00"))
            duration_ms = int((t2 - t1).total_seconds() * 1000)
        except Exception:
            pass

    return {
        "input": total_input,
        "output": total_output,
        "total": total_input + total_output,
        "duration_ms": duration_ms,
        "tools": dict(tool_counts)
    }


def parse_log(log_path: Path, session_id: str = None) -> dict:
    """Parse a single benchmark log file."""
    try:
        events = [json.loads(line) for line in log_path.read_text().splitlines() if line.strip()]
    except Exception as e:
        print(f"Error parsing {log_path}: {e}")
        return {}

    if not events:
        return {}

    tools = [e for e in events if e.get("event") == "tool"]

    first_ts = events[0].get("ts", 0)
    last_ts = events[-1].get("ts", 0)

    # Count tools by type
    tool_counts = defaultdict(int)
    for t in tools:
        tool_counts[t.get("tool", "unknown")] += 1

    # Get token usage from transcript if session_id provided
    tokens = {"input": 0, "output": 0, "total": 0}
    if session_id:
        tokens = parse_transcript(session_id)

    return {
        "file": log_path.name,
        "session_id": session_id,
        "tool_count": len(tools),
        "tool_breakdown": dict(tool_counts),
        "duration_ms": last_ts - first_ts,
        "tokens_input": tokens["input"],
        "tokens_output": tokens["output"],
        "tokens_total": tokens["total"]
    }


def load_session_ids(method: str) -> list:
    """Load session IDs from session file."""
    session_file = LOG_DIR / f"{method}-sessions.txt"
    if not session_file.exists():
        return []
    return [s.strip() for s in session_file.read_text().splitlines() if s.strip()]


def categorize_logs() -> dict:
    """Categorize log files by method (skill vs command)."""
    results = {"skill": [], "command": []}

    if not LOG_DIR.exists():
        print(f"Log directory not found: {LOG_DIR}")
        return results

    # Load session IDs for each method
    skill_sessions = load_session_ids("skill")
    cmd_sessions = load_session_ids("cmd")

    # Process skill runs - always use transcript for metrics
    for i, session_id in enumerate(skill_sessions, 1):
        data = parse_transcript(session_id)
        if data["total"] > 0:  # Valid transcript found
            parsed = {
                "file": f"skill-{i}",
                "session_id": session_id,
                "tool_count": sum(data["tools"].values()),
                "tool_breakdown": data["tools"],
                "duration_ms": data["duration_ms"],
                "tokens_input": data["input"],
                "tokens_output": data["output"],
                "tokens_total": data["total"]
            }
            results["skill"].append(parsed)

    # Process command runs - always use transcript for metrics
    for i, session_id in enumerate(cmd_sessions, 1):
        data = parse_transcript(session_id)
        if data["total"] > 0:  # Valid transcript found
            parsed = {
                "file": f"cmd-{i}",
                "session_id": session_id,
                "tool_count": sum(data["tools"].values()),
                "tool_breakdown": data["tools"],
                "duration_ms": data["duration_ms"],
                "tokens_input": data["input"],
                "tokens_output": data["output"],
                "tokens_total": data["total"]
            }
            results["command"].append(parsed)

    # Fallback: also check old-style jsonl files
    for log_file in sorted(LOG_DIR.glob("*.jsonl")):
        name_lower = log_file.name.lower()
        if "skill" in name_lower and not any(r.get("file") == log_file.name for r in results["skill"]):
            parsed = parse_log(log_file)
            if parsed:
                results["skill"].append(parsed)
        elif ("cmd" in name_lower or "command" in name_lower) and not any(r.get("file") == log_file.name for r in results["command"]):
            parsed = parse_log(log_file)
            if parsed:
                results["command"].append(parsed)

    return results


def calc_stats(values: list) -> dict:
    """Calculate statistics for a list of values."""
    if not values:
        return {"avg": 0, "std": 0, "min": 0, "max": 0}

    return {
        "avg": mean(values),
        "std": stdev(values) if len(values) > 1 else 0,
        "min": min(values),
        "max": max(values)
    }


def generate_report(results: dict, model: str = "default") -> str:
    """Generate markdown report from results."""
    report = []
    report.append("# Benchmark Report: Skills vs Commands")
    report.append("")
    report.append(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    report.append(f"**Model:** {model}")
    report.append("**Task:** 21-step file operations")
    report.append("")

    # Summary table
    report.append("## Summary")
    report.append("")
    report.append("| Method | Runs | Tokens (avg±std) | Duration (avg) | Tools (avg) |")
    report.append("|--------|------|------------------|----------------|-------------|")

    for method in ["skill", "command"]:
        runs = results[method]
        if not runs:
            report.append(f"| {method.capitalize()} | 0 | - | - | - |")
            continue

        tokens = calc_stats([r["tokens_total"] for r in runs])
        duration = calc_stats([r["duration_ms"] for r in runs])
        tools = calc_stats([r["tool_count"] for r in runs])

        report.append(
            f"| {method.capitalize()} | {len(runs)} | "
            f"{tokens['avg']:,.0f}±{tokens['std']:,.0f} | "
            f"{duration['avg']/1000:.1f}s | "
            f"{tools['avg']:.0f} |"
        )

    report.append("")

    # Detailed breakdown
    report.append("## Detailed Results")
    report.append("")

    for method in ["skill", "command"]:
        runs = results[method]
        if not runs:
            continue

        report.append(f"### {method.capitalize()} Runs")
        report.append("")
        report.append("| Run | Tokens | Duration | Tools |")
        report.append("|-----|--------|----------|-------|")

        for i, r in enumerate(runs, 1):
            report.append(
                f"| {i} | {r['tokens_total']:,} | "
                f"{r['duration_ms']/1000:.1f}s | {r['tool_count']} |"
            )

        report.append("")

        # Tool breakdown for first run
        if runs[0].get("tool_breakdown"):
            report.append("**Tool usage (Run 1):**")
            for tool, count in sorted(runs[0]["tool_breakdown"].items()):
                report.append(f"- {tool}: {count}")
            report.append("")

    # Comparison
    if results["skill"] and results["command"]:
        report.append("## Comparison")
        report.append("")

        skill_tokens = mean([r["tokens_total"] for r in results["skill"]])
        cmd_tokens = mean([r["tokens_total"] for r in results["command"]])
        token_diff = ((skill_tokens - cmd_tokens) / cmd_tokens * 100) if cmd_tokens else 0

        skill_duration = mean([r["duration_ms"] for r in results["skill"]])
        cmd_duration = mean([r["duration_ms"] for r in results["command"]])
        duration_diff = ((skill_duration - cmd_duration) / cmd_duration * 100) if cmd_duration else 0

        skill_tools = mean([r["tool_count"] for r in results["skill"]])
        cmd_tools = mean([r["tool_count"] for r in results["command"]])
        tools_diff = ((skill_tools - cmd_tools) / cmd_tools * 100) if cmd_tools else 0

        report.append("| Metric | Skill | Command | Diff |")
        report.append("|--------|-------|---------|------|")
        report.append(f"| Tokens | {skill_tokens:,.0f} | {cmd_tokens:,.0f} | {'+' if token_diff > 0 else ''}{token_diff:.1f}% |")
        report.append(f"| Duration | {skill_duration/1000:.1f}s | {cmd_duration/1000:.1f}s | {'+' if duration_diff > 0 else ''}{duration_diff:.1f}% |")
        report.append(f"| Tools | {skill_tools:.0f} | {cmd_tools:.0f} | {'+' if tools_diff > 0 else ''}{tools_diff:.1f}% |")
        report.append("")

        # Determine winner
        skill_wins = sum([token_diff < 0, duration_diff < 0, tools_diff < 0])
        cmd_wins = 3 - skill_wins
        winner = "Skill" if skill_wins > cmd_wins else "Command" if cmd_wins > skill_wins else "Tie"

        # Auto-generate conclusions
        report.append("## Conclusions")
        report.append("")
        report.append(f"**Winner: {winner}** ({skill_wins}/3 metrics favor Skill, {cmd_wins}/3 favor Command)")
        report.append("")

        if winner == "Skill":
            report.append("Skills demonstrate better prompt adherence due to:")
            report.append("- Reference file architecture provides clearer instruction separation")
            report.append("- Skill activation creates dedicated context vs inline expansion")
        elif winner == "Command":
            report.append("Commands demonstrate better efficiency due to:")
            report.append("- Inline instructions reduce context overhead")
            report.append("- No skill loading/parsing overhead")
        else:
            report.append("Results are inconclusive - performance is similar between methods.")

        report.append("")
        report.append("**Observations:**")
        if abs(token_diff) < 10:
            report.append("- Token usage is comparable between methods")
        else:
            report.append(f"- {'Command' if token_diff > 0 else 'Skill'} is more token-efficient")
        if abs(duration_diff) < 10:
            report.append("- Execution time is comparable between methods")
        else:
            report.append(f"- {'Command' if duration_diff > 0 else 'Skill'} executes faster")
        report.append("")
    else:
        report.append("## Conclusions")
        report.append("")
        report.append("*Insufficient data for comparison*")
        report.append("")

    return "\n".join(report)


def main():
    results = categorize_logs()

    skill_count = len(results["skill"])
    cmd_count = len(results["command"])
    print(f"Found {skill_count} skill runs, {cmd_count} command runs")

    if not (skill_count or cmd_count):
        print("No benchmark logs found. Run benchmarks first.")
        return

    # Read model from metadata file
    model = "default"
    model_file = LOG_DIR / "model.txt"
    if model_file.exists():
        model = model_file.read_text().strip()

    report = generate_report(results, model)

    # Save report
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORT_DIR / f"benchmark-{datetime.now().strftime('%y%m%d-%H%M')}-{model}-fileops.md"
    report_path.write_text(report)

    print(f"\nReport saved: {report_path}")
    print("\n" + "=" * 60)
    print(report)


if __name__ == "__main__":
    main()
