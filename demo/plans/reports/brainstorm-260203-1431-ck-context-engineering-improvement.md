# Brainstorm: Improving ck-context-engineering Accuracy

**Date:** 2026-02-03
**Goal:** Match external repo's 96.7% accuracy while maintaining efficiency advantage

## Problem Statement

| Metric | Local | External | Gap |
|--------|-------|----------|-----|
| Accuracy | 86.7% | 96.7% | -10% |
| Tokens | 594K | 1,066K | +79% more efficient |
| Cost | $0.58 | $0.89 | +55% cheaper |

**Failing Tasks:**
- multi-agent-architecture-design: 67% (missing consensus, 15x token economics)
- token-optimization-strategy: 67% (missing observation-masking, kv-cache)

## Root Cause

Concepts exist in reference files but SKILL.md doesn't surface them prominently for Claude's attention.

## Chosen Solution: Hybrid Approach

### Change 1: Enhance Quick Reference Table
Add key terms column to help Claude identify which reference to load.

### Change 2: Add Key Terms Section
Explicit keyword list in SKILL.md for retrieval.

### Change 3: Improve Reference Headers
Add key concepts summary at top of each reference file.

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Accuracy | 86.7% | 95-100% |
| Tokens | 594K | ~600K |
| Cost | $0.58 | ~$0.59 |

## Decision

User chose: **Implement now** (skip formal plan)
