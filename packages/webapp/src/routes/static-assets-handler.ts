/**
 * Static assets handler for favicon and OG image
 */
import { Hono } from 'hono';

export const assetsRouter = new Hono();

// Favicon - base64 encoded PNG (36x35px)
const FAVICON_BASE64 = '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';

// OG Image - served from embedded base64
import { readFileSync } from 'fs';

/** Get favicon as PNG response */
assetsRouter.get('/favicon.ico', (c) => {
  const buffer = Uint8Array.from(atob(FAVICON_BASE64), c => c.charCodeAt(0));
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});

assetsRouter.get('/favicon.png', (c) => {
  const buffer = Uint8Array.from(atob(FAVICON_BASE64), c => c.charCodeAt(0));
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});

// OG Image - embedded base64 (loaded at build time)
// Note: For production, consider using Cloudflare R2 for large assets
const OG_IMAGE_BASE64 = `OG_IMAGE_PLACEHOLDER`;

assetsRouter.get('/og-image.png', async (c) => {
  // Return a redirect to a placeholder or serve embedded image
  // For now, we'll serve a simple SVG placeholder that can be replaced
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#0a0a0a"/>
    <text x="100" y="150" font-family="monospace" font-size="72" font-weight="bold" fill="#fff">SKILLMARK</text>
    <text x="100" y="210" font-family="monospace" font-size="24" fill="#888">THE AGENT SKILL BENCHMARKING PLATFORM</text>
    <text x="100" y="320" font-family="sans-serif" font-size="36" fill="#ccc">Benchmark your AI agent skills with detailed</text>
    <text x="100" y="370" font-family="sans-serif" font-size="36" fill="#ccc">metrics. Compare accuracy, token usage, and</text>
    <text x="100" y="420" font-family="sans-serif" font-size="36" fill="#ccc">cost across models.</text>
    <text x="100" y="540" font-family="monospace" font-size="20" fill="#666">$ npx skillmark run &lt;skill-path&gt;</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
});
