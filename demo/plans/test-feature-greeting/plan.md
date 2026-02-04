# Feature: User Greeting API

## Overview

Simple REST API endpoint for greeting users. Used as benchmark test case for comparing `/code:auto` vs `/cook --auto`.

**Status:** Ready for implementation
**Complexity:** Low-Medium (4 phases)
**Estimated Effort:** Small

---

## Phases

| Phase | File | Status | Description |
|-------|------|--------|-------------|
| 1 | [phase-01-setup-project-structure.md](./phase-01-setup-project-structure.md) | Pending | Project scaffolding |
| 2 | [phase-02-implement-greeting-endpoint.md](./phase-02-implement-greeting-endpoint.md) | Pending | Core API implementation |
| 3 | [phase-03-write-unit-tests.md](./phase-03-write-unit-tests.md) | Pending | Test coverage |
| 4 | [phase-04-update-documentation.md](./phase-04-update-documentation.md) | Pending | README updates |

---

## Requirements

### Functional
- GET `/api/greet/:name` returns JSON greeting
- Response format: `{"message": "Hello, {name}!", "timestamp": "ISO-8601"}`
- Name validation: 1-50 alphanumeric characters

### Non-Functional
- TypeScript implementation
- Vitest for testing
- Express.js framework
- 100% test coverage for endpoint

---

## Success Criteria

1. All 4 phases completed
2. API responds correctly to valid requests
3. API rejects invalid names with 400 status
4. All tests pass
5. README documents usage
