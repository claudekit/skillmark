#!/usr/bin/env python3
"""
Verify greeting feature implementation completeness.

Checks:
- Directory structure exists
- Required files present
- Code contains expected patterns
- Tests exist and are structured correctly

Usage: python3 verify-greeting-feature-implementation.py [workspace_path]
"""
import json
import sys
from pathlib import Path


def verify_implementation(workspace: Path) -> dict:
    """Verify the greeting API implementation."""
    results = {
        "workspace": str(workspace),
        "checks": {},
        "passed": 0,
        "failed": 0,
        "total": 0,
        "accuracy": 0.0
    }

    api_dir = workspace / "greeting-api"

    # Define checks
    checks = [
        # Phase 1: Setup
        ("phase1_api_dir", api_dir.is_dir(), "greeting-api/ directory exists"),
        ("phase1_src_dir", (api_dir / "src").is_dir(), "src/ directory exists"),
        ("phase1_tests_dir", (api_dir / "tests").is_dir(), "tests/ directory exists"),
        ("phase1_package_json", (api_dir / "package.json").is_file(), "package.json exists"),
        ("phase1_tsconfig", (api_dir / "tsconfig.json").is_file(), "tsconfig.json exists"),
        ("phase1_index_ts", (api_dir / "src" / "index.ts").is_file(), "src/index.ts exists"),

        # Phase 2: Implementation
        ("phase2_middleware_dir", (api_dir / "src" / "middleware").is_dir(), "middleware/ directory exists"),
        ("phase2_handlers_dir", (api_dir / "src" / "handlers").is_dir(), "handlers/ directory exists"),
        ("phase2_validate_name", (api_dir / "src" / "middleware" / "validate-name.ts").is_file(), "validate-name.ts exists"),
        ("phase2_greet_handler", (api_dir / "src" / "handlers" / "greet.ts").is_file(), "greet.ts handler exists"),

        # Phase 3: Tests
        ("phase3_test_file", (api_dir / "tests" / "greet.test.ts").is_file(), "greet.test.ts exists"),

        # Phase 4: Documentation
        ("phase4_readme", (api_dir / "README.md").is_file(), "README.md exists"),
    ]

    # Content checks (only if files exist)
    content_checks = []

    # Check package.json has vitest
    pkg_json = api_dir / "package.json"
    if pkg_json.is_file():
        try:
            pkg_content = pkg_json.read_text()
            has_vitest = "vitest" in pkg_content
            has_express = "express" in pkg_content
            content_checks.append(("content_vitest", has_vitest, "package.json has vitest"))
            content_checks.append(("content_express", has_express, "package.json has express"))
        except Exception:
            pass

    # Check index.ts has route registration
    index_ts = api_dir / "src" / "index.ts"
    if index_ts.is_file():
        try:
            index_content = index_ts.read_text()
            has_route = "/api/greet" in index_content or "greet" in index_content.lower()
            has_export = "export" in index_content
            content_checks.append(("content_route", has_route, "index.ts has greet route"))
            content_checks.append(("content_export", has_export, "index.ts exports app"))
        except Exception:
            pass

    # Check validate-name.ts has validation logic
    validate_ts = api_dir / "src" / "middleware" / "validate-name.ts"
    if validate_ts.is_file():
        try:
            validate_content = validate_ts.read_text()
            has_length_check = "50" in validate_content or "length" in validate_content
            has_regex = "alphanumeric" in validate_content.lower() or "/^[a-zA-Z0-9]" in validate_content
            content_checks.append(("content_length_validation", has_length_check, "validate-name.ts checks length"))
            content_checks.append(("content_regex_validation", has_regex, "validate-name.ts checks alphanumeric"))
        except Exception:
            pass

    # Check greet.ts has handler
    greet_ts = api_dir / "src" / "handlers" / "greet.ts"
    if greet_ts.is_file():
        try:
            greet_content = greet_ts.read_text()
            has_hello = "Hello" in greet_content
            has_timestamp = "timestamp" in greet_content or "toISOString" in greet_content
            content_checks.append(("content_hello_message", has_hello, "greet.ts returns Hello message"))
            content_checks.append(("content_timestamp", has_timestamp, "greet.ts includes timestamp"))
        except Exception:
            pass

    # Check test file has test cases
    test_ts = api_dir / "tests" / "greet.test.ts"
    if test_ts.is_file():
        try:
            test_content = test_ts.read_text()
            has_describe = "describe" in test_content
            has_valid_tests = "valid" in test_content.lower()
            has_invalid_tests = "invalid" in test_content.lower() or "400" in test_content
            content_checks.append(("content_test_describe", has_describe, "test file has describe blocks"))
            content_checks.append(("content_test_valid", has_valid_tests, "test file has valid request tests"))
            content_checks.append(("content_test_invalid", has_invalid_tests, "test file has invalid request tests"))
        except Exception:
            pass

    # Check README has API documentation
    readme = api_dir / "README.md"
    if readme.is_file():
        try:
            readme_content = readme.read_text()
            has_api_docs = "/api/greet" in readme_content
            has_examples = "curl" in readme_content.lower() or "example" in readme_content.lower()
            content_checks.append(("content_readme_api", has_api_docs, "README documents API endpoint"))
            content_checks.append(("content_readme_examples", has_examples, "README has usage examples"))
        except Exception:
            pass

    # Combine all checks
    all_checks = checks + content_checks

    # Run checks
    for check_id, passed, description in all_checks:
        results["checks"][check_id] = {
            "passed": passed,
            "description": description
        }
        if passed:
            results["passed"] += 1
        else:
            results["failed"] += 1

    results["total"] = len(all_checks)
    results["accuracy"] = results["passed"] / results["total"] if results["total"] > 0 else 0

    return results


def main():
    workspace = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    results = verify_implementation(workspace)

    print(json.dumps(results, indent=2))

    # Exit with error if accuracy < 100%
    return 0 if results["accuracy"] == 1.0 else 1


if __name__ == "__main__":
    sys.exit(main())
