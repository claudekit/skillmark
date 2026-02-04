#!/usr/bin/env python3
"""
Generate test.md files for skill validation using Claude CLI.

Analyzes skill content (SKILL.md, references/, scripts/) and generates
2-4 test files in skillmark format for validating skill effectiveness.

Usage:
    python3 generate-skill-tests-from-skill-content.py <skill-path>
    python3 generate-skill-tests-from-skill-content.py <skill-path> --output ./tests/
    python3 generate-skill-tests-from-skill-content.py <skill-path> --dry-run
    python3 generate-skill-tests-from-skill-content.py <skill-path> --model opus
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

# Add scripts directory to path for local imports
sys.path.insert(0, str(Path(__file__).parent))

from encoding_utils import configure_utf8_console, write_text_utf8

# Import with kebab-case filename
import importlib.util
spec = importlib.util.spec_from_file_location(
    "skill_content_collector",
    Path(__file__).parent / "skill-content-collector-for-test-generation.py"
)
skill_content_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(skill_content_module)
SkillContentCollector = skill_content_module.SkillContentCollector

configure_utf8_console()


def extract_json_from_response(text: str) -> str | None:
    """Extract JSON from response, handling markdown code blocks."""
    import re

    # Try to find JSON in markdown code block
    patterns = [
        r"```json\s*\n(.*?)\n```",  # ```json ... ```
        r"```\s*\n(.*?)\n```",       # ``` ... ```
        r"\{[\s\S]*\}",              # Raw JSON object
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            json_str = match.group(1) if match.lastindex else match.group(0)
            # Validate it's actual JSON
            try:
                json.loads(json_str)
                return json_str
            except json.JSONDecodeError:
                continue

    return None


GENERATION_PROMPT = """You must respond with ONLY a JSON object. No explanation, no markdown code blocks, just raw JSON.

Generate tests for this skill. Output format:
{{"skill_name":"<name>","tests":[{{"name":"<skill>-<topic>","test_type":"knowledge"|"task","concepts":["..."],"timeout":120|180,"prompt":"...","expected_items":["..."]}}]}}

Rules:
- 2-4 tests, at least 1 knowledge + 1 task
- Extract concepts from Key Concepts Index or section headers
- timeout: 120 (knowledge), 180 (task)
- 4-8 expected_items per test

Skill content:
{skill_content}

JSON:"""


def invoke_claude_cli(prompt: str, model: str, timeout: int = 180) -> dict | None:
    """Invoke Claude CLI with JSON output."""
    cmd = [
        "claude",
        "-p", prompt,
        "--output-format", "json",
        "--model", model,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )

        if result.returncode != 0:
            print(f"❌ Claude CLI error: {result.stderr}")
            return None

        # Parse JSON response
        response = json.loads(result.stdout)

        # Handle wrapped response format from Claude CLI
        # Format: {"type": "result", "subtype": "success", "result": <actual_result>}
        if isinstance(response, dict) and "result" in response:
            inner = response["result"]
            # Result might be JSON string that needs parsing
            if isinstance(inner, str):
                # Try extracting JSON from markdown code blocks
                json_str = extract_json_from_response(inner)
                if json_str:
                    try:
                        return json.loads(json_str)
                    except json.JSONDecodeError:
                        pass
                # Try direct parsing
                try:
                    return json.loads(inner)
                except json.JSONDecodeError:
                    print(f"❌ Could not parse JSON from response: {inner[:300]}")
                    return None
            return inner
        return response

    except subprocess.TimeoutExpired:
        print(f"❌ Claude CLI timeout after {timeout}s")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse Claude response: {e}")
        print(f"Raw output: {result.stdout[:500]}")
        return None
    except FileNotFoundError:
        print("❌ Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code")
        return None


def format_test_md(test: dict) -> str:
    """Format a test dict into skillmark test.md format."""
    lines = [
        "---",
        f"name: {test['name']}",
        f"type: {test['test_type']}",
        "concepts:",
    ]

    for concept in test["concepts"]:
        lines.append(f"  - {concept}")

    lines.extend([
        f"timeout: {test['timeout']}",
        "---",
        "",
        "# Prompt",
        "",
        test["prompt"],
        "",
        "# Expected",
        "",
        "The response should cover:",
    ])

    for item in test["expected_items"]:
        lines.append(f"- [ ] {item}")

    lines.append("")
    return "\n".join(lines)


def generate_tests(
    skill_path: str,
    output_dir: str | None = None,
    dry_run: bool = False,
    model: str = "sonnet"
) -> bool:
    """Generate test.md files for a skill."""
    # Validate skill
    collector = SkillContentCollector(skill_path)
    valid, message = collector.validate()

    if not valid:
        print(f"❌ Invalid skill: {message}")
        return False

    skill_name = collector.get_skill_name()
    print(f"📚 Analyzing skill: {skill_name}")

    # Determine output directory
    if output_dir:
        out_path = Path(output_dir).resolve()
    else:
        out_path = Path(skill_path).resolve() / "tests"

    # Collect skill content
    skill_content = collector.format_for_prompt()
    prompt = GENERATION_PROMPT.format(skill_content=skill_content)

    print(f"🤖 Invoking Claude CLI ({model})...")

    if dry_run:
        print("\n📋 DRY RUN - Would send prompt:")
        print("-" * 40)
        print(prompt[:2000] + "..." if len(prompt) > 2000 else prompt)
        print("-" * 40)
        print(f"\n📁 Would write to: {out_path}")
        return True

    # Invoke Claude CLI
    response = invoke_claude_cli(prompt, model)

    if not response:
        return False

    # Validate response has tests
    tests = response.get("tests", [])
    if not tests:
        print("❌ No tests generated")
        return False

    print(f"✅ Generated {len(tests)} tests")

    # Create output directory
    out_path.mkdir(parents=True, exist_ok=True)

    # Write test files
    written = 0
    skipped = 0

    for test in tests:
        filename = f"{test['name']}-test.md"
        filepath = out_path / filename

        if filepath.exists():
            print(f"⏭️  Skipping existing: {filename}")
            skipped += 1
            continue

        content = format_test_md(test)
        write_text_utf8(filepath, content)
        print(f"✅ Created: {filename}")
        written += 1

    print(f"\n📊 Summary: {written} created, {skipped} skipped")
    print(f"📁 Output directory: {out_path}")

    return written > 0 or skipped > 0


def main():
    parser = argparse.ArgumentParser(
        description="Generate test.md files for skill validation"
    )
    parser.add_argument(
        "skill_path",
        help="Path to skill directory (must contain SKILL.md)"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output directory for test files (default: <skill>/tests/)"
    )
    parser.add_argument(
        "--dry-run", "-n",
        action="store_true",
        help="Preview without generating files"
    )
    parser.add_argument(
        "--model", "-m",
        default="sonnet",
        choices=["haiku", "sonnet", "opus"],
        help="Claude model to use (default: sonnet)"
    )

    args = parser.parse_args()

    success = generate_tests(
        skill_path=args.skill_path,
        output_dir=args.output,
        dry_run=args.dry_run,
        model=args.model
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
