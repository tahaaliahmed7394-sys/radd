export class ApiError extends Error {
  constructor(status, code, message, field) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export function sanitizeText(input, max = 1000) {
  return String(input ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    .trim()
    .slice(0, max);
}

export function normalizePhone(input) {
  const clean = String(input ?? '').replace(/[\s\-().]/g, '');
  return clean.startsWith('00') ? `+${clean.slice(2)}` : clean;
}

export function isValidPhone(input) {
  return /^\+?[0-9]{10,15}$/.test(normalizePhone(input));
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function isValidDateKey(value) {
  if (!DATE_RE.test(String(value ?? ''))) return false;
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidClock(value) {
  if (!TIME_RE.test(String(value ?? ''))) return false;
  const [hour, minute] = String(value).split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function assert(condition, message, field = 'body') {
  if (!condition) throw new ApiError(400, 'validation', message, field);
}

const BUSINESS_TYPES = ['retail', 'clinic', 'realestate'];
const TONES = ['formal', 'friendly', 'concise'];
const PLANS = ['trial', 'active', 'paused'];
const CONVERSATION_STATUS = ['bot', 'human', 'closed'];
const SENDERS = ['customer', 'bot', 'human'];
const APPOINTMENT_STATUS = ['confirmed', 'cancelled', 'done'];
const ORDER_STATUS = ['new', 'preparing', 'delivered', 'cancelled'];
const DAY_KEYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

function arr(value, field) {
  assert(Array.isArray(value), `${field} must be an array`, field);
  return value;
}

function int(value, field, min = 0, max = Number.MAX_SAFE_INTEGER) {
  assert(Number.isInteger(value), `${field} must be an integer`, field);
  assert(value >= min && value <= max, `${field} is out of range`, field);
  return value;
}

function str(value, field, max = 2000, required = true) {
  const clean = sanitizeText(value, max);
  if (required) assert(clean.length > 0, `${field} is required`, field);
  return clean;
}

export function validateState(raw) {
  assert(raw && typeof raw === 'object', 'State payload must be an object');
  const businesses = arr(raw.businesses, 'businesses');
  const products = arr(raw.products, 'products');
  const customers = arr(raw.customers, 'customers');
  const conversations = arr(raw.conversations, 'conversations');
  const messages = arr(raw.messages, 'messages');
  const appointments = arr(raw.appointments, 'appointments');
  const orders = arr(raw.orders, 'orders');

  const businessIds = new Set();
  const cleanBusinesses = businesses.map((b) => {
    int(b.id, 'businesses[].id', 1);
    assert(!businessIds.has(b.id), `Duplicate business id ${b.id}`, 'businesses');
    businessIds.add(b.id);
    assert(BUSINESS_TYPES.includes(b.type), 'Invalid business type', 'businesses[].type');
    assert(TONES.includes(b.botTone), 'Invalid bot tone', 'businesses[].botTone');
    assert(['ar', 'en'].includes(b.defaultLanguage), 'Invalid default language', 'businesses');
    assert(PLANS.includes(b.plan), 'Invalid plan', 'businesses[].plan');
    assert(b.hours && typeof b.hours === 'object', 'Business hours are required', 'businesses[].hours');
    for (const key of DAY_KEYS) {
      const day = b.hours[key];
      assert(day && typeof day === 'object', `Missing hours for ${key}`, 'businesses[].hours');
      assert(isValidClock(day.open), `Invalid open time for ${key}`, 'businesses[].hours');
      assert(isValidClock(day.close), `Invalid close time for ${key}`, 'businesses[].hours');
      assert(typeof day.closed === 'boolean', `Invalid closed flag for ${key}`, 'businesses[].hours');
    }
    const phone = normalizePhone(b.phone);
    assert(isValidPhone(phone), 'Business phone is invalid', 'businesses[].phone');
    return {
      id: b.id,
      name: str(b.name, 'businesses[].name', 160),
      nameEn: str(b.nameEn ?? '', 'businesses[].nameEn', 160, false),
      type: b.type,
      address: str(b.address ?? '', 'businesses[].address', 300, false),
      addressEn: str(b.addressEn ?? '', 'businesses[].addressEn', 300, false),
      phone,
      hoursJson: JSON.stringify(b.hours),
      botTone: b.botTone,
      defaultLanguage: b.defaultLanguage,
      plan: b.plan,
      renewalAt: b.renewalAt ? str(b.renewalAt, 'businesses[].renewalAt', 40, false) : null,
      accent: /^#[0-9a-fA-F]{6}$/.test(b.accent ?? '') ? b.accent : '#10B981',
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
    };
  });

  const productIds = new Map();
  const cleanProducts = products.map((p) => {
    int(p.id, 'products[].id', 1);
    assert(!productIds.has(p.id), `Duplicate product id ${p.id}`, 'products');
    assert(businessIds.has(p.businessId), `Unknown business ${p.businessId} for product`, 'products');
    const price = int(p.price, 'products[].price', 0);
    const product = {
      id: p.id,
      businessId: p.businessId,
      name: str(p.name, 'products[].name', 160),
      nameEn: str(p.nameEn ?? '', 'products[].nameEn', 160, false),
      price,
      description: str(p.description ?? '', 'products[].description', 500, false),
      descriptionEn: str(p.descriptionEn ?? '', 'products[].descriptionEn', 500, false),
      available: Boolean(p.available),
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    };
    productIds.set(p.id, product);
    return product;
  });

  const customerIds = new Set();
  const phones = new Set();
  const cleanCustomers = customers.map((c) => {
    int(c.id, 'customers[].id', 1);
    assert(!customerIds.has(c.id), `Duplicate customer id ${c.id}`, 'customers');
    customerIds.add(c.id);
    const phone = normalizePhone(c.phone);
    assert(isValidPhone(phone), 'Customer phone is invalid', 'customers[].phone');
    assert(!phones.has(phone), `Duplicate customer phone ${phone}`, 'customers[].phone');
    phones.add(phone);
    return {
      id: c.id,
      name: str(c.name, 'customers[].name', 160),
      phone,
      lastConversationAt: c.lastConversationAt ? new Date(c.lastConversationAt).toISOString() : null,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    };
  });

  const conversationIds = new Set();
  const cleanConversations = conversations.map((c) => {
    int(c.id, 'conversations[].id', 1);
    assert(!conversationIds.has(c.id), `Duplicate conversation id ${c.id}`, 'conversations');
    conversationIds.add(c.id);
    assert(customerIds.has(c.customerId), 'Unknown customer in conversation', 'conversations');
    assert(businessIds.has(c.businessId), 'Unknown business in conversation', 'conversations');
    assert(CONVERSATION_STATUS.includes(c.status), 'Invalid conversation status', 'conversations[].status');
    return {
      id: c.id,
      customerId: c.customerId,
      businessId: c.businessId,
      status: c.status,
      afterHours: Boolean(c.afterHours),
      botState: c.botState ? JSON.stringify(c.botState) : null,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
    };
  });

  const cleanMessages = messages.map((m) => {
    int(m.id, 'messages[].id', 1);
    assert(conversationIds.has(m.conversationId), 'Unknown conversation for message', 'messages');
    assert(SENDERS.includes(m.sender), 'Invalid message sender', 'messages[].sender');
    return {
      id: m.id,
      conversationId: m.conversationId,
      sender: m.sender,
      text: str(m.text, 'messages[].text', 4000),
      at: m.at ? new Date(m.at).toISOString() : new Date().toISOString(),
      status: ['sent', 'delivered', 'read'].includes(m.status) ? m.status : 'delivered',
    };
  });

  const slots = new Set();
  const cleanAppointments = appointments.map((a) => {
    int(a.id, 'appointments[].id', 1);
    assert(customerIds.has(a.customerId), 'Unknown customer in appointment', 'appointments');
    assert(businessIds.has(a.businessId), 'Unknown business in appointment', 'appointments');
    assert(isValidDateKey(a.date), 'Invalid appointment date', 'appointments[].date');
    assert(isValidClock(a.time), 'Invalid appointment time', 'appointments[].time');
    assert(APPOINTMENT_STATUS.includes(a.status), 'Invalid appointment status', 'appointments[].status');
    if (a.status !== 'cancelled') {
      const key = `${a.businessId}|${a.date}|${a.time}`;
      assert(!slots.has(key), 'Two active appointments share the same time slot', 'appointments');
      slots.add(key);
    }
    return {
      id: a.id,
      customerId: a.customerId,
      businessId: a.businessId,
      date: a.date,
      time: a.time,
      service: str(a.service ?? '', 'appointments[].service', 160, false),
      status: a.status,
      createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
    };
  });

  const cleanOrders = orders.map((o) => {
    int(o.id, 'orders[].id', 1);
    assert(customerIds.has(o.customerId), 'Unknown customer in order', 'orders');
    assert(businessIds.has(o.businessId), 'Unknown business in order', 'orders');
    assert(ORDER_STATUS.includes(o.status), 'Invalid order status', 'orders[].status');
    const items = arr(o.items, 'orders[].items');
    assert(items.length > 0, 'Order must contain at least one item', 'orders[].items');
    assert(items.length <= 50, 'Too many order items', 'orders[].items');
    let total = 0;
    const cleanItems = items.map((item) => {
      const product = productIds.get(item.productId);
      assert(product, `Unknown product ${item.productId} in order`, 'orders[].items');
      assert(product.businessId === o.businessId, 'Order item belongs to another business', 'orders[].items');
      assert(product.available, `Product ${product.name} is unavailable`, 'orders[].items');
      const qty = int(item.qty, 'orders[].qty', 1, 99);
      total += product.price * qty;
      return { productId: product.id, name: product.name, price: product.price, qty };
    });
    const phone = normalizePhone(o.phone);
    assert(isValidPhone(phone), 'Order phone is invalid', 'orders[].phone');
    return {
      id: o.id,
      customerId: o.customerId,
      businessId: o.businessId,
      itemsJson: JSON.stringify(cleanItems),
      address: str(o.address, 'orders[].address', 300),
      phone,
      status: o.status,
      total,
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    };
  });

  let settings = {};
  if (raw.settings && typeof raw.settings === 'object') {
    for (const [key, value] of Object.entries(raw.settings)) {
      if (typeof key !== 'string' || key.length > 120) continue;
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') continue;
      settings[key] = String(value).slice(0, 2000);
    }
  }

  return {
    businesses: cleanBusinesses,
    products: cleanProducts,
    customers: cleanCustomers,
    conversations: cleanConversations,
    messages: cleanMessages,
    appointments: cleanAppointments,
    orders: cleanOrders,
    settings,
  };
}
