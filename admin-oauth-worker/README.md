# خادم تفويض GitHub OAuth للوحة الإدارة (Decap CMS)

موقعك ستاتيك على GitHub Pages، وهذا لا يدعم تسجيل الدخول مباشرة، لذلك تحتاج نقطة وسيطة صغيرة (هذا الـ Worker) لإتمام تسجيل الدخول عبر GitHub فقط — لا يخزن أي بيانات ولا يمسّ محتوى موقعك.

## الخطوات

### 1) أنشئ GitHub OAuth App
اذهب إلى: GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
- **Homepage URL**: `https://stayerkw.github.io`
- **Authorization callback URL**: `https://<اسم-الـ-worker>.<حسابك>.workers.dev/callback`

بعد الإنشاء ستحصل على `Client ID` و`Client Secret`.

### 2) انشر الـ Worker
```bash
cd admin-oauth-worker
npx wrangler login
npx wrangler deploy
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

### 3) اربط اللوحة بالـ Worker
افتح `public/admin/config.yml` في مشروع الموقع الرئيسي وعدّل:
```yaml
backend:
  name: github
  repo: <اسم-مستخدمك>/stayerkw.github.io
  branch: main
  base_url: https://<اسم-الـ-worker>.<حسابك>.workers.dev
```

### 4) استخدم اللوحة
افتح `https://stayerkw.github.io/admin/` وسجّل دخول بحساب GitHub. أي حفظ من اللوحة يصبح commit مباشر على المستودع، وينشر تلقائياً عبر GitHub Actions الموجود في المشروع.

## ملاحظة أمان
أي شخص يملك حساب GitHub لديه صلاحية Write على المستودع يقدر يسجّل دخول من اللوحة. لا تشارك صلاحية الكتابة على المستودع إلا مع من تثق به.
