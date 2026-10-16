// مزامنة أحجام البحث في seo/keyword-master.csv من ملف أحجام البحث المعتمد (قرار المالك 16 أكتوبر 2026).
// keyword-master.csv يبقى «خريطة» الكلمات إلى الصفحات (target_url) التي يستخدمها keyword-check وقائمة لوحة التحكم،
// أما الأرقام فتأتي من الملف المعتمد وحده؛ وأي كلمة غير موجودة فيه تصبح «غير متوفر» ولا يُعتمد رقمها القديم.
// التشغيل: node scripts/sync-keyword-volumes.mjs [مسار الملف المعتمد] ثم npm run cms:keywords
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { norm } from "./keyword-check.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.resolve(ROOT, process.argv[2] ?? "seo/أحجام_بحث_الستائر_الكويت.csv");
const MASTER = path.join(ROOT, "seo/keyword-master.csv");

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
  const h = head.map((x) => x.replace(/^﻿/, "").trim());
  return { head: h, rows: body.map((r) => Object.fromEntries(h.map((k, i) => [k, (r[i] ?? "").trim()]))) };
}
const esc = (v = "") => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const num = (v) => (/^\d+(\.\d+)?$/.test(String(v).trim()) ? String(v).trim() : "غير متوفر");

// الصفحة الأساسية للكلمات الجديدة التي لا توجد في الخريطة (خريطة القسم 17.4 في docs/seo/seo-implementation-plan.md)
const TARGETS = {
  "تفصيل ستائر": "/services/tailoring/", "تفصيل ستائر الكويت": "/services/tailoring/", "تفصيل ستاير": "/services/tailoring/",
  "تفصيل ستاير الكويت": "/services/tailoring/", "تفصيل ستائر حسب الطلب": "/services/tailoring/",
  "تركيب ستائر": "/services/installation/", "تركيب ستائر الكويت": "/services/installation/", "فني ستائر": "/services/installation/",
  "فني ستائر الكويت": "/services/installation/", "معلم ستائر": "/services/installation/", "معلم ستائر الكويت": "/services/installation/",
  "تركيب قضبان الستائر": "/services/installation/",
  "محل ستائر": "/", "محل ستائر الكويت": "/", "ستائر الكويت": "/", "ستاير الكويت": "/", "ورشة ستائر الكويت": "/", "تفصيل وتركيب ستائر": "/",
  "أسعار الستائر": "/prices/", "أسعار الستائر الكويت": "/prices/", "أسعار تفصيل الستائر": "/prices/", "سعر متر الستائر": "/prices/", "سعر تفصيل الستائر": "/prices/",
  "ستائر ويفي": "/curtains/wave/", "ستائر ويفي الكويت": "/curtains/wave/", "ستاير ويفي": "/curtains/wave/",
  "ستائر رول": "/curtains/roll/", "ستائر رول الكويت": "/curtains/roll/", "ستائر جاهزة": "/ready-roll-curtains/", "ستائر جاهزة الكويت": "/ready-roll-curtains/",
  "ستائر بلاك أوت": "/curtains/blackout/", "ستائر بلاك أوت الكويت": "/curtains/blackout/", "ستائر بلاك أوت رول": "/curtains/blackout/",
  "ستائر عازلة للضوء": "/curtains/blackout/", "أفضل ستائر لحجب الشمس": "/curtains/blackout/",
  "ستائر شيفون": "/curtains/sheer/", "ستائر شيفون الكويت": "/curtains/sheer/", "ستائر زيبرا": "/curtains/zebra/", "ستائر زيبرا الكويت": "/curtains/zebra/",
  "ستائر خشبية": "/curtains/wooden/", "ستائر خشبية الكويت": "/curtains/wooden/", "ستائر رومانية": "/curtains/roman/",
  "ستائر للمكاتب": "/curtains/office/", "ستائر للشركات": "/curtains/office/", "قياس الستائر": "/blog/how-to-measure-window/",
  "ستائر الجهراء": "/areas/jahra/", "تركيب ستائر حولي": "/areas/hawalli/", "تفصيل ستائر حولي": "/areas/hawalli/", "ستائر السالمية": "/areas/hawalli/",
  "تفصيل ستائر السالمية": "/areas/hawalli/", "ستائر الفروانية": "/areas/farwaniya/", "تفصيل ستائر الفروانية": "/areas/farwaniya/", "ستائر خيطان": "/areas/farwaniya/",
  "ستائر الأحمدي": "/areas/ahmadi/", "ستائر الفحيحيل": "/areas/ahmadi/", "ستائر مبارك الكبير": "/areas/mubarak-al-kabeer/", "ستائر صباح السالم": "/areas/mubarak-al-kabeer/",
  "ستائر الكويت العاصمة": "/areas/capital/",
  "curtains kuwait": "/en/", "curtain shop kuwait": "/en/", "curtain tailoring kuwait": "/en/custom-curtains/", "curtain installation kuwait": "/en/curtain-installation/",
  "roller blinds kuwait": "/en/roller-blinds/", "wave curtains kuwait": "/en/wave-curtains/", "blackout curtains kuwait": "/en/blackout-curtains/",
};
// اعتماد صريح من المالك لرقم ورد في ملاحظات الملف المعتمد (ورقة «الكلمات المكتشفة» غير مرفقة)
const OWNER_APPROVED = { "ستائر بلاك اوت": { vol: "90", note: "ملاحظة الملف المعتمد (ورقة الكلمات المكتشفة) — اعتمدها المالك 16 أكتوبر 2026" } };

const src = parseCsv(fs.readFileSync(SRC, "utf8")).rows;
const { head, rows: master } = parseCsv(fs.readFileSync(MASTER, "utf8"));
const srcDate = src[0]?.["تاريخ الاستخراج"] ?? "";
const SOURCE = `الملف المعتمد ${path.basename(SRC)} — Keyword Planner عبر Windsor (متوسط 12 شهراً، الكويت) — استخراج ${srcDate}`;
const byNorm = new Map(master.map((r) => [norm(r.keyword), r]));
const seen = new Set();
let updated = 0, added = 0, cleared = 0;

for (const s of src) {
  const kw = s["الكلمة المفتاحية"]; if (!kw) continue;
  const key = norm(kw);
  // صيغة الهمزة وغيرها تُطبَّع؛ لكن إن كانت الصيغتان كلتاهما في الخريطة فالمطابقة الحرفية أولى
  let row = master.find((r) => r.keyword === kw) ?? byNorm.get(key);
  if (row && OWNER_APPROVED[row.keyword]) row = master.find((r) => r.keyword === kw);
  const fields = {
    monthly_search_kw: num(s["متوسط البحث الشهري (الكويت)"]),
    competition: s["المنافسة الإعلانية"] || "غير متوفر",
    competition_index: num(s["مؤشر المنافسة (0-100)"]),
    cpc_low: num(s["عرض أعلى الصفحة - أدنى (USD)"]),
    cpc_high: num(s["عرض أعلى الصفحة - أعلى (USD)"]),
    source: SOURCE + (s["ملاحظات"] ? ` — ${s["ملاحظات"]}` : ""),
  };
  if (row) { Object.assign(row, fields); updated++; }
  else {
    row = Object.fromEntries(head.map((h) => [h, ""]));
    Object.assign(row, fields, { keyword: kw, language: /[a-z]/i.test(kw) ? "en" : "ar", intent: "تجاري", cluster: s["الفئة"] || "", group: s["الفئة"] || "", target_url: TARGETS[kw] ?? "", status: "Open" });
    master.push(row); added++;
  }
  seen.add(row);
}
for (const r of master) {
  if (seen.has(r)) continue;
  const ok = OWNER_APPROVED[r.keyword];
  if (ok) { r.monthly_search_kw = ok.vol; r.source = ok.note; continue; }
  if (r.monthly_search_kw !== "غير متوفر") cleared++;
  r.monthly_search_kw = "غير متوفر"; r.competition = r.competition || "غير متوفر";
  r.source = `غير موجودة في الملف المعتمد (${srcDate}) — الرقم القديم غير معتمد`;
}
fs.writeFileSync(MASTER, "﻿" + [head.join(","), ...master.map((r) => head.map((h) => esc(r[h] ?? "")).join(","))].join("\n") + "\n");
console.log(`حُدّثت ${updated} كلمة، وأُضيفت ${added}، وصارت ${cleared} كلمة قديمة «غير متوفر». المجموع ${master.length}.`);
