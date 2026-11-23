import type {
  AppData,
  Appointment,
  ConversationStatus,
  Language,
  Numerals,
  Order,
} from '../data/types';
import { dateKey, addDays, formatDateLabel, formatInt, formatTimeLabel } from './date';

export type ActivityKind = 'order' | 'appointment' | 'handoff';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  at: string;
  customerName: string;
  amount?: number;
  date?: string;
  time?: string;
}

export interface BusinessStats {
  conversationsToday: number;
  messagesToday: number;
  appointmentsUpcoming: number;
  ordersCount: number;
  ordersNew: number;
  ordersRevenue: number;
  avgResponseSeconds: number | null;
  statusCounts: Record<ConversationStatus, number>;
  weeklyConversations: { date: string; label: string; count: number }[];
  weeklyAppointments: { date: string; label: string; count: number }[];
  recent: ActivityItem[];
}

function dayLabel(date: Date, language: Language, numerals: Numerals): string {
  return formatDateLabel(date, language, numerals, { weekday: 'short' });
}

function responseTimeSeconds(data: AppData, businessId: number, now: Date): number | null {
  const since = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const businessConversations = new Set(
    data.conversations.filter((c) => c.businessId === businessId).map((c) => c.id),
  );
  const byConversation = new Map<number, typeof data.messages>();
  for (const message of data.messages) {
    if (!businessConversations.has(message.conversationId)) continue;
    const at = new Date(message.at).getTime();
    if (at < since) continue;
    const list = byConversation.get(message.conversationId) ?? [];
    list.push(message);
    byConversation.set(message.conversationId, list);
  }
  const gaps: number[] = [];
  for (const list of byConversation.values()) {
    const sorted = [...list].sort((a, b) => +new Date(a.at) - +new Date(b.at));
    for (let i = 0; i < sorted.length - 1; i++) {
      const first = sorted[i];
      const next = sorted[i + 1];
      if (first.sender !== 'customer') continue;
      if (next.sender === 'customer') continue;
      const gap = (+new Date(next.at) - +new Date(first.at)) / 1000;
      if (gap >= 0 && gap <= 600) gaps.push(gap);
    }
  }
  if (gaps.length === 0) return null;
  return Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length);
}

export function computeStats(
  data: AppData,
  businessId: number,
  now = new Date(),
  language: Language = 'ar',
  numerals: Numerals = 'western',
): BusinessStats {
  const today = dateKey(now);
  const conversations = data.conversations.filter((c) => c.businessId === businessId);
  const conversationIds = new Set(conversations.map((c) => c.id));
  const appointments = data.appointments.filter((a) => a.businessId === businessId);
  const orders = data.orders.filter((o) => o.businessId === businessId);
  const customerName = (id: number) => data.customers.find((c) => c.id === id)?.name ?? '—';

  const messagesToday = data.messages.filter(
    (m) => conversationIds.has(m.conversationId) && dateKey(new Date(m.at)) === today,
  ).length;

  const statusCounts: Record<ConversationStatus, number> = { bot: 0, human: 0, closed: 0 };
  for (const conversation of conversations) statusCounts[conversation.status] += 1;

  const weeklyConversations = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(now, index - 6);
    const key = dateKey(day);
    return {
      date: key,
      label: dayLabel(day, language, numerals),
      count: conversations.filter((c) => dateKey(new Date(c.createdAt)) === key).length,
    };
  });

  const weeklyAppointments = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(now, index);
    const key = dateKey(day);
    return {
      date: key,
      label: dayLabel(day, language, numerals),
      count: appointments.filter((a) => a.date === key && a.status === 'confirmed').length,
    };
  });

  const recent: ActivityItem[] = [];
  for (const order of orders) {
    recent.push({
      id: `order-${order.id}`,
      kind: 'order',
      at: order.createdAt,
      customerName: customerName(order.customerId),
      amount: order.total,
    });
  }
  for (const appointment of appointments) {
    recent.push({
      id: `appointment-${appointment.id}`,
      kind: 'appointment',
      at: appointment.createdAt,
      customerName: customerName(appointment.customerId),
      date: appointment.date,
      time: appointment.time,
    });
  }
  for (const conversation of conversations) {
    if (conversation.status !== 'human') continue;
    recent.push({
      id: `handoff-${conversation.id}`,
      kind: 'handoff',
      at: conversation.updatedAt,
      customerName: customerName(conversation.customerId),
    });
  }
  recent.sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return {
    conversationsToday: conversations.filter((c) => dateKey(new Date(c.createdAt)) === today).length,
    messagesToday,
    appointmentsUpcoming: appointments.filter((a) => a.date >= today && a.status === 'confirmed').length,
    ordersCount: orders.length,
    ordersNew: orders.filter((o) => o.status === 'new').length,
    ordersRevenue: orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0),
    avgResponseSeconds: responseTimeSeconds(data, businessId, now),
    statusCounts,
    weeklyConversations,
    weeklyAppointments,
    recent: recent.slice(0, 8),
  };
}

export function statsForAll(data: AppData, businessId: number) {
  const conversations = data.conversations.filter((c) => c.businessId === businessId);
  const appointments = data.appointments.filter((a) => a.businessId === businessId);
  const orders = data.orders.filter((o) => o.businessId === businessId);
  return {
    conversations: conversations.length,
    appointments: appointments.length,
    orders: orders.length,
  };
}

export function appointmentSummary(
  appointment: Appointment,
  language: Language,
  numerals: Numerals,
): string {
  const date = new Date(`${appointment.date}T12:00:00`);
  return `${formatDateLabel(date, language, numerals, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTimeLabel(appointment.time, language, numerals)}`;
}

export function orderSummary(order: Order, language: Language, numerals: Numerals): string {
  const date = new Date(order.createdAt);
  return `${formatDateLabel(date, language, numerals, { day: 'numeric', month: 'short' })} · ${formatInt(order.items.reduce((sum, item) => sum + item.qty, 0), numerals)} ${language === 'ar' ? 'منتج' : 'items'}`;
}
