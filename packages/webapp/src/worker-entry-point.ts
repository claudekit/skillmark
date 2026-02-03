/**
 * Skillmark Cloudflare Worker entry point
 *
 * Routes:
 *   GET  /                - Leaderboard HTML page
 *   POST /api/results     - Submit benchmark results
 *   GET  /api/leaderboard - Get skill rankings JSON
 *   GET  /api/skill/:name - Get specific skill details
 *   POST /api/verify      - Verify API key
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { apiRouter } from './routes/api-endpoints-handler.js';
import { pagesRouter } from './routes/html-pages-renderer.js';

type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Skillmark-Version'],
}));

// Only log in development
app.use('*', async (c, next) => {
  if (c.env.ENVIRONMENT !== 'production') {
    return logger()(c, next);
  }
  return next();
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.route('/api', apiRouter);

// HTML pages
app.route('/', pagesRouter);

// 404 handler
app.notFound((c) => {
  const accept = c.req.header('Accept') || '';

  if (accept.includes('application/json')) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Skillmark</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          background: #0d1117;
          color: #c9d1d9;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
        }
        .container { text-align: center; }
        h1 { color: #58a6ff; }
        a { color: #58a6ff; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>404</h1>
        <p>Page not found</p>
        <p><a href="/">Back to leaderboard</a></p>
      </div>
    </body>
    </html>
  `, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);

  const accept = c.req.header('Accept') || '';

  if (accept.includes('application/json')) {
    return c.json({ error: 'Internal server error' }, 500);
  }

  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error - Skillmark</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          background: #0d1117;
          color: #c9d1d9;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
        }
        .container { text-align: center; }
        h1 { color: #f85149; }
        a { color: #58a6ff; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Error</h1>
        <p>Something went wrong</p>
        <p><a href="/">Back to leaderboard</a></p>
      </div>
    </body>
    </html>
  `, 500);
});

export default app;
