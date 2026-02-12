/**
 * Skillmark Embeddable Radar Chart Widget
 *
 * Usage: <script src="https://skillmark.sh/embed.js" data-skill="skill-name" data-theme="dark"></script>
 *
 * Attributes:
 *   data-skill  - Skill name (required)
 *   data-theme  - "dark" (default) or "light"
 *   data-width  - CSS width (default "350px")
 */

const API_BASE = 'https://skillmark.sh/api';

interface SkillData {
  bestAccuracy: number;
  bestSecurity: number | null;
  bestTrigger: number | null;
  avgTokens: number;
  avgCost: number;
  skillName: string;
  history: Array<{ durationMs: number | null }>;
}

/** Normalize metrics to 0-100 scale */
function computeMetrics(d: SkillData) {
  const durResults = d.history.filter(r => r.durationMs != null && r.durationMs > 0);
  const avgDuration = durResults.length > 0
    ? durResults.reduce((s, r) => s + (r.durationMs as number), 0) / durResults.length
    : 0;

  return {
    accuracy: clamp(d.bestAccuracy),
    security: clamp(d.bestSecurity ?? 0),
    trigger: clamp(d.bestTrigger ?? 0),
    tokenEfficiency: clamp(100 - (d.avgTokens / 10000) * 100),
    costEfficiency: clamp(100 - (d.avgCost / 0.10) * 100),
    speed: clamp(100 - (avgDuration / 60000) * 100),
  };
}

function clamp(v: number) { return Math.max(0, Math.min(100, v)); }

/** Generate SVG radar chart string */
function renderSvg(
  metrics: ReturnType<typeof computeMetrics>,
  theme: 'dark' | 'light',
) {
  const cx = 180, cy = 160, maxR = 110;
  const labels = ['Accuracy', 'Security', 'Trigger', 'Tokens', 'Cost', 'Speed'];
  const values = [metrics.accuracy, metrics.security, metrics.trigger, metrics.tokenEfficiency, metrics.costEfficiency, metrics.speed];
  const angles = labels.map((_, i) => (-90 + i * 60) * Math.PI / 180);

  const pt = (a: number, r: number) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  const poly = (r: number) => angles.map(a => pt(a, r)).join(' ');

  const gridColor = theme === 'dark' ? '#333' : '#ccc';
  const fillColor = theme === 'dark' ? 'rgba(88,166,255,0.15)' : 'rgba(37,99,235,0.12)';
  const strokeColor = theme === 'dark' ? '#58a6ff' : '#2563eb';
  const labelColor = theme === 'dark' ? '#888' : '#666';
  const valueColor = theme === 'dark' ? '#ededed' : '#111';
  const bgColor = theme === 'dark' ? '#0d1117' : '#ffffff';
  const brandColor = theme === 'dark' ? '#484f58' : '#aaa';

  const grid = [0.25, 0.5, 0.75, 1.0].map(p =>
    `<polygon points="${poly(maxR * p)}" fill="none" stroke="${gridColor}" stroke-width="0.5"/>`
  ).join('');

  const axes = angles.map(a => {
    const [x2, y2] = pt(a, maxR).split(',');
    return `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="${gridColor}" stroke-width="0.5"/>`;
  }).join('');

  const dataPoints = values.map((v, i) => pt(angles[i], (v / 100) * maxR));
  const dataPoly = `<polygon points="${dataPoints.join(' ')}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5"/>`;
  const dots = dataPoints.map(p => {
    const [x, y] = p.split(',');
    return `<circle cx="${x}" cy="${y}" r="3" fill="${strokeColor}"/>`;
  }).join('');

  const lbls = labels.map((label, i) => {
    const a = angles[i];
    const lx = cx + (maxR + 24) * Math.cos(a);
    const ly = cy + (maxR + 24) * Math.sin(a);
    const anchor = Math.abs(lx - cx) < 5 ? 'middle' : lx > cx ? 'start' : 'end';
    return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="11" fill="${labelColor}" font-family="system-ui,sans-serif">${label}</text>
<text x="${lx.toFixed(1)}" y="${(ly + 13).toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="10" fill="${valueColor}" font-family="monospace">${values[i].toFixed(0)}</text>`;
  }).join('\n');

  // "Powered by Skillmark" branding
  const brand = `<text x="180" y="330" text-anchor="middle" font-size="9" fill="${brandColor}" font-family="system-ui,sans-serif">Powered by skillmark.sh</text>`;

  return `<svg viewBox="0 0 360 340" xmlns="http://www.w3.org/2000/svg" style="background:${bgColor};border-radius:8px">
${grid}${axes}${dataPoly}${dots}
${lbls}
${brand}
</svg>`;
}

/** Initialize all skillmark embed widgets on the page */
function init() {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[data-skill][src*="embed"]');

  scripts.forEach(async (script) => {
    const skillName = script.getAttribute('data-skill');
    if (!skillName) return;

    const theme = (script.getAttribute('data-theme') || 'dark') as 'dark' | 'light';
    const width = script.getAttribute('data-width') || '350px';

    // Create shadow host next to the script tag
    const host = document.createElement('div');
    host.style.width = width;
    script.parentNode?.insertBefore(host, script.nextSibling);

    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `<div style="width:100%;text-align:center;font-family:system-ui;color:${theme === 'dark' ? '#888' : '#666'};font-size:12px">Loading...</div>`;

    try {
      const res = await fetch(`${API_BASE}/skill/${encodeURIComponent(skillName)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SkillData = await res.json();
      const metrics = computeMetrics(data);
      const svg = renderSvg(metrics, theme);
      shadow.innerHTML = svg;
    } catch {
      shadow.innerHTML = `<div style="padding:1rem;text-align:center;font-family:system-ui;color:#f85149;font-size:12px">Failed to load skill data</div>`;
    }
  });
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
