import { create } from 'zustand';
import { buildDemoData } from '../data/demo';
import type {
  AppData,
  Appointment,
  AppointmentStatus,
  Business,
  Conversation,
  ConversationStatus,
  Customer,
  Message,
  MessageStatus,
  Order,
  OrderStatus,
  Product,
} from '../data/types';
import { dateKey } from '../utils/date';
import { isValidPhone, normalizePhone, sanitizeText } from '../utils/text';

const demo = buildDemoData();

function nextId(items: Array<{ id: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export interface AppointmentResult {
  ok: boolean;
  id?: number;
  error?: 'conflict' | 'invalid' | 'not_found';
}

export interface OrderResult {
  ok: boolean;
  id?: number;
  error?: 'unavailable' | 'invalid' | 'not_found';
}

export interface AppState extends AppData {
  activeBusinessId: number;
  activeConversationId: number | null;
  ready: boolean;
  serverOnline: boolean;
  setReady: (ready: boolean) => void;
  setServerOnline: (online: boolean) => void;
  setActiveBusiness: (id: number) => void;
  setActiveConversation: (id: number | null) => void;
  updateBusiness: (id: number, patch: Partial<Business>) => void;
  upsertProduct: (product: Product) => void;
  updateProduct: (id: number, patch: Partial<Product>) => void;
  deleteProduct: (id: number) => void;
  findOrCreateCustomer: (input: { name: string; phone: string }) => Customer | null;
  createConversation: (input: {
    businessId: number;
    customerId: number;
    status?: ConversationStatus;
    createdAt?: string;
    afterHours?: boolean;
  }) => Conversation;
  appendMessage: (input: {
    conversationId: number;
    sender: Message['sender'];
    text: string;
    at?: string;
    status?: MessageStatus;
  }) => Message;
  setConversationStatus: (id: number, status: ConversationStatus) => void;
  setConversationBotState: (id: number, botState: Conversation['botState']) => void;
  setConversationAfterHours: (id: number, value: boolean) => void;
  markCustomerMessagesRead: (conversationId: number) => void;
  addAppointment: (input: {
    businessId: number;
    customerId: number;
    date: string;
    time: string;
    service: string;
    status?: AppointmentStatus;
  }) => AppointmentResult;
  updateAppointment: (
    id: number,
    patch: Partial<Pick<Appointment, 'date' | 'time' | 'service' | 'status'>>,
  ) => AppointmentResult;
  cancelAppointment: (id: number) => void;
  addOrder: (input: {
    businessId: number;
    customerId: number;
    items: { productId: number; qty: number }[];
    address: string;
    phone: string;
    status?: OrderStatus;
    createdAt?: string;
  }) => OrderResult;
  updateOrderStatus: (id: number, status: OrderStatus) => void;
  replaceAll: (data: AppData) => void;
  resetData: () => void;
  clearAll: () => void;
}

const emptyData: AppData = {
  businesses: [],
  products: [],
  customers: [],
  conversations: [],
  messages: [],
  appointments: [],
  orders: [],
};

export const useAppStore = create<AppState>()((set, get) => ({
  ...demo,
  activeBusinessId: demo.businesses[0]?.id ?? 0,
  activeConversationId: null,
  ready: false,
  serverOnline: false,
  setReady: (ready) => set({ ready }),
  setServerOnline: (serverOnline) => set({ serverOnline }),
  setActiveBusiness: (id) =>
    set((state) => {
      if (!state.businesses.some((b) => b.id === id)) return state;
      const conversation = state.conversations.find((c) => c.id === state.activeConversationId);
      return {
        activeBusinessId: id,
        activeConversationId: conversation?.businessId === id ? conversation.id : null,
      };
    }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  updateBusiness: (id, patch) =>
    set((state) => ({
      businesses: state.businesses.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),
  upsertProduct: (product) =>
    set((state) => {
      const exists = state.products.some((p) => p.id === product.id);
      return {
        products: exists
          ? state.products.map((p) => (p.id === product.id ? product : p))
          : [...state.products, product],
      };
    }),
  updateProduct: (id, patch) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  deleteProduct: (id) =>
    set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
  findOrCreateCustomer: ({ name, phone }) => {
    const cleanName = sanitizeText(name, 120);
    const cleanPhone = normalizePhone(phone);
    if (!cleanName || !isValidPhone(cleanPhone)) return null;
    const existing = get().customers.find((c) => c.phone === cleanPhone);
    if (existing) return existing;
    const customer: Customer = {
      id: nextId(get().customers),
      name: cleanName,
      phone: cleanPhone,
      lastConversationAt: null,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ customers: [...state.customers, customer] }));
    return customer;
  },
  createConversation: ({ businessId, customerId, status = 'bot', createdAt, afterHours = false }) => {
    const now = createdAt ?? new Date().toISOString();
    const conversation: Conversation = {
      id: nextId(get().conversations),
      businessId,
      customerId,
      status,
      afterHours,
      createdAt: now,
      updatedAt: now,
      botState: null,
    };
    set((state) => ({
      conversations: [...state.conversations, conversation],
      activeConversationId: conversation.id,
      customers: state.customers.map((c) =>
        c.id === customerId ? { ...c, lastConversationAt: now } : c,
      ),
    }));
    return conversation;
  },
  appendMessage: ({ conversationId, sender, text, at, status }) => {
    const now = at ?? new Date().toISOString();
    const message: Message = {
      id: nextId(get().messages),
      conversationId,
      sender,
      text: sanitizeText(text, 4000),
      at: now,
      status: status ?? (sender === 'customer' ? 'delivered' : 'delivered'),
    };
    set((state) => {
      const conversation = state.conversations.find((c) => c.id === conversationId);
      return {
        messages: [...state.messages, message],
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, updatedAt: now } : c,
        ),
        customers: conversation
          ? state.customers.map((c) =>
              c.id === conversation.customerId ? { ...c, lastConversationAt: now } : c,
            )
          : state.customers,
      };
    });
    return message;
  },
  setConversationStatus: (id, status) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c,
      ),
    })),
  setConversationBotState: (id, botState) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, botState } : c)),
    })),
  setConversationAfterHours: (id, afterHours) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, afterHours } : c)),
    })),
  markCustomerMessagesRead: (conversationId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.conversationId === conversationId && m.sender === 'customer' && m.status !== 'read'
          ? { ...m, status: 'read' }
          : m,
      ),
    })),
  addAppointment: ({ businessId, customerId, date, time, service, status = 'confirmed' }) => {
    const state = get();
    if (
      !state.businesses.some((b) => b.id === businessId) ||
      !state.customers.some((c) => c.id === customerId) ||
      !date ||
      !time
    ) {
      return { ok: false, error: 'invalid' };
    }
    if (status !== 'cancelled') {
      const conflict = state.appointments.some(
        (a) =>
          a.businessId === businessId &&
          a.date === date &&
          a.time === time &&
          a.status !== 'cancelled',
      );
      if (conflict) return { ok: false, error: 'conflict' };
    }
    const id = nextId(state.appointments);
    const appointment: Appointment = {
      id,
      businessId,
      customerId,
      date,
      time,
      service: sanitizeText(service, 160),
      status,
      createdAt: new Date().toISOString(),
    };
    set({ appointments: [...state.appointments, appointment] });
    return { ok: true, id };
  },
  updateAppointment: (id, patch) => {
    const state = get();
    const current = state.appointments.find((a) => a.id === id);
    if (!current) return { ok: false, error: 'not_found' };
    const next = { ...current, ...patch };
    if (!next.date || !next.time) return { ok: false, error: 'invalid' };
    if (next.status !== 'cancelled') {
      const conflict = state.appointments.some(
        (a) =>
          a.id !== id &&
          a.businessId === current.businessId &&
          a.date === next.date &&
          a.time === next.time &&
          a.status !== 'cancelled',
      );
      if (conflict) return { ok: false, error: 'conflict' };
    }
    set({
      appointments: state.appointments.map((a) => (a.id === id ? next : a)),
    });
    return { ok: true, id };
  },
  cancelAppointment: (id) =>
    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === id ? { ...a, status: 'cancelled' } : a,
      ),
    })),
  addOrder: ({ businessId, customerId, items, address, phone, status = 'new', createdAt }) => {
    const state = get();
    if (
      !state.businesses.some((b) => b.id === businessId) ||
      !state.customers.some((c) => c.id === customerId) ||
      !items.length
    ) {
      return { ok: false, error: 'invalid' };
    }
    const resolved = [];
    let total = 0;
    for (const item of items) {
      const product = state.products.find((p) => p.id === item.productId);
      if (!product || product.businessId !== businessId || !product.available) {
        return { ok: false, error: 'unavailable' };
      }
      const qty = Math.max(1, Math.min(99, Math.round(item.qty)));
      total += product.price * qty;
      resolved.push({ productId: product.id, name: product.name, price: product.price, qty });
    }
    const cleanAddress = sanitizeText(address, 300);
    const cleanPhone = normalizePhone(phone);
    if (cleanAddress.length < 5 || !isValidPhone(cleanPhone)) {
      return { ok: false, error: 'invalid' };
    }
    const id = nextId(state.orders);
    const order: Order = {
      id,
      businessId,
      customerId,
      items: resolved,
      address: cleanAddress,
      phone: cleanPhone,
      status,
      total,
      createdAt: createdAt ?? new Date().toISOString(),
    };
    set({ orders: [order, ...state.orders] });
    return { ok: true, id };
  },
  updateOrderStatus: (id, status) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)),
    })),
  replaceAll: (data) =>
    set({
      businesses: data.businesses,
      products: data.products,
      customers: data.customers,
      conversations: data.conversations,
      messages: data.messages,
      appointments: data.appointments,
      orders: data.orders,
      activeBusinessId: data.businesses[0]?.id ?? 0,
      activeConversationId: null,
      ready: true,
    }),
  resetData: () => {
    const fresh = buildDemoData();
    set({
      ...fresh,
      activeBusinessId: fresh.businesses[0]?.id ?? 0,
      activeConversationId: null,
    });
  },
  clearAll: () =>
    set({
      ...emptyData,
      activeBusinessId: 0,
      activeConversationId: null,
    }),
}));

export function todayKey(): string {
  return dateKey(new Date());
}
