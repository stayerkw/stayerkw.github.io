import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { business } from "../data/business";
import { kuwaitAreas } from "../data/areas";
import { priceList, installRule, unitText } from "../data/pricing";

// GEO-01: ملف llms.txt — ملخص نصي موثوق للنشاط تقرؤه مساعدات الذكاء الاصطناعي (ChatGPT، Gemini، Perplexity…).
// كل قيمة فيه تُؤخذ من مصادر الموقع نفسها (business.ts، pricing.json، المحتوى)، فيتحدث تلقائياً عند تغيير سعر أو صفحة
// ولا يُكتب فيه ادعاء غير موجود في الموقع.
export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL(business.domain)).origin;
  const u = (path: string) => `${origin}${path}`;
  const phone = business.phone.replace("+965", "");
  const types = (await getCollection("curtainTypes", ({ data }) => !data.draft && !data.noindex)).sort((a, b) => a.data.order - b.data.order);
  const posts = (await getCollection("blog", ({ data }) => !data.draft && !data.noindex)).sort((a, b) => a.data.order - b.data.order);
  const governorates = kuwaitAreas.map((g) => g.governorate.replace("محافظة ", "")).join("، ");

  const body = `# ${business.name} (Alam Curtains Kuwait)

> ${business.description} نعمل في تفصيل الستائر منذ ${business.foundedYear}، والخدمة زيارة منزلية لأخذ المقاسات وعرض العينات ثم التفصيل في ورشتنا والتركيب في موقع العميل.

## حقائق أساسية

- النشاط: تفصيل وتركيب ستائر حسب المقاس للبيوت والشقق والمكاتب في الكويت.
- التغطية: كل محافظات الكويت الست (${governorates}).
- الهاتف وواتساب: ${phone} (‎${business.phone}) — ${business.whatsappLink}
- ساعات العمل: ${business.hours}.
- مدة التنفيذ المعتادة: ${business.leadTime}.
- زيارة القياس وعرض العينات مجانية، عدا العبدلي والصبية فالمعاينة فيهما مدفوعة.
- التركيب: مجاني عند طلب ${installRule.freeFrom} ستائر فأكثر، وأقل من ذلك ${installRule.fee} د.ك لكل ستارة. نركّب الستائر التي نفصّلها نحن فقط.
- الضمان: ${business.warranty}.
- الإلغاء: ${business.cancellation}.
- لا نقدّم خدمة غسل أو تنظيف الستائر.
- لدينا موظف يتحدث الإنجليزية (English-speaking staff on WhatsApp).
- إنستغرام: ${business.sameAs.join("، ")}

## الأسعار (بالدينار الكويتي، شاملة القماش والسكة والتفصيل)

${priceList.map((r) => `- ${r.name}: ${r.price} د.ك ${unitText(r.unit)} — ${u(r.href)}`).join("\n")}

ملاحظة الوحدة: ستائر الويفي تُسعَّر بالمتر الطولي (عرض الستارة فقط)، وباقي الأنواع بالمتر المربع (العرض × الارتفاع). التفاصيل والحاسبة: ${u("/prices/")}

## الصفحات الرئيسية

- [الرئيسية](${u("/")})
- [أسعار الستائر والحاسبة](${u("/prices/")})
- [تفصيل ستائر حسب المقاس](${u("/services/tailoring/")})
- [تركيب ستائر في الكويت](${u("/services/installation/")})
- [أعمالنا المنفذة بالصور](${u("/projects/")})
- [المنتجات](${u("/products/")})
- [مناطق الخدمة](${u("/areas/")})
- [الضمان والاسترجاع والإلغاء](${u("/warranty/")})
- [الأسئلة الشائعة](${u("/faq/")})
- [من نحن](${u("/about/")})
- [تواصل معنا](${u("/contact/")})

## أنواع الستائر

${types.map((t) => `- [${t.data.title}](${u(`/curtains/${t.id}/`)}): ${t.data.description}`).join("\n")}

## مقالات وأدلة

${posts.map((p) => `- [${p.data.title}](${u(`/blog/${p.id}/`)}): ${p.data.description}`).join("\n")}

## English

Alam Curtains Kuwait makes made-to-measure curtains and blinds in Kuwait (tailoring since ${business.foundedYear}) with home measuring visits and installation across all six governorates. WhatsApp: ${business.phone}. Open daily ${business.hoursOpen}–${business.hoursClose}.

- [Curtains Kuwait (English home)](${u("/en/")})
- [Curtain prices](${u("/en/curtain-prices/")})
- [Custom curtains](${u("/en/custom-curtains/")})
- [Roller blinds and window blinds](${u("/en/roller-blinds/")})
- [Blackout curtains](${u("/en/blackout-curtains/")})
- [Wave curtains](${u("/en/wave-curtains/")})
- [Curtain installation](${u("/en/curtain-installation/")})
- [Commercial curtains for offices](${u("/en/commercial-curtains/")})
- [Contact](${u("/en/contact/")})
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
