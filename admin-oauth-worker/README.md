# خادم تفويض GitHub OAuth للوحة الإدارة (Decap CMS)

موقعك ستاتيك على GitHub Pages، وهذا لا يدعم تسجيل الدخول مباشرة، لذلك تحتاج نقطة وسيطة صغيرة (هذا الـ Worker) لإتمام تسجيل الدخول عبر GitHub فقط — لا يخزن أي بيانات ولا يمسّ محتوى موقعك.

## ما الذي يحميه هذا الإصدار
- التحقق من `state` عبر كوكي HttpOnly (حماية CSRF).
- التوكن يُرسل فقط إلى أصل اللوحة المحدد في `SITE_ORIGIN` (لا `'*'`).
- صلاحية `public_repo` فقط بدل `repo,user`.
- قائمة سماح `ALLOWED_USERS`: لا يدخل إلا الحسابات المذكورة حتى لو كان لديها صلاحية كتابة.
- الخدمة ترفض العمل إن نقص أي متغير (فشل مغلق).

## الخطوات

### 1) أنشئ GitHub OAuth App
GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
- **Homepage URL**: `https://alamcurtainskw.com`
- **Authorization callback URL**: `https://<اسم-الـ-worker>.<حسابك>.workers.dev/callback`

احفظ `Client ID` و`Client Secret`. (إن سبق أن استخدمت سراً قديماً، ولّد سراً جديداً: Generate a new client secret ثم احذف القديم.)

### 2) انشر الـ Worker وأضف المتغيرات
```bash
cd admin-oauth-worker
npx wrangler login
npx wrangler deploy
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put ALLOWED_USERS   # اسم مستخدمك في GitHub (أو عدة أسماء بفاصلة)
npx wrangler secret put SITE_ORIGIN     # https://alamcurtainskw.com  (أثناء الانتقال: https://alamcurtainskw.com,https://stayerkw.github.io)
```
عند تفعيل النطاق الخاص: أعد تشغيل `wrangler secret put SITE_ORIGIN` بالقيمتين مفصولتين بفاصلة.

> إن كان المستودع **خاصاً** أضف السر `GITHUB_SCOPE` بالقيمة `repo`. للمستودع العام يكفي الافتراضي `public_repo`.

### 3) اربط اللوحة بالـ Worker
في `public/admin/config.yml`:
```yaml
backend:
  name: github
  repo: <اسم-مستخدمك>/stayerkw.github.io
  branch: main
  base_url: https://<اسم-الـ-worker>.<حسابك>.workers.dev
```

### 4) اختبر
افتح `https://alamcurtainskw.com/admin/` وسجّل الدخول، ثم عدّل صفحة واحفظ وتأكد من ظهور commit. جرّب أيضاً الدخول بحساب غير مسموح: يجب أن ترى `Forbidden`.

## إجراءات يدوية على حساب GitHub (لا يمكن تنفيذها من الكود)
- فعّل المصادقة الثنائية (2FA) على حسابك.
- فعّل حماية فرع `main` (Settings → Branches).
- لا تمنح صلاحية كتابة على المستودع إلا لمن تثق به.
