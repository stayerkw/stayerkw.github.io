// يسحب مراجعات العملاء الواردة من دالة Netlify وينشرها مباشرة (قرار المالك 7 نوفمبر 2026: بلا موافقة مسبقة).
// المالك يحذف أي مراجعة غير مناسبة من لوحة التحكم، ولا تعود بعد حذفها.
// يسجّل كل معرّف مستورد في src/data/reviews-imported.json حتى لا تعود مراجعة رفضها المالك (حذفها).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const API = 'https://alamcurtains-reviews.netlify.app/api/review';
const LEDGER = 'src/data/reviews-imported.json';
const DIR = 'src/content/reviews';

const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : [];
const seen = new Set(ledger);
const res = await fetch(API, { headers: { accept: 'application/json' } });
if (!res.ok) { console.log('API', res.status); process.exit(0); }
const { items = [] } = await res.json();
const q = (s) => JSON.stringify(String(s ?? ''));
let added = 0;
mkdirSync(DIR, { recursive: true });
for (const r of items) {
  if (!r?.id || seen.has(r.id) || !/^[0-9a-z-]+$/.test(r.id)) continue;
  const rating = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
  const lines = ['---', `name: ${q(r.name)}`, `rating: ${rating}`, `text: ${q(r.text)}`];
  if (r.product && /^[a-z0-9-]+$/.test(r.product) && existsSync(`src/content/products/${r.product}.md`)) lines.push(`product: ${q(r.product)}`);
  if (r.area) lines.push(`area: ${q(r.area)}`);
  lines.push(`date: ${/^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : new Date().toISOString().slice(0, 10)}`, 'approved: true', '---', '');
  writeFileSync(`${DIR}/r-${r.id}.md`, lines.join('\n'));
  seen.add(r.id); ledger.push(r.id); added++;
}
writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
console.log('added', added);
