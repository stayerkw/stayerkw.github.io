// أسعار الأنواع (مؤكدة من المالك، 1 أكتوبر 2026) — مصدر واحد لصفحة الأسعار والحاسبة.
// الوحدة: د.ك للمتر المربع، عدا الويفي فهو د.ك للمتر الطولي دائماً (المالك 2 نوفمبر 2026: الويفي خطين/طبقتين 19، والويفي طبقة واحدة 12، للمتر الطولي، ولا يُسعَّر بالمتر المربع أبداً).
// والسعر شامل القماش والسكة والتفصيل. التركيب بحسب قاعدة التركيب أدناه.
// لا يُضاف نوع هنا قبل تأكيد سعره.
// «الخام» = ويفي مع شيفون. الخشبي 13 للمتر المربع (المالك 4 أكتوبر، كان 17). المكتبي = سعر الرول 6. ويفي مع بلاك اوت (طبقة واحدة) 6.
// البلاك اوت ميزة في القماش لا نوع مستقل. الخام بلاك اوت مع شيفون (قماش بلاك اوت + شيفون) 9 (مؤكد 1 أكتوبر).
// قاعدة التركيب (مؤكدة 1 أكتوبر وعُمّمت على كل الأنواع): التركيب مجاني عند 5 ستائر فأكثر، وأقل من ذلك 5 د.ك لكل ستارة.
// «الستارة» في الحاسبة = نافذة واحدة (عدد النوافذ).
export interface PriceRow {
  id: string;
  name: string;
  href: string;
  price: number;
  /** وحدة السعر: m2 (الافتراضي) أو linear-m (الويفي) */
  unit?: "m2" | "linear-m";
  /** اسم مختصر للنصوص المجمّعة (مثل: رول، شيفون) */
  short?: string;
}

// القيم نفسها تُحرَّر من لوحة التحكم (قسم «الأسعار») وتُحفظ في pricing.json — مصدر واحد للجدول والحاسبة وصفحات الأنواع.
import data from "./pricing.json";

export const installRule = { freeFrom: data.installFreeFrom, fee: data.installFee };

export const priceList: PriceRow[] = data.rows as PriceRow[];

/** هل النوع مسعّر بالمتر الطولي (الويفي) */
export const isLinear = (id: string) => priceList.find((r) => r.id === id)?.unit === "linear-m";

/** نص الوحدة لنوع: «للمتر الطولي» للويفي، و«للمتر المربع» لغيره */
export const unitAr = (id: string) => (isLinear(id) ? "للمتر الطولي" : "للمتر المربع");
export const unitEn = (id: string) => (isLinear(id) ? "per linear metre" : "per m²");

/** سعر نوع بمعرّفه. إن حُذف النوع أو تغيّر معرّفه من اللوحة يُعرض «—» ويُطبع تنبيه، ولا يفشل البناء. */
export function priceOf(id: string): number | string {
  const row = priceList.find((r) => r.id === id);
  if (!row) { console.warn(`[pricing] لا يوجد نوع بالمعرّف «${id}» في pricing.json — يظهر «—» مكان سعره`); return "—"; }
  return row.price;
}

/** نص مجمّع حسب السعر بترتيب المعرّفات، مثل: «رول وويفي 6 د.ك، وشيفون 5 د.ك». يتحدث تلقائياً؛ المعرّف المفقود يُتخطّى بتنبيه. */
export function priceSummary(ids: string[]): string {
  const groups: { price: number; linear: boolean; names: string[] }[] = [];
  for (const id of ids) {
    const row = priceList.find((r) => r.id === id);
    if (!row) { console.warn(`[pricing] لا يوجد نوع بالمعرّف «${id}» — حُذف من جملة الأسعار`); continue; }
    const name = row.short || row.name;
    const linear = row.unit === "linear-m";
    const g = groups.find((x) => x.price === row.price && x.linear === linear);
    g ? g.names.push(name) : groups.push({ price: row.price, linear, names: [name] });
  }
  const join = (a: string[]) => a.length < 2 ? a.join("") : a.slice(0, -1).join(" و") + " و" + a[a.length - 1];
  return groups.map((g, i) => `${i ? "و" : ""}${join(g.names)} ${g.price} د.ك${g.linear ? " للمتر الطولي" : ""}`).join("، ");
}

export interface EstimateInput {
  price: number;
  width: number; // متر
  height: number; // متر
  count: number; // عدد النوافذ المتماثلة
  /** الويفي: السعر × العرض (المتر الطولي) بدل العرض × الارتفاع */
  linear?: boolean;
  /** إن وُجد: التركيب مجاني من freeFrom ستائر فأكثر، وإلا fee لكل ستارة. */
  install?: { freeFrom: number; fee: number };
}

/** تقدير مبدئي = السعر × العرض × الارتفاع × العدد (+ رسوم التركيب إن انطبقت قاعدتها). يعيد null عند مدخلات غير صالحة. لا حد أدنى للمساحة مفترض (غير مؤكد). */
export function estimate({ price, width, height, count, install, linear = false }: EstimateInput): { area: number; total: number; installFee: number; grand: number } | null {
  const ok = (n: number, max: number) => Number.isFinite(n) && n > 0 && n <= max;
  if (!ok(price, 1000) || !ok(width, 20) || (!linear && !ok(height, 10)) || !Number.isInteger(count) || !ok(count, 50)) return null;
  // «area» = الأمتار المحسوبة: مربعة (عرض × ارتفاع) أو طولية للويفي (العرض فقط)
  const area = linear ? width * count : width * height * count;
  const total = area * price;
  const installFee = install && count < install.freeFrom ? install.fee * count : 0;
  return { area, total, installFee, grand: total + installFee };
}

/** يعرض الرقم بخانتين عشريتين كحد أقصى بلا أصفار زائدة. */
export function formatNumber(n: number): string {
  return String(Number(n.toFixed(2)));
}
