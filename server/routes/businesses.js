import { Router } from 'express';
import {
  ApiError,
  assert,
  isValidClock,
  isValidPhone,
  normalizePhone,
  sanitizeText,
} from '../services/validate.js';

const BUSINESS_TYPES = ['retail', 'clinic', 'realestate'];
const TONES = ['formal', 'friendly', 'concise'];
const PLANS = ['trial', 'active', 'paused'];
const DAY_KEYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    type: row.type,
    address: row.address,
    addressEn: row.address_en,
    phone: row.phone,
    hours: JSON.parse(row.hours_json),
    botTone: row.bot_tone,
    defaultLanguage: row.default_language,
    plan: row.plan,
    renewalAt: row.renewal_at,
    accent: row.accent,
    createdAt: row.created_at,
  };
}

export function businessRoutes(db) {
  const router = Router();

  router.get('/businesses', (_req, res) => {
    res.json(db.prepare('SELECT * FROM businesses ORDER BY id').all().map(mapRow));
  });

  router.get('/businesses/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM businesses WHERE id = ?').get(Number(req.params.id));
    if (!row) throw new ApiError(404, 'not_found', 'Business not found');
    res.json(mapRow(row));
  });

  router.patch('/businesses/:id', (req, res) => {
    const id = Number(req.params.id);
    const current = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
    if (!current) throw new ApiError(404, 'not_found', 'Business not found');
    const body = req.body ?? {};
    const next = {
      name: body.name !== undefined ? sanitizeText(body.name, 160) : current.name,
      nameEn: body.nameEn !== undefined ? sanitizeText(body.nameEn, 160) : current.name_en,
      type: body.type ?? current.type,
      address: body.address !== undefined ? sanitizeText(body.address, 300) : current.address,
      addressEn: body.addressEn !== undefined ? sanitizeText(body.addressEn, 300) : current.address_en,
      phone: body.phone !== undefined ? normalizePhone(body.phone) : current.phone,
      hours: body.hours ?? JSON.parse(current.hours_json),
      botTone: body.botTone ?? current.bot_tone,
      defaultLanguage: body.defaultLanguage ?? current.default_language,
      plan: body.plan ?? current.plan,
      renewalAt: body.renewalAt !== undefined ? body.renewalAt : current.renewal_at,
      accent: body.accent ?? current.accent,
    };
    assert(next.name.length > 0, 'Business name is required', 'name');
    assert(isValidPhone(next.phone), 'Business phone is invalid', 'phone');
    assert(BUSINESS_TYPES.includes(next.type), 'Invalid business type', 'type');
    assert(TONES.includes(next.botTone), 'Invalid bot tone', 'botTone');
    assert(PLANS.includes(next.plan), 'Invalid plan', 'plan');
    assert(['ar', 'en'].includes(next.defaultLanguage), 'Invalid language', 'defaultLanguage');
    for (const key of DAY_KEYS) {
      const day = next.hours?.[key];
      assert(day && isValidClock(day.open) && isValidClock(day.close), `Invalid hours for ${key}`, 'hours');
    }
    db.prepare(`
      UPDATE businesses SET name=@name, name_en=@nameEn, type=@type, address=@address, address_en=@addressEn,
        phone=@phone, hours_json=@hoursJson, bot_tone=@botTone, default_language=@defaultLanguage,
        plan=@plan, renewal_at=@renewalAt, accent=@accent
      WHERE id=@id
    `).run({ ...next, hoursJson: JSON.stringify(next.hours), id });
    res.json(mapRow(db.prepare('SELECT * FROM businesses WHERE id = ?').get(id)));
  });

  router.get('/products', (req, res) => {
    const businessId = req.query.businessId ? Number(req.query.businessId) : null;
    const rows = businessId
      ? db.prepare('SELECT * FROM products WHERE business_id = ? ORDER BY id').all(businessId)
      : db.prepare('SELECT * FROM products ORDER BY id').all();
    res.json(rows.map(productRow));
  });

  router.post('/products', (req, res) => {
    const body = req.body ?? {};
    const business = db.prepare('SELECT id FROM businesses WHERE id = ?').get(Number(body.businessId));
    assert(business, 'Unknown business', 'businessId');
    const name = sanitizeText(body.name, 160);
    assert(name.length > 0, 'Product name is required', 'name');
    assert(Number.isInteger(Number(body.price)) && Number(body.price) >= 0, 'Invalid price', 'price');
    const info = db.prepare(`
      INSERT INTO products (business_id, name, name_en, price, description, description_en, available, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Number(body.businessId),
      name,
      sanitizeText(body.nameEn ?? '', 160),
      Number(body.price),
      sanitizeText(body.description ?? '', 500),
      sanitizeText(body.descriptionEn ?? '', 500),
      body.available === false ? 0 : 1,
      new Date().toISOString(),
    );
    res.status(201).json(productRow(db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid)));
  });

  router.patch('/products/:id', (req, res) => {
    const id = Number(req.params.id);
    const current = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!current) throw new ApiError(404, 'not_found', 'Product not found');
    const body = req.body ?? {};
    const next = {
      name: body.name !== undefined ? sanitizeText(body.name, 160) : current.name,
      nameEn: body.nameEn !== undefined ? sanitizeText(body.nameEn, 160) : current.name_en,
      price: body.price !== undefined ? Number(body.price) : current.price,
      description: body.description !== undefined ? sanitizeText(body.description, 500) : current.description,
      descriptionEn: body.descriptionEn !== undefined ? sanitizeText(body.descriptionEn, 500) : current.description_en,
      available: body.available !== undefined ? (body.available ? 1 : 0) : current.available,
    };
    assert(next.name.length > 0, 'Product name is required', 'name');
    assert(Number.isInteger(next.price) && next.price >= 0, 'Invalid price', 'price');
    db.prepare('UPDATE products SET name=?, name_en=?, price=?, description=?, description_en=?, available=? WHERE id=?').run(
      next.name,
      next.nameEn,
      next.price,
      next.description,
      next.descriptionEn,
      next.available,
      id,
    );
    res.json(productRow(db.prepare('SELECT * FROM products WHERE id = ?').get(id)));
  });

  router.delete('/products/:id', (req, res) => {
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id));
    if (result.changes === 0) throw new ApiError(404, 'not_found', 'Product not found');
    res.json({ ok: true });
  });

  return router;
}

function productRow(row) {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    nameEn: row.name_en,
    price: row.price,
    description: row.description,
    descriptionEn: row.description_en,
    available: Boolean(row.available),
    createdAt: row.created_at,
  };
}
