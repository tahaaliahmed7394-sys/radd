import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateRoutes } from './routes/state.js';
import { businessRoutes } from './routes/businesses.js';
import { appointmentRoutes, orderRoutes } from './routes/appointments.js';
import { conversationRoutes, settingsRoutes } from './routes/conversations.js';
import { whatsappRoutes } from './routes/whatsapp.js';
import { ApiError } from './services/validate.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

/**
 * Builds the Express app around an open SQLite database.
 * Keeping this separate from index.js lets tests use an in-memory database.
 */
export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, app: 'radd', at: new Date().toISOString() });
  });

  app.use(
    '/api',
    stateRoutes(db),
    businessRoutes(db),
    appointmentRoutes(db),
    orderRoutes(db),
    conversationRoutes(db),
    settingsRoutes(db),
    whatsappRoutes(db),
  );

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Unknown API route' } });
  });

  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      if (!fs.existsSync(indexPath)) return next();
      res.sendFile(indexPath);
    });
  } else {
    app.get('/', (_req, res) => {
      res.json({
        ok: true,
        app: 'radd',
        message: 'Radd API is running. Start the web app with "npm run dev" or build it with "npm run build".',
      });
    });
  }

  // 404 for anything else (only reachable when dist is absent).
  app.use((req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: `Not found: ${req.method} ${req.path}` } });
  });

  // Central error handler: validation errors become clean JSON responses.
  app.use((error, _req, res, _next) => {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        error: { code: error.code, message: error.message, field: error.field },
      });
    }
    if (error?.type === 'entity.parse.failed' || error instanceof SyntaxError) {
      return res.status(400).json({ error: { code: 'bad_json', message: 'Malformed JSON body' } });
    }
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || error?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      return res.status(409).json({ error: { code: 'conflict', message: 'This record already exists' } });
    }
    if (error?.code?.startsWith('SQLITE_CONSTRAINT')) {
      return res.status(400).json({ error: { code: 'validation', message: 'The data violates a database rule' } });
    }
    console.error('[radd] unhandled error:', error);
    return res.status(500).json({ error: { code: 'internal', message: 'Unexpected server error' } });
  });

  return app;
}
