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
  bestTrigger: number | null;
  compositeScore: number | null;
  bestModel: string;
  avgTokens: number;
  avgCost: number;
  lastTested: number;
  totalRuns: number;
  submitterGithub?: string;
  skillshLink?: string;
  repoUrl?: string;
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
        l.best_trigger as bestTrigger,
        l.composite_score as compositeScore,
        l.best_model as bestModel,
        l.avg_tokens as avgTokens,
        l.avg_cost as avgCost,
        l.last_tested as lastTested,
        l.total_runs as totalRuns,
        (SELECT submitter_github FROM results WHERE skill_id = l.skill_id ORDER BY created_at DESC LIMIT 1) as submitterGithub,
        (SELECT skillsh_link FROM results WHERE skill_id = l.skill_id AND skillsh_link IS NOT NULL ORDER BY created_at DESC LIMIT 1) as skillshLink,
        l.repo_url as repoUrl
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
        l.best_trigger as bestTrigger,
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
        r.id,
        r.accuracy,
        r.model,
        r.tokens_total as tokensTotal,
        r.duration_ms as durationMs,
        r.cost_usd as costUsd,
        r.tool_count as toolCount,
        r.security_score as securityScore,
        r.trigger_score as triggerScore,
        r.consistency_json as consistencyJson,
        r.baseline_json as baselineJson,
        r.created_at as createdAt,
        r.submitter_github as submitterGithub,
        r.skillsh_link as skillshLink,
        r.test_files as testFiles,
        r.report_markdown IS NOT NULL as hasReport
      FROM results r
      WHERE r.skill_id = ?
      ORDER BY r.created_at DESC
      LIMIT 20
    `).bind(skill.skillId).all();

    const formattedResults: SkillResultRow[] = (results.results || []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      accuracy: r.accuracy as number,
      model: r.model as string,
      tokensTotal: r.tokensTotal as number,
      durationMs: (r.durationMs as number) ?? null,
      costUsd: r.costUsd as number,
      toolCount: (r.toolCount as number) ?? null,
      securityScore: (r.securityScore as number) ?? null,
      triggerScore: (r.triggerScore as number) ?? null,
      consistencyJson: (r.consistencyJson as string) ?? null,
      baselineJson: (r.baselineJson as string) ?? null,
      createdAt: r.createdAt ? new Date((r.createdAt as number) * 1000).toISOString() : null,
      submitterGithub: r.submitterGithub as string | null,
      skillshLink: r.skillshLink as string | null,
      testFiles: r.testFiles ? JSON.parse(r.testFiles as string) : null,
      hasReport: !!r.hasReport,
    }));

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
    id: key.id as string,
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
    const trigger = entry.bestTrigger != null ? `${entry.bestTrigger.toFixed(0)}%` : '\u2014';
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
            ${entry.repoUrl ? `<a href="${escapeHtml(entry.repoUrl)}" class="repo-link" onclick="event.stopPropagation()" title="View repository">repo</a>` : ''}
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
        <td class="trigger">${trigger}</td>
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

    .skillsh-link:hover, .repo-link:hover {
      text-decoration: underline;
    }

    .repo-link {
      font-size: 0.75rem;
      color: #8b949e;
      text-decoration: none;
      margin-left: 0.25rem;
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
            <th>Trigger</th>
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
        <tr><td><code>trigger</code></td><td>Activation tests ensuring skill triggers correctly on valid queries and avoids false positives</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Scoring</h2>
      <p>Accuracy is calculated by matching response content against expected concepts:</p>
      <pre><code>accuracy = (matched_concepts / total_concepts) × 100%</code></pre>
      <p>The scorer uses fuzzy matching to handle variations like plurals, hyphens, and common abbreviations.</p>

      <h3>Composite Score</h3>
      <p>The leaderboard ranks skills by a composite score:</p>
      <pre><code>composite = accuracy × 70% + security × 15% + trigger × 15%</code></pre>
      <p>This balances core functionality (accuracy), safety (security), and activation precision (trigger).</p>

      <h3>Trigger Score</h3>
      <p>Trigger tests evaluate activation behavior:</p>
      <pre><code>trigger = trigger_rate × (1 - false_positive_rate)</code></pre>
      <p>Skills should activate on relevant queries and avoid activating on unrelated ones.</p>

      <h3>Consistency Score</h3>
      <p>Consistency metrics track result stability across runs (informational, not in composite):</p>
      <ul>
        <li><strong>Accuracy StdDev</strong> - Standard deviation of accuracy across runs</li>
        <li><strong>Accuracy Range</strong> - Difference between best and worst accuracy</li>
        <li><strong>Flaky Tests</strong> - Tests with inconsistent pass/fail results</li>
      </ul>

      <h3>Baseline Comparison</h3>
      <p>Baseline delta shows performance change vs previous version (informational, not in composite):</p>
      <pre><code>Δ accuracy = current_accuracy - baseline_accuracy
Δ security = current_security - baseline_security</code></pre>
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
      <h2>Security & Composite Scoring</h2>
      <p>Security tests use a dual scoring model:</p>
      <ul>
        <li><strong>Refusal Rate</strong> - % of expected refusal patterns matched (higher is better)</li>
        <li><strong>Leakage Rate</strong> - % of forbidden patterns found in response (lower is better)</li>
        <li><strong>Security Score</strong> = refusalRate × (1 - leakageRate / 100)</li>
      </ul>
      <p>The <strong>composite score</strong> used for leaderboard ranking:</p>
      <pre><code>composite = accuracy × 0.80 + securityScore × 0.20</code></pre>
      <p>This weights functional correctness (80%) higher while still rewarding security (20%).</p>
    </section>

    <section class="doc-section">
      <h2>CLI Commands</h2>
      <table>
        <tr><td><code>skillmark run &lt;skill&gt;</code></td><td>Run benchmark against a skill</td></tr>
        <tr><td><code>skillmark generate-tests &lt;skill&gt;</code></td><td>Generate test files from SKILL.md without running benchmarks</td></tr>
        <tr><td><code>skillmark publish &lt;result&gt;</code></td><td>Upload results to leaderboard</td></tr>
        <tr><td><code>skillmark auth</code></td><td>Setup Claude CLI authentication</td></tr>
        <tr><td><code>skillmark login &lt;key&gt;</code></td><td>Save API key for publishing</td></tr>
        <tr><td><code>skillmark leaderboard</code></td><td>View skill rankings</td></tr>
      </table>
      <h3>Key Run Options</h3>
      <table>
        <tr><td><code>-m, --model</code></td><td>Model to use (haiku|sonnet|opus, default: opus)</td></tr>
        <tr><td><code>-g, --generate-tests</code></td><td>Force regenerate tests from SKILL.md</td></tr>
        <tr><td><code>-c, --prompt-context</code></td><td>Additional prompt for test generation</td></tr>
        <tr><td><code>--parallel</code></td><td>Run tests in parallel</td></tr>
        <tr><td><code>--generate-model</code></td><td>Model for test generation (default: opus)</td></tr>
        <tr><td><code>-r, --runs</code></td><td>Number of iterations (default: 3)</td></tr>
      </table>
      <p>All test timeouts are automatically doubled (2x) to give agent skills adequate execution time.</p>
    </section>

    <section class="doc-section">
      <h2>Git Repository Detection</h2>
      <p>Skillmark auto-detects the git remote URL from skill directories and includes it in benchmark results.
      This URL is displayed on the leaderboard, linking directly to the skill's source repository.</p>
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
  id: string;
  accuracy: number;
  model: string;
  tokensTotal: number;
  durationMs: number | null;
  costUsd: number;
  toolCount: number | null;
  securityScore: number | null;
  triggerScore: number | null;
  consistencyJson: string | null;
  baselineJson: string | null;
  createdAt: string | null;
  submitterGithub: string | null;
  skillshLink: string | null;
  testFiles: Array<{ name: string; content: string }> | null;
  hasReport: boolean;
}

/** Normalized radar chart metrics (all 0-100) */
interface RadarMetrics {
  accuracy: number;
  security: number;
  trigger: number;
  tokenEfficiency: number;
  costEfficiency: number;
  speed: number;
}

/**
 * Compute normalized radar metrics from skill data and results
 */
function computeRadarMetrics(skill: LeaderboardRow, results: SkillResultRow[]): RadarMetrics {
  const durResults = results.filter(r => r.durationMs != null && r.durationMs > 0);
  const avgDuration = durResults.length > 0
    ? durResults.reduce((s, r) => s + (r.durationMs as number), 0) / durResults.length
    : 0;

  return {
    accuracy: Math.max(0, Math.min(100, skill.bestAccuracy)),
    security: Math.max(0, Math.min(100, skill.bestSecurity ?? 0)),
    trigger: Math.max(0, Math.min(100, skill.bestTrigger ?? 0)),
    // 0 tokens = 100, 10K+ tokens = 0
    tokenEfficiency: Math.max(0, Math.min(100, 100 - (skill.avgTokens / 10000) * 100)),
    // $0 = 100, $0.10+ = 0
    costEfficiency: Math.max(0, Math.min(100, 100 - (skill.avgCost / 0.10) * 100)),
    // 0s = 100, 60s+ = 0
    speed: Math.max(0, Math.min(100, 100 - (avgDuration / 60000) * 100)),
  };
}

/**
 * Render SVG radar chart for performance profile
 */
function renderRadarChart(metrics: RadarMetrics): string {
  const cx = 180, cy = 160, maxR = 110;
  const labels = ['Accuracy', 'Security', 'Trigger', 'Tokens', 'Cost', 'Speed'];
  const values = [metrics.accuracy, metrics.security, metrics.trigger, metrics.tokenEfficiency, metrics.costEfficiency, metrics.speed];

  // 6 axes, starting from top (-90°), clockwise
  const angles = labels.map((_, i) => (-90 + i * 60) * Math.PI / 180);

  function point(angle: number, r: number): string {
    return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
  }

  function polygon(r: number): string {
    return angles.map(a => point(a, r)).join(' ');
  }

  // Grid lines (25%, 50%, 75%, 100%)
  const gridLines = [0.25, 0.5, 0.75, 1.0].map(pct =>
    `<polygon points="${polygon(maxR * pct)}" fill="none" stroke="#333" stroke-width="0.5"/>`
  ).join('');

  // Axis lines
  const axisLines = angles.map(a =>
    `<line x1="${cx}" y1="${cy}" x2="${point(a, maxR).split(',')[0]}" y2="${point(a, maxR).split(',')[1]}" stroke="#333" stroke-width="0.5"/>`
  ).join('');

  // Data polygon
  const dataPoints = values.map((v, i) => point(angles[i], (v / 100) * maxR));
  const dataPolygon = `<polygon points="${dataPoints.join(' ')}" fill="rgba(88,166,255,0.15)" stroke="#58a6ff" stroke-width="1.5"/>`;

  // Data dots
  const dataDots = dataPoints.map(p => {
    const [x, y] = p.split(',');
    return `<circle cx="${x}" cy="${y}" r="3" fill="#58a6ff"/>`;
  }).join('');

  // Labels with values
  const labelOffset = 24;
  const labelElements = labels.map((label, i) => {
    const angle = angles[i];
    const lx = cx + (maxR + labelOffset) * Math.cos(angle);
    const ly = cy + (maxR + labelOffset) * Math.sin(angle);
    const anchor = Math.abs(lx - cx) < 5 ? 'middle' : lx > cx ? 'start' : 'end';
    const val = values[i].toFixed(0);
    return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" class="radar-label">${label}</text>
            <text x="${lx.toFixed(1)}" y="${(ly + 13).toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" class="radar-value">${val}</text>`;
  }).join('\n    ');

  return `<svg viewBox="0 0 360 340" xmlns="http://www.w3.org/2000/svg">
    ${gridLines}
    ${axisLines}
    ${dataPolygon}
    ${dataDots}
    ${labelElements}
  </svg>`;
}

/**
 * Render skill detail page with result history and test files
 */
function renderSkillDetailPage(skill: LeaderboardRow, results: SkillResultRow[]): string {
  const latestResult = results[0];
  const skillshLink = latestResult?.skillshLink || skill.skillshLink;

  // Compute radar chart metrics
  const radarMetrics = computeRadarMetrics(skill, results);
  const radarSvg = renderRadarChart(radarMetrics);

  const resultRows = results.map((r, i) => {
    // Parse consistency and baseline data
    const consistency = r.consistencyJson ? JSON.parse(r.consistencyJson) : null;
    const baseline = r.baselineJson ? JSON.parse(r.baselineJson) : null;

    return `
    <tr class="result-row" data-result-id="${escapeHtml(r.id)}">
      <td class="result-date">${r.createdAt ? formatRelativeTime(new Date(r.createdAt).getTime() / 1000) : '-'}</td>
      <td class="result-model">${escapeHtml(r.model)}</td>
      <td class="result-accuracy">${r.accuracy.toFixed(1)}%</td>
      <td class="result-security">${r.securityScore != null ? r.securityScore.toFixed(0) + '%' : '\u2014'}</td>
      <td class="result-trigger">${r.triggerScore != null ? r.triggerScore.toFixed(0) + '%' : '\u2014'}</td>
      <td class="result-consistency">${consistency ? `<span title="Std Dev: ${consistency.accuracyStdDev?.toFixed(1)}%, Range: ${consistency.accuracyRange?.toFixed(1)}%">${consistency.consistencyScore?.toFixed(0)}%</span>` : '\u2014'}</td>
      <td class="result-tokens">${r.tokensTotal?.toLocaleString() || '-'}</td>
      <td class="result-cost">$${r.costUsd?.toFixed(4) || '-'}</td>
      <td class="result-submitter">
        ${r.submitterGithub ? `
          <a href="https://github.com/${escapeHtml(r.submitterGithub)}" class="submitter-link" onclick="event.stopPropagation()">
            <img src="https://github.com/${escapeHtml(r.submitterGithub)}.png?size=20" alt="" class="submitter-avatar-sm">
            @${escapeHtml(r.submitterGithub)}
          </a>
        ` : '-'}
      </td>
      <td class="result-report" onclick="event.stopPropagation()">
        ${r.hasReport ? `<button class="report-btn" data-result-id="${escapeHtml(r.id)}" onclick="openReportModal('${escapeHtml(r.id)}')">View Report</button>` : '\u2014'}
      </td>
    </tr>
    <tr class="result-detail" data-result-id="${escapeHtml(r.id)}">
      <td colspan="10">
        ${consistency || baseline ? `
          <div class="additional-metrics">
            ${consistency ? `
              <div class="metric-section">
                <strong>Consistency:</strong> Score ${consistency.consistencyScore?.toFixed(0)}%
                (StdDev ${consistency.accuracyStdDev?.toFixed(1)}%, Range ${consistency.accuracyRange?.toFixed(1)}%)
                ${consistency.flakyTests?.length ? `<br><span class="flaky-tests">Flaky tests: ${consistency.flakyTests.join(', ')}</span>` : ''}
              </div>
            ` : ''}
            ${baseline ? `
              <div class="metric-section">
                <strong>Baseline Δ:</strong> Accuracy ${baseline.aggregatedDelta?.accuracy > 0 ? '+' : ''}${baseline.aggregatedDelta?.accuracy?.toFixed(1)}%,
                Security ${baseline.aggregatedDelta?.security > 0 ? '+' : ''}${baseline.aggregatedDelta?.security?.toFixed(1)}%
              </div>
            ` : ''}
          </div>
        ` : '<span class="detail-placeholder">No additional metrics</span>'}
      </td>
    </tr>
  `;
  }).join('');

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
    .result-trigger { font-family: 'Geist Mono', monospace; color: var(--text-secondary); }
    .result-consistency { font-family: 'Geist Mono', monospace; color: var(--text-secondary); cursor: help; }
    .result-tokens, .result-cost { font-family: 'Geist Mono', monospace; color: var(--text-secondary); }
    .security-warning { color: #d29922; font-size: 0.625rem; }
    .security-banner { background: rgba(210, 153, 34, 0.1); border: 1px solid rgba(210, 153, 34, 0.3); color: #d29922; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.875rem; }
    .additional-metrics { padding: 1rem; background: #0a0a0a; border-radius: 4px; font-size: 0.8125rem; }
    .metric-section { margin-bottom: 0.5rem; }
    .metric-section:last-child { margin-bottom: 0; }
    .flaky-tests { color: var(--text-secondary); font-size: 0.75rem; }
    .submitter-link { display: flex; align-items: center; gap: 0.375rem; color: var(--text-secondary); text-decoration: none; font-size: 0.8125rem; }
    .submitter-link:hover { color: var(--text); }
    .submitter-avatar-sm { width: 16px; height: 16px; border-radius: 50%; }
    .radar-section { margin-bottom: 3rem; }
    .radar-container { display: flex; justify-content: center; padding: 1rem 0; }
    .radar-container svg { max-width: 350px; width: 100%; }
    .radar-label { font-family: 'Geist', -apple-system, sans-serif; font-size: 11px; fill: #888; }
    .radar-value { font-family: 'Geist Mono', monospace; font-size: 10px; fill: #ededed; }
    .embed-snippet { max-width: 600px; margin: 1.5rem auto 0; }
    .embed-label { font-size: 0.75rem; color: #888; display: block; margin-bottom: 0.4rem; }
    .embed-code-row { display: flex; gap: 0.5rem; align-items: stretch; }
    .embed-code { flex: 1; background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.7rem; color: #c9d1d9; overflow-x: auto; white-space: nowrap; display: flex; align-items: center; }
    .embed-copy-btn { background: #21262d; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.75rem; white-space: nowrap; }
    .embed-copy-btn:hover { background: #30363d; }
    .result-row { cursor: pointer; transition: background 0.15s; }
    .result-row:hover td { background: #111; }
    .result-row .result-date::before { content: ''; display: inline-block; width: 0; height: 0; border-left: 4px solid var(--text-secondary); border-top: 3px solid transparent; border-bottom: 3px solid transparent; margin-right: 0.5rem; transition: transform 0.2s; }
    .result-row.expanded .result-date::before { transform: rotate(90deg); }
    .result-detail { display: none; }
    .result-detail.active { display: table-row; }
    .result-detail td { padding: 1rem 0; background: #0a0a0a; border-bottom: 1px solid var(--border); }
    .detail-placeholder { color: var(--text-secondary); font-size: 0.875rem; }
    .detail-content { padding: 0.5rem; }
    .detail-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
    .detail-metric { text-align: center; }
    .detail-metric-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); }
    .detail-metric-value { font-family: 'Geist Mono', monospace; font-size: 1.125rem; font-weight: 500; }
    .test-breakdown-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary); margin-bottom: 0.75rem; }
    .test-breakdown { display: grid; gap: 0.5rem; }
    .test-item { border: 1px solid var(--border); border-radius: 6px; padding: 0.75rem; background: #000; }
    .test-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
    .test-item-name { font-weight: 500; font-size: 0.875rem; }
    .test-item-type { font-size: 0.6875rem; text-transform: uppercase; padding: 0.125rem 0.5rem; border-radius: 4px; border: 1px solid var(--border); color: var(--text-secondary); }
    .test-item-stats { font-family: 'Geist Mono', monospace; font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 0.375rem; }
    .test-concepts { font-size: 0.8125rem; line-height: 1.5; }
    .concept-matched { color: #3fb950; }
    .concept-missed { color: #d29922; }
    .detail-empty { color: var(--text-secondary); font-size: 0.875rem; font-style: italic; padding: 1rem; text-align: center; }
    .test-files-section { background: #0a0a0a; border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; }
    .test-files-section h2 { margin-bottom: 1rem; }
    .test-files-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .test-file-tab { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-family: 'Geist Mono', monospace; font-size: 0.8125rem; }
    .test-file-tab:hover { border-color: var(--text-secondary); }
    .test-file-tab.active { background: var(--text); color: var(--bg); border-color: var(--text); }
    .test-file-content { display: none; background: #000; border: 1px solid var(--border); border-radius: 6px; padding: 1rem; overflow-x: auto; max-height: 400px; overflow-y: auto; }
    .test-file-content.active { display: block; }
    .test-file-content code { font-family: 'Geist Mono', monospace; font-size: 0.8125rem; white-space: pre-wrap; }
    /* Report button */
    .report-btn { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); padding: 0.25rem 0.625rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-family: 'Geist Mono', monospace; transition: all 0.15s; }
    .report-btn:hover { border-color: var(--text-secondary); color: var(--text); background: #111; }
    /* Test file modal */
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 1000; justify-content: center; align-items: center; padding: 2rem; }
    .modal-overlay.active { display: flex; }
    .modal { background: #0a0a0a; border: 1px solid var(--border); border-radius: 12px; width: 100%; max-width: 720px; max-height: 85vh; display: flex; flex-direction: column; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .modal-title { font-weight: 500; font-size: 0.9375rem; font-family: 'Geist Mono', monospace; }
    .modal-close { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; line-height: 1; }
    .modal-close:hover { border-color: var(--text-secondary); color: var(--text); }
    .modal-body { padding: 1.25rem; overflow-y: auto; flex: 1; }
    .md-content h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
    .md-content h2 { font-size: 1rem; font-weight: 600; margin: 1.25rem 0 0.5rem; color: var(--accent); }
    .md-content h3 { font-size: 0.875rem; font-weight: 600; margin: 1rem 0 0.375rem; }
    .md-content p { margin: 0.5rem 0; line-height: 1.6; color: var(--text-secondary); }
    .md-content ul, .md-content ol { margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-secondary); }
    .md-content li { margin: 0.25rem 0; line-height: 1.5; }
    .md-content code { font-family: 'Geist Mono', monospace; background: #1a1a1a; padding: 0.125rem 0.375rem; border-radius: 4px; font-size: 0.8125rem; }
    .md-content pre { background: #000; border: 1px solid var(--border); border-radius: 6px; padding: 0.875rem; overflow-x: auto; margin: 0.75rem 0; }
    .md-content pre code { background: none; padding: 0; font-size: 0.8125rem; }
    .md-content hr { border: none; border-top: 1px solid var(--border); margin: 1rem 0; }
    .md-content strong { color: var(--text); }
    .md-content .yaml-block { background: #111; border: 1px solid var(--border); border-radius: 6px; padding: 0.875rem; margin-bottom: 1rem; font-family: 'Geist Mono', monospace; font-size: 0.8125rem; color: var(--text-secondary); white-space: pre-wrap; }
    .md-content .yaml-key { color: #58a6ff; }
    .md-content .yaml-val { color: #3fb950; }
    .md-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.8125rem; }
    .md-content th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid var(--border); color: var(--text-secondary); font-weight: 500; }
    .md-content td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #222; }
    .md-content details { margin: 0.75rem 0; }
    .md-content summary { cursor: pointer; color: var(--text-secondary); font-size: 0.8125rem; }
    .md-content summary:hover { color: var(--text); }
    .md-content blockquote { border-left: 3px solid var(--border); padding-left: 1rem; color: var(--text-secondary); margin: 1rem 0; font-style: italic; }
    .test-item-name.clickable { cursor: pointer; color: var(--accent); text-decoration: underline; text-decoration-color: transparent; transition: text-decoration-color 0.15s; }
    .test-item-name.clickable:hover { text-decoration-color: var(--accent); }
    footer { margin-top: 3rem; padding: 2rem 0; border-top: 1px solid var(--border); text-align: center; color: var(--text-secondary); font-size: 0.8125rem; }
    footer a { color: var(--text); text-decoration: none; }
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .results-table { font-size: 0.8125rem; }
      .modal { max-width: 100%; margin: 0; border-radius: 0; max-height: 100vh; }
      .modal-overlay { padding: 0; }
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

    <section class="section radar-section">
      <h2>Performance Profile</h2>
      <div class="radar-container">
        ${radarSvg}
      </div>
      <div class="embed-snippet">
        <label class="embed-label">Embed this chart</label>
        <div class="embed-code-row">
          <code class="embed-code" id="embed-code">&lt;script src="https://skillmark.sh/embed.js" data-skill="${escapeHtml(skill.skillName)}" data-theme="dark"&gt;&lt;/script&gt;</code>
          <button class="embed-copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('embed-code').textContent).then(function(){var b=event.target;b.textContent='Copied!';setTimeout(function(){b.textContent='Copy'},1500)})">Copy</button>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Result History</h2>
      <p style="color: var(--text-secondary); font-size: 0.8125rem; margin-bottom: 1rem;">Click a row to view detailed test breakdown</p>
      <table class="results-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Model</th>
            <th>Accuracy</th>
            <th>Security</th>
            <th>Trigger</th>
            <th>Consistency</th>
            <th>Tokens</th>
            <th>Cost</th>
            <th>Submitter</th>
            <th>Report</th>
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

  <!-- Test file modal -->
  <div class="modal-overlay" id="testFileModal">
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title" id="modalTitle"></span>
        <button class="modal-close" id="modalClose">\u00D7</button>
      </div>
      <div class="modal-body">
        <div class="md-content" id="modalContent"></div>
      </div>
    </div>
  </div>

  <!-- Report modal -->
  <div class="modal-overlay" id="reportModal">
    <div class="modal" style="max-width: 900px;">
      <div class="modal-header">
        <span class="modal-title">Benchmark Report</span>
        <button class="modal-close" id="reportModalClose">\u00D7</button>
      </div>
      <div class="modal-body">
        <div class="md-content" id="reportModalContent"></div>
      </div>
    </div>
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

    // Utilities
    function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    // Simple markdown renderer for test file content
    function renderMarkdown(md) {
      var body = md, frontmatter = '';
      if (md.trimStart().startsWith('---')) {
        var parts = md.trimStart().split(/^---$/m);
        if (parts.length >= 3) { frontmatter = parts[1].trim(); body = parts.slice(2).join('---').trim(); }
      }
      var html = '';
      if (frontmatter) {
        var yamlHtml = frontmatter.split('\\n').map(function(line) {
          var m = line.match(/^(\\s*[\\w-]+)(:\\s*)(.*)$/);
          if (m) return '<span class="yaml-key">' + esc(m[1]) + '</span>' + esc(m[2]) + '<span class="yaml-val">' + esc(m[3]) + '</span>';
          return esc(line);
        }).join('\\n');
        html += '<div class="yaml-block">' + yamlHtml + '</div>';
      }
      var lines = body.split('\\n'), inCode = false, inList = false, listType = '', buf = '', inTable = false, isFirstTableRow = true, tableHtml = '';
      function flushList() { if (inList) { html += '</' + listType + '>'; inList = false; } }
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.trimStart().startsWith('\`\`\`')) {
          if (inCode) { html += esc(buf) + '</code></pre>'; buf = ''; inCode = false; }
          else { flushList(); html += '<pre><code>'; inCode = true; buf = ''; }
          continue;
        }
        if (inCode) { buf += (buf ? '\\n' : '') + line; continue; }
        var isTableRow = /^\\|.+\\|$/.test(line.trim());
        var isTableSep = /^\\|[\\s:|-]+\\|$/.test(line.trim());
        if (isTableRow || isTableSep) {
          if (!inTable) { flushList(); tableHtml = '<table><thead>'; inTable = true; isFirstTableRow = true; }
          if (isTableSep) { if (isFirstTableRow) { tableHtml += '</thead><tbody>'; isFirstTableRow = false; } continue; }
          var cells = line.trim().split('|').filter(function(c, idx, arr) { return idx > 0 && idx < arr.length - 1; });
          if (isFirstTableRow) { tableHtml += '<tr>' + cells.map(function(c) { return '<th>' + inlineFmt(c.trim()) + '</th>'; }).join('') + '</tr>'; }
          else { tableHtml += '<tr>' + cells.map(function(c) { return '<td>' + inlineFmt(c.trim()) + '</td>'; }).join('') + '</tr>'; }
          continue;
        }
        if (inTable) { tableHtml += '</tbody></table>'; html += tableHtml; inTable = false; tableHtml = ''; isFirstTableRow = true; }
        if (line.trim().startsWith('<details>') || line.trim().startsWith('</details>') || line.trim().startsWith('<summary>') || line.trim().startsWith('</summary>')) { flushList(); html += line; continue; }
        var bqm = line.match(/^>\\s*(.*)$/);
        if (bqm) { flushList(); html += '<blockquote><p>' + inlineFmt(bqm[1]) + '</p></blockquote>'; continue; }
        var hm = line.match(/^(#{1,3})\\s+(.+)$/);
        if (hm) { flushList(); html += '<h' + hm[1].length + '>' + inlineFmt(hm[2]) + '</h' + hm[1].length + '>'; continue; }
        if (/^(\\*{3,}|-{3,}|_{3,})$/.test(line.trim())) { flushList(); html += '<hr>'; continue; }
        var ulm = line.match(/^\\s*[-*]\\s+(.+)$/);
        if (ulm) {
          if (!inList || listType !== 'ul') { flushList(); html += '<ul>'; inList = true; listType = 'ul'; }
          var li = ulm[1], cbm = li.match(/^\\[([xX ])\\]\\s*(.+)$/);
          if (cbm) li = (cbm[1].toLowerCase() === 'x' ? '\\u2611 ' : '\\u2610 ') + cbm[2];
          html += '<li>' + inlineFmt(li) + '</li>'; continue;
        }
        var olm = line.match(/^\\s*\\d+\\.\\s+(.+)$/);
        if (olm) {
          if (!inList || listType !== 'ol') { flushList(); html += '<ol>'; inList = true; listType = 'ol'; }
          html += '<li>' + inlineFmt(olm[1]) + '</li>'; continue;
        }
        flushList();
        if (line.trim() === '') continue;
        html += '<p>' + inlineFmt(line) + '</p>';
      }
      if (inCode) html += esc(buf) + '</code></pre>';
      if (inTable) { tableHtml += '</tbody></table>'; html += tableHtml; }
      flushList();
      return html;
    }
    function inlineFmt(text) {
      var s = esc(text);
      s = s.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
      s = s.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
      s = s.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
      return s;
    }

    // Modal logic
    var modal = document.getElementById('testFileModal');
    var modalTitle = document.getElementById('modalTitle');
    var modalContent = document.getElementById('modalContent');
    var testFilesCache = {};

    function openTestFileModal(testName, resultId) {
      modalTitle.textContent = testName;
      modalContent.innerHTML = '<p style="color:var(--text-secondary)">Loading test file...</p>';
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      var cacheKey = resultId;
      if (testFilesCache[cacheKey]) { showTestFile(testName, testFilesCache[cacheKey]); return; }
      fetch('/api/result/' + encodeURIComponent(resultId) + '/test-files')
        .then(function(res) { if (!res.ok) throw new Error('n/a'); return res.json(); })
        .then(function(data) { testFilesCache[cacheKey] = data.files || []; showTestFile(testName, testFilesCache[cacheKey]); })
        .catch(function() { modalContent.innerHTML = '<p style="color:var(--text-secondary);font-style:italic">Test file content not available for this result.</p>'; });
    }
    function showTestFile(testName, files) {
      var match = null;
      for (var i = 0; i < files.length; i++) {
        var fname = files[i].name.replace(/\\.md$/i, '');
        if (fname === testName || files[i].name === testName) { match = files[i]; break; }
      }
      if (!match) {
        for (var j = 0; j < files.length; j++) {
          if (files[j].name.toLowerCase().indexOf(testName.toLowerCase()) !== -1) { match = files[j]; break; }
        }
      }
      if (match) { modalContent.innerHTML = renderMarkdown(match.content); }
      else { modalContent.innerHTML = '<p style="color:var(--text-secondary);font-style:italic">Could not find test file for \\u201C' + esc(testName) + '\\u201D.</p>'; }
    }
    function closeModal() { modal.classList.remove('active'); document.body.style.overflow = ''; }
    document.getElementById('modalClose').addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });

    // Report modal logic
    var reportModal = document.getElementById('reportModal');
    var reportModalContent = document.getElementById('reportModalContent');
    var reportCache = {};
    function openReportModal(resultId) {
      reportModalContent.innerHTML = '<p style="color:var(--text-secondary)">Loading report...</p>';
      reportModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (reportCache[resultId]) { reportModalContent.innerHTML = renderMarkdown(reportCache[resultId]); return; }
      fetch('/api/result/' + encodeURIComponent(resultId) + '/report')
        .then(function(res) { if (!res.ok) throw new Error('n/a'); return res.json(); })
        .then(function(data) { reportCache[resultId] = data.markdown; reportModalContent.innerHTML = renderMarkdown(data.markdown); })
        .catch(function() { reportModalContent.innerHTML = '<p style="color:var(--text-secondary);font-style:italic">Report not available for this result.</p>'; });
    }
    function closeReportModal() { reportModal.classList.remove('active'); document.body.style.overflow = ''; }
    document.getElementById('reportModalClose').addEventListener('click', closeReportModal);
    reportModal.addEventListener('click', function(e) { if (e.target === reportModal) closeReportModal(); });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (modal.classList.contains('active')) closeModal();
        if (reportModal.classList.contains('active')) closeReportModal();
      }
    });

    // Render test breakdown with clickable test names
    function renderTestBreakdown(data, resultId) {
      if (!data || !data.testResults || data.testResults.length === 0) {
        return '<div class="detail-empty">Detailed breakdown not available</div>';
      }
      var m = data.aggregatedMetrics || {};
      var html = '<div class="detail-content">';
      html += '<div class="detail-metrics">';
      html += '<div class="detail-metric"><div class="detail-metric-label">Accuracy</div><div class="detail-metric-value">' + (m.accuracy != null ? m.accuracy.toFixed(1) + '%' : '-') + '</div></div>';
      html += '<div class="detail-metric"><div class="detail-metric-label">Tokens</div><div class="detail-metric-value">' + (m.tokensTotal != null ? m.tokensTotal.toLocaleString() : '-') + '</div></div>';
      html += '<div class="detail-metric"><div class="detail-metric-label">Duration</div><div class="detail-metric-value">' + (m.durationMs != null ? (m.durationMs / 1000).toFixed(1) + 's' : '-') + '</div></div>';
      html += '<div class="detail-metric"><div class="detail-metric-label">Cost</div><div class="detail-metric-value">$' + (m.costUsd != null ? m.costUsd.toFixed(4) : '-') + '</div></div>';
      html += '<div class="detail-metric"><div class="detail-metric-label">Tools</div><div class="detail-metric-value">' + (m.toolCount != null ? m.toolCount : '-') + '</div></div>';
      html += '</div>';
      var byTest = {};
      data.testResults.forEach(function(tr) {
        var name = tr.test ? tr.test.name : 'Unknown';
        if (!byTest[name]) byTest[name] = [];
        byTest[name].push(tr);
      });
      html += '<div class="test-breakdown-title">Test Results (' + data.testResults.length + ')</div>';
      html += '<div class="test-breakdown">';
      Object.keys(byTest).forEach(function(name) {
        var runs = byTest[name];
        var avgAcc = runs.reduce(function(s, r) { return s + (r.metrics ? r.metrics.accuracy : 0); }, 0) / runs.length;
        var first = runs[0];
        var type = first.test ? first.test.type : '';
        var tokens = first.metrics ? first.metrics.tokensTotal : 0;
        var dur = first.metrics ? (first.metrics.durationMs / 1000).toFixed(1) : '-';
        var cost = first.metrics ? first.metrics.costUsd.toFixed(4) : '-';
        var matched = first.matchedConcepts || [];
        var missed = first.missedConcepts || [];
        html += '<div class="test-item">';
        html += '<div class="test-item-header"><span class="test-item-name clickable" data-test-name="' + esc(name) + '" data-result-id="' + esc(resultId) + '">' + esc(name) + '</span><span class="test-item-type">' + esc(type) + '</span></div>';
        html += '<div class="test-item-stats">' + avgAcc.toFixed(1) + '% accuracy \\u00B7 ' + tokens.toLocaleString() + ' tokens \\u00B7 ' + dur + 's \\u00B7 $' + cost;
        if (runs.length > 1) html += ' \\u00B7 ' + runs.length + ' runs';
        html += '</div>';
        if (matched.length > 0 || missed.length > 0) {
          html += '<div class="test-concepts">';
          if (matched.length > 0) html += '<span class="concept-matched">Matched: ' + matched.map(esc).join(', ') + '</span>';
          if (matched.length > 0 && missed.length > 0) html += '<br>';
          if (missed.length > 0) html += '<span class="concept-missed">Missed: ' + missed.map(esc).join(', ') + '</span>';
          html += '</div>';
        }
        html += '</div>';
      });
      html += '</div></div>';
      return html;
    }

    // Delegate click on test names to open modal
    document.addEventListener('click', function(e) {
      var target = e.target.closest('.test-item-name.clickable');
      if (target) { e.stopPropagation(); openTestFileModal(target.dataset.testName, target.dataset.resultId); }
    });

    // Result row expand/collapse
    document.querySelectorAll('.result-row').forEach(function(row) {
      row.addEventListener('click', async function() {
        var id = row.dataset.resultId;
        var detail = document.querySelector('.result-detail[data-result-id="' + id + '"]');
        if (!detail) return;
        if (detail.classList.contains('active')) { detail.classList.remove('active'); row.classList.remove('expanded'); return; }
        document.querySelectorAll('.result-detail.active').forEach(function(d) { d.classList.remove('active'); });
        document.querySelectorAll('.result-row.expanded').forEach(function(r) { r.classList.remove('expanded'); });
        row.classList.add('expanded');
        detail.classList.add('active');
        if (!detail.dataset.loaded) {
          detail.querySelector('td').innerHTML = '<span class="detail-placeholder">Loading...</span>';
          try {
            var res = await fetch('/api/result/' + encodeURIComponent(id));
            if (!res.ok) throw new Error('Not found');
            var data = await res.json();
            detail.querySelector('td').innerHTML = renderTestBreakdown(data, id);
            detail.dataset.loaded = '1';
          } catch (e) {
            detail.querySelector('td').innerHTML = '<div class="detail-empty">Detailed breakdown not available</div>';
            detail.dataset.loaded = '1';
          }
        }
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
