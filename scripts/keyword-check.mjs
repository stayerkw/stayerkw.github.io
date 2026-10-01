// فحص «الكلمة المستهدفة» (focusKeyword) في ملفات المحتوى مقابل seo/keyword-master.csv.
// يُستدعى من seo-lint.mjs (فيعمل في CI وفي deploy.yml)، ويمكن تشغيله وحده: node scripts/keyword-check.mjs
//   خطأ:   كلمة غير موجودة في الخريطة، أو كلمة واحدة تستهدفها صفحتان منشورتان (تنافس صفحات — N-21).
//   تحذير: الكلمة لا تظهر في العنوان أو وصف جوجل، أو الخريطة توجّهها إلى صفحة أخرى.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = { products: "products", "curtain-types": "curtains", services: "services", areas: "areas", blog: "blog", projects: "projects" };

// تطبيع عربي للمقارنة: الهمزات والتاء المربوطة والألف المقصورة والتشكيل والتطويل
export const norm = (t = "") =>
  String(t).toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const hasAllWords = (text, kw) => { const t = ` ${norm(text)} `; return norm(kw).split(" ").filter(Boolean).every((w) => t.includes(` ${w} `) || t.includes(` ${w}`)); };

function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  const h = head.map((x) => x.replace(/^\uFEFF/, "").trim());
  return body.map((r) => Object.fromEntries(h.map((k, i) => [k, (r[i] ?? "").trim()])));
}
export function loadKeywordMap() {
  const file = path.join(ROOT, "seo/keyword-master.csv");
  if (!fs.existsSync(file)) return new Map();
  return new Map(parseCsv(fs.readFileSync(file, "utf8")).map((r) => [r.keyword, r]));
}

// قراءة القيم البسيطة من frontmatter (title/seoTitle/description/focusKeyword/draft) بلا مكتبات
function frontmatter(file) {
  const m = fs.readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1).replace(/\\"/g, '"').replace(/''/g, "'");
    out[kv[1]] = v;
  }
  return out;
}

export function checkKeywords() {
  const errors = [], warnings = [];
  const map = loadKeywordMap();
  const used = new Map();
  for (const [dir, route] of Object.entries(DIRS)) {
    const abs = path.join(ROOT, "src/content", dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs).filter((x) => x.endsWith(".md"))) {
      const fm = frontmatter(path.join(abs, f));
      if (!fm.focusKeyword || fm.draft === "true") continue;
      const url = `/${route}/${f.replace(/\.md$/, "")}/`;
      const kw = fm.focusKeyword;
      const row = map.get(kw);
      if (!row) { errors.push(`✗ ${url}: الكلمة المستهدفة «${kw}» غير موجودة في seo/keyword-master.csv`); continue; }
      (used.get(kw) ?? used.set(kw, []).get(kw)).push(url);
      if (!hasAllWords(fm.seoTitle || fm.title, kw)) warnings.push(`! ${url}: الكلمة المستهدفة «${kw}» لا تظهر في العنوان`);
      if (!hasAllWords(fm.description, kw)) warnings.push(`! ${url}: الكلمة المستهدفة «${kw}» لا تظهر في وصف جوجل`);
      const target = (row.target_url || "").trim();
      if (target.startsWith("/") && target !== url && fm.noindex !== "true") warnings.push(`! ${url}: الخريطة توجّه «${kw}» إلى ${target} (حدّث الخريطة أو اختر كلمة أخرى)`);
    }
  }
  for (const [kw, urls] of used) if (urls.length > 1) errors.push(`✗ تنافس صفحات: «${kw}» مستهدفة في ${urls.join(" و ")} — اختر لكل صفحة كلمة مختلفة`);
  return { errors, warnings, count: [...used.values()].flat().length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, warnings, count } = checkKeywords();
  console.log(`الكلمات المستهدفة: ${count} صفحة — أخطاء: ${errors.length}، تحذيرات: ${warnings.length}`);
  [...warnings, ...errors].forEach((l) => console.log(l));
  process.exit(errors.length ? 1 : 0);
}
