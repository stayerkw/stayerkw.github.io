import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// image() يجعل Astro يولّد نسخاً محسّنة (WebP، أحجام متعددة) من أي صورة تُرفق في المحتوى
// تلقائياً عند البناء — بدل الاعتماد على صورة خام من public/ بلا معالجة.
const withImage = (image: ReturnType<typeof z.string>) =>
  z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().default(0),
    image: image.optional(),
    imageAlt: z.string().optional(),
    // I1: عنوان SEO اختياري يُستعمل في <title> بدل title (اسم النشاط يُضاف تلقائياً)
    seoTitle: z.string().optional(),
    // الكلمة المستهدفة من seo/keyword-master.csv — يفحصها scripts/keyword-check.mjs (تكرار/ظهور/الصفحة المستهدفة)
    focusKeyword: z.string().optional(),
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
      curtainType: z.string().optional(),
      price: z.number().optional(),
      priceNote: z.string().optional(),
      // صور إضافية للمنتج الواحد (تظهر كمعرض أسفل الصورة الرئيسية)
      gallery: z.array(image()).optional(),
      // I1: حقول موسعة اختيارية — تُعرض فقط إن عُبّئت (لا قيم افتراضية مخمّنة)
      fabricType: z.string().optional(),
      opacity: z.enum(['شفاف', 'نصف معتم', 'بلاك أوت']).optional(),
      colors: z.array(z.string()).optional(),
      care: z.string().optional(),
    }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: ({ image }) => withImage(image()).extend({ pubDate: z.date(), updatedDate: z.date().optional(), ...related }),
});

// صفحات مناطق الخدمة — تُنشأ فقط للمناطق التي لها حجم بحث فعلي (حسب Google Keyword Planner)
const areas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/areas' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),
    focusKeyword: z.string().optional(),
    description: z.string(),
    governorate: z.string(),
    intro: z.string(),
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
      description: z.string(),
      focusKeyword: z.string().optional(),
      governorate: z.string(),
      // اختياري: الحي/المنطقة داخل المحافظة
      area: z.string().optional(),
      // يطابق اسم ملف في src/content/curtain-types (مثل wave أو roll)
      curtainType: z.string().optional(),
      room: z.enum(['living', 'bedroom', 'diwaniya', 'office', 'kitchen', 'majlis', 'other']),
      // المشكلة التي أراد العميل حلها، والحل المنفذ
      problem: z.string(),
      solution: z.string(),
      fabric: z.string().optional(),
      // مدة التنفيذ الفعلية لهذا المشروع (نص حر، مثل «يومان»)
      duration: z.string().optional(),
      tip: z.string().optional(),
      images: z
        .array(
          z.object({
            src: image(),
            alt: z.string(),
            label: z.enum(['before', 'after', 'gallery']).default('gallery'),
          })
        )
        .min(1),
      // موافقة العميل الموثقة على النشر — إلزامية
      consent: z
        .boolean()
        .refine((v) => v === true, 'لا يُنشر مشروع بلا موافقة موثقة من العميل: فعّل حقل consent بعد الحصول على الموافقة'),
      // اختياري: كيف وُثّقت الموافقة (رسالة واتساب، تاريخ…) — لا يُعرض في الموقع
      consentNote: z.string().optional(),
      order: z.number().default(0),
      draft: z.boolean().default(false),
    }),
});

export const collections = { curtainTypes, services, uses, products, blog, areas, projects };
