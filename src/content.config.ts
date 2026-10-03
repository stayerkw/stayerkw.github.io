import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// image() يجعل Astro يولّد نسخاً محسّنة (WebP، أحجام متعددة) من أي صورة تُرفق في المحتوى
// تلقائياً عند البناء — بدل الاعتماد على صورة خام من public/ بلا معالجة.
// لوحة التحكم قد تحفظ الحقل الاختياري الفارغ كنص فارغ ('') — نعامله كأنه غير موجود
// كي لا يفشل البناء (مثل opacity: '') ولا يصير العنوان فارغاً (seoTitle: '').
const blank = (v: unknown) => (v === '' || v === null ? undefined : v);
const optStr = () => z.preprocess(blank, z.string().optional());
// نص يُقبل فارغاً: الوصف الفارغ لا يُفشل البناء (يُولَّد وصف احتياطي في BaseLayout، وseo-lint ينبّه فقط)
const textOrEmpty = () => z.preprocess(blank, z.string().default(''));
const opt = <T extends z.ZodTypeAny>(t: T) => z.preprocess(blank, t.optional());

const withImage = (image: ReturnType<typeof z.string>) =>
  z.object({
    title: z.string(),
    description: textOrEmpty(),
    order: z.number().default(0),
    image: opt(image),
    imageAlt: optStr(),
    // I1: عنوان SEO اختياري يُستعمل في <title> بدل title (اسم النشاط يُضاف تلقائياً)
    seoTitle: optStr(),
    // الكلمة المستهدفة من seo/keyword-master.csv — يفحصها scripts/keyword-check.mjs (تكرار/ظهور/الصفحة المستهدفة)
    focusKeyword: optStr(),
    // true = تُنشر الصفحة بـ noindex وتُستبعد من sitemap (لصفحة رفيعة لم يكتمل محتواها)
    noindex: z.boolean().default(false),
    draft: z.boolean().default(false),
  });

const faqList = z.array(z.object({ question: z.string(), answer: z.string() })).default([]);
// روابط داخلية مختارة يدوياً من اللوحة (معرّفات ملفات المنتجات/المقالات)
const related = { relatedProducts: z.array(z.string()).default([]), relatedPosts: z.array(z.string()).default([]) };

const curtainTypes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/curtain-types' }),
  schema: ({ image }) => withImage(image()).extend({ faqs: faqList, ...related }),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: ({ image }) => withImage(image()).extend({ faqs: faqList, ...related }),
});

const uses = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/uses' }),
  schema: ({ image }) => withImage(image()),
});

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: ({ image }) =>
    withImage(image()).extend({
      // ربط المنتج بنوع الستارة (يطابق اسم ملف داخل src/content/curtain-types)
      curtainType: optStr(),
      price: opt(z.number()),
      priceNote: optStr(),
      // صور إضافية للمنتج الواحد (تظهر كمعرض أسفل الصورة الرئيسية)
      gallery: z.array(image()).optional(),
      // I1: حقول موسعة اختيارية — تُعرض فقط إن عُبّئت (لا قيم افتراضية مخمّنة)
      fabricType: optStr(),
      opacity: opt(z.enum(['شفاف', 'نصف معتم', 'بلاك أوت'])),
      colors: opt(z.array(z.string())),
      care: optStr(),
    }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: ({ image }) => withImage(image()).extend({ pubDate: z.preprocess(blank, z.date().default(() => new Date())), updatedDate: opt(z.date()), ...related }),
});

// صفحات مناطق الخدمة — تُنشأ فقط للمناطق التي لها حجم بحث فعلي (حسب Google Keyword Planner)
const areas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/areas' }),
  schema: z.object({
    title: z.string(),
    seoTitle: optStr(),
    focusKeyword: optStr(),
    description: textOrEmpty(),
    governorate: z.string(),
    intro: textOrEmpty(),
    // اختياري: إن تُرك فارغاً تُؤخذ المناطق تلقائياً من src/data/areas.ts
    areasList: z.array(z.string()).optional(),
    faqs: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
    order: z.number().default(0),
    draft: z.boolean().default(false),
    // true = الصفحة تُنشر لكن بـ noindex ومستبعدة من sitemap حتى يكتمل محتواها الفريد (C-02)
    noindex: z.boolean().default(false),
  }),
});

// مشاريع منفذة (P-WORKS / C3): لا يُنشر مشروع بلا موافقة موثقة من العميل (5.1 و5.2).
// `consent` إلزامي ويجب أن يكون true، وإلا يفشل البناء برسالة واضحة ولا يُنشر المشروع.
// لا تُضاف مشاريع تجريبية: كل ملف هنا يجب أن يمثل عملاً حقيقياً نُفّذ فعلاً.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: textOrEmpty(),
      focusKeyword: optStr(),
      governorate: optStr(),
      // اختياري: الحي/المنطقة داخل المحافظة
      area: optStr(),
      // يطابق اسم ملف في src/content/curtain-types (مثل wave أو roll)
      curtainType: optStr(),
      room: opt(z.enum(['living', 'bedroom', 'room', 'diwaniya', 'office', 'kitchen', 'bathroom', 'majlis', 'other'])),
      // المشكلة التي أراد العميل حلها، والحل المنفذ
      problem: textOrEmpty(),
      solution: textOrEmpty(),
      fabric: optStr(),
      // مدة التنفيذ الفعلية لهذا المشروع (نص حر، مثل «يومان»)
      duration: optStr(),
      tip: optStr(),
      images: z
        .array(
          z.object({
            src: image(),
            alt: z.string(),
            label: z.enum(['before', 'after', 'gallery']).default('gallery'),
          })
        )
        .default([]),
      // موافقة العميل الموثقة على النشر: بدونها (أو بلا صور/محافظة/غرفة) يُحفظ المشروع ولا يُنشر،
      // ولا يفشل البناء — scripts/seo-lint.mjs ينبّه بسبب عدم النشر (publishableProject في src/lib/projects.ts)
      consent: z.preprocess(blank, z.boolean().default(false)),
      // اختياري: كيف وُثّقت الموافقة (رسالة واتساب، تاريخ…) — لا يُعرض في الموقع
      consentNote: optStr(),
      order: z.number().default(0),
      draft: z.boolean().default(false),
    }),
});

export const collections = { curtainTypes, services, uses, products, blog, areas, projects };
