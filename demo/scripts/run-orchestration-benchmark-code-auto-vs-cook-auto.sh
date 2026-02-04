#!/bin/bash
# Benchmark runner for /code:auto vs /cook --auto comparison
# Usage: ./run-orchestration-benchmark-code-auto-vs-cook-auto.sh [code|cook|all] [runs] [--model MODEL] [--parallel]
#
# Examples:
#   ./run-orchestration-benchmark-code-auto-vs-cook-auto.sh all 3 --model sonnet
#   ./run-orchestration-benchmark-code-auto-vs-cook-auto.sh code 1 --model haiku
#   ./run-orchestration-benchmark-code-auto-vs-cook-auto.sh cook 3 --model opus --parallel

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="/tmp/ck-orchestration-benchmark"
WORKSPACE_BASE="/tmp/bench-greeting"
PLAN_SOURCE="$PROJECT_DIR/plans/test-feature-greeting"

# Defaults
METHOD="${1:-all}"
RUNS="${2:-3}"
PARALLEL=false
MODEL="sonnet"

# Parse remaining args
shift 2 2>/dev/null || true
while [[ $# -gt 0 ]]; do
    case "$1" in
        --parallel) PARALLEL=true; shift ;;
        --model) MODEL="$2"; shift 2 ;;
        *) shift ;;
    esac
done

echo "=============================================="
echo "Benchmark: /code:auto vs /cook --auto"
echo "=============================================="
echo "Method: $METHOD"
echo "Runs per method: $RUNS"
echo "Model: $MODEL"
echo "Parallel: $PARALLEL"
echo "Project: $PROJECT_DIR"
echo "Plan source: $PLAN_SOURCE"
echo ""

# Validate plan exists
if [[ ! -d "$PLAN_SOURCE" ]]; then
    echo "ERROR: Plan directory not found: $PLAN_SOURCE"
    echo "Run from skill-validation project root"
    exit 1
fi

# Clean previous logs
rm -rf "$LOG_DIR"
mkdir -p "$LOG_DIR"

# Save metadata
echo "$MODEL" > "$LOG_DIR/model.txt"
echo "$(date -Iseconds)" > "$LOG_DIR/started.txt"

run_code_auto() {
    local run_num=$1
    local workspace="$WORKSPACE_BASE-code-$run_num"
    local session_id=$(uuidgen | tr '[:upper:]' '[:lower:]')
    local plan_dir="$workspace/plans/test-feature-greeting"

    echo "[code:auto #$run_num] Starting... Session: $session_id"

    # Setup workspace
    rm -rf "$workspace"
    mkdir -p "$workspace/plans"
    cp -r "$PLAN_SOURCE" "$plan_dir"

    # Copy .claude directory for commands/skills to work
    cp -r "$PROJECT_DIR/.claude" "$workspace/.claude"

    # Create minimal project structure expected by the plan
    mkdir -p "$workspace/greeting-api"

    # Run Claude with /code:auto command (auto mode, all phases)
    # Format: /code:auto [plan-path] [all-phases: Yes/No]
    cd "$workspace"

    local start_time=$(date +%s)
    claude --print --session-id "$session_id" --dangerously-skip-permissions --model "$MODEL" \
        "/code:auto plans/test-feature-greeting/plan.md Yes" \
        > "$LOG_DIR/code-$run_num-output.log" 2>&1 || true
    local end_time=$(date +%s)

    # Save session ID and timing
    echo "$session_id" > "$LOG_DIR/code-$run_num-session.txt"
    echo "$((end_time - start_time))" > "$LOG_DIR/code-$run_num-walltime.txt"

    local elapsed=$((end_time - start_time))
    echo "[code:auto #$run_num] Complete (${elapsed}s)"
}

run_cook_auto() {
    local run_num=$1
    local workspace="$WORKSPACE_BASE-cook-$run_num"
    local session_id=$(uuidgen | tr '[:upper:]' '[:lower:]')
    local plan_dir="$workspace/plans/test-feature-greeting"

    echo "[cook --auto #$run_num] Starting... Session: $session_id"

    # Setup workspace
    rm -rf "$workspace"
    mkdir -p "$workspace/plans"
    cp -r "$PLAN_SOURCE" "$plan_dir"

    # Copy .claude directory for commands/skills to work
    cp -r "$PROJECT_DIR/.claude" "$workspace/.claude"

    # Create minimal project structure expected by the plan
    mkdir -p "$workspace/greeting-api"

    # Run Claude with /cook --auto skill
    cd "$workspace"

    local start_time=$(date +%s)
    claude --print --session-id "$session_id" --dangerously-skip-permissions --model "$MODEL" \
        "/cook --auto plans/test-feature-greeting/plan.md" \
        > "$LOG_DIR/cook-$run_num-output.log" 2>&1 || true
    local end_time=$(date +%s)

    # Save session ID and timing
    echo "$session_id" > "$LOG_DIR/cook-$run_num-session.txt"
    echo "$((end_time - start_time))" > "$LOG_DIR/cook-$run_num-walltime.txt"

    local elapsed=$((end_time - start_time))
    echo "[cook --auto #$run_num] Complete (${elapsed}s)"
}

# Run benchmarks
PIDS=()

if [[ "$METHOD" == "code" || "$METHOD" == "all" ]]; then
    echo ""
    echo "=== Running /code:auto Benchmarks ==="
    for i in $(seq 1 $RUNS); do
        if $PARALLEL; then
            run_code_auto $i &
            PIDS+=($!)
        else
            run_code_auto $i
        fi
    done
fi

if [[ "$METHOD" == "cook" || "$METHOD" == "all" ]]; then
    echo ""
    echo "=== Running /cook --auto Benchmarks ==="
    for i in $(seq 1 $RUNS); do
        if $PARALLEL; then
            run_cook_auto $i &
            PIDS+=($!)
        else
            run_cook_auto $i
        fi
    done
fi

# Wait for parallel jobs
if $PARALLEL && [ ${#PIDS[@]} -gt 0 ]; then
    echo ""
    echo "Waiting for ${#PIDS[@]} parallel jobs..."
    for pid in "${PIDS[@]}"; do
        wait $pid || echo "Job $pid failed"
    done
    echo "All jobs complete"
fi

# Collect session IDs
echo ""
echo "=== Collecting Results ==="
cat "$LOG_DIR"/code-*-session.txt > "$LOG_DIR/code-sessions.txt" 2>/dev/null || true
cat "$LOG_DIR"/cook-*-session.txt > "$LOG_DIR/cook-sessions.txt" 2>/dev/null || true

# Run verification on each workspace
echo ""
echo "=== Running Verification ==="
for workspace in "$WORKSPACE_BASE"-*; do
    if [[ -d "$workspace" ]]; then
        echo "Verifying: $workspace"
        ~/.claude/skills/.venv/bin/python3 "$PROJECT_DIR/scripts/verify-greeting-feature-implementation.py" "$workspace" \
            > "$LOG_DIR/$(basename $workspace)-verify.json" 2>&1 || true
    fi
done

# Analyze results
echo ""
echo "=== Analyzing Results ==="
~/.claude/skills/.venv/bin/python3 "$PROJECT_DIR/scripts/analyze-orchestration-benchmark-code-auto-vs-cook-auto.py"

echo ""
echo "=============================================="
echo "Benchmark Complete"
echo "=============================================="
echo "Logs: $LOG_DIR"
echo "Reports: $PROJECT_DIR/plans/reports/"
