---
title: "Security Benchmark Feature"
description: "Add security test generation, dual scoring, and dashboard security metrics to Skillmark"
status: complete
priority: P1
effort: 16h
branch: zuey
tags: [feature, security, cli, webapp, database]
created: 2026-02-06
---

# Security Benchmark Feature

## Overview

Add security benchmarking to Skillmark: auto-generated security tests (6 categories), dual scoring (refusal + leakage), composite leaderboard score (70/30 accuracy/security), and dedicated security dashboard page.

Brainstorm report: [brainstorm-260206-1021-security-benchmark-feature.md](../reports/brainstorm-260206-1021-security-benchmark-feature.md)

## Phases

| # | Phase | Status | Effort | Pkg | Link |
|---|-------|--------|--------|-----|------|
| 1 | Security types & test format | Complete | 2h | CLI | [phase-01](./phase-01-security-types-and-test-format.md) |
| 2 | Security test scorer | Complete | 3h | CLI | [phase-02](./phase-02-security-test-scorer.md) |
| 3 | Auto-generation integration | Complete | 3h | CLI | [phase-03](./phase-03-auto-generation-integration.md) |
| 4 | Benchmark pipeline integration | Complete | 2h | CLI | [phase-04](./phase-04-benchmark-pipeline-integration.md) |
| 5 | DB migration & API changes | Complete | 2h | Webapp | [phase-05](./phase-05-db-migration-and-api-changes.md) |
| 6 | Dashboard UI changes | Complete | 3h | Webapp | [phase-06](./phase-06-dashboard-ui-changes.md) |
| 7 | Testing & documentation | Complete | 1h | Both | [phase-07](./phase-07-testing-and-documentation.md) |

## Dependencies

- Phase 2 depends on Phase 1 (types needed for scorer)
- Phase 3 depends on Phase 1 (test format for generation)
- Phase 4 depends on Phase 1, 2, 3 (full CLI pipeline)
- Phase 5 is independent (can parallel with Phase 2-4)
- Phase 6 depends on Phase 5 (needs API)
- Phase 7 depends on all previous phases

## Key Design Decisions

- Test type extended: `knowledge | task | security`
- Forbidden patterns use **exact match only** (no fuzzy) to prevent false positives
- Composite: `(accuracy × 0.70) + (security × 0.30)`
- Security tests piggybacked on existing LLM generation call (no extra cost)
- Backward compatible: existing results with null security score work via COALESCE
