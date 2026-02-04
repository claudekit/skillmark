#!/usr/bin/env python3
"""
Verify benchmark step completion.
Usage: python3 verify-steps.py [workspace_path]
"""
import json
import sys
from pathlib import Path


def verify(workspace: str) -> dict:
    base = Path(workspace) / "benchmark-test"
    results = {"passed": 0, "failed": 0, "total": 21, "steps": {}}

    # Helper to safely read file
    def read_safe(p: Path) -> str:
        try:
            return p.read_text() if p.exists() else ""
        except Exception:
            return ""

    # Helper to safely parse JSON
    def json_safe(p: Path) -> dict:
        try:
            return json.loads(p.read_text()) if p.exists() else {}
        except Exception:
            return {}

    checks = [
        # Phase 1: Directory Setup
        (1, "benchmark-test/ exists", base.is_dir()),
        (2, "src/ exists", (base / "src").is_dir()),
        (3, "docs/ exists", (base / "docs").is_dir()),
        (4, "config/ exists", (base / "config").is_dir()),

        # Phase 2: File Creation
        (5, "README.md exists", (base / "README.md").is_file()),
        (6, "src/main.py exists", (base / "src/main.py").is_file()),
        (7, "src/helpers.py exists (renamed)", (base / "src/helpers.py").is_file()),
        (8, "docs/setup.md exists", (base / "docs/setup.md").is_file()),
        (9, "config/settings.json exists", (base / "config/settings.json").is_file()),
        (10, ".gitignore exists", (base / ".gitignore").is_file()),

        # Phase 4: Modify Operations (verifiable)
        (14, "README.md has Features section", "## Features" in read_safe(base / "README.md")),
        (15, "main.py has import", "import" in read_safe(base / "src/main.py")),
        (16, "settings.json debug=false", json_safe(base / "config/settings.json").get("debug") is False),
        (17, "utils.py deleted, helpers.py exists",
         not (base / "src/utils.py").exists() and (base / "src/helpers.py").exists()),

        # Phase 5: Verification
        (20, "COMPLETION.md exists", (base / "COMPLETION.md").is_file()),
    ]

    for step, desc, ok in checks:
        results["steps"][step] = {"description": desc, "passed": ok}
        if ok:
            results["passed"] += 1
        else:
            results["failed"] += 1

    results["accuracy"] = results["passed"] / len(checks) if checks else 0
    results["checked_steps"] = len(checks)

    return results


def main():
    workspace = sys.argv[1] if len(sys.argv) > 1 else "."
    results = verify(workspace)

    print(json.dumps(results, indent=2))

    # Exit code: 0 if all passed, 1 otherwise
    return 0 if results["accuracy"] == 1.0 else 1


if __name__ == "__main__":
    sys.exit(main())
