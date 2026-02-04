#!/bin/bash
# Benchmark runner for Skills vs Commands comparison
# Usage: ./run-benchmark.sh [skill|command|all] [runs] [--parallel] [--model haiku|sonnet|opus]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="/tmp/ck-benchmark"
WORKSPACE_BASE="/tmp/bench"

METHOD="${1:-all}"
RUNS="${2:-3}"
PARALLEL=false
MODEL=""

# Parse flags
while [[ $# -gt 0 ]]; do
    case "$1" in
        --parallel) PARALLEL=true; shift ;;
        --model) MODEL="$2"; shift 2 ;;
        *) shift ;;
    esac
done

# Build model flag if specified
MODEL_FLAG=""
if [[ -n "$MODEL" ]]; then
    MODEL_FLAG="--model $MODEL"
fi

echo "=== Benchmark: Skills vs Commands ==="
echo "Method: $METHOD"
echo "Runs per method: $RUNS"
echo "Parallel: $PARALLEL"
echo "Model: ${MODEL:-default}"
echo "Project: $PROJECT_DIR"
echo ""

# Clean previous logs
rm -rf "$LOG_DIR"
mkdir -p "$LOG_DIR"

# Save model name for analysis
echo "${MODEL:-default}" > "$LOG_DIR/model.txt"

run_skill() {
    local run_num=$1
    local workspace="$WORKSPACE_BASE-skill-$run_num"
    local session_id=$(uuidgen | tr '[:upper:]' '[:lower:]')

    echo "[Skill $run_num] Starting... Session: $session_id"
    rm -rf "$workspace"
    mkdir -p "$workspace"

    # Run Claude with skill activation (non-interactive, bypass permissions)
    cd "$PROJECT_DIR"
    claude --print --session-id "$session_id" --dangerously-skip-permissions $MODEL_FLAG \
        "Activate benchmark-fileops skill. Workspace: $workspace" \
        > "$LOG_DIR/skill-$run_num-output.log" 2>&1

    # Save session ID (atomic write to individual file)
    echo "$session_id" > "$LOG_DIR/skill-$run_num-session.txt"

    echo "[Skill $run_num] Complete"
}

run_command() {
    local run_num=$1
    local workspace="$WORKSPACE_BASE-cmd-$run_num"
    local session_id=$(uuidgen | tr '[:upper:]' '[:lower:]')

    echo "[Command $run_num] Starting... Session: $session_id"
    rm -rf "$workspace"
    mkdir -p "$workspace"

    # Run Claude with command (non-interactive, bypass permissions)
    cd "$PROJECT_DIR"
    claude --print --session-id "$session_id" --dangerously-skip-permissions $MODEL_FLAG \
        "/benchmark-fileops $workspace" \
        > "$LOG_DIR/cmd-$run_num-output.log" 2>&1

    # Save session ID (atomic write to individual file)
    echo "$session_id" > "$LOG_DIR/cmd-$run_num-session.txt"

    echo "[Command $run_num] Complete"
}

# Collect session IDs after runs complete
collect_sessions() {
    # Merge individual session files into combined file
    cat "$LOG_DIR"/skill-*-session.txt > "$LOG_DIR/skill-sessions.txt" 2>/dev/null || true
    cat "$LOG_DIR"/cmd-*-session.txt > "$LOG_DIR/cmd-sessions.txt" 2>/dev/null || true
}

# Run benchmarks
PIDS=()

if [[ "$METHOD" == "skill" || "$METHOD" == "all" ]]; then
    echo "=== Running Skill Benchmarks ==="
    for i in $(seq 1 $RUNS); do
        if $PARALLEL; then
            run_skill $i &
            PIDS+=($!)
        else
            run_skill $i
        fi
    done
fi

if [[ "$METHOD" == "command" || "$METHOD" == "all" ]]; then
    echo "=== Running Command Benchmarks ==="
    for i in $(seq 1 $RUNS); do
        if $PARALLEL; then
            run_command $i &
            PIDS+=($!)
        else
            run_command $i
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

# Collect sessions and analyze
collect_sessions

echo ""
echo "=== Analyzing Results ==="
~/.claude/skills/.venv/bin/python3 "$PROJECT_DIR/scripts/analyze-benchmark-results.py"

echo ""
echo "=== Benchmark Complete ==="
echo "Logs: $LOG_DIR"
echo "Report: $PROJECT_DIR/plans/reports/"
