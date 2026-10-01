// أسعار الأنواع (مؤكدة من المالك، 1 أكتوبر 2026) — مصدر واحد لصفحة الأسعار والحاسبة.
// الوحدة: د.ك للمتر المربع، والسعر شامل القماش والسكة والتفصيل. التركيب بحسب قاعدة التركيب أدناه.
// لا يُضاف نوع هنا قبل تأكيد سعره.
// «الخام» = ويفي مع شيفون. الخشبي 17 للمتر المربع (مؤكد). المكتبي = سعر الرول 6. ويفي مع بلاك أوت (طبقة واحدة) 6.
// البلاك أوت ميزة في القماش لا نوع مستقل. الخام بلاك أوت مع شيفون (قماش بلاك أوت + شيفون) 9 (مؤكد 1 أكتوبر).
// قاعدة التركيب (مؤكدة 1 أكتوبر وعُمّمت على كل الأنواع): التركيب مجاني عند 5 ستائر فأكثر، وأقل من ذلك 5 د.ك لكل ستارة.
// «الستارة» في الحاسبة = نافذة واحدة (عدد النوافذ).
export interface PriceRow {
  id: string;
  name: string;
  href: string;
  price: number;
}

export const installRule = { freeFrom: 5, fee: 5 };

export const priceList: PriceRow[] = [
  { id: "roll", name: "ستائر رول", href: "/curtains/roll/", price: 6 },
  { id: "wave", name: "ستائر ويفي", href: "/curtains/wave/", price: 6 },
  { id: "wave-sheer", name: "ستائر ويفي مع شيفون (الخام)", href: "/wave-curtains/", price: 7 },
  { id: "wave-blackout", name: "ستائر ويفي مع بلاك أوت (طبقة واحدة)", href: "/wave-curtains/", price: 6 },
  { id: "blackout", name: "ستائر بلاك أوت", href: "/curtains/blackout/", price: 6 },
  { id: "khaam-blackout", name: "ستائر خام بلاك أوت مع شيفون", href: "/curtains/blackout/", price: 9 },
  { id: "sheer", name: "ستائر شيفون", href: "/curtains/sheer/", price: 5 },
  { id: "kids", name: "ستائر أطفال", href: "/curtains/kids/", price: 6 },
  { id: "office", name: "ستائر مكتبية (رول)", href: "/curtains/office/", price: 6 },
  { id: "wooden", name: "ستائر خشبية (بليندات)", href: "/curtains/wooden/", price: 17 },
];

export interface EstimateInput {
  price: number;
  width: number; // متر
  height: number; // متر
  count: number; // عدد النوافذ المتماثلة
  /** إن وُجد: التركيب مجاني من freeFrom ستائر فأكثر، وإلا fee لكل ستارة. */
  install?: { freeFrom: number; fee: number };
}

/** تقدير مبدئي = السعر × العرض × الارتفاع × العدد (+ رسوم التركيب إن انطبقت قاعدتها). يعيد null عند مدخلات غير صالحة. لا حد أدنى للمساحة مفترض (غير مؤكد). */
export function estimate({ price, width, height, count, install }: EstimateInput): { area: number; total: number; installFee: number; grand: number } | null {
  const ok = (n: number, max: number) => Number.isFinite(n) && n > 0 && n <= max;
  if (!ok(price, 1000) || !ok(width, 20) || !ok(height, 10) || !Number.isInteger(count) || !ok(count, 50)) return null;
  const area = width * height * count;
  const total = area * price;
  const installFee = install && count < install.freeFrom ? install.fee * count : 0;
  return { area, total, installFee, grand: total + installFee };
}

/** يعرض الرقم بخانتين عشريتين كحد أقصى بلا أصفار زائدة. */
export function formatNumber(n: number): string {
  return String(Number(n.toFixed(2)));
}
