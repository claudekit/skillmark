#!/usr/bin/env python3
"""
Verify context engineering benchmark responses against expected concepts.
Scores accuracy based on coverage of key concepts per task.
"""
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Expected concepts per task
EXPECTED_CONCEPTS = {
    0: {  # Context degradation diagnosis
        "name": "context-degradation-diagnosis",
        "concepts": [
            ("lost-in-middle", ["lost in middle", "lost-in-middle", "middle position", "attention decay"]),
            ("attention-mechanics", ["attention", "u-shaped", "u shaped", "beginning and end", "primacy", "recency"]),
            ("compaction", ["compaction", "compress", "summariz", "condense"]),
            ("position-encoding", ["position", "encoding", "positional"]),
            ("token-limit", ["token", "limit", "context window", "context limit"]),
            ("degradation-pattern", ["degrad", "decay", "deteriorat", "quality loss"]),
        ]
    },
    1: {  # Multi-agent architecture design
        "name": "multi-agent-architecture-design",
        "concepts": [
            ("orchestrator-pattern", ["orchestrat", "supervisor", "coordinator", "central"]),
            ("context-isolation", ["isolat", "separate context", "partition", "independent context"]),
            ("token-economics", ["token", "cost", "15x", "overhead"]),
            ("consensus", ["consensus", "voting", "agree", "coordinate"]),
            ("handoff", ["handoff", "hand off", "pass", "delegate"]),
            ("specialization", ["specialist", "specializ", "role", "dedicated"]),
        ]
    },
    2: {  # Token optimization strategy
        "name": "token-optimization-strategy",
        "concepts": [
            ("compaction-trigger", ["70%", "80%", "threshold", "trigger", "utilization"]),
            ("observation-masking", ["mask", "observation", "tool output", "reference"]),
            ("kv-cache", ["cache", "kv", "key-value", "prefix"]),
            ("progressive-disclosure", ["progressive", "just-in-time", "load on demand", "lazy"]),
            ("summarization", ["summar", "condense", "compress"]),
            ("priority", ["priorit", "critical", "important", "preserve"]),
        ]
    },
    3: {  # Memory system implementation
        "name": "memory-system-implementation",
        "concepts": [
            ("short-term-memory", ["short-term", "short term", "working memory", "session"]),
            ("long-term-memory", ["long-term", "long term", "persist", "cross-session"]),
            ("rag", ["rag", "retrieval", "augment", "vector"]),
            ("knowledge-graph", ["graph", "knowledge base", "semantic", "relationship"]),
            ("embedding", ["embed", "vector", "similarity"]),
            ("persistence", ["persist", "store", "save", "database"]),
        ]
    },
    4: {  # Evaluation framework
        "name": "evaluation-framework",
        "concepts": [
            ("token-metrics", ["token", "usage", "utilization", "consumption"]),
            ("quality-metrics", ["quality", "accuracy", "correctness", "fidelity"]),
            ("llm-as-judge", ["llm as judge", "llm-as-judge", "model evaluation", "ai eval"]),
            ("probe-based", ["probe", "needle", "test case", "benchmark"]),
            ("baseline", ["baseline", "comparison", "before/after", "control"]),
            ("degradation-detection", ["degrad", "drift", "decay", "monitor"]),
        ]
    },
}


def check_concept(text: str, patterns: List[str]) -> bool:
    """Check if any pattern matches in text (case-insensitive)."""
    text_lower = text.lower()
    return any(p.lower() in text_lower for p in patterns)


def score_response(task_id: int, response_text: str) -> Dict:
    """Score a response against expected concepts."""
    task_info = EXPECTED_CONCEPTS[task_id]
    results = {
        "task_name": task_info["name"],
        "concepts_found": [],
        "concepts_missing": [],
        "total": len(task_info["concepts"]),
        "score": 0,
    }

    for concept_name, patterns in task_info["concepts"]:
        if check_concept(response_text, patterns):
            results["concepts_found"].append(concept_name)
        else:
            results["concepts_missing"].append(concept_name)

    results["score"] = len(results["concepts_found"])
    results["accuracy"] = results["score"] / results["total"] if results["total"] > 0 else 0

    return results


def extract_response_text(json_file: Path) -> str:
    """Extract response text from claude output JSON."""
    try:
        content = json_file.read_text().strip()
        if not content:
            return ""

        # Claude CLI outputs single JSON object with --output-format json
        try:
            data = json.loads(content)
            if isinstance(data, dict):
                # Primary field is "result"
                if "result" in data:
                    return str(data["result"])
                # Fallback fields
                if "content" in data:
                    return str(data["content"])
                if "message" in data:
                    return str(data["message"])
        except json.JSONDecodeError:
            # If not valid JSON, treat as plain text
            return content

        return content
    except Exception as e:
        print(f"Error reading {json_file}: {e}")
        return ""


def verify_benchmark(log_dir: Path) -> Dict:
    """Verify all benchmark responses."""
    results = {"local": {}, "external": {}}

    for skill_type in ["local", "external"]:
        for task_id in range(5):
            json_file = log_dir / f"{skill_type}-task-{task_id}.json"
            if json_file.exists():
                response_text = extract_response_text(json_file)
                task_score = score_response(task_id, response_text)
                results[skill_type][task_id] = task_score
            else:
                results[skill_type][task_id] = {
                    "task_name": EXPECTED_CONCEPTS[task_id]["name"],
                    "error": "File not found",
                    "accuracy": 0,
                }

    return results


def print_results(results: Dict):
    """Print verification results."""
    print("\n" + "=" * 60)
    print("Context Engineering Skill Benchmark - Verification Results")
    print("=" * 60)

    for skill_type in ["local", "external"]:
        print(f"\n### {skill_type.upper()} Skill ###\n")
        total_score = 0
        total_possible = 0

        for task_id, task_result in results[skill_type].items():
            name = task_result.get("task_name", f"Task {task_id}")
            if "error" in task_result:
                print(f"Task {task_id} ({name}): ERROR - {task_result['error']}")
            else:
                acc = task_result["accuracy"] * 100
                found = len(task_result["concepts_found"])
                total = task_result["total"]
                total_score += found
                total_possible += total
                print(f"Task {task_id} ({name}): {acc:.0f}% ({found}/{total})")
                if task_result["concepts_missing"]:
                    print(f"  Missing: {', '.join(task_result['concepts_missing'])}")

        if total_possible > 0:
            overall = (total_score / total_possible) * 100
            print(f"\nOverall Accuracy: {overall:.1f}% ({total_score}/{total_possible})")


def main():
    log_dir = Path("/tmp/ck-context-benchmark")

    if not log_dir.exists():
        print(f"Log directory not found: {log_dir}")
        print("Run the benchmark first: ./scripts/run-context-engineering-skill-benchmark.sh")
        sys.exit(1)

    results = verify_benchmark(log_dir)
    print_results(results)

    # Return results as JSON for programmatic use
    print("\n" + "=" * 60)
    print("JSON Results:")
    print(json.dumps(results, indent=2))

    return results


if __name__ == "__main__":
    main()
