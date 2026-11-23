import JSZip from 'jszip';
import type { AppData } from '../data/types';
import { toCsv } from './text';

export interface ExportBundle {
  app: 'radd';
  version: string;
  exportedAt: string;
  data: AppData;
  settings: Record<string, string>;
}

export function buildExportBundle(data: AppData, settings: Record<string, string>): ExportBundle {
  return {
    app: 'radd',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data,
    settings,
  };
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJsonBundle(bundle: ExportBundle): void {
  const stamp = bundle.exportedAt.slice(0, 10);
  downloadBlob(
    `radd-backup-${stamp}.json`,
    new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }),
  );
}

function hoursRow(hours: Record<string, { open: string; close: string; closed: boolean }>) {
  const row: Record<string, string | number> = {};
  for (const [day, value] of Object.entries(hours)) {
    row[`${day}_open`] = value.open;
    row[`${day}_close`] = value.close;
    row[`${day}_closed`] = value.closed ? 1 : 0;
  }
  return row;
}

/** Creates a ZIP with one UTF-8 CSV per table (Excel-friendly BOM included). */
export async function downloadCsvZip(data: AppData): Promise<void> {
  const zip = new JSZip();
  const customerName = (id: number) => data.customers.find((c) => c.id === id)?.name ?? '';

  zip.file(
    'businesses.csv',
    toCsv(
      data.businesses.map((b) => ({
        id: b.id,
        name: b.name,
        nameEn: b.nameEn,
        type: b.type,
        phone: b.phone,
        address: b.address,
        botTone: b.botTone,
        plan: b.plan,
        renewalAt: b.renewalAt,
        ...hoursRow(b.hours),
      })),
    ),
  );
  zip.file(
    'products.csv',
    toCsv(
      data.products.map((p) => ({
        id: p.id,
        businessId: p.businessId,
        name: p.name,
        nameEn: p.nameEn,
        price: p.price,
        available: p.available ? 1 : 0,
        description: p.description,
      })),
    ),
  );
  zip.file(
    'customers.csv',
    toCsv(
      data.customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        lastConversationAt: c.lastConversationAt ?? '',
        createdAt: c.createdAt,
      })),
    ),
  );
  zip.file(
    'conversations.csv',
    toCsv(
      data.conversations.map((c) => ({
        id: c.id,
        businessId: c.businessId,
        customer: customerName(c.customerId),
        status: c.status,
        afterHours: c.afterHours ? 1 : 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    ),
  );
  zip.file(
    'messages.csv',
    toCsv(
      data.messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        sender: m.sender,
        text: m.text,
        at: m.at,
        status: m.status,
      })),
    ),
  );
  zip.file(
    'appointments.csv',
    toCsv(
      data.appointments.map((a) => ({
        id: a.id,
        businessId: a.businessId,
        customer: customerName(a.customerId),
        date: a.date,
        time: a.time,
        service: a.service,
        status: a.status,
      })),
    ),
  );
  zip.file(
    'orders.csv',
    toCsv(
      data.orders.map((o) => ({
        id: o.id,
        businessId: o.businessId,
        customer: customerName(o.customerId),
        items: o.items.map((item) => `${item.qty}× ${item.name}`).join(' | '),
        total: o.total,
        address: o.address,
        phone: o.phone,
        status: o.status,
        createdAt: o.createdAt,
      })),
    ),
  );

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(`radd-data-${stamp}.zip`, blob);
}

/** Lightweight guard so imports cannot wipe the app with an unrelated JSON file. */
export function parseImportBundle(raw: string): { data: AppData; settings?: Record<string, string> } {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
  const record = parsed as Record<string, unknown>;
  const candidate = (record.data ?? record) as Record<string, unknown>;
  const keys: (keyof AppData)[] = [
    'businesses',
    'products',
    'customers',
    'conversations',
    'messages',
    'appointments',
    'orders',
  ];
  for (const key of keys) {
    if (!Array.isArray(candidate[key])) throw new Error(`missing ${key}`);
  }
  const businesses = candidate.businesses as AppData['businesses'];
  if (businesses.length === 0) throw new Error('empty businesses');
  for (const business of businesses) {
    if (
      typeof business.id !== 'number' ||
      typeof business.name !== 'string' ||
      !business.hours ||
      typeof business.hours !== 'object'
    ) {
      throw new Error('invalid business');
    }
  }
  const settings =
    record.settings && typeof record.settings === 'object'
      ? (Object.fromEntries(
          Object.entries(record.settings as Record<string, unknown>).map(([key, value]) => [
            key,
            String(value),
          ]),
        ) as Record<string, string>)
      : undefined;
  return { data: candidate as unknown as AppData, settings };
}
