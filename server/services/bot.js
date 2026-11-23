import { readState } from './store.js';

const DAY_KEYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_LABELS = {
  ar: { sat: 'السبت', sun: 'الأحد', mon: 'الاثنين', tue: 'الثلاثاء', wed: 'الأربعاء', thu: 'الخميس', fri: 'الجمعة' },
  en: { sat: 'Sat', sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri' },
};

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectLang(text) {
  const latin = (String(text).match(/[a-zA-Z]/g) || []).length;
  const arabic = (String(text).match(/[\u0600-\u06FF]/g) || []).length;
  return latin > arabic ? 'en' : 'ar';
}

function includesAny(text, words) {
  const n = normalize(text);
  return words.some((w) => n.includes(normalize(w)));
}

function isOpenNow(hours) {
  const now = new Date();
  const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const key = map[now.getDay()];
  const day = hours?.[key];
  if (!day || day.closed) return false;
  const [oh, om] = String(day.open || '00:00').split(':').map(Number);
  const [ch, cm] = String(day.close || '00:00').split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

function hoursSummary(hours, lang) {
  return DAY_KEYS.map((k) => {
    const d = hours?.[k];
    const label = DAY_LABELS[lang][k];
    if (!d || d.closed) return `• ${label}: ${lang === 'ar' ? 'عطلة' : 'Closed'}`;
    return `• ${label}: ${d.open} - ${d.close}`;
  }).join('\n');
}

function formatMoney(iqd, lang) {
  const n = new Intl.NumberFormat(lang === 'ar' ? 'ar-IQ' : 'en-IQ').format(Number(iqd) || 0);
  return lang === 'ar' ? `${n} د.ع` : `${n} IQD`;
}

function findProducts(text, products, businessId) {
  const n = normalize(text);
  return products
    .filter((p) => p.businessId === businessId && p.available)
    .map((p) => {
      const name = normalize(p.name);
      const en = normalize(p.nameEn);
      let score = 0;
      if (name && n.includes(name)) score += 100;
      if (en && n.includes(en)) score += 100;
      for (const token of name.split(/\s+/).filter((t) => t.length >= 3)) if (n.includes(token)) score += 10;
      for (const token of en.split(/\s+/).filter((t) => t.length >= 3)) if (n.includes(token)) score += 6;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}

export function generateBotReply(db, { businessId, text, conversation }) {
  const state = readState(db);
  const business = state.businesses.find((b) => b.id === businessId) || state.businesses[0];
  if (!business) {
    return { replies: ['عذراً، النظام غير جاهز حالياً.'], handoff: false };
  }
  const lang = detectLang(text) || business.defaultLanguage || 'ar';
  const t = (ar, en) => (lang === 'ar' ? ar : en);
  const n = normalize(text);

  const handoffWords = ['مدير', 'مسؤول', 'موظف', 'انسان', 'human', 'manager', 'agent', 'complaint', 'شكوى'];
  if (includesAny(text, handoffWords) || includesAny(text, ['غاضب', 'زعلان', 'سيء', 'كذاب', 'scam', 'angry', 'bad'])) {
    return {
      replies: [t('أعتذر عن الإزعاج. راح أحولك لموظف يساعدك مباشرة.', 'Sorry about that. I will connect you with a human agent now.')],
      handoff: true,
      status: 'human',
    };
  }

  if (includesAny(text, ['مرحبا', 'هلا', 'السلام', 'hi', 'hello', 'hey'])) {
    return { replies: [t(`أهلاً بك في ${business.name} 👋\nاكتب سؤالك عن الأسعار، الدوام، العنوان، الحجز، أو الطلب.`, `Welcome to ${business.nameEn || business.name} 👋\nAsk about prices, hours, location, booking, or ordering.`)], handoff: false };
  }

  if (includesAny(text, ['سعر', 'بيش', 'بكم', 'price', 'cost', 'how much'])) {
    const matches = findProducts(text, state.products, business.id);
    if (matches.length === 1) {
      const p = matches[0];
      return { replies: [t(`سعر ${p.name}: ${formatMoney(p.price, 'ar')}.`, `Price of ${p.nameEn || p.name}: ${formatMoney(p.price, 'en')}.`)], handoff: false };
    }
    if (matches.length > 1) {
      return { replies: [t(`لقيت أكثر من خيار:\n${matches.slice(0, 5).map((p) => `• ${p.name} — ${formatMoney(p.price, 'ar')}`).join('\n')}\nأي واحد تقصد؟`, `I found multiple options:\n${matches.slice(0, 5).map((p) => `• ${p.nameEn || p.name} — ${formatMoney(p.price, 'en')}`).join('\n')}\nWhich one do you mean?`)], handoff: false };
    }
    const list = state.products.filter((p) => p.businessId === business.id && p.available).slice(0, 8).map((p) => `• ${lang === 'ar' ? p.name : p.nameEn || p.name} — ${formatMoney(p.price, lang)}`).join('\n');
    return { replies: [t(`الأسعار المتوفرة:\n${list}`, `Available prices:\n${list}`)], handoff: false };
  }

  if (includesAny(text, ['دوام', 'ساعات', 'مفتوح', 'شغال', 'hours', 'open', 'close', 'working'])) {
    const open = isOpenNow(business.hours);
    return { replies: [t(`${open ? 'نعم، حالياً مفتوح.' : 'حالياً خارج الدوام.'}\nساعات الدوام:\n${hoursSummary(business.hours, 'ar')}`, `${open ? 'Yes, we are open now.' : 'We are currently closed.'}\nWorking hours:\n${hoursSummary(business.hours, 'en')}`)], handoff: false };
  }

  if (includesAny(text, ['عنوان', 'موقع', 'وين', 'location', 'address', 'where'])) {
    return { replies: [t(`عنواننا: ${business.address}\nالهاتف: ${business.phone}`, `Our address: ${business.addressEn || business.address}\nPhone: ${business.phone}`)], handoff: false };
  }

  if (includesAny(text, ['حجز', 'موعد', 'book', 'appointment', 'reserve'])) {
    const open = isOpenNow(business.hours);
    if (!open) {
      return { replies: [t(`استلمت طلب الحجز، بس حالياً خارج الدوام. اكتب اليوم والوقت المناسب ورقمك، وراح نأكد لك أول الدوام.`, `I got your booking request, but we're currently closed. Send your preferred day/time and phone number, and we'll confirm at opening.`)], handoff: false, afterHours: true };
    }
    return { replies: [t('أكيد، أقدر أساعدك بالحجز. اكتب الخدمة، اليوم، والوقت المناسب.', 'Sure, I can help with booking. Please send the service, day, and preferred time.')], handoff: false };
  }

  if (includesAny(text, ['طلب', 'اطلب', 'ابي', 'اريد', 'order', 'buy', 'want'])) {
    return { replies: [t('أكيد. اكتب اسم المنتج والكمية والعنوان ورقم الهاتف حتى أسجل الطلب.', 'Sure. Please send the product name, quantity, address, and phone number so I can place the order.')], handoff: false };
  }

  if (includesAny(text, ['شكرا', 'ثانكس', 'thanks', 'thank you'])) {
    return { replies: [t('العفو! إذا تحتاج أي شي ثاني أنا حاضر.', 'You’re welcome! If you need anything else, I’m here.')], handoff: false };
  }

  return {
    replies: [t('ما متأكد فهمت طلبك بالكامل. حتى ما أعطيك معلومة غلط، راح أحولك لموظف يساعدك.', 'I’m not fully sure I understood. To avoid giving wrong information, I’ll connect you with a human agent.')],
    handoff: true,
    status: 'human',
  };
}
