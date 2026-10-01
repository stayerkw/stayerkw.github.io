// رسائل واتساب بحسب سياق الصفحة (المهمة E1).
// الهدف: رسالة جاهزة تحمل رابط الصفحة ونوع الطلب، فتقل الأسئلة المتكررة
// ويعرف فريق المبيعات أي صفحة جلبت الطلب. القوالب مأخوذة من خطة الموقع (المسار E).
import { business } from "./business";

export type WaTopic =
  | "general"
  | "roll"
  | "wave"
  | "prices"
  | "area"
  | "product"
  | "type"
  | "service"
  | "coverage"
  | "project";

export interface WaContext {
  topic?: WaTopic;
  product?: string; // اسم المنتج/النوع/الخدمة
  area?: string; // اسم المحافظة أو المنطقة
  pageUrl: string; // الرابط الكامل للصفحة الحالية
}

const AREA_PREFIX = "/areas/";

// slug الصفحة (لاتيني) → اسم المحافظة بالعربية لرسالة واتساب
const AREA_NAMES: Record<string, string> = {
  jahra: "الجهراء",
  hawalli: "حولي",
  "mubarak-al-kabeer": "مبارك الكبير",
  capital: "العاصمة",
  farwaniya: "الفروانية",
  ahmadi: "الأحمدي",
};

function decode(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

/** يستنتج موضوع الرسالة من مسار الصفحة عند عدم تحديده صراحةً. */
export function inferTopic(pathname: string): WaTopic {
  const p = decode(pathname);
  if (p.startsWith("/ready-roll-curtains")) return "roll";
  if (p.startsWith("/wave-curtains")) return "wave";
  if (p.startsWith("/prices")) return "prices";
  if (p.startsWith(AREA_PREFIX) && p.length > AREA_PREFIX.length) return "area";
  if (p.startsWith("/areas")) return "coverage";
  if (p.startsWith("/projects/") && p.length > "/projects/".length) return "project";
  if (p.startsWith("/products/") && p.length > "/products/".length) return "product";
  if (p.startsWith("/curtains/") && p.length > "/curtains/".length) return "type";
  if (p.startsWith("/services/") && p.length > "/services/".length) return "service";
  return "general";
}

/** يستخرج اسم المحافظة من مسار صفحة المنطقة (مثل /areas/jahra/). */
export function inferArea(pathname: string): string | undefined {
  const p = decode(pathname);
  if (!p.startsWith(AREA_PREFIX)) return undefined;
  const slug = p.slice(AREA_PREFIX.length).replace(/\/+$/, "").trim();
  return AREA_NAMES[slug];
}

const FIELDS = {
  area: "المنطقة:",
  windows: "عدد النوافذ:",
  size: "المقاس التقريبي:",
  install: "هل أحتاج تركيباً أيضاً؟ نعم / لا",
};

/** يبني نص الرسالة. الأسطر الفارغة (مثل «المنطقة:») يملؤها العميل. */
export function buildWhatsAppMessage({ topic = "general", product, area, pageUrl }: WaContext): string {
  const page = `الصفحة التي زرتها: ${pageUrl}`;
  const lines: string[] = [];

  switch (topic) {
    case "roll":
      lines.push("السلام عليكم، أرغب بالحصول على عرض سعر لستائر رول.", page, FIELDS.area, FIELDS.windows, FIELDS.size, FIELDS.install);
      break;
    case "wave":
      lines.push("السلام عليكم، أرغب بالحصول على عرض سعر لستائر ويفي.", page, FIELDS.area, FIELDS.windows, FIELDS.size, "اللون أو التصميم المفضل:", FIELDS.install);
      break;
    case "prices":
      lines.push("السلام عليكم، أرغب بمعرفة السعر التقريبي للستائر.", page, "النوع المطلوب:", FIELDS.area, FIELDS.windows, FIELDS.size, "هل لديكم صورة أو تصميم قريب مما أريده؟");
      break;
    case "area":
      lines.push(
        `السلام عليكم، أرغب بطلب قياس أو عرض سعر لستائر${area ? ` في ${area}` : ""}.`,
        page,
        FIELDS.area,
        "نوع الستارة المطلوب:",
        FIELDS.windows,
        "وقت التواصل المناسب:"
      );
      break;
    case "coverage":
      lines.push("السلام عليكم، أرغب بالتأكد من تغطية خدمتكم في منطقتي.", page, FIELDS.area, "نوع الخدمة المطلوبة (تفصيل / تركيب):");
      break;
    case "product":
      lines.push(`السلام عليكم، أرغب بعرض سعر لـ: ${product ?? "أحد المنتجات"}.`, page, FIELDS.area, FIELDS.windows, FIELDS.size, FIELDS.install);
      break;
    case "type":
      lines.push(`السلام عليكم، أرغب بعرض سعر لـ: ${product ?? "هذا النوع من الستائر"}.`, page, FIELDS.area, FIELDS.windows, FIELDS.size, FIELDS.install);
      break;
    case "project":
      lines.push(`السلام عليكم، شاهدت مشروع «${product ?? "من أعمالكم"}» وأرغب بعرض سعر لعمل مشابه.`, page, FIELDS.area, FIELDS.windows, FIELDS.size, FIELDS.install);
      break;
    case "service":
      lines.push(`السلام عليكم، أرغب بالاستفسار عن خدمة: ${product ?? "التفصيل والتركيب"}.`, page, FIELDS.area, FIELDS.windows, "موعد مناسب للتواصل:");
      break;
    default:
      lines.push("السلام عليكم، أرغب بعرض سعر لتفصيل ستائر.", page, FIELDS.area, "نوع الستارة المطلوب:", FIELDS.windows, FIELDS.size);
  }
  return lines.join("\n");
}

export function buildWhatsAppHref(ctx: WaContext): string {
  return `${business.whatsappLink}?text=${encodeURIComponent(buildWhatsAppMessage(ctx))}`;
}

/** سمات data-* يلتقطها سكربت التتبع العام في BaseLayout (حدث whatsapp_click). */
export function waTrackingAttrs(opts: { topic: WaTopic; product?: string; area?: string; placement: string }) {
  const attrs: Record<string, string> = {
    "data-wa": "",
    "data-wa-topic": opts.topic,
    "data-wa-placement": opts.placement,
  };
  if (opts.product) attrs["data-wa-product"] = opts.product;
  if (opts.area) attrs["data-wa-area"] = opts.area;
  return attrs;
}
