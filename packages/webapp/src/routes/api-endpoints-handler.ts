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
}

/**
 * POST /api/results - Submit benchmark results
 */
apiRouter.post('/results', async (c) => {
  try {
    // Verify API key
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid API key' }, 401);
    }

    const apiKey = authHeader.slice(7);
    const isValid = await verifyApiKey(c.env.DB, apiKey);
    if (!isValid) {
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

    // Insert result
    const resultId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO results (
        id, skill_id, model, accuracy, tokens_total, tokens_input, tokens_output,
        duration_ms, cost_usd, tool_count, runs, hash, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      resultId,
      payload.skillId,
      payload.model,
      payload.accuracy,
      payload.tokensTotal,
      payload.tokensInput || null,
      payload.tokensOutput || null,
      payload.durationMs,
      payload.costUsd,
      payload.toolCount || null,
      payload.runs,
      payload.hash,
      payload.rawJson || null
    ).run();

    // Update API key last used
    await updateApiKeyLastUsed(c.env.DB, apiKey);

    // Get rank
    const rank = await getSkillRank(c.env.DB, payload.skillId);

    return c.json({
      success: true,
      resultId,
      leaderboardUrl: `https://skillmark.workers.dev/?skill=${encodeURIComponent(payload.skillName)}`,
      rank,
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
        best_model as bestModel,
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
        best_model as bestModel,
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
        accuracy,
        model,
        created_at as date
      FROM results
      WHERE skill_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(skill.skillId).all();

    const formattedHistory = history.results?.map((row: Record<string, unknown>) => ({
      accuracy: row.accuracy,
      model: row.model,
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
    WHERE best_accuracy > (
      SELECT best_accuracy FROM leaderboard WHERE skill_id = ?
    )
  `).bind(skillId).first();

  return result?.rank as number || null;
}
