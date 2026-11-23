PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('retail', 'clinic', 'realestate')),
  address TEXT NOT NULL DEFAULT '',
  address_en TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  hours_json TEXT NOT NULL,
  bot_tone TEXT NOT NULL CHECK (bot_tone IN ('formal', 'friendly', 'concise')),
  default_language TEXT NOT NULL CHECK (default_language IN ('ar', 'en')),
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'active', 'paused')),
  renewal_at TEXT,
  accent TEXT NOT NULL DEFAULT '#10B981',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  description TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  last_conversation_at TEXT,
  created_at TEXT NOT NULL,
  CHECK (phone NOT GLOB '*[^0-9+]*'),
  CHECK (length(phone) BETWEEN 10 AND 16)
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'bot' CHECK (status IN ('bot', 'human', 'closed')),
  after_hours INTEGER NOT NULL DEFAULT 0 CHECK (after_hours IN (0, 1)),
  bot_state TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversations_business ON conversations(business_id);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('customer', 'bot', 'human')),
  text TEXT NOT NULL,
  at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('sent', 'delivered', 'read'))
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, at);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  service TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'done')),
  created_at TEXT NOT NULL,
  CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CHECK (time GLOB '[0-9][0-9]:[0-9][0-9]')
);

-- One active appointment per business per date/time. Cancelled slots free up.
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_slot
  ON appointments(business_id, date, time)
  WHERE status <> 'cancelled';

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  items_json TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'delivered', 'cancelled')),
  total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_at TEXT NOT NULL,
  CHECK (phone NOT GLOB '*[^0-9+]*'),
  CHECK (length(phone) BETWEEN 10 AND 16)
);
CREATE INDEX IF NOT EXISTS idx_orders_business ON orders(business_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
