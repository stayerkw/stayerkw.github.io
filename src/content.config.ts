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
    draft: z.boolean().default(false),
  });

const curtainTypes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/curtain-types' }),
  schema: ({ image }) => withImage(image()),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: ({ image }) => withImage(image()),
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
    }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: ({ image }) => withImage(image()).extend({ pubDate: z.date() }),
});

export const collections = { curtainTypes, services, uses, products, blog };
