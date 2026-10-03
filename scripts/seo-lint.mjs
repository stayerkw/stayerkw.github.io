// فحص السيو الآلي على مخرجات البناء (dist) — يفحص ما سيُنشر فعلاً لا ملفات المصدر.
// الاستعمال: npm run build && node scripts/seo-lint.mjs [--strict]
//   بدون --strict: الأخطاء الجسيمة تُفشل الأمر (خروج 1)، والتحذيرات تُطبع فقط.
//   مع --strict: التحذيرات تُفشل أيضاً.
//   مع --report-only: لا يُفشل أبداً (خروج 0) ويطبع كل ملاحظة كتنبيه GitHub (::warning::) — المستعمل في CI والنشر
//   بقرار المالك (2 أكتوبر): الفحص يُنبّه ولا يمنع النشر.
import fs from "node:fs";
import path from "node:path";
import { checkKeywords } from "./keyword-check.mjs";

const DIST = "dist";
const strict = process.argv.includes("--strict");
const reportOnly = process.argv.includes("--report-only");
const errors = [];
const warnings = [];
const err = (page, msg) => errors.push(`✗ ${page}: ${msg}`);
const warn = (page, msg) => warnings.push(`! ${page}: ${msg}`);

if (!fs.existsSync(DIST)) {
  console.error("لا يوجد مجلد dist — شغّل npm run build أولاً.");
  process.exit(1);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const routeOf = (file) => "/" + path.relative(DIST, file).replace(/\\/g, "/").replace(/(^|\/)index\.html$/, "$1");

const pages = walk(DIST)
  .filter((f) => !/[\\/]admin[\\/]/.test(f) && !f.endsWith("404.html"))
  .map((file) => ({ file, route: routeOf(file), html: fs.readFileSync(file, "utf8") }));

const titles = new Map();
const descs = new Map();
const indexable = new Set();

for (const { route, html } of pages) {
  const title = decode((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "").trim();
  const desc = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "").trim();
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  if (!noindex) indexable.add(canonical);

  // أخطاء جسيمة
  if (!title) err(route, "لا يوجد <title>");
  if (!desc) err(route, "لا يوجد meta description");
  if (!canonical) err(route, "لا يوجد canonical");
  else if (new URL(canonical).pathname !== route) err(route, `canonical لا يطابق المسار (${canonical})`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) err(route, `عدد وسوم h1 = ${h1} (المطلوب 1)`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt=/.test(m[0])) err(route, "صورة بلا وسم alt");
  }

  // JSON-LD: كتلة @graph واحدة، معرّفات فريدة، كل إشارة @id تصل لعقدة، Product يحمل offers
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let graphs = 0;
  for (const b of blocks) {
    let d;
    try { d = JSON.parse(b); } catch { err(route, "JSON-LD غير صالح"); continue; }
    if (!d["@graph"]) continue;
    graphs++;
    const g = d["@graph"];
    const ids = g.map((x) => x["@id"]).filter(Boolean);
    if (new Set(ids).size !== ids.length) err(route, "معرّفات @id مكررة في schema");
    const refs = [];
    const walkRefs = (o) => {
      if (Array.isArray(o)) o.forEach(walkRefs);
      else if (o && typeof o === "object") {
        if (Object.keys(o).length === 1 && o["@id"]) refs.push(o["@id"]);
        Object.values(o).forEach(walkRefs);
      }
    };
    g.forEach((x) => { const { "@id": _i, ...rest } = x; walkRefs(rest); });
    for (const r of refs) if (!ids.includes(r)) err(route, `إشارة @id بلا عقدة: ${r}`);
    for (const x of g) if (x["@type"] === "Product" && !x.offers) err(route, "Product بلا offers");
  }
  if (graphs !== 1) err(route, `كتل @graph = ${graphs} (المطلوب 1)`);

  // تحذيرات جودة
  if (title.length > 60) warn(route, `العنوان ${title.length} حرفاً (الحد 60)`);
  if (desc.length < 110 || desc.length > 160) warn(route, `الوصف ${desc.length} حرفاً (المطلوب 110–160)`);
  if (/\b\d{8}\b/.test(title + " " + desc)) warn(route, "رقم هاتف داخل العنوان/الوصف");
  if (!noindex) {
    if (titles.has(title)) warn(route, `عنوان مكرر مع ${titles.get(title)}`);
    else titles.set(title, route);
    if (descs.has(desc)) warn(route, `وصف مكرر مع ${descs.get(desc)}`);
    else descs.set(desc, route);
  }
}

// sitemap: كل صفحة مفهرسة موجودة، ولا صفحة noindex فيه
const smFiles = fs.readdirSync(DIST).filter((f) => /^sitemap-\d+\.xml$/.test(f));
if (!smFiles.length) err("sitemap", "لا يوجد ملف sitemap-*.xml");
else {
  const locs = new Set(
    smFiles.flatMap((f) => [...fs.readFileSync(path.join(DIST, f), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))
  );
  for (const c of indexable) if (!locs.has(c)) err("sitemap", `صفحة مفهرسة غير موجودة في sitemap: ${c}`);
  for (const l of locs) if (!indexable.has(l)) err("sitemap", `رابط في sitemap ليس صفحة مفهرسة: ${l}`);
}

// مشاريع محفوظة لن تُنشر لنقص ما لا يجوز نشره بدونه (انظر src/lib/projects.ts)
{
  const dir = "src/content/projects";
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
    const fm = (fs.readFileSync(path.join(dir, f), "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/) || [, ""])[1];
    if (/^draft:\s*true\s*$/m.test(fm)) continue;
    const miss = [];
    if (!/^consent:\s*true\s*$/m.test(fm)) miss.push("موافقة العميل");
    if (!/^images:\s*\n\s*-/m.test(fm)) miss.push("صورة");
    if (miss.length) warn(`/projects/${f.replace(/\.md$/, "")}/`, `محفوظ لكنه لا يُنشر حتى يُكمل: ${miss.join("، ")}`);
  }
}

// الكلمات المستهدفة (focusKeyword) في ملفات المحتوى — تنافس الصفحات خطأ جسيم، وغياب الكلمة عن العنوان/الوصف تحذير
const kw = checkKeywords();
errors.push(...kw.errors);
warnings.push(...kw.warnings);

console.log(`فُحصت ${pages.length} صفحة — أخطاء: ${errors.length}، تحذيرات: ${warnings.length}${strict ? " (وضع صارم)" : ""}`);
if (reportOnly) {
  // تنبيهات تظهر في صفحة الفحص على GitHub دون إفشاله
  for (const l of [...errors, ...warnings]) console.log(`::warning title=SEO::${l.replace(/\n/g, " ")}`);
  process.exit(0);
}
if (warnings.length) console.log(warnings.join("\n"));
if (errors.length) console.error(errors.join("\n"));
process.exit(errors.length || (strict && warnings.length) ? 1 : 0);
