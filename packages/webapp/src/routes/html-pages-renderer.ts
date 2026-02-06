/**
 * HTML pages renderer for Skillmark leaderboard UI
 * Design: Vercel/skills.sh inspired - pure black, minimal, clean typography
 */
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

export const pagesRouter = new Hono<{ Bindings: Bindings }>();

/** Leaderboard entry from database */
interface LeaderboardRow {
  skillId: string;
  skillName: string;
  source: string;
  bestAccuracy: number;
  bestSecurity: number | null;
  compositeScore: number | null;
  bestModel: string;
  avgTokens: number;
  avgCost: number;
  lastTested: number;
  totalRuns: number;
  submitterGithub?: string;
  skillshLink?: string;
}

/**
 * GET / - Leaderboard homepage
 */
pagesRouter.get('/', async (c) => {
  try {
    // Get current user from session
    const cookieHeader = c.req.header('Cookie') || '';
    const currentUser = await getCurrentUser(c.env.DB, cookieHeader);

    // Get leaderboard with latest submitter info
    const results = await c.env.DB.prepare(`
      SELECT
        l.skill_id as skillId,
        l.skill_name as skillName,
        l.source,
        l.best_accuracy as bestAccuracy,
        l.best_security as bestSecurity,
        l.composite_score as compositeScore,
        l.best_model as bestModel,
        l.avg_tokens as avgTokens,
        l.avg_cost as avgCost,
        l.last_tested as lastTested,
        l.total_runs as totalRuns,
        (SELECT submitter_github FROM results WHERE skill_id = l.skill_id ORDER BY created_at DESC LIMIT 1) as submitterGithub,
        (SELECT skillsh_link FROM results WHERE skill_id = l.skill_id AND skillsh_link IS NOT NULL ORDER BY created_at DESC LIMIT 1) as skillshLink
      FROM leaderboard l
      LIMIT 50
    `).all();

    const entries = (results.results || []) as unknown as LeaderboardRow[];

    return c.html(renderLeaderboardPage(entries, currentUser));
  } catch (error) {
    console.error('Error rendering leaderboard:', error);
    return c.html(renderErrorPage('Failed to load leaderboard'));
  }
});

/**
 * GET /docs - Getting Started page
 */
pagesRouter.get('/docs', (c) => {
  return c.html(renderDocsPage());
});

/**
 * GET /how-it-works - How it works page
 */
pagesRouter.get('/how-it-works', (c) => {
  return c.html(renderHowItWorksPage());
});

/**
 * GET /skill/:name - Skill detail page
 */
pagesRouter.get('/skill/:name', async (c) => {
  try {
    const skillName = decodeURIComponent(c.req.param('name'));

    // Get skill details with latest submitter
    const skill = await c.env.DB.prepare(`
      SELECT
        l.skill_id as skillId,
        l.skill_name as skillName,
        l.source,
        l.best_accuracy as bestAccuracy,
        l.best_security as bestSecurity,
        l.composite_score as compositeScore,
        l.best_model as bestModel,
        l.avg_tokens as avgTokens,
        l.avg_cost as avgCost,
        l.last_tested as lastTested,
        l.total_runs as totalRuns
      FROM leaderboard l
      WHERE l.skill_name = ?
    `).bind(skillName).first();

    if (!skill) {
      return c.html(renderErrorPage('Skill not found'), 404);
    }

    // Get recent results with submitter info
    const results = await c.env.DB.prepare(`
      SELECT
        r.accuracy,
        r.model,
        r.tokens_total as tokensTotal,
        r.cost_usd as costUsd,
        r.security_score as securityScore,
        r.created_at as createdAt,
        r.submitter_github as submitterGithub,
        r.skillsh_link as skillshLink,
        r.test_files as testFiles
      FROM results r
      WHERE r.skill_id = ?
      ORDER BY r.created_at DESC
      LIMIT 20
    `).bind(skill.skillId).all();

    const formattedResults = results.results?.map((r: Record<string, unknown>) => ({
      accuracy: r.accuracy,
      model: r.model,
      tokensTotal: r.tokensTotal,
      costUsd: r.costUsd,
      securityScore: r.securityScore ?? null,
      createdAt: r.createdAt ? new Date((r.createdAt as number) * 1000).toISOString() : null,
      submitterGithub: r.submitterGithub,
      skillshLink: r.skillshLink,
      testFiles: r.testFiles ? JSON.parse(r.testFiles as string) : null,
    })) || [];

    return c.html(renderSkillDetailPage(skill as unknown as LeaderboardRow, formattedResults));
  } catch (error) {
    console.error('Error rendering skill page:', error);
    return c.html(renderErrorPage('Failed to load skill details'));
  }
});

/**
 * GET /login - Login page with GitHub OAuth
 */
pagesRouter.get('/login', (c) => {
  const error = c.req.query('error');
  return c.html(renderLoginPage(error));
});

/**
 * GET /dashboard - User dashboard with API key management
 */
pagesRouter.get('/dashboard', async (c) => {
  // Check if user is logged in via cookie
  const cookieHeader = c.req.header('Cookie') || '';
  const sessionId = parseCookie(cookieHeader, 'skillmark_session');

  if (!sessionId) {
    return c.redirect('/login');
  }

  // Get user from session
  const session = await c.env.DB.prepare(`
    SELECT u.id, u.github_username, u.github_avatar
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > unixepoch()
  `).bind(sessionId).first();

  if (!session) {
    return c.redirect('/login');
  }

  // Get user's API keys
  const keys = await c.env.DB.prepare(`
    SELECT id, created_at, last_used_at
    FROM api_keys
    WHERE github_username = ?
    ORDER BY created_at DESC
  `).bind(session.github_username).all();

  const formattedKeys = keys.results?.map((key: Record<string, unknown>) => ({
    id: key.id,
    createdAt: key.created_at ? new Date((key.created_at as number) * 1000).toISOString() : null,
    lastUsedAt: key.last_used_at ? new Date((key.last_used_at as number) * 1000).toISOString() : null,
  })) || [];

  return c.html(renderDashboardPage({
    username: session.github_username as string,
    avatar: session.github_avatar as string | null,
    keys: formattedKeys,
  }));
});

/** Current user info for nav */
interface CurrentUser {
  username: string;
  avatar: string | null;
}

/**
 * Helper: Parse specific cookie from header
 */
function parseCookie(cookieHeader: string, name: string): string | null {
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [cookieName, ...rest] = cookie.trim().split('=');
    if (cookieName === name) {
      return rest.join('=');
    }
  }
  return null;
}

/**
 * Helper: Get current user from session cookie
 */
async function getCurrentUser(db: D1Database, cookieHeader: string): Promise<CurrentUser | null> {
  const sessionId = parseCookie(cookieHeader, 'skillmark_session');
  if (!sessionId) return null;

  const session = await db.prepare(`
    SELECT u.github_username, u.github_avatar
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > unixepoch()
  `).bind(sessionId).first();

  if (!session) return null;

  return {
    username: session.github_username as string,
    avatar: session.github_avatar as string | null,
  };
}

/**
 * Helper: Render nav with optional user info
 */
function renderNav(currentUser: CurrentUser | null): string {
  const userSection = currentUser
    ? `<a href="/dashboard" class="user-nav">
        <img src="${currentUser.avatar || `https://github.com/${currentUser.username}.png?size=32`}" alt="" class="user-avatar">
        <span>@${escapeHtml(currentUser.username)}</span>
      </a>`
    : `<a href="/login">Login</a>`;

  return `
  <nav>
    <div class="nav-left">
      <a href="/" class="nav-home">
        <svg class="nav-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        <span class="nav-divider">/</span>
        <span class="nav-title">Skillmark</span>
      </a>
    </div>
    <div class="nav-right">
      <a href="/docs">Docs</a>
      <a href="/how-it-works">How It Works</a>
      <a href="https://github.com/claudekit/skillmark" title="GitHub"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></a>
      ${userSection}
    </div>
  </nav>`;
}

/**
 * Render the leaderboard HTML page - Vercel/skills.sh style
 */
function renderLeaderboardPage(entries: LeaderboardRow[], currentUser: CurrentUser | null = null): string {
  const totalRuns = entries.reduce((sum, e) => sum + e.totalRuns, 0);

  const rows = entries.map((entry, index) => {
    const rank = index + 1;
    const accuracy = entry.bestAccuracy.toFixed(1);
    const security = entry.bestSecurity != null ? `${entry.bestSecurity.toFixed(0)}%` : '\u2014';
    const composite = entry.compositeScore != null ? `${entry.compositeScore.toFixed(1)}%` : '\u2014';
    const securityWarning = entry.bestSecurity != null && entry.bestSecurity < 50
      ? '<span class="security-warning" title="Low security score">\u25CF</span> '
      : '';
    const source = entry.source || '';
    const repoPath = source.replace('https://github.com/', '').replace(/\.git$/, '');
    const submitter = entry.submitterGithub;
    const skillshLink = entry.skillshLink;

    return `
      <tr onclick="window.location='/skill/${encodeURIComponent(entry.skillName)}'" style="cursor: pointer;">
        <td class="rank">${rank}</td>
        <td class="skill">
          <div class="skill-info">
            <span class="skill-name">${escapeHtml(entry.skillName)}</span>
            ${repoPath ? `<span class="skill-repo">${escapeHtml(repoPath)}</span>` : ''}
            ${skillshLink ? `<a href="${escapeHtml(skillshLink)}" class="skillsh-link" onclick="event.stopPropagation()">skill.sh</a>` : ''}
          </div>
        </td>
        <td class="submitter">
          ${submitter ? `
            <a href="https://github.com/${escapeHtml(submitter)}" class="submitter-link" onclick="event.stopPropagation()">
              <img src="https://github.com/${escapeHtml(submitter)}.png?size=24" alt="" class="submitter-avatar">
              <span>@${escapeHtml(submitter)}</span>
            </a>
          ` : '<span class="no-submitter">-</span>'}
        </td>
        <td class="security">${securityWarning}${security}</td>
        <td class="composite">${composite}</td>
        <td class="accuracy">${accuracy}%</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skillmark - Agent Skill Benchmarks</title>
  <meta name="description" content="The open agent skill benchmarking platform. Test and compare AI agent skills with detailed metrics.">

  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/favicon.png">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://skillmark.sh/">
  <meta property="og:title" content="Skillmark - Agent Skill Benchmarks">
  <meta property="og:description" content="Benchmark your AI agent skills with detailed metrics. Compare accuracy, token usage, and cost across models.">
  <meta property="og:image" content="https://cdn.claudekit.cc/skillmark/og-image.png">
  <meta property="og:site_name" content="Skillmark">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://skillmark.sh/">
  <meta name="twitter:title" content="Skillmark - Agent Skill Benchmarks">
  <meta name="twitter:description" content="Benchmark your AI agent skills with detailed metrics. Compare accuracy, token usage, and cost across models.">
  <meta name="twitter:image" content="https://cdn.claudekit.cc/skillmark/og-image.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --bg: #000;
      --text: #ededed;
      --text-secondary: #888;
      --border: #333;
      --hover: #111;
    }

    body {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }

    /* Navigation */
    nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .nav-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .nav-logo {
      font-size: 1.25rem;
    }

    .nav-divider {
      color: var(--text-secondary);
      margin: 0 0.25rem;
    }

    .nav-title {
      font-weight: 500;
    }

    .nav-right {
      display: flex;
      gap: 1.5rem;
    }

    .nav-right a {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
    }

    .nav-right a:hover {
      color: var(--text);
    }

    .user-nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .user-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
    }

    .nav-home {
      display: flex;
      align-items: center;
      text-decoration: none;
      color: inherit;
    }

    /* Main container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 4rem 1.5rem;
    }

    /* Hero section */
    .hero {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem;
      margin-bottom: 4rem;
      align-items: start;
    }

    .hero-left {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .logo-text {
      font-family: 'Geist Mono', monospace;
      font-size: 4rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .logo-subtitle {
      font-size: 0.75rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .hero-right p {
      font-size: 1.5rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* Install section */
    .install-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem;
      margin-bottom: 5rem;
    }

    .install-box h3 {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-bottom: 1rem;
    }

    .install-command {
      display: flex;
      align-items: center;
      background: #0a0a0a;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.875rem 1rem;
      font-family: 'Geist Mono', monospace;
      font-size: 0.875rem;
    }

    .install-command .dollar {
      color: var(--text-secondary);
      margin-right: 0.5rem;
      user-select: none;
    }

    .install-command code {
      flex: 1;
    }

    .install-command .copy-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.25rem;
    }

    .install-command .copy-btn:hover {
      color: var(--text);
    }

    .agents-list {
      display: flex;
      gap: 1.5rem;
      align-items: center;
    }

    .agent-icon {
      width: 32px;
      height: 32px;
      opacity: 0.6;
    }

    .agent-icon:hover {
      opacity: 1;
    }

    /* Leaderboard section */
    .leaderboard-section h2 {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }

    /* Search bar */
    .search-container {
      position: relative;
      margin-bottom: 1.5rem;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
    }

    .search-input {
      width: 100%;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.875rem 1rem 0.875rem 2.75rem;
      font-family: 'Geist Mono', monospace;
      font-size: 0.875rem;
      color: var(--text);
      outline: none;
    }

    .search-input::placeholder {
      color: var(--text-secondary);
    }

    .search-input:focus {
      border-color: #555;
    }

    .search-shortcut {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      font-family: 'Geist Mono', monospace;
      font-size: 0.75rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.125rem 0.375rem;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
    }

    .tab {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-family: inherit;
      font-size: 0.875rem;
      cursor: pointer;
      padding: 0;
    }

    .tab:hover {
      color: var(--text);
    }

    .tab.active {
      color: var(--text);
      text-decoration: underline;
      text-underline-offset: 0.5rem;
    }

    .tab-count {
      color: var(--text-secondary);
    }

    /* Table */
    .leaderboard-table {
      width: 100%;
      border-collapse: collapse;
    }

    .leaderboard-table th {
      text-align: left;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-secondary);
      font-weight: 500;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
    }

    .leaderboard-table th:last-child {
      text-align: right;
    }

    .leaderboard-table td {
      padding: 1rem 0;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }

    .leaderboard-table tr:hover td {
      background: var(--hover);
    }

    .rank {
      width: 50px;
      color: var(--text-secondary);
      font-family: 'Geist Mono', monospace;
    }

    .skill {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .skill-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .skill-name {
      font-weight: 500;
    }

    .skill-repo {
      font-family: 'Geist Mono', monospace;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .skillsh-link {
      font-size: 0.75rem;
      color: #58a6ff;
      text-decoration: none;
    }

    .skillsh-link:hover {
      text-decoration: underline;
    }

    .submitter {
      width: 150px;
    }

    .submitter-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.8125rem;
    }

    .submitter-link:hover {
      color: var(--text);
    }

    .submitter-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }

    .no-submitter {
      color: var(--text-secondary);
    }

    .accuracy {
      text-align: right;
      font-family: 'Geist Mono', monospace;
      font-weight: 500;
    }

    .security {
      text-align: right;
      font-family: 'Geist Mono', monospace;
      color: var(--text-secondary);
    }

    .composite {
      text-align: right;
      font-family: 'Geist Mono', monospace;
      font-weight: 500;
    }

    .security-warning {
      color: #d29922;
      font-size: 0.625rem;
    }

    .security-banner {
      background: rgba(210, 153, 34, 0.1);
      border: 1px solid rgba(210, 153, 34, 0.3);
      color: #d29922;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-secondary);
    }

    .empty-state p {
      margin-bottom: 2rem;
    }

    .empty-cta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .empty-cta code {
      background: #0a0a0a;
      border: 1px solid var(--border);
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      font-family: 'Geist Mono', monospace;
      font-size: 0.875rem;
    }

    /* Footer */
    footer {
      margin-top: 4rem;
      padding: 2rem 0;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--text-secondary);
      font-size: 0.8125rem;
    }

    footer a {
      color: var(--text);
      text-decoration: none;
    }

    footer a:hover {
      text-decoration: underline;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .hero {
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      .logo-text {
        font-size: 2.5rem;
      }

      .hero-right p {
        font-size: 1.125rem;
      }

      .install-section {
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      .agents-list {
        flex-wrap: wrap;
      }
    }
  </style>
</head>
<body>
  ${renderNav(currentUser)}

  <div class="container">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-left">
        <div>
          <div class="logo-text">SKILLMARK</div>
          <div class="logo-subtitle">The Agent Skill Benchmarking Platform</div>
        </div>
      </div>
      <div class="hero-right">
        <p>Benchmark your AI agent skills with detailed metrics. Compare accuracy, token usage, and cost across models.</p>
      </div>
    </section>

    <!-- Install -->
    <section class="install-section">
      <div class="install-box">
        <h3>Install in One Command</h3>
        <div class="install-command">
          <span class="dollar">$</span>
          <code>npx skillmark run &lt;skill-path&gt;</code>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('npx skillmark run')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="install-box">
        <h3>Compatible with These Agents</h3>
        <div class="agents-list">
          <svg class="agent-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          <svg class="agent-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          <svg class="agent-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6zm10 0h2v2h-2zm-6-4h8v2h-8z"/></svg>
          <svg class="agent-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        </div>
      </div>
    </section>

    <!-- Leaderboard -->
    <section class="leaderboard-section">
      <h2>Skills Leaderboard</h2>

      <div class="search-container">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="search-input" placeholder="Search skills..." id="search">
        <span class="search-shortcut">/</span>
      </div>

      <div class="tabs">
        <button class="tab active">All Time <span class="tab-count">(${entries.length.toLocaleString()})</span></button>
        <button class="tab">By Accuracy</button>
        <button class="tab">By Tokens</button>
        <button class="tab">By Cost</button>
      </div>

      ${entries.length > 0 ? `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Skill</th>
            <th>Submitter</th>
            <th>Security</th>
            <th>Composite</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      ` : `
      <div class="empty-state">
        <p>No benchmark results yet.</p>
        <div class="empty-cta">
          <code>npx skillmark run &lt;skill-path&gt;</code>
          <code>npx skillmark publish ./result.json --api-key &lt;key&gt;</code>
        </div>
      </div>
      `}
    </section>

    <footer>
      <p>
        Built with <a href="https://github.com/claudekit/skillmark">Skillmark</a> ·
        <a href="https://www.npmjs.com/package/skillmark">npm</a> ·
        <a href="https://github.com/claudekit/skillmark">GitHub</a> ·
        by <a href="https://claudekit.cc">ClaudeKit.cc</a>
      </p>
    </footer>
  </div>

  <script>
    // Keyboard shortcut for search
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('search').focus();
      }
    });

    // Search functionality
    document.getElementById('search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.leaderboard-table tbody tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Render error page - Vercel style
 */
function renderErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - Skillmark</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Geist', -apple-system, sans-serif;
      background: #000;
      color: #ededed;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    .error {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    p { color: #888; margin-bottom: 1.5rem; }
    a {
      color: #ededed;
      text-decoration: underline;
      text-underline-offset: 4px;
    }
  </style>
</head>
<body>
  <div class="error">
    <h1>Something went wrong</h1>
    <p>${escapeHtml(message)}</p>
    <a href="/">Back to leaderboard</a>
  </div>
</body>
</html>`;
}

/**
 * Render Getting Started / Docs page
 */
function renderDocsPage(): string {
  return renderDocLayout('Getting Started', `
    <section class="doc-section">
      <h2>Installation</h2>
      <p>Install Skillmark globally or use npx:</p>
      <pre><code>npm install -g skillmark
# or
npx skillmark</code></pre>
    </section>

    <section class="doc-section">
      <h2>Requirements</h2>
      <ul>
        <li><strong>Claude Code CLI</strong> - Skillmark runs benchmarks using Claude Code locally</li>
        <li><strong>Claude Max subscription</strong> - Required for Claude Code API access</li>
      </ul>
      <p>All benchmarks run 100% locally on your machine.</p>
    </section>

    <section class="doc-section">
      <h2>Quick Start</h2>
      <p>Run your first benchmark in 3 steps:</p>

      <h3>1. Test Files (Auto-generated)</h3>
      <p>Skillmark auto-generates test files based on your skill's SKILL.md. Just run:</p>
      <pre><code>skillmark run ./my-skill</code></pre>
      <p>Or create tests manually with YAML frontmatter:</p>
      <pre><code>---
name: my-first-test
type: knowledge
concepts:
  - concept-one
  - concept-two
timeout: 120
---

# Prompt
Your question or task here.

# Expected
- [ ] First expected outcome
- [ ] Second expected outcome</code></pre>

      <h3>2. Run the benchmark</h3>
      <pre><code>skillmark run ./my-skill --tests ./tests --model sonnet --runs 3</code></pre>

      <h3>3. View results</h3>
      <p>Results are saved to <code>./skillmark-results/</code>:</p>
      <ul>
        <li><code>result.json</code> - Machine-readable metrics</li>
        <li><code>report.md</code> - Human-readable report</li>
      </ul>
    </section>

    <section class="doc-section">
      <h2>CLI Commands</h2>
      <table>
        <tr><td><code>skillmark run &lt;skill&gt;</code></td><td>Run benchmark against a skill</td></tr>
        <tr><td><code>skillmark publish &lt;result&gt;</code></td><td>Upload results to leaderboard</td></tr>
        <tr><td><code>skillmark leaderboard</code></td><td>View skill rankings</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Options</h2>
      <table>
        <tr><td><code>--tests &lt;path&gt;</code></td><td>Path to test suite (default: ./tests)</td></tr>
        <tr><td><code>--model &lt;model&gt;</code></td><td>haiku | sonnet | opus (default: opus)</td></tr>
        <tr><td><code>--runs &lt;n&gt;</code></td><td>Number of iterations (default: 3)</td></tr>
        <tr><td><code>--output &lt;dir&gt;</code></td><td>Output directory (default: ./skillmark-results)</td></tr>
        <tr><td><code>--publish</code></td><td>Auto-publish results to leaderboard</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Publishing Results</h2>
      <h3>1. Get API Key</h3>
      <p><a href="/login">Login with GitHub</a> to get your API key from the dashboard.</p>

      <h3>2. Save API Key</h3>
      <pre><code># Option 1: Environment variable
export SKILLMARK_API_KEY=sk_your_key

# Option 2: Config file
echo "api_key=sk_your_key" > ~/.skillmarkrc</code></pre>

      <h3>3. Publish</h3>
      <pre><code># Auto-publish after benchmark
skillmark run ./my-skill --publish

# Or publish existing results
skillmark publish ./skillmark-results/result.json</code></pre>
    </section>
  `);
}

/**
 * Render How It Works page
 */
function renderHowItWorksPage(): string {
  return renderDocLayout('How It Works', `
    <section class="doc-section">
      <h2>Overview</h2>
      <p>Skillmark benchmarks AI agent skills by running standardized tests and measuring key metrics:</p>
      <ul>
        <li><strong>Accuracy</strong> - Percentage of expected concepts matched</li>
        <li><strong>Tokens</strong> - Total tokens consumed (input + output). Lower = more efficient</li>
        <li><strong>Duration</strong> - Wall-clock execution time</li>
        <li><strong>Cost</strong> - Estimated API cost in USD</li>
        <li><strong>Tool Calls</strong> - Number of tool invocations</li>
        <li><strong>Model</strong> - Claude model used (haiku, sonnet, opus)</li>
      </ul>
    </section>

    <section class="doc-section">
      <h2>Test Types</h2>
      <table>
        <tr><td><code>knowledge</code></td><td>Q&A style tests checking if response covers expected concepts</td></tr>
        <tr><td><code>task</code></td><td>Execution tests verifying tool usage and task completion</td></tr>
        <tr><td><code>security</code></td><td>Security tests checking refusal of malicious prompts and absence of forbidden content</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Scoring</h2>
      <p>Accuracy is calculated by matching response content against expected concepts:</p>
      <pre><code>accuracy = (matched_concepts / total_concepts) × 100%</code></pre>
      <p>The scorer uses fuzzy matching to handle variations like plurals, hyphens, and common abbreviations.</p>
    </section>

    <section class="doc-section">
      <h2>Token Efficiency</h2>
      <p>Token usage is captured from Claude Code CLI transcript after each run:</p>
      <ul>
        <li><strong>Input tokens</strong> - Prompt + context sent to Claude</li>
        <li><strong>Output tokens</strong> - Claude's response + tool calls</li>
        <li><strong>Total tokens</strong> - Input + Output (used for efficiency ranking)</li>
      </ul>
      <p>Skills achieving same accuracy with fewer tokens rank higher in token efficiency.</p>
    </section>

    <section class="doc-section">
      <h2>Skill Sources</h2>
      <p>Skillmark supports multiple skill sources:</p>
      <table>
        <tr><td><strong>Local</strong></td><td><code>./my-skill</code> or <code>~/.claude/skills/my-skill</code></td></tr>
        <tr><td><strong>Git</strong></td><td><code>https://github.com/user/skill-repo</code></td></tr>
        <tr><td><strong>skill.sh</strong></td><td><code>skill.sh/user/skill-name</code></td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Publishing Results</h2>
      <p>Share your benchmark results on the public leaderboard:</p>
      <pre><code>skillmark publish ./skillmark-results/result.json --api-key YOUR_KEY</code></pre>
      <p>Results include a verification hash to prevent tampering.</p>
    </section>

    <section class="doc-section">
      <h2>Architecture</h2>
      <pre><code>┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  CLI        │────▶│  Claude     │────▶│  Results    │
│  skillmark  │     │  Engine     │     │  JSON + MD  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Cloudflare │
                                        │  Workers+D1 │
                                        └─────────────┘</code></pre>
    </section>

    <section class="doc-section">
      <h2>Enhanced Test Generation</h2>
      <p>Skillmark uses an enhanced test generation flow when no tests exist:</p>
      <pre><code>┌─────────────┐     ┌─────────────────────────────────────┐
│  SKILL.md   │────▶│  skill-creator + @claude-code-guide │
└─────────────┘     └─────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼ (success)     ▼ (fails)       │
            ┌─────────────┐  ┌─────────────┐        │
            │  Enhanced   │  │  Basic      │        │
            │  Prompt     │  │  Prompt     │        │
            └──────┬──────┘  └──────┬──────┘        │
                   └───────────┬────┘               │
                               ▼                    │
                       ┌─────────────┐              │
                       │  Test Files │◀─────────────┘
                       └─────────────┘</code></pre>
    </section>

    <section class="doc-section">
      <h2>skill-creator Skill</h2>
      <p>The <code>skill-creator</code> skill analyzes SKILL.md to extract structured metadata:</p>
      <table>
        <tr><td><strong>capabilities</strong></td><td>Core capabilities (3-6 items)</td></tr>
        <tr><td><strong>keyConcepts</strong></td><td>Key topics/keywords (5-10 items)</td></tr>
        <tr><td><strong>edgeCases</strong></td><td>Failure scenarios to test (3-5 items)</td></tr>
        <tr><td><strong>testingPatterns</strong></td><td>Claude Code testing best practices</td></tr>
        <tr><td><strong>toolInvocations</strong></td><td>Expected tool calls</td></tr>
      </table>
      <p>If skill-creator is not installed, Skillmark auto-installs it via:</p>
      <pre><code>npx skills add https://github.com/anthropics/claudekit-skills --skill skill-creator</code></pre>
    </section>

    <section class="doc-section">
      <h2>claude-code-guide Subagent</h2>
      <p>The <code>@claude-code-guide</code> subagent provides Claude Code-specific testing patterns:</p>
      <ul>
        <li>Skill invocation patterns and best practices</li>
        <li>Common failure modes and edge cases</li>
        <li>Tool usage expectations (Read, Write, Bash, etc.)</li>
        <li>Testing patterns for knowledge vs task tests</li>
      </ul>
      <p>It's referenced via prompt engineering in skill-creator:</p>
      <pre><code>Use @"claude-code-guide (agent)" to understand Claude Code CLI patterns...</code></pre>
      <p>Claude's built-in subagent routing handles the reference automatically.</p>
    </section>

    <section class="doc-section">
      <h2>Error Handling</h2>
      <p>Skillmark uses retry-then-degrade pattern for robustness:</p>
      <table>
        <tr><td><strong>skill-creator succeeds</strong></td><td>Enhanced prompt with analysis</td></tr>
        <tr><td><strong>skill-creator fails (1 retry)</strong></td><td>Degrades to basic prompt</td></tr>
        <tr><td><strong>Claude CLI fails</strong></td><td>Generates single fallback test</td></tr>
      </table>
      <p>This ensures test generation always succeeds, even if enhanced analysis fails.</p>
    </section>
  `);
}

/**
 * Shared layout for documentation pages
 */
function renderDocLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Skillmark</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --bg: #000; --text: #ededed; --text-secondary: #888; --border: #333; }
    body { font-family: 'Geist', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; -webkit-font-smoothing: antialiased; }
    nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); }
    .nav-left { display: flex; align-items: center; gap: 0.5rem; }
    .nav-left a { color: var(--text); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
    .nav-divider { color: var(--text-secondary); }
    .nav-right { display: flex; gap: 1.5rem; }
    .nav-right a { color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; }
    .nav-right a:hover, .nav-right a.active { color: var(--text); }
    .container { max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem; }
    h1 { font-size: 2.5rem; font-weight: 600; margin-bottom: 2rem; }
    .doc-section { margin-bottom: 3rem; }
    .doc-section h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: var(--text); }
    .doc-section h3 { font-size: 1rem; font-weight: 500; margin: 1.5rem 0 0.5rem; color: var(--text); }
    .doc-section p { color: var(--text-secondary); margin-bottom: 1rem; }
    .doc-section ul { color: var(--text-secondary); margin-left: 1.5rem; margin-bottom: 1rem; }
    .doc-section li { margin-bottom: 0.5rem; }
    .doc-section strong { color: var(--text); }
    pre { background: #0a0a0a; border: 1px solid var(--border); border-radius: 8px; padding: 1rem; overflow-x: auto; margin-bottom: 1rem; }
    code { font-family: 'Geist Mono', monospace; font-size: 0.875rem; }
    p code { background: #1a1a1a; padding: 0.125rem 0.375rem; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
    table td { padding: 0.75rem 0; border-bottom: 1px solid var(--border); color: var(--text-secondary); }
    table td:first-child { color: var(--text); width: 40%; }
    footer { margin-top: 3rem; padding: 2rem 0; border-top: 1px solid var(--border); text-align: center; color: var(--text-secondary); font-size: 0.8125rem; }
    footer a { color: var(--text); text-decoration: none; }
  </style>
</head>
<body>
  <nav>
    <div class="nav-left">
      <a href="/">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <span>Skillmark</span>
      </a>
    </div>
    <div class="nav-right">
      <a href="/docs">Docs</a>
      <a href="/how-it-works">How It Works</a>
      <a href="https://github.com/claudekit/skillmark" title="GitHub"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></a>
      <a href="/login">Login</a>
    </div>
  </nav>
  <div class="container">
    <h1>${title}</h1>
    ${content}
    <footer>
      <a href="https://github.com/claudekit/skillmark">Skillmark</a> · Built for AI agent developers · by <a href="https://claudekit.cc">ClaudeKit.cc</a>
    </footer>
  </div>
</body>
</html>`;
}

/** Result row for skill detail page */
interface SkillResultRow {
  accuracy: number;
  model: string;
  tokensTotal: number;
  costUsd: number;
  securityScore: number | null;
  createdAt: string | null;
  submitterGithub: string | null;
  skillshLink: string | null;
  testFiles: Array<{ name: string; content: string }> | null;
}

/**
 * Render skill detail page with result history and test files
 */
function renderSkillDetailPage(skill: LeaderboardRow, results: SkillResultRow[]): string {
  const latestResult = results[0];
  const skillshLink = latestResult?.skillshLink || skill.skillshLink;

  const resultRows = results.map((r, i) => `
    <tr>
      <td class="result-date">${r.createdAt ? formatRelativeTime(new Date(r.createdAt).getTime() / 1000) : '-'}</td>
      <td class="result-model">${escapeHtml(r.model)}</td>
      <td class="result-accuracy">${r.accuracy.toFixed(1)}%</td>
      <td class="result-security">${r.securityScore != null ? r.securityScore.toFixed(0) + '%' : '\u2014'}</td>
      <td class="result-tokens">${r.tokensTotal?.toLocaleString() || '-'}</td>
      <td class="result-cost">$${r.costUsd?.toFixed(4) || '-'}</td>
      <td class="result-submitter">
        ${r.submitterGithub ? `
          <a href="https://github.com/${escapeHtml(r.submitterGithub)}" class="submitter-link">
            <img src="https://github.com/${escapeHtml(r.submitterGithub)}.png?size=20" alt="" class="submitter-avatar-sm">
            @${escapeHtml(r.submitterGithub)}
          </a>
        ` : '-'}
      </td>
    </tr>
  `).join('');

  // Render test files viewer if available
  const testFilesSection = latestResult?.testFiles?.length ? `
    <section class="test-files-section">
      <h2>Test Files</h2>
      <div class="test-files-tabs">
        ${latestResult.testFiles.map((f, i) => `
          <button class="test-file-tab ${i === 0 ? 'active' : ''}" data-index="${i}">${escapeHtml(f.name)}</button>
        `).join('')}
      </div>
      <div class="test-files-content">
        ${latestResult.testFiles.map((f, i) => `
          <pre class="test-file-content ${i === 0 ? 'active' : ''}" data-index="${i}"><code>${escapeHtml(f.content)}</code></pre>
        `).join('')}
      </div>
    </section>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(skill.skillName)} - Skillmark</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --bg: #000; --text: #ededed; --text-secondary: #888; --border: #333; }
    body { font-family: 'Geist', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; -webkit-font-smoothing: antialiased; }
    nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); }
    .nav-left { display: flex; align-items: center; gap: 0.5rem; }
    .nav-left a { color: var(--text); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
    .nav-right { display: flex; gap: 1.5rem; }
    .nav-right a { color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; }
    .nav-right a:hover { color: var(--text); }
    .container { max-width: 1000px; margin: 0 auto; padding: 3rem 1.5rem; }
    .breadcrumb { color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem; }
    .breadcrumb a { color: var(--text-secondary); text-decoration: none; }
    .breadcrumb a:hover { color: var(--text); }
    h1 { font-size: 2.5rem; font-weight: 600; margin-bottom: 0.5rem; }
    .skill-meta { display: flex; gap: 1.5rem; color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 2rem; }
    .skill-meta a { color: #58a6ff; text-decoration: none; }
    .skill-meta a:hover { text-decoration: underline; }
    .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.5rem; margin-bottom: 3rem; }
    .stat-card { background: #0a0a0a; border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; }
    .stat-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary); margin-bottom: 0.5rem; }
    .stat-value { font-family: 'Geist Mono', monospace; font-size: 1.5rem; font-weight: 500; }
    .section { margin-bottom: 3rem; }
    .section h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary); margin-bottom: 1rem; }
    .results-table { width: 100%; border-collapse: collapse; }
    .results-table th { text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary); font-weight: 500; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
    .results-table td { padding: 0.75rem 0; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
    .result-accuracy { font-family: 'Geist Mono', monospace; font-weight: 500; }
    .result-security { font-family: 'Geist Mono', monospace; color: var(--text-secondary); }
    .result-tokens, .result-cost { font-family: 'Geist Mono', monospace; color: var(--text-secondary); }
    .security-warning { color: #d29922; font-size: 0.625rem; }
    .security-banner { background: rgba(210, 153, 34, 0.1); border: 1px solid rgba(210, 153, 34, 0.3); color: #d29922; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.875rem; }
    .submitter-link { display: flex; align-items: center; gap: 0.375rem; color: var(--text-secondary); text-decoration: none; font-size: 0.8125rem; }
    .submitter-link:hover { color: var(--text); }
    .submitter-avatar-sm { width: 16px; height: 16px; border-radius: 50%; }
    .test-files-section { background: #0a0a0a; border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; }
    .test-files-section h2 { margin-bottom: 1rem; }
    .test-files-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .test-file-tab { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-family: 'Geist Mono', monospace; font-size: 0.8125rem; }
    .test-file-tab:hover { border-color: var(--text-secondary); }
    .test-file-tab.active { background: var(--text); color: var(--bg); border-color: var(--text); }
    .test-file-content { display: none; background: #000; border: 1px solid var(--border); border-radius: 6px; padding: 1rem; overflow-x: auto; max-height: 400px; overflow-y: auto; }
    .test-file-content.active { display: block; }
    .test-file-content code { font-family: 'Geist Mono', monospace; font-size: 0.8125rem; white-space: pre-wrap; }
    footer { margin-top: 3rem; padding: 2rem 0; border-top: 1px solid var(--border); text-align: center; color: var(--text-secondary); font-size: 0.8125rem; }
    footer a { color: var(--text); text-decoration: none; }
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .results-table { font-size: 0.8125rem; }
    }
  </style>
</head>
<body>
  <nav>
    <div class="nav-left">
      <a href="/">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <span>Skillmark</span>
      </a>
    </div>
    <div class="nav-right">
      <a href="/docs">Docs</a>
      <a href="/how-it-works">How It Works</a>
      <a href="https://github.com/claudekit/skillmark" title="GitHub"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></a>
      <a href="/login">Login</a>
    </div>
  </nav>
  <div class="container">
    <div class="breadcrumb">
      <a href="/">Leaderboard</a> / ${escapeHtml(skill.skillName)}
    </div>
    <h1>${escapeHtml(skill.skillName)}</h1>
    <div class="skill-meta">
      ${skill.source ? `<span>Source: <a href="${escapeHtml(skill.source)}">${escapeHtml(skill.source.replace('https://github.com/', ''))}</a></span>` : ''}
      ${skillshLink ? `<span><a href="${escapeHtml(skillshLink)}">View on skill.sh</a></span>` : ''}
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Best Accuracy</div>
        <div class="stat-value">${skill.bestAccuracy.toFixed(1)}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Security</div>
        <div class="stat-value">${skill.bestSecurity != null ? skill.bestSecurity.toFixed(0) + '%' : '\u2014'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Best Model</div>
        <div class="stat-value">${escapeHtml(skill.bestModel)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Tokens</div>
        <div class="stat-value">${Math.round(skill.avgTokens).toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Runs</div>
        <div class="stat-value">${skill.totalRuns}</div>
      </div>
    </div>

    <section class="section">
      <h2>Result History</h2>
      <table class="results-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Model</th>
            <th>Accuracy</th>
            <th>Security</th>
            <th>Tokens</th>
            <th>Cost</th>
            <th>Submitter</th>
          </tr>
        </thead>
        <tbody>
          ${resultRows}
        </tbody>
      </table>
    </section>

    ${skill.bestSecurity != null ? `
    <section class="section">
      <h2>Security Benchmark</h2>
      ${skill.bestSecurity < 50 ? `
        <div class="security-banner">
          <span class="security-warning">\u25CF</span>
          This skill has a low security score. Consider running security benchmarks to identify vulnerabilities.
        </div>
      ` : ''}
      <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="stat-card">
          <div class="stat-label">Security Score</div>
          <div class="stat-value">${skill.bestSecurity.toFixed(1)}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Composite Score</div>
          <div class="stat-value">${skill.compositeScore?.toFixed(1) || '\u2014'}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Accuracy</div>
          <div class="stat-value">${skill.bestAccuracy.toFixed(1)}%</div>
        </div>
      </div>
    </section>
    ` : ''}

    ${testFilesSection}

    <footer>
      <a href="https://github.com/claudekit/skillmark">Skillmark</a> · Built for AI agent developers · by <a href="https://claudekit.cc">ClaudeKit.cc</a>
    </footer>
  </div>

  <script>
    // Test file tab switching
    document.querySelectorAll('.test-file-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const index = tab.dataset.index;
        document.querySelectorAll('.test-file-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.test-file-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.querySelector('.test-file-content[data-index="' + index + '"]').classList.add('active');
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Render login page with GitHub OAuth button
 */
function renderLoginPage(error?: string): string {
  const errorMessage = error ? `
    <div class="error-message">
      ${error === 'oauth_failed' ? 'GitHub authentication failed. Please try again.' :
        error === 'token_failed' ? 'Failed to authenticate with GitHub. Please try again.' :
        'An error occurred. Please try again.'}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - Skillmark</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --bg: #000; --text: #ededed; --text-secondary: #888; --border: #333; }
    body {
      font-family: 'Geist', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
    }
    nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); }
    .nav-left { display: flex; align-items: center; gap: 0.5rem; }
    .nav-left a { color: var(--text); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
    .login-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .login-box {
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    h1 { font-size: 2rem; font-weight: 600; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-secondary); margin-bottom: 2rem; }
    .github-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.875rem 1.5rem;
      background: #ededed;
      color: #000;
      border: none;
      border-radius: 8px;
      font-family: inherit;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s;
    }
    .github-btn:hover { background: #fff; }
    .github-btn svg { width: 20px; height: 20px; }
    .error-message {
      background: rgba(248, 81, 73, 0.1);
      border: 1px solid rgba(248, 81, 73, 0.3);
      color: #f85149;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }
    .info-text {
      margin-top: 2rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    .info-text a { color: var(--text); }
  </style>
</head>
<body>
  <nav>
    <div class="nav-left">
      <a href="/">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <span>Skillmark</span>
      </a>
    </div>
  </nav>
  <div class="login-container">
    <div class="login-box">
      <h1>Sign in</h1>
      <p class="subtitle">Get an API key to publish benchmark results</p>
      ${errorMessage}
      <a href="/auth/github" class="github-btn">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        Continue with GitHub
      </a>
      <p class="info-text">
        By signing in, you agree to our <a href="/docs">Terms of Service</a>.
      </p>
    </div>
  </div>
</body>
</html>`;
}

interface DashboardUser {
  username: string;
  avatar: string | null;
  keys: Array<{
    id: string;
    createdAt: string | null;
    lastUsedAt: string | null;
  }>;
}

/**
 * Render dashboard page with API key management
 */
function renderDashboardPage(user: DashboardUser): string {
  const keyRows = user.keys.map(key => `
    <tr data-key-id="${escapeHtml(key.id as string)}">
      <td class="key-id">
        <code>${escapeHtml((key.id as string).slice(0, 8))}...</code>
      </td>
      <td class="key-created">${key.createdAt ? formatRelativeTime(new Date(key.createdAt).getTime() / 1000) : 'Unknown'}</td>
      <td class="key-used">${key.lastUsedAt ? formatRelativeTime(new Date(key.lastUsedAt).getTime() / 1000) : 'Never'}</td>
      <td class="key-actions">
        <button class="revoke-btn" onclick="revokeKey('${escapeHtml(key.id as string)}')">Revoke</button>
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - Skillmark</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --bg: #000; --text: #ededed; --text-secondary: #888; --border: #333; --success: #3fb950; }
    body {
      font-family: 'Geist', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); }
    .nav-left { display: flex; align-items: center; gap: 0.5rem; }
    .nav-left a { color: var(--text); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
    .nav-right { display: flex; align-items: center; gap: 1rem; }
    .nav-right a { color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; }
    .nav-right a:hover { color: var(--text); }
    .user-info { display: flex; align-items: center; gap: 0.5rem; }
    .user-avatar { width: 28px; height: 28px; border-radius: 50%; }
    .user-name { font-size: 0.875rem; }
    .container { max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem; }
    h1 { font-size: 2rem; font-weight: 600; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-secondary); margin-bottom: 2rem; }
    .section { margin-bottom: 3rem; }
    .section h2 { font-size: 1rem; font-weight: 500; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary); }
    .generate-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: var(--text);
      color: var(--bg);
      border: none;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      margin-bottom: 1.5rem;
    }
    .generate-btn:hover { background: #fff; }
    .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .new-key-display {
      display: none;
      background: rgba(63, 185, 80, 0.1);
      border: 1px solid rgba(63, 185, 80, 0.3);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }
    .new-key-display.visible { display: block; }
    .new-key-display p { color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.75rem; }
    .new-key-display .key-value {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #0a0a0a;
      padding: 0.75rem;
      border-radius: 6px;
      font-family: 'Geist Mono', monospace;
      font-size: 0.8125rem;
      word-break: break-all;
    }
    .copy-btn {
      flex-shrink: 0;
      background: none;
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.75rem;
    }
    .copy-btn:hover { color: var(--text); border-color: var(--text-secondary); }
    .done-btn {
      flex-shrink: 0;
      background: var(--success);
      border: none;
      color: #000;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .done-btn:hover { opacity: 0.9; }
    .keys-table { width: 100%; border-collapse: collapse; }
    .keys-table th {
      text-align: left;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-secondary);
      font-weight: 500;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
    }
    .keys-table td { padding: 1rem 0; border-bottom: 1px solid var(--border); }
    .keys-table code { font-family: 'Geist Mono', monospace; font-size: 0.8125rem; }
    .key-created, .key-used { color: var(--text-secondary); font-size: 0.875rem; }
    .revoke-btn {
      background: none;
      border: 1px solid #f85149;
      color: #f85149;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .revoke-btn:hover { background: rgba(248, 81, 73, 0.1); }
    .empty-state { color: var(--text-secondary); padding: 2rem 0; }
    .usage-section { background: #0a0a0a; border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; }
    .usage-section h3 { font-size: 0.875rem; font-weight: 500; margin-bottom: 1rem; }
    .usage-section pre { background: #000; border: 1px solid var(--border); border-radius: 6px; padding: 1rem; overflow-x: auto; margin-bottom: 0.75rem; }
    .usage-section code { font-family: 'Geist Mono', monospace; font-size: 0.8125rem; }
    .usage-section p { color: var(--text-secondary); font-size: 0.8125rem; }
  </style>
</head>
<body>
  <nav>
    <div class="nav-left">
      <a href="/">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <span>Skillmark</span>
      </a>
    </div>
    <div class="nav-right">
      <div class="user-info">
        ${user.avatar ? `<img src="${escapeHtml(user.avatar)}" alt="" class="user-avatar">` : ''}
        <span class="user-name">${escapeHtml(user.username)}</span>
      </div>
      <a href="/auth/logout">Sign out</a>
    </div>
  </nav>
  <div class="container">
    <h1>Dashboard</h1>
    <p class="subtitle">Manage your API keys for publishing benchmark results</p>

    <div class="section">
      <h2>API Keys</h2>
      <button class="generate-btn" id="generateBtn" onclick="generateKey()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Generate New Key
      </button>

      <div class="new-key-display" id="newKeyDisplay">
        <p><strong>New API key created!</strong> Copy it now - you won't see it again.</p>
        <div class="key-value">
          <code id="newKeyValue"></code>
          <button class="copy-btn" onclick="copyKey()">Copy</button>
          <button class="done-btn" onclick="location.reload()">Done</button>
        </div>
      </div>

      ${user.keys.length > 0 ? `
      <table class="keys-table">
        <thead>
          <tr>
            <th>Key ID</th>
            <th>Created</th>
            <th>Last Used</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="keysTableBody">
          ${keyRows}
        </tbody>
      </table>
      ` : `
      <p class="empty-state">No API keys yet. Generate one to start publishing benchmarks.</p>
      `}
    </div>

    <div class="section">
      <h2>Usage</h2>
      <div class="usage-section">
        <h3>Save your API key</h3>
        <pre><code># Option 1: Environment variable
export SKILLMARK_API_KEY=sk_your_key_here

# Option 2: Config file (~/.skillmarkrc)
echo "api_key=sk_your_key_here" > ~/.skillmarkrc</code></pre>
        <p>The CLI reads from env var first, then ~/.skillmarkrc.</p>
      </div>
    </div>

    <div class="section">
      <div class="usage-section">
        <h3>Publish with auto-publish flag</h3>
        <pre><code># Run benchmark and auto-publish results
skillmark run ./my-skill --publish

# Or publish existing results
skillmark publish ./skillmark-results/result.json</code></pre>
      </div>
    </div>
  </div>

  <script>
    async function generateKey() {
      const btn = document.getElementById('generateBtn');
      btn.disabled = true;
      btn.textContent = 'Generating...';

      try {
        const res = await fetch('/auth/keys', { method: 'POST' });
        const data = await res.json();

        if (data.apiKey) {
          document.getElementById('newKeyValue').textContent = data.apiKey;
          document.getElementById('newKeyDisplay').classList.add('visible');
          btn.style.display = 'none';
        } else {
          alert('Failed to generate key: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Failed to generate key: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Generate New Key';
      }
    }

    function copyKey() {
      const key = document.getElementById('newKeyValue').textContent;
      navigator.clipboard.writeText(key).then(() => {
        const btn = event.target;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      });
    }

    async function revokeKey(keyId) {
      if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
        return;
      }

      try {
        const res = await fetch('/auth/keys/' + keyId, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
          document.querySelector('tr[data-key-id="' + keyId + '"]').remove();
        } else {
          alert('Failed to revoke key: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Failed to revoke key: ' + err.message);
      }
    }
  </script>
</body>
</html>`;
}

/**
 * Format Unix timestamp to relative time
 */
function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Never';

  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
