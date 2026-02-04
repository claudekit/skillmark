#!/usr/bin/env python3
"""
JSON schemas for Claude CLI output when generating skill tests.

Defines the expected structured output format for test generation.
"""

# Schema for a single test file
TEST_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "description": "Kebab-case test name derived from skill-name and concept"
        },
        "test_type": {
            "type": "string",
            "enum": ["knowledge", "task"],
            "description": "knowledge for Q&A tests, task for action-based tests"
        },
        "concepts": {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of 3-6 concepts this test covers"
        },
        "timeout": {
            "type": "integer",
            "description": "Timeout in seconds (120 for knowledge, 180 for task)"
        },
        "prompt": {
            "type": "string",
            "description": "The question or task instruction for the test"
        },
        "expected_items": {
            "type": "array",
            "items": {"type": "string"},
            "description": "4-8 verifiable checklist items for expected response"
        }
    },
    "required": ["name", "test_type", "concepts", "timeout", "prompt", "expected_items"]
}

# Schema for Claude CLI output containing multiple tests
OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "skill_name": {
            "type": "string",
            "description": "Name of the skill being tested"
        },
        "tests": {
            "type": "array",
            "items": TEST_SCHEMA,
            "minItems": 2,
            "maxItems": 4,
            "description": "2-4 tests covering different aspects of the skill"
        }
    },
    "required": ["skill_name", "tests"]
}


def get_output_schema_json() -> str:
    """Return OUTPUT_SCHEMA as formatted JSON string."""
    import json
    return json.dumps(OUTPUT_SCHEMA, indent=2)
