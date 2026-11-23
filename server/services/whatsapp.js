const GRAPH_VERSION = 'v21.0';

export function whatsappConfig() {
  const mode = (process.env.WHATSAPP_MODE || 'demo').toLowerCase();
  return {
    mode: mode === 'cloud' ? 'cloud' : 'demo',
    token: process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
    businessId: Number(process.env.WHATSAPP_BUSINESS_ID || 1),
  };
}

export function whatsappStatus() {
  const cfg = whatsappConfig();
  const configured = Boolean(cfg.token && cfg.phoneNumberId && cfg.verifyToken);
  return {
    mode: cfg.mode,
    configured,
    ready: cfg.mode === 'cloud' && configured,
    businessId: cfg.businessId,
    hasVerifyToken: Boolean(cfg.verifyToken),
    hasAppSecret: Boolean(cfg.appSecret),
  };
}

export async function sendWhatsAppText(to, text) {
  const cfg = whatsappConfig();
  if (cfg.mode !== 'cloud') return { ok: false, skipped: true, reason: 'demo_mode' };
  if (!cfg.token || !cfg.phoneNumberId) return { ok: false, skipped: true, reason: 'missing_config' };

  const normalized = String(to).replace(/[^\d]/g, '');
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${cfg.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalized,
      type: 'text',
      text: { body: String(text).slice(0, 4096) },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[radd][whatsapp] send failed', res.status, data);
    return { ok: false, status: res.status, error: data };
  }
  return { ok: true, data };
}

export function extractWhatsAppMessages(payload) {
  const out = [];
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
      for (const msg of messages) {
        if (msg?.type !== 'text') continue;
        const from = String(msg.from || '');
        const contact = contacts.find((c) => c?.wa_id === from);
        out.push({
          from,
          name: contact?.profile?.name || from,
          text: msg?.text?.body || '',
          messageId: msg?.id || '',
          timestamp: msg?.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString(),
        });
      }
    }
  }
  return out;
}
