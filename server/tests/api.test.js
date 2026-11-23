import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createDb } from '../db/index.js';
import { createApp } from '../app.js';

const DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

function hours(open = '09:00', close = '18:00') {
  return Object.fromEntries(DAYS.map((day) => [day, { open, close, closed: false }]));
}

function fixture(overrides = {}) {
  return {
    businesses: [
      {
        id: 1,
        name: 'متجر الاختبار',
        nameEn: 'Test Shop',
        type: 'retail',
        address: 'بغداد – الكرادة',
        addressEn: 'Baghdad – Karrada',
        phone: '+9647701234567',
        hours: hours(),
        botTone: 'friendly',
        defaultLanguage: 'ar',
        plan: 'active',
        renewalAt: '2026-12-01',
        accent: '#10B981',
        createdAt: '2026-01-01T09:00:00.000Z',
      },
    ],
    products: [
      {
        id: 1,
        businessId: 1,
        name: 'قميص قطني',
        nameEn: 'Cotton shirt',
        price: 25000,
        description: 'قميص صيفي',
        descriptionEn: 'Summer shirt',
        available: true,
        createdAt: '2026-01-01T09:00:00.000Z',
      },
      {
        id: 2,
        businessId: 1,
        name: 'حقيبة جلد',
        nameEn: 'Leather bag',
        price: 35000,
        description: '',
        descriptionEn: '',
        available: false,
        createdAt: '2026-01-01T09:00:00.000Z',
      },
    ],
    customers: [
      {
        id: 1,
        name: 'زينب حسن',
        phone: '+9647701112233',
        lastConversationAt: '2026-01-02T10:00:00.000Z',
        createdAt: '2026-01-01T09:00:00.000Z',
      },
    ],
    conversations: [
      {
        id: 1,
        businessId: 1,
        customerId: 1,
        status: 'bot',
        afterHours: false,
        botState: null,
        createdAt: '2026-01-02T10:00:00.000Z',
        updatedAt: '2026-01-02T10:00:00.000Z',
      },
    ],
    messages: [
      {
        id: 1,
        conversationId: 1,
        sender: 'customer',
        text: 'هلا',
        at: '2026-01-02T10:00:00.000Z',
        status: 'read',
      },
    ],
    appointments: [
      {
        id: 1,
        businessId: 1,
        customerId: 1,
        date: '2026-03-10',
        time: '10:00',
        service: 'قياس',
        status: 'confirmed',
        createdAt: '2026-01-02T10:00:00.000Z',
      },
    ],
    orders: [
      {
        id: 1,
        businessId: 1,
        customerId: 1,
        items: [{ productId: 1, name: 'قميص قطني', price: 25000, qty: 2 }],
        address: 'بغداد – الكرادة، دار 5',
        phone: '+9647701112233',
        status: 'new',
        total: 50000,
        createdAt: '2026-01-02T11:00:00.000Z',
      },
    ],
    settings: { language: 'ar' },
    ...overrides,
  };
}

let db;
let app;

function seed(payload = fixture()) {
  return request(app).put('/api/state').send(payload);
}

beforeEach(() => {
  db = createDb(':memory:');
  app = createApp(db);
});

afterEach(() => {
  db.close();
});

describe('health and state', () => {
  it('reports health', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.app).toBe('radd');
  });

  it('starts with an empty state', async () => {
    const response = await request(app).get('/api/state').expect(200);
    expect(response.body.businesses).toEqual([]);
    expect(response.body.settings).toEqual({});
  });

  it('imports and returns a full state', async () => {
    await seed().expect(200);
    const response = await request(app).get('/api/state').expect(200);
    expect(response.body.businesses).toHaveLength(1);
    expect(response.body.products[1].available).toBe(false);
    expect(response.body.appointments[0].time).toBe('10:00');
    expect(response.body.orders[0].total).toBe(50000);
    expect(response.body.settings.language).toBe('ar');
  });

  it('rejects an invalid customer phone', async () => {
    const payload = fixture();
    payload.customers[0].phone = '123';
    const response = await seed(payload).expect(400);
    expect(response.body.error.code).toBe('validation');
  });

  it('rejects two active appointments in the same slot', async () => {
    const payload = fixture();
    payload.appointments.push({
      id: 2,
      businessId: 1,
      customerId: 1,
      date: '2026-03-10',
      time: '10:00',
      service: 'قياس ثاني',
      status: 'confirmed',
      createdAt: '2026-01-02T10:00:00.000Z',
    });
    const response = await seed(payload).expect(400);
    expect(response.body.error.message).toMatch(/same time slot/i);
  });

  it('allows a cancelled appointment to share a slot', async () => {
    const payload = fixture();
    payload.appointments.push({
      id: 2,
      businessId: 1,
      customerId: 1,
      date: '2026-03-10',
      time: '10:00',
      service: 'ملغي',
      status: 'cancelled',
      createdAt: '2026-01-02T10:00:00.000Z',
    });
    await seed(payload).expect(200);
  });

  it('recalculates order totals on the server', async () => {
    const payload = fixture();
    payload.orders[0].total = 1;
    const response = await seed(payload).expect(200);
    expect(response.body.state.orders[0].total).toBe(50000);
  });
});

describe('appointments', () => {
  it('creates a new appointment', async () => {
    await seed().expect(200);
    const response = await request(app)
      .post('/api/appointments')
      .send({
        businessId: 1,
        customerId: 1,
        date: '2026-03-11',
        time: '12:00',
        service: 'قياس وتجربة',
      })
      .expect(201);
    expect(response.body.status).toBe('confirmed');
  });

  it('rejects a double booking with 409', async () => {
    await seed().expect(200);
    const response = await request(app)
      .post('/api/appointments')
      .send({
        businessId: 1,
        customerId: 1,
        date: '2026-03-10',
        time: '10:00',
        service: 'قياس',
      })
      .expect(409);
    expect(response.body.error.code).toBe('conflict');
  });

  it('cancels an appointment and frees the slot', async () => {
    await seed().expect(200);
    await request(app).delete('/api/appointments/1').expect(200);
    await request(app)
      .post('/api/appointments')
      .send({
        businessId: 1,
        customerId: 1,
        date: '2026-03-10',
        time: '10:00',
        service: 'قياس جديد',
      })
      .expect(201);
  });

  it('rejects invalid times', async () => {
    await seed().expect(200);
    const response = await request(app)
      .post('/api/appointments')
      .send({ businessId: 1, customerId: 1, date: '2026-03-10', time: '25:99' })
      .expect(400);
    expect(response.body.error.field).toBe('time');
  });
});

describe('orders', () => {
  it('records an order with a server-calculated total', async () => {
    await seed().expect(200);
    const response = await request(app)
      .post('/api/orders')
      .send({
        businessId: 1,
        customerId: 1,
        phone: '+9647701112233',
        address: 'بغداد – الكرادة، دار 9',
        items: [{ productId: 1, qty: 3 }],
      })
      .expect(201);
    expect(response.body.total).toBe(75000);
    expect(response.body.items[0].name).toBe('قميص قطني');
  });

  it('rejects an unavailable product', async () => {
    await seed().expect(200);
    const response = await request(app)
      .post('/api/orders')
      .send({
        businessId: 1,
        customerId: 1,
        phone: '+9647701112233',
        address: 'بغداد – الكرادة، دار 9',
        items: [{ productId: 2, qty: 1 }],
      })
      .expect(400);
    expect(response.body.error.message).toMatch(/unavailable/i);
  });

  it('updates the order status', async () => {
    await seed().expect(200);
    const response = await request(app)
      .patch('/api/orders/1')
      .send({ status: 'preparing' })
      .expect(200);
    expect(response.body.status).toBe('preparing');
  });
});

describe('conversations and settings', () => {
  it('hands a conversation to a human', async () => {
    await seed().expect(200);
    const response = await request(app)
      .patch('/api/conversations/1')
      .send({ status: 'human' })
      .expect(200);
    expect(response.body.status).toBe('human');
  });

  it('validates conversation status', async () => {
    await seed().expect(200);
    await request(app)
      .patch('/api/conversations/1')
      .send({ status: 'robot-overlord' })
      .expect(400);
  });

  it('appends and sanitises a message', async () => {
    await seed().expect(200);
    const response = await request(app)
      .post('/api/conversations/1/messages')
      .send({ sender: 'human', text: '<b>مرحبا</b>' })
      .expect(201);
    expect(response.body.text).toBe('bمرحبا/b');
    expect(response.body.sender).toBe('human');
  });

  it('saves settings', async () => {
    await request(app).put('/api/settings').send({ theme: 'dark', speed: 2 }).expect(200);
    const response = await request(app).get('/api/settings').expect(200);
    expect(response.body).toEqual({ theme: 'dark', speed: '2' });
  });

  it('returns 404 for unknown conversations', async () => {
    const response = await request(app).get('/api/conversations/999/messages').expect(404);
    expect(response.body.error.code).toBe('not_found');
  });
});
