import { validateState } from './validate.js';

const parseJson = (value, fallback = null) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export function readState(db) {
  const businesses = db.prepare('SELECT * FROM businesses ORDER BY id').all().map((row) => ({
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    type: row.type,
    address: row.address,
    addressEn: row.address_en,
    phone: row.phone,
    hours: parseJson(row.hours_json, {}),
    botTone: row.bot_tone,
    defaultLanguage: row.default_language,
    plan: row.plan,
    renewalAt: row.renewal_at,
    accent: row.accent,
    createdAt: row.created_at,
  }));

  const products = db.prepare('SELECT * FROM products ORDER BY id').all().map((row) => ({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    nameEn: row.name_en,
    price: row.price,
    description: row.description,
    descriptionEn: row.description_en,
    available: Boolean(row.available),
    createdAt: row.created_at,
  }));

  const customers = db.prepare('SELECT * FROM customers ORDER BY id').all().map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    lastConversationAt: row.last_conversation_at,
    createdAt: row.created_at,
  }));

  const conversations = db.prepare('SELECT * FROM conversations ORDER BY id').all().map((row) => ({
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    status: row.status,
    afterHours: Boolean(row.after_hours),
    botState: parseJson(row.bot_state, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const messages = db.prepare('SELECT * FROM messages ORDER BY id').all().map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    sender: row.sender,
    text: row.text,
    at: row.at,
    status: row.status,
  }));

  const appointments = db.prepare('SELECT * FROM appointments ORDER BY id').all().map((row) => ({
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    date: row.date,
    time: row.time,
    service: row.service,
    status: row.status,
    createdAt: row.created_at,
  }));

  const orders = db.prepare('SELECT * FROM orders ORDER BY id').all().map((row) => ({
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    items: parseJson(row.items_json, []),
    address: row.address,
    phone: row.phone,
    status: row.status,
    total: row.total,
    createdAt: row.created_at,
  }));

  const settingsRows = db.prepare('SELECT * FROM settings').all();
  const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));

  return { businesses, products, customers, conversations, messages, appointments, orders, settings };
}

export function replaceState(db, raw) {
  const clean = validateState(raw);
  const insertBusiness = db.prepare(`
    INSERT INTO businesses (id, name, name_en, type, address, address_en, phone, hours_json, bot_tone, default_language, plan, renewal_at, accent, created_at)
    VALUES (@id, @name, @nameEn, @type, @address, @addressEn, @phone, @hoursJson, @botTone, @defaultLanguage, @plan, @renewalAt, @accent, @createdAt)
  `);
  const insertProduct = db.prepare(`
    INSERT INTO products (id, business_id, name, name_en, price, description, description_en, available, created_at)
    VALUES (@id, @businessId, @name, @nameEn, @price, @description, @descriptionEn, @available, @createdAt)
  `);
  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, name, phone, last_conversation_at, created_at)
    VALUES (@id, @name, @phone, @lastConversationAt, @createdAt)
  `);
  const insertConversation = db.prepare(`
    INSERT INTO conversations (id, customer_id, business_id, status, after_hours, bot_state, created_at, updated_at)
    VALUES (@id, @customerId, @businessId, @status, @afterHours, @botState, @createdAt, @updatedAt)
  `);
  const insertMessage = db.prepare(`
    INSERT INTO messages (id, conversation_id, sender, text, at, status)
    VALUES (@id, @conversationId, @sender, @text, @at, @status)
  `);
  const insertAppointment = db.prepare(`
    INSERT INTO appointments (id, customer_id, business_id, date, time, service, status, created_at)
    VALUES (@id, @customerId, @businessId, @date, @time, @service, @status, @createdAt)
  `);
  const insertOrder = db.prepare(`
    INSERT INTO orders (id, customer_id, business_id, items_json, address, phone, status, total, created_at)
    VALUES (@id, @customerId, @businessId, @itemsJson, @address, @phone, @status, @total, @createdAt)
  `);
  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  const run = db.transaction(() => {
    db.exec('DELETE FROM messages; DELETE FROM orders; DELETE FROM appointments; DELETE FROM conversations; DELETE FROM customers; DELETE FROM products; DELETE FROM businesses; DELETE FROM settings;');
    for (const b of clean.businesses) insertBusiness.run(b);
    for (const p of clean.products) insertProduct.run({ ...p, available: p.available ? 1 : 0 });
    for (const c of clean.customers) insertCustomer.run(c);
    for (const c of clean.conversations) insertConversation.run({ ...c, afterHours: c.afterHours ? 1 : 0 });
    for (const m of clean.messages) insertMessage.run(m);
    for (const a of clean.appointments) insertAppointment.run(a);
    for (const o of clean.orders) insertOrder.run(o);
    for (const [key, value] of Object.entries(clean.settings)) insertSetting.run(key, value);

    const tables = ['businesses', 'products', 'customers', 'conversations', 'messages', 'appointments', 'orders'];
    for (const table of tables) {
      const max = db.prepare(`SELECT COALESCE(MAX(id), 0) AS m FROM ${table}`).get().m;
      db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run(table);
      db.prepare('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)').run(table, max);
    }
  });
  run();
  return readState(db);
}
