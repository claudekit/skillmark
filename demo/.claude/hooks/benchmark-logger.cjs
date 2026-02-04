#!/usr/bin/env node
/**
 * Benchmark Logger - Tracks tool usage, tokens, and timing
 * Hooks: PreToolUse, PostToolUse
 * Output: /tmp/ck-benchmark/{session-id}.jsonl
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = '/tmp/ck-benchmark';

function log(sessionId, event) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const line = JSON.stringify({ ...event, ts: Date.now() }) + '\n';
  fs.appendFileSync(path.join(LOG_DIR, `${sessionId}.jsonl`), line);
}

async function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf-8'));
  const sid = input.session_id || 'default';

  // Log tool invocation
  if (input.tool_name) {
    log(sid, {
      event: 'tool',
      tool: input.tool_name,
      input_size: JSON.stringify(input.tool_input || {}).length
    });
  }

  // Log token counts (from context data if available)
  if (input.context) {
    log(sid, {
      event: 'tokens',
      input: input.context.input || 0,
      output: input.context.output || 0,
      total: (input.context.input || 0) + (input.context.output || 0)
    });
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => console.log(JSON.stringify({ continue: true })));
