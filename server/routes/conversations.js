import { Router } from 'express';
import { ApiError, assert, sanitizeText } from '../services/validate.js';

const STATUSES = ['bot', 'human', 'closed'];
const SENDERS = ['customer', 'bot', 'human'];

function mapRow(row) {
  let botState = null;
  if (row.bot_state) {
    try {
      botState = JSON.parse(row.bot_state);
    } catch {
      botState = null;
    }
  }
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    status: row.status,
    afterHours: Boolean(row.after_hours),
    botState,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function messageRow(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    sender: row.sender,
    text: row.text,
    at: row.at,
    status: row.status,
  };
}

export function conversationRoutes(db) {
  const router = Router();

  router.get('/conversations', (req, res) => {
    const businessId = req.query.businessId ? Number(req.query.businessId) : null;
    const rows = businessId
      ? db.prepare('SELECT * FROM conversations WHERE business_id = ? ORDER BY updated_at DESC').all(businessId)
      : db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all();
    res.json(rows.map(mapRow));
  });

  router.get('/conversations/:id/messages', (req, res) => {
    const id = Number(req.params.id);
    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
    if (!conversation) throw new ApiError(404, 'not_found', 'Conversation not found');
    const rows = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY at, id').all(id);
    res.json(rows.map(messageRow));
  });

  router.post('/conversations/:id/messages', (req, res) => {
    const id = Number(req.params.id);
    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
    if (!conversation) throw new ApiError(404, 'not_found', 'Conversation not found');
    const sender = req.body?.sender ?? 'customer';
    assert(SENDERS.includes(sender), 'Invalid sender', 'sender');
    const text = sanitizeText(req.body?.text, 4000);
    assert(text.length > 0, 'Message text is required', 'text');
    const at = new Date().toISOString();
    const info = db
      .prepare('INSERT INTO messages (conversation_id, sender, text, at, status) VALUES (?, ?, ?, ?, ?)')
      .run(id, sender, text, at, 'delivered');
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(at, id);
    db.prepare('UPDATE customers SET last_conversation_at = ? WHERE id = ?').run(at, conversation.customer_id);
    res.status(201).json(messageRow(db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid)));
  });

  router.patch('/conversations/:id', (req, res) => {
    const id = Number(req.params.id);
    const current = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
    if (!current) throw new ApiError(404, 'not_found', 'Conversation not found');
    const status = req.body?.status ?? current.status;
    assert(STATUSES.includes(status), 'Invalid conversation status', 'status');
    const afterHours = req.body?.afterHours !== undefined ? (req.body.afterHours ? 1 : 0) : current.after_hours;
    const botState =
      req.body?.botState !== undefined
        ? req.body.botState
          ? JSON.stringify(req.body.botState)
          : null
        : current.bot_state;
    db.prepare('UPDATE conversations SET status = ?, after_hours = ?, bot_state = ?, updated_at = ? WHERE id = ?').run(
      status,
      afterHours,
      botState,
      new Date().toISOString(),
      id,
    );
    res.json(mapRow(db.prepare('SELECT * FROM conversations WHERE id = ?').get(id)));
  });

  return router;
}

export function settingsRoutes(db) {
  const router = Router();

  router.get('/settings', (_req, res) => {
    const rows = db.prepare('SELECT * FROM settings').all();
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  });

  router.put('/settings', (req, res) => {
    const body = req.body ?? {};
    assert(body && typeof body === 'object' && !Array.isArray(body), 'Settings must be an object');
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const run = db.transaction(() => {
      db.exec('DELETE FROM settings');
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          upsert.run(String(key).slice(0, 120), String(value).slice(0, 2000));
        }
      }
    });
    run();
    res.json({ ok: true });
  });

  return router;
}
