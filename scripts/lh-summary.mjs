// يطبع ملخص Lighthouse لكل صفحة كتنبيهات GitHub (::notice::) لتظهر في صفحة الطلب وتُقرأ عبر API.
// يُشغَّل بعد lighthouse-ci-action: node scripts/lh-summary.mjs <resultsPath>
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2] || '.lighthouseci';
const files = readdirSync(dir).filter((f) => /^lhr-.*\.json$/.test(f));
const ms = (a) => (a?.numericValue != null ? `${(a.numericValue / 1000).toFixed(2)}s` : '—');
for (const f of files) {
  const r = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const a = r.audits;
  const path = new URL(r.finalDisplayedUrl || r.finalUrl).pathname;
  const el = a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet || '';
  const msg = `perf ${Math.round(r.categories.performance.score * 100)} | LCP ${ms(a['largest-contentful-paint'])} | FCP ${ms(a['first-contentful-paint'])} | SI ${ms(a['speed-index'])} | TBT ${Math.round(a['total-blocking-time'].numericValue)}ms | CLS ${a['cumulative-layout-shift'].numericValue.toFixed(3)} | bytes ${Math.round(a['total-byte-weight'].numericValue / 1024)}KB | LCP el: ${el.slice(0, 120)}`;
  console.log(`::notice title=Lighthouse ${path}::${msg.replace(/\n/g, ' ')}`);
}
