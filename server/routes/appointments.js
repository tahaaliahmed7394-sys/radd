import { Router } from 'express';
import {
  ApiError,
  assert,
  isValidClock,
  isValidDateKey,
  isValidPhone,
  normalizePhone,
  sanitizeText,
} from '../services/validate.js';

const STATUSES = ['confirmed', 'cancelled', 'done'];

function mapRow(row) {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    date: row.date,
    time: row.time,
    service: row.service,
    status: row.status,
    createdAt: row.created_at,
  };
}

function ensureRefs(db, businessId, customerId) {
  assert(db.prepare('SELECT 1 FROM businesses WHERE id = ?').get(businessId), 'Unknown business', 'businessId');
  assert(db.prepare('SELECT 1 FROM customers WHERE id = ?').get(customerId), 'Unknown customer', 'customerId');
}

function ensureSlotFree(db, businessId, date, time, excludeId = 0) {
  const existing = db
    .prepare(
      `SELECT id FROM appointments
       WHERE business_id = ? AND date = ? AND time = ? AND status <> 'cancelled' AND id <> ?`,
    )
    .get(businessId, date, time, excludeId);
  if (existing) {
    throw new ApiError(409, 'conflict', 'This appointment slot is already booked', 'time');
  }
}

export function appointmentRoutes(db) {
  const router = Router();

  router.get('/appointments', (req, res) => {
    const businessId = req.query.businessId ? Number(req.query.businessId) : null;
    const rows = businessId
      ? db.prepare('SELECT * FROM appointments WHERE business_id = ? ORDER BY date, time').all(businessId)
      : db.prepare('SELECT * FROM appointments ORDER BY date, time').all();
    res.json(rows.map(mapRow));
  });

  router.post('/appointments', (req, res) => {
    const body = req.body ?? {};
    const businessId = Number(body.businessId);
    const customerId = Number(body.customerId);
    ensureRefs(db, businessId, customerId);
    const date = String(body.date ?? '');
    const time = String(body.time ?? '');
    assert(isValidDateKey(date), 'Invalid date', 'date');
    assert(isValidClock(time), 'Invalid time', 'time');
    ensureSlotFree(db, businessId, date, time);
    const service = sanitizeText(body.service ?? '', 160);
    const info = db
      .prepare(
        `INSERT INTO appointments (customer_id, business_id, date, time, service, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`,
      )
      .run(customerId, businessId, date, time, service, new Date().toISOString());
    res.status(201).json(mapRow(db.prepare('SELECT * FROM appointments WHERE id = ?').get(info.lastInsertRowid)));
  });

  router.patch('/appointments/:id', (req, res) => {
    const id = Number(req.params.id);
    const current = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    if (!current) throw new ApiError(404, 'not_found', 'Appointment not found');
    const body = req.body ?? {};
    const next = {
      date: body.date !== undefined ? String(body.date) : current.date,
      time: body.time !== undefined ? String(body.time) : current.time,
      service: body.service !== undefined ? sanitizeText(body.service, 160) : current.service,
      status: body.status ?? current.status,
    };
    assert(isValidDateKey(next.date), 'Invalid date', 'date');
    assert(isValidClock(next.time), 'Invalid time', 'time');
    assert(STATUSES.includes(next.status), 'Invalid appointment status', 'status');
    if (next.status !== 'cancelled') {
      ensureSlotFree(db, current.business_id, next.date, next.time, id);
    }
    db.prepare('UPDATE appointments SET date=?, time=?, service=?, status=? WHERE id=?').run(
      next.date,
      next.time,
      next.service,
      next.status,
      id,
    );
    res.json(mapRow(db.prepare('SELECT * FROM appointments WHERE id = ?').get(id)));
  });

  router.delete('/appointments/:id', (req, res) => {
    const result = db.prepare("UPDATE appointments SET status='cancelled' WHERE id = ?").run(Number(req.params.id));
    if (result.changes === 0) throw new ApiError(404, 'not_found', 'Appointment not found');
    res.json({ ok: true });
  });

  return router;
}

const ORDER_STATUSES = ['new', 'preparing', 'delivered', 'cancelled'];

function orderRow(row) {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    items: JSON.parse(row.items_json),
    address: row.address,
    phone: row.phone,
    status: row.status,
    total: row.total,
    createdAt: row.created_at,
  };
}

export function orderRoutes(db) {
  const router = Router();

  router.get('/orders', (req, res) => {
    const businessId = req.query.businessId ? Number(req.query.businessId) : null;
    const rows = businessId
      ? db.prepare('SELECT * FROM orders WHERE business_id = ? ORDER BY id DESC').all(businessId)
      : db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
    res.json(rows.map(orderRow));
  });

  router.post('/orders', (req, res) => {
    const body = req.body ?? {};
    const businessId = Number(body.businessId);
    const customerId = Number(body.customerId);
    const business = db.prepare('SELECT id FROM businesses WHERE id = ?').get(businessId);
    assert(business, 'Unknown business', 'businessId');
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    assert(customer, 'Unknown customer', 'customerId');
    const phone = normalizePhone(body.phone ?? customer.phone);
    assert(isValidPhone(phone), 'Invalid phone number', 'phone');
    const address = sanitizeText(body.address, 300);
    assert(address.length >= 5, 'Address is too short', 'address');
    assert(Array.isArray(body.items) && body.items.length > 0, 'Order needs at least one item', 'items');
    assert(body.items.length <= 50, 'Too many items', 'items');
    let total = 0;
    const items = body.items.map((item) => {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(item.productId));
      assert(product, 'Unknown product', 'items');
      assert(product.business_id === businessId, 'Product belongs to another business', 'items');
      assert(product.available === 1, `Product "${product.name}" is unavailable`, 'items');
      const qty = Number(item.qty);
      assert(Number.isInteger(qty) && qty >= 1 && qty <= 99, 'Invalid quantity', 'qty');
      total += product.price * qty;
      return { productId: product.id, name: product.name, price: product.price, qty };
    });
    const info = db
      .prepare(
        `INSERT INTO orders (customer_id, business_id, items_json, address, phone, status, total, created_at)
         VALUES (?, ?, ?, ?, ?, 'new', ?, ?)`,
      )
      .run(customerId, businessId, JSON.stringify(items), address, phone, total, new Date().toISOString());
    res.status(201).json(orderRow(db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid)));
  });

  router.patch('/orders/:id', (req, res) => {
    const id = Number(req.params.id);
    const current = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!current) throw new ApiError(404, 'not_found', 'Order not found');
    const status = req.body?.status ?? current.status;
    assert(ORDER_STATUSES.includes(status), 'Invalid order status', 'status');
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    res.json(orderRow(db.prepare('SELECT * FROM orders WHERE id = ?').get(id)));
  });

  return router;
}
