/**
 * GitHub OAuth authentication handler for Skillmark
 * Handles login flow, session management, and API key generation
 */
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

type Bindings = {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  ENVIRONMENT: string;
};

type Variables = {
  user?: UserSession;
};

interface UserSession {
  id: string;
  githubId: number;
  githubUsername: string;
  githubAvatar: string | null;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  avatar_url: string;
  email: string | null;
}

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export const authRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const SESSION_COOKIE = 'skillmark_session';
const SESSION_DURATION_DAYS = 30;

/**
 * GET /auth/github - Redirect to GitHub OAuth
 */
authRouter.get('/github', (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const baseUrl = getBaseUrl(c.req.url, c.env.ENVIRONMENT);
  const redirectUri = `${baseUrl}/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state: generateState(),
  });

  return c.redirect(`${GITHUB_OAUTH_URL}?${params.toString()}`);
});

/**
 * GET /auth/github/callback - Handle OAuth callback
 */
authRouter.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');

  if (error || !code) {
    return c.redirect('/login?error=oauth_failed');
  }

  try {
    const baseUrl = getBaseUrl(c.req.url, c.env.ENVIRONMENT);

    // Exchange code for access token
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: c.env.GITHUB_CLIENT_ID,
        client_secret: c.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${baseUrl}/auth/github/callback`,
      }),
    });

    const tokenData = await tokenResponse.json() as GitHubTokenResponse;

    if (!tokenData.access_token) {
      console.error('Failed to get access token:', tokenData);
      return c.redirect('/login?error=token_failed');
    }

    // Fetch user profile
    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Skillmark-OAuth',
      },
    });

    const githubUser = await userResponse.json() as GitHubUserResponse;

    // Create or update user in database
    const userId = await upsertUser(c.env.DB, githubUser);

    // Create session
    const sessionId = await createSession(c.env.DB, userId);

    // Set session cookie
    setCookie(c, SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: c.env.ENVIRONMENT === 'production',
      sameSite: 'Lax',
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
      path: '/',
    });

    return c.redirect('/dashboard');
  } catch (err) {
    console.error('OAuth callback error:', err);
    return c.redirect('/login?error=oauth_failed');
  }
});

/**
 * GET /auth/logout - Clear session and redirect
 */
authRouter.get('/logout', async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE);

  if (sessionId) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  }

  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.redirect('/');
});

/**
 * GET /api/me - Get current user info
 */
authRouter.get('/me', async (c) => {
  const user = await getCurrentUser(c);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  return c.json({
    id: user.id,
    githubUsername: user.githubUsername,
    githubAvatar: user.githubAvatar,
  });
});

/**
 * POST /api/keys - Generate new API key
 */
authRouter.post('/keys', async (c) => {
  const user = await getCurrentUser(c);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Generate new API key
  const apiKey = generateApiKey();
  const keyHash = await hashApiKey(apiKey);
  const keyId = crypto.randomUUID();

  // Store key with user info
  await c.env.DB.prepare(`
    INSERT INTO api_keys (id, key_hash, user_name, github_username, github_avatar, github_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    keyId,
    keyHash,
    user.githubUsername,
    user.githubUsername,
    user.githubAvatar,
    user.githubId
  ).run();

  return c.json({
    apiKey,
    keyId,
    message: 'API key generated. Store it securely - it cannot be retrieved again.',
  });
});

/**
 * GET /api/keys - List user's API keys (without revealing the key)
 */
authRouter.get('/keys', async (c) => {
  const user = await getCurrentUser(c);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const keys = await c.env.DB.prepare(`
    SELECT id, created_at, last_used_at
    FROM api_keys
    WHERE github_id = ?
    ORDER BY created_at DESC
  `).bind(user.githubId).all();

  const formattedKeys = keys.results?.map((key: Record<string, unknown>) => ({
    id: key.id,
    createdAt: key.created_at ? new Date((key.created_at as number) * 1000).toISOString() : null,
    lastUsedAt: key.last_used_at ? new Date((key.last_used_at as number) * 1000).toISOString() : null,
  })) || [];

  return c.json({ keys: formattedKeys });
});

/**
 * DELETE /api/keys/:id - Revoke an API key
 */
authRouter.delete('/keys/:id', async (c) => {
  const user = await getCurrentUser(c);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const keyId = c.req.param('id');

  // Verify key belongs to user
  const key = await c.env.DB.prepare(`
    SELECT id FROM api_keys WHERE id = ? AND github_id = ?
  `).bind(keyId, user.githubId).first();

  if (!key) {
    return c.json({ error: 'Key not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM api_keys WHERE id = ?').bind(keyId).run();

  return c.json({ success: true });
});

/**
 * POST /api/verify - Verify API key and return user info (for CLI)
 */
authRouter.post('/verify-key', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ valid: false }, 401);
  }

  const apiKey = authHeader.slice(7);
  const keyHash = await hashApiKey(apiKey);

  const keyRecord = await c.env.DB.prepare(`
    SELECT github_username, github_avatar, github_id
    FROM api_keys
    WHERE key_hash = ?
  `).bind(keyHash).first();

  if (!keyRecord) {
    return c.json({ valid: false }, 401);
  }

  // Update last used
  await c.env.DB.prepare(`
    UPDATE api_keys SET last_used_at = unixepoch() WHERE key_hash = ?
  `).bind(keyHash).run();

  return c.json({
    valid: true,
    user: {
      githubUsername: keyRecord.github_username,
      githubAvatar: keyRecord.github_avatar,
    },
  });
});

/**
 * Helper: Get current user from session cookie
 */
async function getCurrentUser(c: { req: { header: (name: string) => string | undefined }; env: Bindings }): Promise<UserSession | null> {
  // Get session ID from cookie using raw header
  const cookieHeader = c.req.header('Cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies[SESSION_COOKIE];

  if (!sessionId) {
    return null;
  }

  const session = await c.env.DB.prepare(`
    SELECT u.id, u.github_id, u.github_username, u.github_avatar
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > unixepoch()
  `).bind(sessionId).first();

  if (!session) {
    return null;
  }

  return {
    id: session.id as string,
    githubId: session.github_id as number,
    githubUsername: session.github_username as string,
    githubAvatar: session.github_avatar as string | null,
  };
}

/**
 * Helper: Parse cookies from header
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      cookies[name] = rest.join('=');
    }
  });
  return cookies;
}

/**
 * Helper: Create or update user
 */
async function upsertUser(db: D1Database, githubUser: GitHubUserResponse): Promise<string> {
  const existingUser = await db.prepare(`
    SELECT id FROM users WHERE github_id = ?
  `).bind(githubUser.id).first();

  if (existingUser) {
    // Update existing user
    await db.prepare(`
      UPDATE users
      SET github_username = ?, github_avatar = ?, github_email = ?, updated_at = unixepoch()
      WHERE github_id = ?
    `).bind(
      githubUser.login,
      githubUser.avatar_url,
      githubUser.email,
      githubUser.id
    ).run();
    return existingUser.id as string;
  }

  // Create new user
  const userId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO users (id, github_id, github_username, github_avatar, github_email)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    userId,
    githubUser.id,
    githubUser.login,
    githubUser.avatar_url,
    githubUser.email
  ).run();

  return userId;
}

/**
 * Helper: Create session
 */
async function createSession(db: D1Database, userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_DAYS * 24 * 60 * 60;

  await db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(sessionId, userId, expiresAt).run();

  return sessionId;
}

/**
 * Helper: Generate random API key
 */
function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return 'sk_' + Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Helper: Hash API key
 */
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Helper: Generate state for CSRF protection
 */
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Helper: Get base URL based on environment
 */
function getBaseUrl(requestUrl: string, environment: string): string {
  const url = new URL(requestUrl);
  if (environment === 'production') {
    return 'https://skillmark.workers.dev';
  }
  return `${url.protocol}//${url.host}`;
}
