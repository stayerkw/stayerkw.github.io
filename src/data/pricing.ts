// أسعار الأنواع (مؤكدة من المالك، 1 أكتوبر 2026) — مصدر واحد لصفحة الأسعار والحاسبة.
// الوحدة لكل نوع في الحقل unit: الويفي كله للمتر الطولي (المالك 7 نوفمبر 2026: خط واحد 12، خطين 19 — لا يُسعَّر بالمتر المربع أبداً)،
// وباقي الأنواع للمتر المربع. السعر شامل القماش والسكة والتفصيل. التركيب بحسب قاعدة التركيب أدناه.
// لا يُضاف نوع هنا قبل تأكيد سعره.
// «الخام» = ويفي مع شيفون. الخشبي 13 للمتر المربع (المالك 4 أكتوبر، كان 17). الرول 8 للمتر المربع (المالك 12 نوفمبر 2026، كان 6)، ويشمل المكتبي ورول البلاك اوت والرول الجاهز.
// البلاك اوت ميزة في القماش لا نوع مستقل. الخام بلاك اوت مع شيفون (قماش بلاك اوت + شيفون) 9 (مؤكد 1 أكتوبر).
// قاعدة التركيب (مؤكدة 1 أكتوبر وعُمّمت على كل الأنواع): التركيب مجاني عند 5 ستائر فأكثر، وأقل من ذلك 5 د.ك لكل ستارة.
// «الستارة» في الحاسبة = نافذة واحدة (عدد النوافذ).
export interface PriceRow {
  id: string;
  name: string;
  href: string;
  price: number;
  /** اسم مختصر للنصوص المجمّعة (مثل: رول، شيفون) */
  short?: string;
  /** وحدة السعر: m2 = للمتر المربع (العرض × الارتفاع)، linear-m = للمتر الطولي (العرض فقط — الويفي) */
  unit?: PriceUnit;
}

export type PriceUnit = "m2" | "linear-m";
/** «للمتر المربع» أو «للمتر الطولي» */
export const unitText = (u?: PriceUnit) => (u === "linear-m" ? "للمتر الطولي" : "للمتر المربع");
/** اختصار الوحدة: م² أو م طولي */
export const unitShort = (u?: PriceUnit) => (u === "linear-m" ? "م طولي" : "م²");
export const unitOf = (id: string): PriceUnit => (priceList.find((r) => r.id === id)?.unit === "linear-m" ? "linear-m" : "m2");

// القيم نفسها تُحرَّر من لوحة التحكم (قسم «الأسعار») وتُحفظ في pricing.json — مصدر واحد للجدول والحاسبة وصفحات الأنواع.
import data from "./pricing.json";

export const installRule = { freeFrom: data.installFreeFrom, fee: data.installFee };

export const priceList: PriceRow[] = data.rows as PriceRow[];

/** سعر نوع بمعرّفه. إن حُذف النوع أو تغيّر معرّفه من اللوحة يُعرض «—» ويُطبع تنبيه، ولا يفشل البناء. */
export function priceOf(id: string): number | string {
  const row = priceList.find((r) => r.id === id);
  if (!row) { console.warn(`[pricing] لا يوجد نوع بالمعرّف «${id}» في pricing.json — يظهر «—» مكان سعره`); return "—"; }
  return row.price;
}

/** نص مجمّع حسب السعر بترتيب المعرّفات، مثل: «رول وبلاك اوت 8 د.ك للمتر المربع، وويفي خط واحد 12 د.ك للمتر الطولي». يتحدث تلقائياً؛ المعرّف المفقود يُتخطّى بتنبيه. */
export function priceSummary(ids: string[]): string {
  const groups: { price: number; unit: PriceUnit; names: string[] }[] = [];
  for (const id of ids) {
    const row = priceList.find((r) => r.id === id);
    if (!row) { console.warn(`[pricing] لا يوجد نوع بالمعرّف «${id}» — حُذف من جملة الأسعار`); continue; }
    const name = row.short || row.name;
    const unit: PriceUnit = row.unit === "linear-m" ? "linear-m" : "m2";
    const g = groups.find((x) => x.price === row.price && x.unit === unit);
    g ? g.names.push(name) : groups.push({ price: row.price, unit, names: [name] });
  }
  const join = (a: string[]) => a.length < 2 ? a.join("") : a.slice(0, -1).join(" و") + " و" + a[a.length - 1];
  // كل مجموعة تذكر وحدتها، فلا يُقرأ سعر الويفي (للمتر الطولي) سعراً للمتر المربع
  return groups.map((g, i) => `${i ? "و" : ""}${join(g.names)} ${g.price} د.ك ${unitText(g.unit)}`).join("، ");
}

export interface EstimateInput {
  price: number;
  width: number; // متر
  height: number; // متر (لا يُستعمل في التسعير بالمتر الطولي)
  count: number; // عدد النوافذ المتماثلة
  /** linear-m: الكمية = العرض × العدد (الويفي). m2 (الافتراضي): العرض × الارتفاع × العدد */
  unit?: PriceUnit;
  /** إن وُجد: التركيب مجاني من freeFrom ستائر فأكثر، وإلا fee لكل ستارة. */
  install?: { freeFrom: number; fee: number };
}

/** تقدير مبدئي = السعر × العرض × الارتفاع × العدد (+ رسوم التركيب إن انطبقت قاعدتها). يعيد null عند مدخلات غير صالحة. لا حد أدنى للمساحة مفترض (غير مؤكد). */
export function estimate({ price, width, height, count, install, unit = "m2" }: EstimateInput): { area: number; total: number; installFee: number; grand: number } | null {
  const ok = (n: number, max: number) => Number.isFinite(n) && n > 0 && n <= max;
  const linear = unit === "linear-m";
  if (!ok(price, 1000) || !ok(width, 20) || (!linear && !ok(height, 10)) || !Number.isInteger(count) || !ok(count, 50)) return null;
  // area = الكمية المسعّرة: أمتار طولية للويفي، وأمتار مربعة لباقي الأنواع
  const area = linear ? width * count : width * height * count;
  const total = area * price;
  const installFee = install && count < install.freeFrom ? install.fee * count : 0;
  return { area, total, installFee, grand: total + installFee };
}

/** يعرض الرقم بخانتين عشريتين كحد أقصى بلا أصفار زائدة. */
export function formatNumber(n: number): string {
  return String(Number(n.toFixed(2)));
}
