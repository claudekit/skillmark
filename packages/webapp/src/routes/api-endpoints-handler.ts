/**
 * API endpoints handler for Skillmark leaderboard
 */
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

export const apiRouter = new Hono<{ Bindings: Bindings }>();

/** Result submission payload */
interface ResultPayload {
  skillId: string;
  skillName: string;
  source: string;
  model: string;
  accuracy: number;
  tokensTotal: number;
  tokensInput?: number;
  tokensOutput?: number;
  durationMs: number;
  costUsd: number;
  toolCount?: number;
  runs: number;
  hash: string;
  timestamp: string;
  rawJson?: string;
  // New fields for GitHub OAuth + enhanced tracking
  testFiles?: Array<{ name: string; content: string }>;
  skillshLink?: string;
  /** Security benchmark score (0-100) */
  securityScore?: number;
  /** Full security breakdown JSON */
  securityJson?: string;
  /** Git repository URL (auto-detected from skill directory) */
  repoUrl?: string;
  /** Benchmark report markdown */
  reportMarkdown?: string;
  /** Trigger test score (0-100) */
  triggerScore?: number;
  /** Consistency metrics JSON */
  consistencyJson?: string;
  /** Baseline comparison JSON */
  baselineJson?: string;
}

/** API key info returned from verification */
interface ApiKeyInfo {
  githubUsername: string | null;
  githubAvatar: string | null;
}

/**
 * POST /api/results - Submit benchmark results
 */
apiRouter.post('/results', async (c) => {
  try {
    // Verify API key and get user info
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid API key' }, 401);
    }

    const apiKey = authHeader.slice(7);
    const keyInfo = await verifyApiKeyAndGetInfo(c.env.DB, apiKey);
    if (!keyInfo) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    // Parse payload
    const payload = await c.req.json<ResultPayload>();

    // Validate required fields
    if (!payload.skillId || !payload.skillName || !payload.model || !payload.hash) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Validate model
    if (!['haiku', 'sonnet', 'opus'].includes(payload.model)) {
      return c.json({ error: 'Invalid model' }, 400);
    }

    // Validate accuracy range
    if (payload.accuracy < 0 || payload.accuracy > 100) {
      return c.json({ error: 'Accuracy must be between 0 and 100' }, 400);
    }

    // Ensure skill exists
    await ensureSkillExists(c.env.DB, payload.skillId, payload.skillName, payload.source);

    // Insert result with new fields
    const resultId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO results (
        id, skill_id, model, accuracy, tokens_total, tokens_input, tokens_output,
        duration_ms, cost_usd, tool_count, runs, hash, raw_json,
        submitter_github, test_files, skillsh_link,
        security_score, security_json, repo_url, report_markdown,
        trigger_score, consistency_json, baseline_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      resultId,
      payload.skillId,
      payload.model,
      payload.accuracy,
      payload.tokensTotal,
      payload.tokensInput ?? null,
      payload.tokensOutput ?? null,
      payload.durationMs,
      payload.costUsd,
      payload.toolCount ?? null,
      payload.runs,
      payload.hash,
      payload.rawJson || null,
      keyInfo.githubUsername || null,
      payload.testFiles ? JSON.stringify(payload.testFiles) : null,
      payload.skillshLink || null,
      payload.securityScore ?? null,
      payload.securityJson || null,
      payload.repoUrl || null,
      payload.reportMarkdown || null,
      payload.triggerScore ?? null,
      payload.consistencyJson || null,
      payload.baselineJson || null
    ).run();

    // Update API key last used
    await updateApiKeyLastUsed(c.env.DB, apiKey);

    // Get rank
    const rank = await getSkillRank(c.env.DB, payload.skillId);

    return c.json({
      success: true,
      resultId,
      leaderboardUrl: `https://skillmark.sh/?skill=${encodeURIComponent(payload.skillName)}`,
      rank,
      submitter: keyInfo.githubUsername ? {
        github: keyInfo.githubUsername,
        avatar: keyInfo.githubAvatar,
      } : null,
    });
  } catch (error) {
    console.error('Error submitting result:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/leaderboard - Get skill rankings
 */
apiRouter.get('/leaderboard', async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const offset = parseInt(c.req.query('offset') || '0');

    const results = await c.env.DB.prepare(`
      SELECT
        skill_id as skillId,
        skill_name as skillName,
        source,
        best_accuracy as bestAccuracy,
        best_security as bestSecurity,
        best_trigger as bestTrigger,
        composite_score as compositeScore,
        best_model as bestModel,
        repo_url as repoUrl,
        avg_tokens as avgTokens,
        avg_cost as avgCost,
        last_tested as lastTested,
        total_runs as totalRuns
      FROM leaderboard
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    // Format timestamps
    const entries = results.results?.map((row: Record<string, unknown>) => ({
      ...row,
      lastTested: row.lastTested
        ? new Date((row.lastTested as number) * 1000).toISOString()
        : null,
    })) || [];

    return c.json({ entries });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/skill/:name - Get specific skill details
 */
apiRouter.get('/skill/:name', async (c) => {
  try {
    const skillName = decodeURIComponent(c.req.param('name'));

    // Get skill from leaderboard view
    const skill = await c.env.DB.prepare(`
      SELECT
        skill_id as skillId,
        skill_name as skillName,
        source,
        best_accuracy as bestAccuracy,
        best_security as bestSecurity,
        best_trigger as bestTrigger,
        composite_score as compositeScore,
        best_model as bestModel,
        repo_url as repoUrl,
        avg_tokens as avgTokens,
        avg_cost as avgCost,
        last_tested as lastTested,
        total_runs as totalRuns
      FROM leaderboard
      WHERE skill_name = ?
    `).bind(skillName).first();

    if (!skill) {
      return c.json({ error: 'Skill not found' }, 404);
    }

    // Get result history
    const history = await c.env.DB.prepare(`
      SELECT
        id,
        accuracy,
        model,
        tokens_total as tokensTotal,
        duration_ms as durationMs,
        cost_usd as costUsd,
        tool_count as toolCount,
        security_score as securityScore,
        trigger_score as triggerScore,
        consistency_json as consistencyJson,
        baseline_json as baselineJson,
        created_at as date
      FROM results
      WHERE skill_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(skill.skillId).all();

    const formattedHistory = history.results?.map((row: Record<string, unknown>) => ({
      id: row.id,
      accuracy: row.accuracy,
      model: row.model,
      tokensTotal: row.tokensTotal ?? null,
      durationMs: row.durationMs ?? null,
      costUsd: row.costUsd ?? null,
      toolCount: row.toolCount ?? null,
      securityScore: row.securityScore ?? null,
      triggerScore: row.triggerScore ?? null,
      consistencyJson: row.consistencyJson ?? null,
      baselineJson: row.baselineJson ?? null,
      date: row.date ? new Date((row.date as number) * 1000).toISOString() : null,
    })) || [];

    return c.json({
      ...skill,
      lastTested: skill.lastTested
        ? new Date((skill.lastTested as number) * 1000).toISOString()
        : null,
      history: formattedHistory,
    });
  } catch (error) {
    console.error('Error fetching skill:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/result/:id - Get full result detail (parsed raw_json)
 */
apiRouter.get('/result/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB.prepare(`
      SELECT raw_json FROM results WHERE id = ?
    `).bind(id).first();

    if (!result?.raw_json) {
      return c.json({ error: 'Result not found or no detailed data available' }, 404);
    }

    return c.json(JSON.parse(result.raw_json as string));
  } catch (error) {
    console.error('Error fetching result detail:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/result/:id/test-files - Get test files for a result
 */
apiRouter.get('/result/:id/test-files', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB.prepare(`
      SELECT test_files FROM results WHERE id = ?
    `).bind(id).first();

    if (!result?.test_files) {
      return c.json({ error: 'No test files available' }, 404);
    }

    return c.json({ files: JSON.parse(result.test_files as string) });
  } catch (error) {
    console.error('Error fetching test files:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/result/:id/report - Get benchmark report for a result
 */
apiRouter.get('/result/:id/report', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB.prepare(`
      SELECT report_markdown FROM results WHERE id = ?
    `).bind(id).first();

    if (!result?.report_markdown) {
      return c.json({ error: 'Report not available' }, 404);
    }

    return c.json({ markdown: result.report_markdown });
  } catch (error) {
    console.error('Error fetching report:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/verify - Verify API key
 */
apiRouter.post('/verify', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ valid: false }, 401);
    }

    const apiKey = authHeader.slice(7);
    const isValid = await verifyApiKey(c.env.DB, apiKey);

    return c.json({ valid: isValid });
  } catch (error) {
    return c.json({ valid: false }, 500);
  }
});

/**
 * Verify API key against database
 */
async function verifyApiKey(db: D1Database, apiKey: string): Promise<boolean> {
  const keyHash = await hashApiKey(apiKey);

  const result = await db.prepare(`
    SELECT id FROM api_keys WHERE key_hash = ?
  `).bind(keyHash).first();

  return result !== null;
}

/**
 * Verify API key and return associated user info
 */
async function verifyApiKeyAndGetInfo(db: D1Database, apiKey: string): Promise<ApiKeyInfo | null> {
  const keyHash = await hashApiKey(apiKey);

  const result = await db.prepare(`
    SELECT github_username, github_avatar FROM api_keys WHERE key_hash = ?
  `).bind(keyHash).first();

  if (!result) {
    return null;
  }

  return {
    githubUsername: result.github_username as string | null,
    githubAvatar: result.github_avatar as string | null,
  };
}

/**
 * Update API key last used timestamp
 */
async function updateApiKeyLastUsed(db: D1Database, apiKey: string): Promise<void> {
  const keyHash = await hashApiKey(apiKey);

  await db.prepare(`
    UPDATE api_keys SET last_used_at = unixepoch() WHERE key_hash = ?
  `).bind(keyHash).run();
}

/**
 * Hash API key for storage using Web Crypto API
 */
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Ensure skill exists in database
 */
async function ensureSkillExists(
  db: D1Database,
  skillId: string,
  skillName: string,
  source: string
): Promise<void> {
  const existing = await db.prepare(`
    SELECT id FROM skills WHERE id = ?
  `).bind(skillId).first();

  if (!existing) {
    await db.prepare(`
      INSERT INTO skills (id, name, source) VALUES (?, ?, ?)
    `).bind(skillId, skillName, source).run();
  }
}

/**
 * Get skill rank in leaderboard
 */
async function getSkillRank(db: D1Database, skillId: string): Promise<number | null> {
  const result = await db.prepare(`
    SELECT COUNT(*) + 1 as rank
    FROM leaderboard
    WHERE composite_score > (
      SELECT composite_score FROM leaderboard WHERE skill_id = ?
    )
  `).bind(skillId).first();

  return result?.rank as number || null;
}
