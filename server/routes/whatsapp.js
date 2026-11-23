import { Router } from 'express';
import { whatsappConfig, whatsappStatus, sendWhatsAppText, extractWhatsAppMessages } from '../services/whatsapp.js';
import { generateBotReply } from '../services/bot.js';
import { sanitizeText } from '../services/validate.js';

const seen = new Set();
function dedupe(id) {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 5000) {
    const first = seen.values().next().value;
    seen.delete(first);
  }
  return false;
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  return `+${digits}`;
}

function findOrCreateCustomer(db, { name, phone }) {
  const cleanPhone = normalizePhone(phone);
  const existing = db.prepare('SELECT * FROM customers WHERE phone = ?').get(cleanPhone);
  if (existing) return existing;
  const now = new Date().toISOString();
  const info = db.prepare('INSERT INTO customers (name, phone, last_conversation_at, created_at) VALUES (?, ?, ?, ?)').run(
    sanitizeText(name || cleanPhone, 120) || cleanPhone,
    cleanPhone,
    now,
    now,
  );
  return db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
}

function findOrCreateConversation(db, { businessId, customerId }) {
  const existing = db
    .prepare("SELECT * FROM conversations WHERE business_id = ? AND customer_id = ? AND status != 'closed' ORDER BY updated_at DESC LIMIT 1")
    .get(businessId, customerId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const info = db
    .prepare('INSERT INTO conversations (customer_id, business_id, status, after_hours, bot_state, created_at, updated_at) VALUES (?, ?, ?, 0, NULL, ?, ?)')
    .run(customerId, businessId, 'bot', now, now);
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(info.lastInsertRowid);
}

function insertMessage(db, { conversationId, sender, text, at }) {
  const info = db
    .prepare('INSERT INTO messages (conversation_id, sender, text, at, status) VALUES (?, ?, ?, ?, ?)')
    .run(conversationId, sender, sanitizeText(text, 4000), at || new Date().toISOString(), 'delivered');
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
}

export function whatsappRoutes(db) {
  const router = Router();

  router.get('/whatsapp/status', (_req, res) => {
    res.json(whatsappStatus());
  });

  router.get('/whatsapp/webhook', (req, res) => {
    const cfg = whatsappConfig();
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token && token === cfg.verifyToken) {
      return res.status(200).send(String(challenge));
    }
    return res.status(403).json({ error: { code: 'forbidden', message: 'Webhook verification failed' } });
  });

  router.post('/whatsapp/webhook', async (req, res) => {
    // Acknowledge immediately to avoid Meta retries; process safely.
    res.status(200).json({ ok: true });

    try {
      const cfg = whatsappConfig();
      if (cfg.mode !== 'cloud') return;
      const incoming = extractWhatsAppMessages(req.body);
      for (const msg of incoming) {
        if (dedupe(msg.messageId)) continue;
        const customer = findOrCreateCustomer(db, { name: msg.name, phone: msg.from });
        const conversation = findOrCreateConversation(db, { businessId: cfg.businessId, customerId: customer.id });
        const at = msg.timestamp || new Date().toISOString();

        insertMessage(db, { conversationId: conversation.id, sender: 'customer', text: msg.text, at });
        db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(at, conversation.id);
        db.prepare('UPDATE customers SET last_conversation_at = ? WHERE id = ?').run(at, customer.id);

        const reply = generateBotReply(db, { businessId: cfg.businessId, text: msg.text, conversation });
        for (const text of reply.replies || []) {
          const botAt = new Date().toISOString();
          insertMessage(db, { conversationId: conversation.id, sender: 'bot', text, at: botAt });
          db.prepare('UPDATE conversations SET updated_at = ?, status = ?, after_hours = ? WHERE id = ?').run(
            botAt,
            reply.status || conversation.status || 'bot',
            reply.afterHours ? 1 : conversation.after_hours ? 1 : 0,
            conversation.id,
          );
          await sendWhatsAppText(msg.from, text);
        }

        if (reply.handoff) {
          db.prepare('UPDATE conversations SET status = ?, updated_at = ? WHERE id = ?').run('human', new Date().toISOString(), conversation.id);
        }
      }
    } catch (err) {
      console.error('[radd][whatsapp] webhook error', err);
    }
  });

  return router;
}
