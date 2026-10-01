// يولّد قائمة «الكلمة المستهدفة» في public/admin/config.yml من seo/keyword-master.csv.
// شغّله بعد تعديل الخريطة: npm run cms:keywords  (يستبدل ما بين علامتي keywords فقط)
import fs from "node:fs";
import { loadKeywordMap } from "./keyword-check.mjs";

const CONFIG = "public/admin/config.yml";
const rows = [...loadKeywordMap().values()].filter((r) => r.keyword);
const vol = (r) => (/^\d+$/.test(r.monthly_search_kw) ? Number(r.monthly_search_kw) : -1);
rows.sort((a, b) => vol(b) - vol(a) || a.keyword.localeCompare(b.keyword, "ar"));
const esc = (t) => JSON.stringify(t);
const lines = rows.map((r) => {
  const v = vol(r);
  const label = `${r.keyword} · ${v >= 0 ? `${v} بحث/شهر` : "بلا بيانات"}${r.target_url && r.target_url.startsWith("/") ? ` → ${r.target_url}` : ""}`;
  return `          - { label: ${esc(label)}, value: ${esc(r.keyword)} }`;
});
const block = `# >>> keywords (مولَّد: npm run cms:keywords — لا تعدّله يدوياً)\n${lines.join("\n")}\n# <<< keywords`;
let yml = fs.readFileSync(CONFIG, "utf8");
const re = /# >>> keywords[\s\S]*?# <<< keywords/;
if (!re.test(yml)) { console.error("لم أجد علامتي keywords في config.yml"); process.exit(1); }
yml = yml.replace(re, block);
fs.writeFileSync(CONFIG, yml);
console.log(`كُتبت ${rows.length} كلمة في ${CONFIG}`);
