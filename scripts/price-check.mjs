// فحص اتساق الأسعار في الموقع المبني (dist) مع src/data/pricing.json — بالعربي والإنجليزي.
// السبب (16 نوفمبر 2026): بعد رفع الرول من 6 إلى 8 بقيت أمثلة حسابية وصفحات إنجليزية مكتوبة يدوياً
// على السعر القديم، وبقي «بلاك اوت مع شيفون 9 للمتر المربع» بعد أن صار 19 للمتر الطولي.
// يمر على نص كل صفحة ويبحث عن «اسم نوع ... رقم د.ك/KWD» قريبين، وينبّه إن لم يكن الرقم من أسعار
// ذلك النوع في pricing.json، وينبّه أيضاً إن ذُكر الويفي بالمتر المربع.
// --report-only: ينبّه ولا يُفشل (قرار المالك: الفحوص تنبّه ولا تمنع النشر).
import { readFileSync, readdirSync, existsSync } from "node:fs";

const reportOnly = process.argv.includes("--report-only");
const pricing = JSON.parse(readFileSync(new URL("../src/data/pricing.json", import.meta.url), "utf8"));
const p = (id) => pricing.rows.find((r) => r.id === id)?.price;
const vals = (...ids) => ids.map(p).filter((v) => v !== undefined).map(String);

// لكل نوع: أسماؤه في اللغتين، والأسعار المسموح ذكرها بجانبه (كل أشكاله في pricing.json)
const rules = [
  { name: "رول/roller", re: /(?:ستائر |ستارة )?رول|roller(?: blinds?)?/gi, ok: vals("roll", "office", "blackout", "kids-print") },
  { name: "بلاك اوت/blackout", re: /بلاك ?[اأ]وت|blackout/gi, ok: vals("blackout", "wave-blackout", "khaam-blackout") },
  { name: "ويفي/wave", re: /ويفي|wave(?: curtains?)?/gi, ok: vals("wave", "wave-sheer", "wave-blackout", "khaam-blackout") },
  { name: "خشبي/wooden", re: /خشبي[ةه]?|wooden(?: blinds?)?/gi, ok: vals("wooden") },
  { name: "زيبرا/zebra", re: /زيبرا|zebra/gi, ok: vals("zebra") },
  { name: "شيفون/sheer", re: /شيفون|sheers?/gi, ok: vals("sheer", "wave-sheer", "khaam-blackout") },
  { name: "حلقات/eyelet", re: /حلقات|eyelet/gi, ok: vals("eyelet") },
  { name: "روماني/roman", re: /روماني[ةه]?|roman/gi, ok: vals("roman") },
];
const money = /(\d+(?:\.\d+)?)\s?(?:د\.ك|KWD|KD)\b/g;

const root = new URL("../dist/", import.meta.url);
if (!existsSync(root)) { console.error("price-check: شغّل npm run build أولاً"); process.exit(reportOnly ? 0 : 1); }
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(new URL(e.name + "/", d)) : e.name.endsWith(".html") ? [new URL(e.name, d)] : []));

const issues = [];
for (const file of walk(root)) {
  const path = file.pathname.replace(root.pathname, "/").replace(/index\.html$/, "");
  if (path.startsWith("/admin/") || path.startsWith("/invoice")) continue;
  const html = readFileSync(file, "utf8");
  const text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  for (const m of text.matchAll(money)) {
    const before = text.slice(Math.max(0, m.index - 45), m.index);
    // نواتج الأمثلة الحسابية (بعد = أو :) والأرقام المجمّعة ليست أسعار وحدة
    if (/[=×x]\s*$|\d\s*[×x]\s*\d[^]*$/.test(before.slice(-12))) continue;
    if (/(?:التركيب|installation|تركيب|per curtain|لكل ستارة|ستائر فأكثر)/i.test(text.slice(m.index, m.index + 30) + before.slice(-20))) continue;
    // أقرب اسم نوع قبل الرقم
    let best = null;
    for (const r of rules) for (const n of before.matchAll(r.re)) if (!best || n.index > best.at) best = { at: n.index, r };
    if (!best) continue;
    const between = before.slice(best.at);
    if (/[.؛]\s|،\s*و\d/.test(between.slice(0, -2))) continue; // جملة أخرى بينهما
    // الرقم يبدأ بنداً جديداً في قائمة («لـX، و8 د.ك…» / «for sheers, 8 KWD…» / «zebra and 13 KWD»)
    if (/(?:[,،]|\band|\bor|\bو)\s*$/.test(between)) continue;
    if (!best.r.ok.includes(m[1])) issues.push(`${path}  «…${before.slice(best.at).trim()} ${m[0]}»  ← المتوقع لـ${best.r.name}: ${best.r.ok.join(" / ")}`);
  }
  for (const m of text.matchAll(/(?:ويفي|wave)[^.؛]{0,40}?(?:للمتر المربع|per m²|per square metre)/gi)) {
    if (/(?:رول|roller|شيفون|sheer|حلقات|eyelet|خشب|wooden|زيبرا|zebra)[^.؛]*$/i.test(m[0])) continue;
    issues.push(`${path}  «${m[0]}»  ← الويفي يُسعَّر بالمتر الطولي فقط`);
  }
}

const unique = [...new Set(issues)];
if (unique.length) {
  console.log(`⚠️ price-check: ${unique.length} تعارض محتمل مع pricing.json:`);
  for (const i of unique) console.log("  - " + i);
  if (!reportOnly) process.exit(1);
} else console.log("✓ price-check: كل الأسعار المذكورة تطابق pricing.json");
