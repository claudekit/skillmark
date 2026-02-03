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
  bestModel: string;
  avgTokens: number;
  avgCost: number;
  lastTested: number;
  totalRuns: number;
}

/**
 * GET / - Leaderboard homepage
 */
pagesRouter.get('/', async (c) => {
  try {
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
      LIMIT 50
    `).all();

    const entries = (results.results || []) as unknown as LeaderboardRow[];

    return c.html(renderLeaderboardPage(entries));
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
 * Render the leaderboard HTML page - Vercel/skills.sh style
 */
function renderLeaderboardPage(entries: LeaderboardRow[]): string {
  const totalRuns = entries.reduce((sum, e) => sum + e.totalRuns, 0);

  const rows = entries.map((entry, index) => {
    const rank = index + 1;
    const accuracy = entry.bestAccuracy.toFixed(1);
    const source = entry.source || '';
    const repoPath = source.replace('https://github.com/', '').replace(/\.git$/, '');

    return `
      <tr>
        <td class="rank">${rank}</td>
        <td class="skill">
          <span class="skill-name">${escapeHtml(entry.skillName)}</span>
          ${repoPath ? `<span class="skill-repo">${escapeHtml(repoPath)}</span>` : ''}
        </td>
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

    .skill-name {
      font-weight: 500;
    }

    .skill-repo {
      font-family: 'Geist Mono', monospace;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .accuracy {
      text-align: right;
      font-family: 'Geist Mono', monospace;
      font-weight: 500;
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
  <nav>
    <div class="nav-left">
      <svg class="nav-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
      <span class="nav-divider">/</span>
      <span class="nav-title">Skillmark</span>
    </div>
    <div class="nav-right">
      <a href="/docs">Docs</a>
      <a href="/how-it-works">How It Works</a>
      <a href="https://github.com/claudekit/skillmark">GitHub</a>
    </div>
  </nav>

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
        <button class="tab">By Cost</button>
      </div>

      ${entries.length > 0 ? `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Skill</th>
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
        <a href="https://github.com/claudekit/skillmark">GitHub</a>
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
      <h2>Quick Start</h2>
      <p>Run your first benchmark in 3 steps:</p>

      <h3>1. Create a test file</h3>
      <p>Create <code>tests/my-test.md</code> with YAML frontmatter:</p>
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
        <tr><td><code>--model &lt;model&gt;</code></td><td>haiku | sonnet | opus (default: sonnet)</td></tr>
        <tr><td><code>--runs &lt;n&gt;</code></td><td>Number of iterations (default: 3)</td></tr>
        <tr><td><code>--output &lt;dir&gt;</code></td><td>Output directory (default: ./skillmark-results)</td></tr>
      </table>
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
        <li><strong>Tokens</strong> - Total tokens consumed (input + output)</li>
        <li><strong>Duration</strong> - Wall-clock execution time</li>
        <li><strong>Cost</strong> - Estimated API cost in USD</li>
        <li><strong>Tool Calls</strong> - Number of tool invocations</li>
      </ul>
    </section>

    <section class="doc-section">
      <h2>Test Types</h2>
      <table>
        <tr><td><code>knowledge</code></td><td>Q&A style tests checking if response covers expected concepts</td></tr>
        <tr><td><code>task</code></td><td>Execution tests verifying tool usage and task completion</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Scoring</h2>
      <p>Accuracy is calculated by matching response content against expected concepts:</p>
      <pre><code>accuracy = (matched_concepts / total_concepts) × 100%</code></pre>
      <p>The scorer uses fuzzy matching to handle variations like plurals, hyphens, and common abbreviations.</p>
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
      <a href="https://github.com/claudekit/skillmark">GitHub</a>
    </div>
  </nav>
  <div class="container">
    <h1>${title}</h1>
    ${content}
    <footer>
      <a href="https://github.com/claudekit/skillmark">Skillmark</a> · Built for AI agent developers
    </footer>
  </div>
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
