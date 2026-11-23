import { Router } from 'express';
import { readState, replaceState } from '../services/store.js';

export function stateRoutes(db) {
  const router = Router();

  router.get('/state', (_req, res) => {
    res.json(readState(db));
  });

  router.put('/state', (req, res) => {
    const state = replaceState(db, req.body);
    res.json({ ok: true, state });
  });

  return router;
}
