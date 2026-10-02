// فحص الروابط والأصول الداخلية في dist: كل href/src يبدأ بـ "/" يجب أن يصل لملف موجود.
// الاستعمال: npm run build && node scripts/check-links.mjs
import fs from "node:fs";
import path from "node:path";

const DIST = "dist";
if (!fs.existsSync(DIST)) { console.error("لا يوجد مجلد dist — شغّل npm run build أولاً."); process.exit(1); }

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}
const exists = (urlPath) => {
  let p = decodeURIComponent(urlPath.split("#")[0].split("?")[0]);
  if (!p.startsWith("/")) return true;
  const full = path.join(DIST, p);
  if (p.endsWith("/")) return fs.existsSync(path.join(full, "index.html"));
  return fs.existsSync(full) || fs.existsSync(path.join(full, "index.html")) || fs.existsSync(full + ".html");
};

const broken = [];
let checked = 0;
for (const file of walk(DIST)) {
  const route = "/" + path.relative(DIST, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");
  const urls = new Set();
  for (const m of html.matchAll(/\b(?:href|src)="(\/(?!\/)[^"]*)"/g)) urls.add(m[1]);
  for (const m of html.matchAll(/\bsrcset="([^"]+)"/g))
    for (const part of m[1].split(",")) { const u = part.trim().split(/\s+/)[0]; if (u.startsWith("/") && !u.startsWith("//")) urls.add(u); }
  for (const u of urls) {
    checked++;
    if (!exists(u)) broken.push(`✗ ${route} → ${u}`);
  }
}
console.log(`فُحص ${checked} رابط/أصل داخلي — المكسور: ${broken.length}`);
if (broken.length) {
  // --report-only: تنبيه في GitHub بلا إفشال (قرار المالك: الفحص لا يمنع النشر)
  if (process.argv.includes("--report-only")) { for (const b of broken) console.log(`::warning title=رابط مكسور::${b}`); process.exit(0); }
  console.error(broken.join("\n")); process.exit(1);
}
