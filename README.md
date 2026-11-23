# ردّ | Radd

تطبيق ويب عربي أولاً لأتمتة ردود واتساب للشركات الصغيرة (محاكاة كاملة + أساس ربط WhatsApp Cloud API).  
Arabic-first WhatsApp automation demo for small businesses (full simulation + Hybrid WhatsApp Cloud API foundation).

## المميزات | Features
- محاكاة واتساب كاملة: سيناريوهات، فقاعات، سرعة، إيقاف/متابعة، تبديل زبون/صاحب عمل.
- بوت قواعدي يفهم عراقي/عربي/إنكليزي ويرد فقط من بيانات العمل.
- لوحة تحكم، محادثات، مواعيد، طلبات، بيانات عمل، إعدادات، إدارة اشتراكات.
- عربي RTL / إنكليزي LTR، فاتح/داكن، أرقام غربية/شرقية.
- SQLite محلي + Express API + React/Vite واجهة.
- وضع Hybrid: Demo بدون مفاتيح، وCloud عند إضافة مفاتيح Meta.

## التشغيل المحلي | Local Run
```bash
cd radd
npm install
npm run dev
```
- Web: http://localhost:5173
- API: http://localhost:8787

## أوامر مفيدة | Scripts
```bash
npm run build      # بناء الواجهة
npm start          # تشغيل API (ويقدم dist إذا مبني)
npm run test       # Vitest
npm run test:e2e   # Playwright (بعد تثبيت المتصفحات)
```

## إعداد WhatsApp Hybrid
انسخ `.env.example` إلى `.env` وعدّل القيم:

```env
WHATSAPP_MODE=cloud
WHATSAPP_TOKEN=YOUR_META_TOKEN
WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN=radd_verify_123
WHATSAPP_BUSINESS_ID=1
```

Webhook (يحتاج رابط HTTPS عام):
- Callback: `https://YOUR_DOMAIN/api/whatsapp/webhook`
- Verify token: نفس `WHATSAPP_VERIFY_TOKEN`
- Subscribe: `messages`

> بدون مفاتيح، التطبيق يشتغل بوضع Demo بالكامل.

## النشر | Deployment
هذا المشروع يحتاج Node.js server (ليس static فقط).
- **Render/Railway/Fly/VPS**: مناسب.
- أمر البناء: `npm install && npm run build`
- أمر التشغيل: `npm start`
- ضبط المتغيرات البيئية من `.env.example`.

ملاحظة: SQLite على الاستضافات المجانية قد يكون مؤقتاً؛ للإنتاج الحقيقي استخدم قاعدة بيانات مدارة.

## الأمان | Security
- لا تضع `.env` أو توكنات Meta في GitHub.
- لا تشارك Access Token بالدردشة أو screenshots.
