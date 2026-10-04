// فحص وزن الصور المنشورة (N-50): يقرأ كل صفحة في dist ويجمع الصور التي قد يحمّلها الجوال
// (src وكل نسخ srcset حتى عرض 900w) وينبّه إن تجاوز ملف منها الحد (150 ك.ب افتراضياً).
// المقصود الصورة التي يرسلها الموقع بعد التحويل، لا الصورة الأصلية المرفوعة (الأصل يُصغَّر تلقائياً).
// الاستعمال: node scripts/image-weight-check.mjs [--report-only] [--max=150]
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const args = process.argv.slice(2);
const reportOnly = args.includes('--report-only');
const max = Number((args.find((a) => a.startsWith('--max=')) || '--max=150').split('=')[1]) * 1024;
const dist = 'dist';
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.html') ? [join(d, e.name)] : []));
const heavy = new Map(); // file -> {size, pages:Set}
let checked = 0;
for (const page of walk(dist)) {
  const html = readFileSync(page, 'utf8');
  const urls = new Set();
  for (const m of html.matchAll(/<(?:img|source)\b[^>]*>/g)) {
    const tag = m[0];
    const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
    const srcset = tag.match(/\ssrcset="([^"]+)"/)?.[1];
    // مع srcset يختار المتصفح منها، وsrc احتياطي للمتصفحات القديمة فقط
    if (src && !srcset) urls.add(src);
    if (srcset) for (const c of srcset.split(',')) {
      const [u, w] = c.trim().split(/\s+/);
      if (!w || !w.endsWith('w') || parseInt(w) <= 900) urls.add(u);
    }
  }
  for (const u of urls) {
    if (!u.startsWith('/')) continue;
    const f = join(dist, decodeURIComponent(u.split('?')[0]));
    if (!existsSync(f)) continue;
    checked++;
    const size = statSync(f).size;
    if (size > max) {
      const e = heavy.get(u) || { size, pages: new Set() };
      e.pages.add(page.replace(/^dist/, '').replace(/index\.html$/, ''));
      heavy.set(u, e);
    }
  }
}
for (const [u, e] of heavy) {
  const msg = `صورة ${Math.round(e.size / 1024)} ك.ب (الحد ${max / 1024}) في: ${[...e.pages].slice(0, 3).join('، ')}${e.pages.size > 3 ? '…' : ''}`;
  console.log(process.env.GITHUB_ACTIONS ? `::warning title=صورة ثقيلة ${u}::${msg}` : `⚠ ${u} — ${msg}`);
}
console.log(`فُحص ${checked} مرجع صورة — الأثقل من الحد: ${heavy.size}`);
if (heavy.size && !reportOnly) process.exit(1);
