// IndexNow (N-56): يرسل إلى Bing (وكل محركات IndexNow) الصفحات الجديدة أو المعدّلة فقط بعد كل نشر.
// prepare: يقارن بصمة (sha1) كل صفحة في dist مع آخر نشر (.indexnow/hashes.json المحفوظ في ذاكرة Actions)
//          ويكتب الروابط المتغيرة إلى .indexnow/urls.txt (أول تشغيل = كل صفحات الخريطة).
// submit:  يرسل .indexnow/urls.txt إلى api.indexnow.org. ملف المفتاح: public/9943ce41493bd99fdf3884cccb6dc100.txt
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const KEY = '9943ce41493bd99fdf3884cccb6dc100';
const HOST = 'alamcurtainskw.com';
const ORIGIN = 'https://' + HOST;
const mode = process.argv[2];
mkdirSync('.indexnow', { recursive: true });
if (mode === 'prepare') {
  const sm = readFileSync('dist/sitemap-0.xml', 'utf8');
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const prev = existsSync('.indexnow/hashes.json') ? JSON.parse(readFileSync('.indexnow/hashes.json', 'utf8')) : {};
  const next = {};
  const changed = [];
  for (const u of urls) {
    const path = new URL(u).pathname;
    const file = join('dist', path, 'index.html');
    if (!existsSync(file)) continue;
    // يُستبعد رابط ملفات الأصول المتغيرة (/_astro/…) من البصمة حتى لا يُرسل كل الموقع عند تغيير CSS فقط
    const html = readFileSync(file, 'utf8').replace(/\/_astro\/[^"' )]+/g, '');
    const h = createHash('sha1').update(html).digest('hex');
    next[u] = h;
    if (prev[u] !== h) changed.push(u);
  }
  writeFileSync('.indexnow/hashes.json', JSON.stringify(next));
  writeFileSync('.indexnow/urls.txt', changed.join('\n'));
  console.log('IndexNow: ' + changed.length + ' رابط متغير من ' + urls.length + (Object.keys(prev).length ? '' : ' (أول تشغيل)'));
} else if (mode === 'submit') {
  const urlList = existsSync('.indexnow/urls.txt') ? readFileSync('.indexnow/urls.txt', 'utf8').split('\n').filter(Boolean) : [];
  if (!urlList.length) { console.log('IndexNow: لا جديد'); process.exit(0); }
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: ORIGIN + '/' + KEY + '.txt', urlList }),
  });
  console.log('IndexNow: أُرسل ' + urlList.length + ' رابط — الرد ' + res.status);
  if (res.status >= 400 && res.status !== 429) console.log('::warning title=IndexNow::الرد ' + res.status + ' — ' + (await res.text()).slice(0, 200));
}
