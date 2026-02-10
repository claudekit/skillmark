# @skillmark/cli

## 0.4.0

### Minor Changes

- Auto-release from conventional commits

  - feat(webapp): add trigger metrics, consistency tracking, and baseline comparison to leaderboard
  - feat(cli): add trigger test type, consistency metrics, and performance baseline features
  - feat(cli): add AUP compliance validator and enhance test generation
  - feat(cli): upload report markdown on publish
  - feat(webapp): add benchmark report viewing modal
  - feat(cli): add comprehensive benchmark report generator

## 0.3.0

### Minor Changes

- feat: comprehensive benchmark report generation and webapp viewing

  - Add detailed markdown report generation with executive summary, per-test breakdowns, run consistency analysis, concept coverage, security analysis, performance metrics, and recommendations
  - Upload report to webapp on publish for persistent viewing
  - Add report viewing modal on skill detail page with rich markdown rendering including tables, blockquotes, and collapsible sections

## 0.2.0

### Minor Changes

- 4417566: Add security benchmarking, generate-tests command, and dashboard improvements

  - Security test type with refusal/leakage scoring and composite metrics
  - `generate-tests` command for regenerating tests from SKILL.md
  - `--prompt-context` option for injecting additional context into test generation
  - Auto-publish results after benchmark runs
  - Expandable test results and security radar chart in dashboard
  - Git repo URL detection for published results
