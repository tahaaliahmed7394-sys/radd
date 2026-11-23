import type {
  Appointment,
  BotConfig,
  BotState,
  Business,
  Conversation,
  Customer,
  DayKey,
  Product,
} from '../data/types';
import {
  dateKey,
  dayKeyOf,
  formatNumber,
  fromDateKey,
  dayHoursFor,
  isBusinessOpenAt,
  nextAvailableSlots,
  timeToMinutes,
} from '../utils/date';
import {
  containsAny,
  detectLanguage,
  normalizeArabic,
  parseArabicNumber,
  sanitizeText,
} from '../utils/text';

export type Intent =
  | 'greeting'
  | 'price'
  | 'booking'
  | 'order'
  | 'hours'
  | 'address'
  | 'thanks'
  | 'angry'
  | 'cancel'
  | 'fallback';

export type BotAction =
  | { type: 'appointment'; date: string; time: string; service: string }
  | { type: 'order'; items: { productId: number; qty: number }[]; address: string; phone: string }
  | { type: 'handoff'; reason: 'angry' | 'unknown' | 'keyword' | 'conflict' };

export interface BotResult {
  replies: string[];
  action: BotAction | null;
  handoff: boolean;
  afterHours: boolean;
  state: BotState | null;
  intent: Intent;
  lang: 'ar' | 'en';
}

export interface BotInput {
  text: string;
  business: Business;
  products: Product[];
  appointments: Appointment[];
  customer: Customer;
  conversation: Conversation;
  now: Date;
  config?: BotConfig;
}

const WEEKDAYS = {
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

const MONTHS = {
  ar: [
    'كانون الثاني',
    'شباط',
    'آذار',
    'نيسان',
    'أيار',
    'حزيران',
    'تموز',
    'آب',
    'أيلول',
    'تشرين الأول',
    'تشرين الثاني',
    'كانون الأول',
  ],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const DAY_LABELS: Record<'ar' | 'en', Record<string, string>> = {
  ar: {
    sat: 'السبت',
    sun: 'الأحد',
    mon: 'الاثنين',
    tue: 'الثلاثاء',
    wed: 'الأربعاء',
    thu: 'الخميس',
    fri: 'الجمعة',
  },
  en: {
    sat: 'Sat',
    sun: 'Sun',
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
  },
};

const DAY_ORDER: DayKey[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

const ANGRY_WORDS = [
  'غاضب',
  'زعلان',
  'سيء',
  'سيئه',
  'سيئ',
  'كذب',
  'كذاب',
  'محتال',
  'نصاب',
  'انتظرت',
  'انتظرنا',
  'تاخير',
  'تاخرت',
  'مو زين',
  'ما عجبني',
  'شكوى',
  'اشتكي',
  'استرجاع',
  'تعويض',
  ' awful',
  'angry',
  'terrible',
  'worst',
  'complaint',
  'refund',
  'scam',
];

const GREETING_WORDS = ['مرحبا', 'هلا', 'سلام', 'صباح الخير', 'مساء الخير', 'هاي', 'hello', 'hi', 'hey', 'good morning', 'good evening'];
const PRICE_WORDS = ['سعر', 'اسعار', 'بكم', 'بكام', 'كم سعر', 'بيش', 'بشكد', 'شكد', 'كم حق', 'how much', 'price', 'cost', 'rate'];
const HOURS_WORDS = ['دوام', 'ساعات', 'تفتحون', 'تفتح', 'تسكرون', 'وقت العمل', 'اوقات العمل', 'hours', 'open', 'closing', 'close', 'working hours'];
const ADDRESS_WORDS = ['عنوان', 'وين', 'موقع', 'مكان', 'لوكيشن', 'address', 'location', 'where are you', 'where'];
const BOOKING_WORDS = ['موعد', 'حجز', 'احجز', 'أحجز', 'appointment', 'book', 'booking', 'معاينه', 'معاينة', 'استشاره', 'استشارة', 'دكتور', 'طبيب', 'قياس', 'تجربه', 'viewing'];
const ORDER_WORDS = ['اطلب', 'أطلب', 'طلب', 'اشتري', 'أشتري', 'اريد اشتري', 'أريد أشتري', 'order', 'buy', 'purchase'];
const THANKS_WORDS = ['شكرا', 'مشكور', 'مشكوره', 'تسلم', 'تسلمين', 'thanks', 'thank you', 'thx'];
const CANCEL_WORDS = ['الغاء', 'الغي', 'ألغي', 'ملغي', 'cancel', 'مو اريد', 'ما اريد', 'لا اريد', 'لا أريد'];

const DEFAULT_HANDOFF_KEYWORDS = ['مدير', 'مسؤول', 'شكوى', 'manager', 'complaint'];

function L<T>(lang: 'ar' | 'en', ar: T, en: T): T {
  return lang === 'ar' ? ar : en;
}

function currency(lang: 'ar' | 'en'): string {
  return lang === 'ar' ? 'د.ع' : 'IQD';
}

function money(value: number, lang: 'ar' | 'en'): string {
  return `${formatNumber(value, 'western')} ${currency(lang)}`;
}

function productName(product: Product, lang: 'ar' | 'en'): string {
  return lang === 'ar' ? product.name : product.nameEn;
}

function businessName(business: Business, lang: 'ar' | 'en'): string {
  return lang === 'ar' ? business.name : business.nameEn;
}

function businessAddress(business: Business, lang: 'ar' | 'en'): string {
  return lang === 'ar' ? business.address : business.addressEn;
}

export function serviceLabel(business: Business, lang: 'ar' | 'en'): string {
  if (business.type === 'clinic') return L(lang, 'استشارة', 'Consultation');
  if (business.type === 'realestate') return L(lang, 'معاينة عقار', 'Property viewing');
  return L(lang, 'قياس وتجربة', 'Fitting session');
}

function fmtSlot(slot: { date: string; time: string }, lang: 'ar' | 'en', now: Date): string {
  const d = fromDateKey(slot.date);
  const today = dateKey(now);
  const tomorrow = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  let label: string;
  if (slot.date === today) {
    label = L(lang, 'اليوم', 'today');
  } else if (slot.date === tomorrow) {
    label = L(lang, 'باجر', 'tomorrow');
  } else {
    label = `${WEEKDAYS[lang][d.getDay()]} ${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
  }
  return `${label} ${slot.time}`;
}

function slotList(slots: { date: string; time: string }[], lang: 'ar' | 'en', now: Date): string {
  return slots.map((s) => `• ${fmtSlot(s, lang, now)}`).join('\n');
}

/** Groups consecutive weekdays with identical hours for a readable summary. */
export function describeHours(
  business: Business,
  lang: 'ar' | 'en',
  now: Date,
): { summary: string; isOpen: boolean } {
  const groups: Array<{ start: string; end: string; value: string }> = [];
  for (const key of DAY_ORDER) {
    const dh = business.hours[key];
    const value = dh.closed
      ? L(lang, 'عطلة', 'closed')
      : `${dh.open} – ${dh.close}`;
    const last = groups[groups.length - 1];
    if (last && last.value === value) last.end = key;
    else groups.push({ start: key, end: key, value });
  }
  const summary = groups
    .map((g) => {
      const label =
        g.start === g.end
          ? DAY_LABELS[lang][g.start]
          : `${DAY_LABELS[lang][g.start]} – ${DAY_LABELS[lang][g.end]}`;
      return `• ${label}: ${g.value}`;
    })
    .join('\n');
  return { summary, isOpen: isBusinessOpenAt(business.hours, now) };
}

interface ScoredProduct {
  product: Product;
  score: number;
}

export function findProducts(text: string, products: Product[], businessId: number): Product[] {
  const norm = normalizeArabic(text);
  const scored: ScoredProduct[] = [];
  for (const product of products) {
    if (product.businessId !== businessId) continue;
    const name = normalizeArabic(product.name);
    const alt = normalizeArabic(product.nameEn);
    let score = 0;
    if (norm.includes(name)) score += 100;
    if (alt && norm.includes(alt)) score += 100;
    const tokens = Array.from(new Set(name.split(/[\s–\-،,()]+/))).filter((t) => t.length >= 3);
    for (const token of tokens) {
      if (!/^\d+$/.test(token) && norm.includes(token)) score += 10;
    }
    const latinTokens = Array.from(new Set(alt.split(/[\s–\-،,()]+/))).filter((t) => t.length >= 3);
    for (const token of latinTokens) {
      if (norm.includes(token)) score += 6;
    }
    if (score > 0) scored.push({ product, score: score + name.length / 100 });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.product);
}

function extractTimeMinutes(text: string): number | null {
  const norm = normalizeArabic(text);
  const hourWords: Record<string, number> = {
    '١': 1,
    '٢': 2,
    '٣': 3,
    '٤': 4,
    '٥': 5,
    '٦': 6,
    '٧': 7,
    '٨': 8,
    '٩': 9,
    '١٠': 10,
    '١١': 11,
    '١٢': 12,
    واحده: 1,
    الواحده: 1,
    ثنتين: 2,
    الثنتين: 2,
    اثنين: 2,
    الاثنين: 2,
    ثلاث: 3,
    الثلاث: 3,
    ثلاثه: 3,
    الثلاثه: 3,
    اربع: 4,
    الاربع: 4,
    اربعه: 4,
    الاربععه: 4,
    خمس: 5,
    الخمس: 5,
    خمسه: 5,
    الخمسه: 5,
    ست: 6,
    الست: 6,
    سته: 6,
    السته: 6,
    سبع: 7,
    السبع: 7,
    سبعه: 7,
    السبيعه: 7,
    ثمان: 8,
    الثمان: 8,
    ثمانيه: 8,
    الثمانيه: 8,
    تسع: 9,
    التسع: 9,
    تسعه: 9,
    التسعه: 9,
    عشر: 10,
    العشر: 10,
    عشره: 10,
    العشره: 10,
  };
  let hour: number | null = null;
  let minute = 0;
  const match = norm.match(/(\d{1,2})(?::(\d{1,2}))?/);
  if (match) {
    hour = Number(match[1]);
    if (match[2]) minute = Number(match[2]);
  } else {
    const words = norm.split(/[\s،,.!?]+/);
    for (const word of words) {
      if (hourWords[word] != null) {
        hour = hourWords[word];
        break;
      }
    }
  }
  if (hour == null) return null;
  if (hour > 23 || minute > 59) return null;
  const afternoon = containsAny(norm, ['العصر', 'بعد الظهر', 'مساء', 'المساء', 'ليل', 'الليل', 'pm', 'evening', 'afternoon']);
  const morning = containsAny(norm, ['صباح', 'الصبح', 'am', 'morning']);
  let normalizedHour = hour;
  if (afternoon && normalizedHour < 12) normalizedHour += 12;
  if (morning && normalizedHour === 12) normalizedHour = 0;
  if (normalizedHour > 23) return null;
  return normalizedHour * 60 + minute;
}

function resolveDateKey(text: string, now: Date): string | null {
  const norm = normalizeArabic(text);
  if (containsAny(norm, ['بعد باجر', 'بعد بكره', 'بعد غد'])) {
    return dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2));
  }
  if (containsAny(norm, ['باجر', 'بكره', 'غدا', 'غد ', 'tomorrow'])) {
    return dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  }
  if (containsAny(norm, ['اليوم', 'هاليوم', 'today'])) return dateKey(now);
  const dayMap: Record<string, string> = {
    سبت: 'sat',
    السبت: 'sat',
    احد: 'sun',
    الاحد: 'sun',
    اثنين: 'mon',
    الاثنين: 'mon',
    ثلاثاء: 'tue',
    الثلاثاء: 'tue',
    اربعاء: 'wed',
    الاربعاء: 'wed',
    خميس: 'thu',
    الخميس: 'thu',
    جمعه: 'fri',
    الجمعه: 'fri',
    saturday: 'sat',
    sunday: 'sun',
    monday: 'mon',
    tuesday: 'tue',
    wednesday: 'wed',
    thursday: 'thu',
    friday: 'fri',
  };
  const words = norm.split(/[\s؟?!.,]+/);
  for (const word of words) {
    const key = dayMap[word];
    if (!key) continue;
    const todayKey = dayKeyOf(now);
    const todayIndex = DAY_ORDER.indexOf(todayKey as (typeof DAY_ORDER)[number]);
    const targetIndex = DAY_ORDER.indexOf(key as (typeof DAY_ORDER)[number]);
    const offset = (targetIndex - todayIndex + 7) % 7;
    return dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
  }
  return null;
}

function matchOffered(
  text: string,
  offered: { date: string; time: string }[],
  now: Date,
): { date: string; time: string } | null {
  if (offered.length === 0) return null;
  const norm = normalizeArabic(text);
  const indexMap: Record<string, number> = {
    الاول: 0,
    اول: 0,
    الثانيه: 1,
    ثاني: 1,
    الثاني: 1,
    الثالثه: 2,
    ثالث: 2,
    الثالث: 2,
    الرابعه: 3,
    رابع: 3,
    الرابع: 3,
  };
  const wantedDate = resolveDateKey(norm, now);
  let pool = wantedDate ? offered.filter((s) => s.date === wantedDate) : offered;
  if (pool.length === 0) pool = offered;
  const minutes = extractTimeMinutes(norm);
  if (minutes != null) {
    const exact = pool.find((s) => timeToMinutes(s.time) === minutes);
    if (exact) return exact;
    const same12 = pool.find((s) => timeToMinutes(s.time) % 720 === minutes % 720);
    if (same12) return same12;
    return null;
  }
  for (const [word, index] of Object.entries(indexMap)) {
    if (norm.split(/[\s،,.!?]+/).includes(word)) {
      return pool[index] ?? pool[0] ?? null;
    }
  }
  if (wantedDate && pool.length === 1) return pool[0];
  return null;
}

function toneWelcome(business: Business, lang: 'ar' | 'en'): string {
  const name = businessName(business, lang);
  if (business.botTone === 'formal') {
    return L(
      lang,
      `أهلاً بك في ${name}. أنا المساعد الآلي، وأنا هنا لخدمتك بخصوص الأسعار والمواعيد والطلبات والدوام.`,
      `Welcome to ${name}. I am the automated assistant, here to help with prices, appointments, orders and opening hours.`,
    );
  }
  if (business.botTone === 'concise') {
    return L(
      lang,
      `أهلاً، معك مساعد ${name}. أسعار، مواعيد، طلبات — شتحتاج؟`,
      `Hi, this is ${name}'s assistant. Prices, appointments, orders — what do you need?`,
    );
  }
  return L(
    lang,
    `أهلاً وسهلاً 👋 أنا المساعد الآلي لـ${name}. أكدر أساعدك بالأسعار، المواعيد، الطلبات، والدوام.\nشتحب تسأل؟`,
    `Welcome 👋 I'm the automated assistant for ${name}. I can help with prices, appointments, orders and opening hours.\nWhat would you like to know?`,
  );
}

function classify(norm: string): Intent {
  if (containsAny(norm, ANGRY_WORDS)) return 'angry';
  if (containsAny(norm, CANCEL_WORDS)) return 'cancel';
  const booking = containsAny(norm, BOOKING_WORDS);
  const price = containsAny(norm, PRICE_WORDS);
  const order = containsAny(norm, ORDER_WORDS);
  const hours = containsAny(norm, HOURS_WORDS);
  const address = containsAny(norm, ADDRESS_WORDS);
  if (booking) return 'booking';
  if (order) return 'order';
  if (price) return 'price';
  if (hours) return 'hours';
  if (address) return 'address';
  if (containsAny(norm, GREETING_WORDS)) return 'greeting';
  if (containsAny(norm, THANKS_WORDS)) return 'thanks';
  return 'fallback';
}

function handoffResult(
  lang: 'ar' | 'en',
  intent: Intent,
  reason: 'angry' | 'unknown' | 'keyword' | 'conflict',
): BotResult {
  const reply =
    reason === 'angry'
      ? L(
          lang,
          'أعتذر منك جداً على هذا الموقف. حوّلت محادثتك مباشرة لصاحب العمل وراح يتواصل وياك بأقرب وقت.',
          'I am very sorry about this. I have transferred your conversation to the business owner, who will contact you shortly.',
        )
      : L(
          lang,
          'أعتذر، ما وصلتني المعلومة بشكل واضح وما أريد أعطيك معلومة غلط. حوّلت محادثتك لصاحب العمل وراح يرد عليك بأقرب وقت.',
          'I am sorry, I could not understand that clearly and I do not want to give you wrong information. I have transferred your conversation to the business owner.',
        );
  return {
    replies: [reply],
    action: { type: 'handoff', reason },
    handoff: true,
    afterHours: false,
    state: null,
    intent,
    lang,
  };
}

/**
 * Rule-based engine. It only answers from the registered business data and
 * escalates to a human whenever it is not certain.
 */
export function runBot(input: BotInput): BotResult {
  const raw = sanitizeText(input.text, 1000);
  const text = raw.trim();
  const detected = detectLanguage(text);
  const lang: 'ar' | 'en' = /[A-Za-z\u0600-\u06FF]/.test(text) ? detected : input.business.defaultLanguage;
  const norm = normalizeArabic(text);
  const intent = classify(norm);
  const business = input.business;
  const { now } = input;
  const customer = input.customer;
  const state = input.conversation.botState;
  const firstName = customer.name.split(' ')[0] || customer.name;
  const name = businessName(business, lang);
  const hoursInfo = describeHours(business, lang, now);
  const handoffKeywords = (input.config?.handoffKeywords ?? '')
    .split(',')
    .map((k) => normalizeArabic(k.trim()))
    .filter(Boolean);
  const keywords = [...DEFAULT_HANDOFF_KEYWORDS, ...handoffKeywords];

  if (!text) {
    return { replies: [], action: null, handoff: false, afterHours: false, state, intent: 'fallback', lang };
  }

  // 1) Anything that looks like a complaint goes straight to a human.
  if (intent === 'angry') {
    return handoffResult(lang, intent, 'angry');
  }
  if (containsAny(norm, keywords.map((k) => normalizeArabic(k)))) {
    return handoffResult(lang, intent, 'keyword');
  }

  // 2) Outside working hours: acknowledge, log for the morning, never book or guess.
  if (!hoursInfo.isOpen) {
    const custom = input.config?.outOfHours?.[lang]?.trim();
    const already = Boolean(state?.lastOutOfHoursAt);
    const reply = already
      ? L(
          lang,
          'سجّلنا رسالتك، وراح نرد عليك بأول وقت من ساعات الدوام.',
          'We have logged your message and will reply at the start of working hours.',
        )
      : custom ||
        L(
          lang,
          `أهلاً بك في ${name} 🌙 وصلتنا رسالتك خارج ساعات الدوام الحالية، وسجّلنا طلبك وراح نرد عليك أول شي بالصباح.\nساعات دوامنا:\n${hoursInfo.summary}`,
          `Welcome to ${name} 🌙 Your message arrived outside our working hours. We have logged your request and will reply first thing in the morning.\nOur hours:\n${hoursInfo.summary}`,
        );
    return {
      replies: [reply],
      action: null,
      handoff: false,
      afterHours: true,
      state: { lastOutOfHoursAt: state?.lastOutOfHoursAt ?? now.toISOString() },
      intent,
      lang,
    };
  }

  // 3) Cancel an in-progress booking/order.
  if (state && intent === 'cancel') {
    return {
      replies: [
        L(
          lang,
          'تم إلغاء العملية الحالية. تحب أساعدك بشي ثاني؟',
          'The current request has been cancelled. Can I help with anything else?',
        ),
      ],
      action: null,
      handoff: false,
      afterHours: false,
      state: null,
      intent,
      lang,
    };
  }

  // 4) Continue an open booking flow.
  if (state?.flow === 'booking' && state.step === 'choose') {
    const offered = state.offered ?? [];
    const match = matchOffered(text, offered, now);
    if (!match) {
      const attempts = (state.attempts ?? 0) + 1;
      if (attempts >= 2) return handoffResult(lang, intent, 'unknown');
      return {
        replies: [
          L(
            lang,
            `ما وصلني الوقت بشكل واضح. هذي الأوقات المتاحة:\n${slotList(offered, lang, now)}\nاكتب الوقت مثل: باجر 10:00.`,
            `I did not catch the time clearly. Available times:\n${slotList(offered, lang, now)}\nWrite it like: tomorrow 10:00.`,
          ),
        ],
        action: null,
        handoff: false,
        afterHours: false,
        state: { ...state, attempts },
        intent,
        lang,
      };
    }
    const taken = input.appointments.some(
      (a) => a.businessId === business.id && a.date === match.date && a.time === match.time && a.status !== 'cancelled',
    );
    if (taken) {
      const open = nextAvailableSlots(business.hours, input.appointments.filter((a) => a.businessId === business.id), now, 4);
      if (open.length === 0) return handoffResult(lang, intent, 'conflict');
      return {
        replies: [
          L(
            lang,
            `هذا الوقت انحجز للتو. هذي أقرب أوقات ثانية:\n${slotList(open, lang, now)}\nأي وقت يناسبك؟`,
            `That time was just booked. Here are the next available times:\n${slotList(open, lang, now)}\nWhich one works for you?`,
          ),
        ],
        action: null,
        handoff: false,
        afterHours: false,
        state: { ...state, offered: open, attempts: (state.attempts ?? 0) + 1 },
        intent,
        lang,
      };
    }
    return {
      replies: [
        L(
          lang,
          `تم حجز موعدك ${fmtSlot(match, lang, now)} لـ${serviceLabel(business, lang)}. ننتظرك، وإذا احتجت تغيير الموعد خبّرنا.`,
          `Your ${serviceLabel(business, lang).toLowerCase()} is booked for ${fmtSlot(match, lang, now)}. See you then — tell us if you need to reschedule.`,
        ),
      ],
      action: { type: 'appointment', date: match.date, time: match.time, service: serviceLabel(business, lang) },
      handoff: false,
      afterHours: false,
      state: null,
      intent,
      lang,
    };
  }

  // 5) Continue an open order flow.
  if (state?.flow === 'order') {
    const product = input.products.find((p) => p.id === state.productId);
    if (state.step === 'product') {
      const found = findProducts(text, input.products, business.id);
      if (found.length === 0) {
        return {
          replies: [
            L(
              lang,
              `ما لقيت هذا المنتج بقائمتنا. هذي المنتجات المتوفرة:\n${availableList(input.products, business.id, lang)}\nاكتب اسم المنتج اللي تريده.`,
              `I could not find that item in our list. Available items:\n${availableList(input.products, business.id, lang)}\nSend the item name you want.`,
            ),
          ],
          action: null,
          handoff: false,
          afterHours: false,
          state: { ...state, attempts: (state.attempts ?? 0) + 1 },
          intent,
          lang,
        };
      }
      return startOrder(found[0], text, business, lang, now);
    }
    if (state.step === 'qty' && product) {
      const qty = parseArabicNumber(norm);
      if (qty == null || qty < 1 || qty > 99) {
        return {
          replies: [
            L(
              lang,
              `اكتب الكمية المطلوبة من ${productName(product, lang)} (رقم من 1 إلى 99).`,
              `How many ${productName(product, lang)} would you like? (1 to 99)`,
            ),
          ],
          action: null,
          handoff: false,
          afterHours: false,
          state: { ...state, attempts: (state.attempts ?? 0) + 1 },
          intent,
          lang,
        };
      }
      return {
        replies: [
          L(
            lang,
            `تمام: ${qty} × ${productName(product, lang)} = ${money(product.price * qty, lang)}.\nشنو عنوان التوصيل؟`,
            `Got it: ${qty} × ${productName(product, lang)} = ${money(product.price * qty, lang)}.\nWhat is the delivery address?`,
          ),
        ],
        action: null,
        handoff: false,
        afterHours: false,
        state: { ...state, step: 'address', qty, attempts: 0 },
        intent,
        lang,
      };
    }
    if (state.step === 'address' && product) {
      const address = cleanAddress(text);
      if (address.length < 5) {
        return {
          replies: [
            L(
              lang,
              'العنوان غير واضح. اكتب المنطقة والشارع وأقرب نقطة دالة حتى نوصل الطلب صح.',
              'The address is not clear. Please write the area, street and nearest landmark.',
            ),
          ],
          action: null,
          handoff: false,
          afterHours: false,
          state: { ...state, attempts: (state.attempts ?? 0) + 1 },
          intent,
          lang,
        };
      }
      const qty = state.qty ?? 1;
      return {
        replies: [
          L(
            lang,
            `ملخص الطلب:\n• ${qty} × ${productName(product, lang)} (${money(product.price * qty, lang)})\n• الاسم: ${customer.name}\n• الهاتف: ${customer.phone}\n• العنوان: ${address}\nالإجمالي: ${money(product.price * qty, lang)}\nأأكد الطلب؟ (نعم / لا)`,
            `Order summary:\n• ${qty} × ${productName(product, lang)} (${money(product.price * qty, lang)})\n• Name: ${customer.name}\n• Phone: ${customer.phone}\n• Address: ${address}\nTotal: ${money(product.price * qty, lang)}\nConfirm the order? (yes / no)`,
          ),
        ],
        action: null,
        handoff: false,
        afterHours: false,
        state: { ...state, step: 'confirm', address, attempts: 0 },
        intent,
        lang,
      };
    }
    if (state.step === 'confirm' && product) {
      const address = state.address ?? '';
      const qty = state.qty ?? 1;
      if (isYes(norm)) {
        return {
          replies: [
            L(
              lang,
              `تم تسجيل طلبك ✅ راح نتواصل وياك على ${customer.phone} للتأكيد والتوصيل. شكراً لثقتك بـ${name}.`,
              `Your order is recorded ✅ We will contact you on ${customer.phone} to confirm delivery. Thank you for choosing ${name}.`,
            ),
          ],
          action: { type: 'order', items: [{ productId: product.id, qty }], address, phone: customer.phone },
          handoff: false,
          afterHours: false,
          state: null,
          intent,
          lang,
        };
      }
      if (isNo(norm)) {
        return {
          replies: [
            L(lang, 'تم إلغاء الطلب. تحب أعرض عليك منتج ثاني؟', 'Order cancelled. Would you like to see another item?'),
          ],
          action: null,
          handoff: false,
          afterHours: false,
          state: null,
          intent,
          lang,
        };
      }
      const attempts = (state.attempts ?? 0) + 1;
      if (attempts >= 2) return handoffResult(lang, intent, 'unknown');
      return {
        replies: [L(lang, 'اكتب «نعم» للتأكيد أو «لا» للإلغاء.', 'Please reply “yes” to confirm or “no” to cancel.')],
        action: null,
        handoff: false,
        afterHours: false,
        state: { ...state, attempts },
        intent,
        lang,
      };
    }
  }

  // 6) Fresh intents.
  if (intent === 'booking') {
    const offers = nextAvailableSlots(
      business.hours,
      input.appointments.filter((a) => a.businessId === business.id),
      now,
      4,
    );
    if (offers.length === 0) return handoffResult(lang, intent, 'conflict');
    const greeting =
      business.botTone === 'formal'
        ? L(lang, `أهلاً بك ${customer.name}.`, `Welcome ${customer.name}.`)
        : business.botTone === 'friendly'
          ? L(lang, `أهلاً ${firstName} 🌿`, `Hi ${firstName} 🌿`)
          : L(lang, 'تمام.', 'Sure.');
    return {
      replies: [
        `${greeting}\n${L(lang, 'هذي أقرب الأوقات المتاحة:', 'Here are the nearest available times:')}\n${slotList(offers, lang, now)}\n${L(lang, 'أي وقت يناسبك؟', 'Which time works for you?')}`,
      ],
      action: null,
      handoff: false,
      afterHours: false,
      state: { flow: 'booking', step: 'choose', attempts: 0, offered: offers },
      intent,
      lang,
    };
  }

  if (intent === 'order') {
    const matches = findProducts(text, input.products, business.id);
    if (matches.length === 0) {
      return {
        replies: [
          L(
            lang,
            `هذي المنتجات المتوفرة عندنا:\n${availableList(input.products, business.id, lang)}\nاكتب اسم المنتج اللي تريده.`,
            `Here is what we have available:\n${availableList(input.products, business.id, lang)}\nSend the item name you want.`,
          ),
        ],
        action: null,
        handoff: false,
        afterHours: false,
        state: { flow: 'order', step: 'product', attempts: 0 },
        intent,
        lang,
      };
    }
    if (matches.length > 1) {
      const list = matches
        .slice(0, 4)
        .map((p) => `• ${productName(p, lang)} — ${money(p.price, lang)}${p.available ? '' : L(lang, ' (غير متوفر)', ' (unavailable)')}`)
        .join('\n');
      return {
        replies: [
          L(
            lang,
            `عندنا أكثر من خيار:\n${list}\nأي واحد تقصد؟`,
            `We have more than one option:\n${list}\nWhich one do you mean?`,
          ),
        ],
        action: null,
        handoff: false,
        afterHours: false,
        state: { flow: 'order', step: 'product', attempts: 1 },
        intent,
        lang,
      };
    }
    return startOrder(matches[0], text, business, lang, now);
  }

  if (intent === 'price') {
    const matches = findProducts(text, input.products, business.id);
    if (matches.length === 0) {
      return {
        replies: [
          L(
            lang,
            `أسعارنا الحالية:\n${availableList(input.products, business.id, lang)}\nإذا تقصد منتج ثاني، اكتب اسمه وأعطيك سعره بدقة.`,
            `Our current prices:\n${availableList(input.products, business.id, lang)}\nIf you meant something else, send its name and I will give you the exact price.`,
          ),
        ],
        action: null,
        handoff: false,
        afterHours: false,
        state: null,
        intent,
        lang,
      };
    }
    if (matches.length > 1) {
      const list = matches
        .slice(0, 4)
        .map((p) => `• ${productName(p, lang)} — ${money(p.price, lang)}${p.available ? '' : L(lang, ' (غير متوفر)', ' (unavailable)')}`)
        .join('\n');
      return {
        replies: [L(lang, `عندنا هذي الخيارات:\n${list}`, `We have these options:\n${list}`)],
        action: null,
        handoff: false,
        afterHours: false,
        state: null,
        intent,
        lang,
      };
    }
    const product = matches[0];
    const availability = product.available
      ? L(lang, 'متوفر حالياً.', 'available now.')
      : L(lang, 'بس حالياً غير متوفر.', 'but it is currently unavailable.');
    const description = lang === 'ar' ? product.description : product.descriptionEn;
    return {
      replies: [
        L(
          lang,
          `سعر ${productName(product, lang)} هو ${money(product.price, lang)}. ${availability}${description ? `\n${description}` : ''}`,
          `The price of ${productName(product, lang)} is ${money(product.price, lang)}. It is ${availability}${description ? `\n${description}` : ''}`,
        ),
      ],
      action: null,
      handoff: false,
      afterHours: false,
      state: null,
      intent,
      lang,
    };
  }

  if (intent === 'hours') {
    return {
      replies: [
        L(
          lang,
          `ساعات دوام ${name}:\n${hoursInfo.summary}\nالحين: ${hoursInfo.isOpen ? 'مفتوح ✅' : 'مغلق'}.`,
          `Opening hours at ${name}:\n${hoursInfo.summary}\nRight now: ${hoursInfo.isOpen ? 'open ✅' : 'closed'}.`,
        ),
      ],
      action: null,
      handoff: false,
      afterHours: false,
      state: null,
      intent,
      lang,
    };
  }

  if (intent === 'address') {
    return {
      replies: [
        L(
          lang,
          `عنواننا: ${businessAddress(business, lang)}\nهاتف: ${business.phone}`,
          `Our address: ${businessAddress(business, lang)}\nPhone: ${business.phone}`,
        ),
      ],
      action: null,
      handoff: false,
      afterHours: false,
      state: null,
      intent,
      lang,
    };
  }

  if (intent === 'greeting') {
    const custom = input.config?.welcome?.[lang]?.trim();
    return {
      replies: [custom || toneWelcome(business, lang)],
      action: null,
      handoff: false,
      afterHours: false,
      state: null,
      intent,
      lang,
    };
  }

  if (intent === 'thanks') {
    return {
      replies: [L(lang, 'العفو، موجودين بخدمتك 🌿', 'You are welcome — happy to help 🌿')],
      action: null,
      handoff: false,
      afterHours: false,
      state: null,
      intent,
      lang,
    };
  }

  return handoffResult(lang, 'fallback', 'unknown');
}

function startOrder(
  product: Product,
  text: string,
  business: Business,
  lang: 'ar' | 'en',
  now: Date,
): BotResult {
  void now;
  void business;
  if (!product.available) {
    return {
      replies: [
        L(
          lang,
          `${productName(product, lang)} سعره ${money(product.price, lang)}، بس حالياً غير متوفر. هذا المتوفر عندنا:\n${availableList([product], product.businessId, lang)}`,
          `${productName(product, lang)} is priced at ${money(product.price, lang)}, but it is currently unavailable. Here is what is available:\n${availableList([product], product.businessId, lang)}`,
        ),
      ],
      action: null,
      handoff: false,
      afterHours: false,
      state: null,
      intent: 'order',
      lang,
    };
  }
  const qty = parseArabicNumber(text);
  if (qty != null && qty >= 1 && qty <= 99) {
    return {
      replies: [
        L(
          lang,
          `تمام: ${qty} × ${productName(product, lang)} = ${money(product.price * qty, lang)}.\nشنو عنوان التوصيل؟`,
          `Got it: ${qty} × ${productName(product, lang)} = ${money(product.price * qty, lang)}.\nWhat is the delivery address?`,
        ),
      ],
      action: null,
      handoff: false,
      afterHours: false,
      state: { flow: 'order', step: 'address', attempts: 0, productId: product.id, qty },
      intent: 'order',
      lang,
    };
  }
  return {
    replies: [
      L(
        lang,
        `تمام، ${productName(product, lang)} سعره ${money(product.price, lang)}.\nكم قطعة تريد؟`,
        `Great, ${productName(product, lang)} is ${money(product.price, lang)}.\nHow many would you like?`,
      ),
    ],
    action: null,
    handoff: false,
    afterHours: false,
    state: { flow: 'order', step: 'qty', attempts: 0, productId: product.id },
    intent: 'order',
    lang,
  };
}

function availableList(products: Product[], businessId: number, lang: 'ar' | 'en'): string {
  return products
    .filter((p) => p.businessId === businessId && p.available)
    .slice(0, 6)
    .map((p) => `• ${productName(p, lang)} — ${money(p.price, lang)}`)
    .join('\n');
}

function cleanAddress(text: string): string {
  return sanitizeText(
    text
      .replace(/^(عنواني|العنوان|أسكن في|اسكن في|منطقة|my address is|address:?)\s*/i, '')
      .trim(),
    240,
  );
}

function isYes(norm: string): boolean {
  const tokens = norm.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return tokens.some((token) =>
    ['نعم', 'اي', 'ايه', 'ايوه', 'اكيد', 'موافق', 'تمام', 'اوكي', 'اوك', 'زين', 'تم', 'yes', 'ok', 'okay', 'confirm'].includes(token),
  );
}

function isNo(norm: string): boolean {
  const tokens = norm.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return tokens.some((token) => ['لا', 'مو', 'ليس', 'no', 'cancel', 'الغاء'].includes(token));
}

/** Re-exported for tests and UI helpers. */
export { resolveDateKey, extractTimeMinutes, matchOffered, isBusinessOpenAt, dayHoursFor };
