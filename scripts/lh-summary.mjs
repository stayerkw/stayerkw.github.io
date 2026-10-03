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
  // مراحل LCP (TTFB / تأخر التحميل / زمن التحميل / تأخر الرسم) إن وُجدت
  const phases = a['largest-contentful-paint-element']?.details?.items?.[1]?.items
    ?.map((p) => `${p.phase || p.label}: ${Math.round(p.timing)}ms`).join(', ') || '';
  // أكبر الطلبات قبل LCP
  const reqs = (a['network-requests']?.details?.items || [])
    .filter((q) => q.endTime != null)
    .sort((x, y) => (y.transferSize || 0) - (x.transferSize || 0)).slice(0, 6)
    .map((q) => `${q.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 50)} ${Math.round((q.transferSize || 0) / 1024)}K@${Math.round(q.endTime)}ms`).join(' ; ');
  console.log(`::notice title=Lighthouse ${path}::${msg.replace(/\n/g, ' ')} || phases: ${phases} || top: ${reqs}`);
}
