// GEO-03: بيانات مشتقة من نص المقال نفسه (Markdown)، فلا يُكتب شيء مرتين ولا يتغيّر ما يظهر للزائر.
import type { ImageMetadata } from "astro";

const assets = import.meta.glob<{ default: ImageMetadata }>("/src/content/*/images/*.{jpg,jpeg,png,webp,avif}");

/** نص عادي من Markdown: الروابط تُختصر إلى نصها، وتُزال علامات التغميق */
const plain = (s: string) =>
  s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * أسئلة قسم «## أسئلة شائعة» المكتوبة داخل النص بصيغة: **السؤال؟** الجواب.
 * تُستخدم للبيانات المنظمة (FAQPage) فقط؛ النص الظاهر يبقى كما هو.
 */
export function inlineFaqs(body: string | undefined): { question: string; answer: string }[] {
  if (!body) return [];
  const start = body.search(/^##\s+أسئلة شائعة\s*$/m);
  if (start < 0) return [];
  const rest = body.slice(start).split("\n").slice(1);
  const out: { question: string; answer: string }[] = [];
  for (const line of rest) {
    if (/^##\s/.test(line)) break;
    const m = line.match(/^\*\*(.+?[؟?])\*\*\s*(.+)$/);
    if (m) out.push({ question: plain(m[1]), answer: plain(m[2]) });
  }
  return out;
}

/** أول صورة محلية في نص المقال (مثل ../projects/images/x.jpg) كأصل صورة يعالجه Astro */
export async function firstBodyImage(body: string | undefined, filePath: string | undefined): Promise<ImageMetadata | undefined> {
  if (!body || !filePath) return undefined;
  const m = body.match(/!\[[^\]]*\]\((\.{1,2}\/[^)\s]+)\)/);
  if (!m) return undefined;
  const key = new URL(m[1], `file:///${filePath.replace(/^\/+/, "")}`).pathname;
  const load = assets[key];
  return load ? (await load()).default : undefined;
}
