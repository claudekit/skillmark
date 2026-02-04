#!/usr/bin/env node
/**
 * Capture final token counts at session end
 * Hook: Stop
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = '/tmp/ck-benchmark';

async function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf-8'));
  const sid = input.session_id || 'default';

  // Final snapshot
  const logPath = path.join(LOG_DIR, `${sid}.jsonl`);
  if (fs.existsSync(logPath)) {
    const line = JSON.stringify({
      event: 'session_end',
      ts: Date.now(),
      context_input: input.context?.input || 0,
      context_output: input.context?.output || 0
    }) + '\n';
    fs.appendFileSync(logPath, line);
  }

  console.log(JSON.stringify({}));
}

main().catch(() => console.log(JSON.stringify({})));
