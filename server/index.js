import 'dotenv/config';
import path from 'node:path';
import { createDb } from './db/index.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT) || 8787;
const databasePath = process.env.DATABASE_PATH || path.join('data', 'radd.sqlite');

const db = createDb(databasePath);
const app = createApp(db);

const server = app.listen(port, () => {
  console.log(`\n  ردّ — Radd API`);
  console.log(`  http://localhost:${port}`);
  console.log(`  database: ${databasePath}`);
  console.log(`  web app:  http://localhost:5173 (npm run dev)\n`);
});

function shutdown(signal) {
  console.log(`\n[radd] ${signal} received, closing database…`);
  server.close(() => {
    try {
      db.close();
    } finally {
      process.exit(0);
    }
  });
  setTimeout(() => process.exit(0), 4000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
