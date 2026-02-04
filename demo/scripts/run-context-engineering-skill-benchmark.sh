#!/bin/bash
# Benchmark: ck-context-engineering vs Agent-Skills-for-Context-Engineering
# Compares monolithic vs modular skill architectures for context engineering tasks

set -e

PROJECT_DIR="/Users/duynguyen/www/claudekit/skill-validation"
EXTERNAL_REPO="https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering"
EXTERNAL_SKILLS_DIR="/tmp/external-context-engineering-skills"
LOG_DIR="/tmp/ck-context-benchmark"
REPORTS_DIR="$PROJECT_DIR/plans/reports"

MODEL="${1:-sonnet}"
METHOD="${2:-all}"  # all, local, external

echo "=============================================="
echo "Context Engineering Skill Benchmark"
echo "=============================================="
echo "Model: $MODEL"
echo "Method: $METHOD"
echo "Project: $PROJECT_DIR"
echo ""

# Task prompts
declare -a TASK_PROMPTS=(
  "My agent loses important instructions after 50+ turns. Diagnose the issue and recommend fixes for context degradation."
  "Design a 3-agent system for code review: one for security, one for performance, one for style. How should they coordinate and share context?"
  "My agent uses 85% context at turn 20. How do I extend the conversation without quality loss? Provide specific optimization strategies."
  "Implement cross-session memory for a coding assistant that remembers user preferences and project context. What architecture should I use?"
  "How do I measure if my agent's context management is effective? What metrics matter and how do I evaluate them?"
)

declare -a TASK_NAMES=(
  "context-degradation-diagnosis"
  "multi-agent-architecture-design"
  "token-optimization-strategy"
  "memory-system-implementation"
  "evaluation-framework"
)

# Setup
mkdir -p "$LOG_DIR" "$REPORTS_DIR"

# Clone external skills if needed
setup_external_skills() {
  if [[ ! -d "$EXTERNAL_SKILLS_DIR" ]]; then
    echo "Cloning external skills repository..."
    git clone --depth 1 "$EXTERNAL_REPO" "$EXTERNAL_SKILLS_DIR"
  else
    echo "External skills already cloned at $EXTERNAL_SKILLS_DIR"
  fi
}

# Run single test
run_test() {
  local skill_type=$1  # local or external
  local task_num=$2
  local task_name="${TASK_NAMES[$task_num]}"
  local prompt="${TASK_PROMPTS[$task_num]}"
  local workspace="/tmp/ctx-bench-${skill_type}-${task_num}"

  rm -rf "$workspace" && mkdir -p "$workspace"

  # Copy appropriate skills
  mkdir -p "$workspace/.claude/skills"
  if [[ "$skill_type" == "local" ]]; then
    cp -r "$PROJECT_DIR/.claude/skills/ck-context-engineering" "$workspace/.claude/skills/"
  else
    # Copy relevant external skills
    for skill in context-fundamentals context-optimization context-compression \
                 context-degradation multi-agent-patterns memory-systems evaluation; do
      if [[ -d "$EXTERNAL_SKILLS_DIR/skills/$skill" ]]; then
        cp -r "$EXTERNAL_SKILLS_DIR/skills/$skill" "$workspace/.claude/skills/"
      fi
    done
  fi

  echo "[${skill_type}] Task $((task_num+1)): $task_name"

  local start_time=$(date +%s)

  # Run claude with skill activation
  cd "$workspace"
  claude --model "$MODEL" \
    --print \
    --output-format json \
    "Activate context-engineering skills. $prompt" \
    > "$LOG_DIR/${skill_type}-task-${task_num}.json" 2>&1 || true

  local end_time=$(date +%s)
  local elapsed=$((end_time - start_time))

  echo "  Complete (${elapsed}s)"
}

# Run all tests for a skill type
run_all_tests() {
  local skill_type=$1
  echo ""
  echo "=== Running $skill_type Skill Tests ==="

  for i in "${!TASK_PROMPTS[@]}"; do
    run_test "$skill_type" "$i"
  done
}

# Main execution
if [[ "$METHOD" == "all" || "$METHOD" == "external" ]]; then
  setup_external_skills
fi

if [[ "$METHOD" == "all" || "$METHOD" == "local" ]]; then
  run_all_tests "local"
fi

if [[ "$METHOD" == "all" || "$METHOD" == "external" ]]; then
  run_all_tests "external"
fi

echo ""
echo "=== Running Analysis ==="
~/.claude/skills/.venv/bin/python3 "$PROJECT_DIR/scripts/analyze-context-engineering-skill-benchmark.py"

echo ""
echo "=============================================="
echo "Benchmark Complete"
echo "=============================================="
echo "Logs: $LOG_DIR"
echo "Reports: $REPORTS_DIR"
