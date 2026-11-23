import type { DemoScenario } from '../data/types';

export const SCENARIOS: DemoScenario[] = [
  {
    id: 'price',
    icon: 'tag',
    titleKey: 'scenario.price.title',
    descKey: 'scenario.price.desc',
    businessType: 'retail',
    clock: '10:12',
    customer: { name: 'ليلى عبد الله', nameEn: 'Layla Abdullah', phone: '+9647709990001' },
    messages: [
      { role: 'customer', text: 'هلا، بيش قميص الكتان؟', textEn: 'Hi, how much is the linen shirt?', delayMs: 900 },
      { role: 'customer', text: 'تمام، شكراً!', textEn: 'Great, thanks!', delayMs: 5200 },
    ],
  },
  {
    id: 'booking',
    icon: 'calendar',
    titleKey: 'scenario.booking.title',
    descKey: 'scenario.booking.desc',
    businessType: 'clinic',
    clock: '10:05',
    customer: { name: 'حيدر كريم', nameEn: 'Haidar Kareem', phone: '+9647709990002' },
    messages: [
      {
        role: 'customer',
        text: 'مرحبا، أريد أحجز موعد تنظيف أسنان',
        textEn: 'Hi, I would like to book a dental cleaning appointment.',
        delayMs: 900,
      },
      { role: 'customer', text: 'باجر الساعة 11', textEn: 'Tomorrow at 11', delayMs: 5600 },
      { role: 'customer', text: 'مشكورين', textEn: 'Thanks a lot', delayMs: 4200 },
    ],
  },
  {
    id: 'order',
    icon: 'package',
    titleKey: 'scenario.order.title',
    descKey: 'scenario.order.desc',
    businessType: 'retail',
    clock: '11:20',
    customer: { name: 'مروة أحمد', nameEn: 'Marwa Ahmed', phone: '+9647709990003' },
    messages: [
      {
        role: 'customer',
        text: 'أريد أطلب قميص كتان رجالي',
        textEn: 'I would like to order a men’s linen shirt.',
        delayMs: 900,
      },
      { role: 'customer', text: 'قطعتين', textEn: 'Two pieces', delayMs: 5000 },
      {
        role: 'customer',
        text: 'بغداد، الكرادة، شارع 62، دار 14، قرب مول عشتار',
        textEn: 'Baghdad, Karrada, Street 62, house 14, near Ishtar Mall',
        delayMs: 6200,
      },
      { role: 'customer', text: 'نعم أكد الطلب', textEn: 'Yes, confirm the order', delayMs: 4800 },
    ],
  },
  {
    id: 'info',
    icon: 'clock',
    titleKey: 'scenario.info.title',
    descKey: 'scenario.info.desc',
    businessType: 'realestate',
    clock: '09:40',
    customer: { name: 'سيف الدين', nameEn: 'Saif Al-Din', phone: '+9647709990004' },
    messages: [
      { role: 'customer', text: 'شنو ساعات الدوام؟', textEn: 'What are your opening hours?', delayMs: 900 },
      { role: 'customer', text: 'وين موقعكم بالضبط؟', textEn: 'Where exactly are you located?', delayMs: 5000 },
      { role: 'customer', text: 'شكراً جزيلاً', textEn: 'Thank you very much', delayMs: 4000 },
    ],
  },
  {
    id: 'angry',
    icon: 'flame',
    titleKey: 'scenario.angry.title',
    descKey: 'scenario.angry.desc',
    businessType: 'clinic',
    clock: '09:10',
    customer: { name: 'أم محمد', nameEn: 'Umm Mohammed', phone: '+9647709990005' },
    messages: [
      {
        role: 'customer',
        text: 'دكتوركم تأخر عليّ ساعة كاملة أمس، هذا مو معقول',
        textEn: 'Your doctor kept me waiting a full hour yesterday, this is unacceptable.',
        delayMs: 900,
      },
      { role: 'customer', text: 'أريد أحچي ويا المدير', textEn: 'I want to speak to the manager', delayMs: 4500 },
      {
        role: 'owner',
        text: 'أعتذر منك نيابة عن العيادة، أرجو إرسال رقم الحجز وراح أتابع الموضوع شخصياً.',
        textEn: 'I apologise on behalf of the clinic. Please send your booking number and I will follow up personally.',
        delayMs: 5500,
      },
    ],
  },
  {
    id: 'after-hours',
    icon: 'moon',
    titleKey: 'scenario.afterHours.title',
    descKey: 'scenario.afterHours.desc',
    businessType: 'retail',
    clock: '21:40',
    customer: { name: 'عباس ناصر', nameEn: 'Abbas Nasser', phone: '+9647709990006' },
    messages: [
      { role: 'customer', text: 'عندكم عباية سادة؟', textEn: 'Do you have a plain abaya?', delayMs: 900 },
      { role: 'customer', text: 'أريد أحجز قياس باجر', textEn: 'I want to book a fitting tomorrow', delayMs: 5500 },
    ],
  },
  {
    id: 'unknown',
    icon: 'help',
    titleKey: 'scenario.unknown.title',
    descKey: 'scenario.unknown.desc',
    businessType: 'clinic',
    clock: '12:15',
    customer: { name: 'رغد سالم', nameEn: 'Raghad Salem', phone: '+9647709990007' },
    messages: [
      {
        role: 'customer',
        text: 'هل عندكم خدمة توصيل للبصرة؟',
        textEn: 'Do you deliver to Basra?',
        delayMs: 900,
      },
    ],
  },
];

export function scenarioById(id: string): DemoScenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
