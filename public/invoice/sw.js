// عامل خدمة نظام الفواتير: يعمل دون إنترنت. الصفحة نفسها «الشبكة أولاً» كي تصل التحديثات فوراً،
// والمكتبات والخطوط والشعار «الذاكرة أولاً». نطاقه /invoice/ فقط ولا يمس بقية الموقع.
const CACHE = 'alam-invoice-v2';
const SHELL = [
  '/invoice/',
  '/invoice/manifest.webmanifest',
  '/invoice/vendor/html2canvas.min.js',
  '/invoice/vendor/jspdf.umd.min.js',
  '/logo.png',
  '/fonts/cairo-arabic-400-normal.woff2',
  '/fonts/cairo-arabic-700-normal.woff2',
  '/fonts/cairo-latin-400-normal.woff2',
  '/fonts/cairo-latin-700-normal.woff2',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('alam-invoice-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('/invoice/', copy)); return r; }).catch(() => caches.match('/invoice/')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
