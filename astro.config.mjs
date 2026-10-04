// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// كل صفحة محتوى موسومة noindex: true تُستبعد من sitemap (تتسق مع meta robots في BaseLayout)
const frontmatter = (file) => readFileSync(file, 'utf8').split(/^---\s*$/m)[1] ?? '';
const noindexDirs = { areas: 'areas', products: 'products', blog: 'blog', curtains: 'curtain-types', services: 'services' };
const noindexPaths = Object.entries(noindexDirs).flatMap(([route, dir]) => {
  const abs = fileURLToPath(new URL(`./src/content/${dir}/`, import.meta.url));
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith('.md') && /^noindex:\s*true\s*$/m.test(frontmatter(abs + f)))
    .map((f) => `/${route}/${f.replace(/\.md$/, '')}`);
});

// P-WORKS: صفحة /projects/ تُنشر noindex ما دام لا يوجد مشروع قابل للنشر، فتُستبعد من sitemap أيضاً
const projectsDir = fileURLToPath(new URL('./src/content/projects/', import.meta.url));
const hasPublishedProjects = existsSync(projectsDir) && readdirSync(projectsDir)
  .filter((f) => f.endsWith('.md'))
  .some((f) => {
    // نفس قاعدة src/lib/projects.ts: غير مسودة + موافقة + صورة + محافظة + غرفة
    const fm = readFileSync(projectsDir + f, 'utf8').split(/^---\s*$/m)[1] ?? '';
    return !/^draft:\s*true\s*$/m.test(fm) && /^consent:\s*true\s*$/m.test(fm) && /^images:\s*\n\s*-/m.test(fm);
  });

// B5: lastmod حقيقي من تاريخ آخر commit للملف المصدر (لا تواريخ مختلقة). الصفحات التي لا نجد لها
// مصدراً أو لا يوجد git (مثلاً داخل zip) تُترك بلا lastmod بدل تخمينه. يتطلب في CI: fetch-depth: 0.
const contentDirs = { products: 'products', curtains: 'curtain-types', services: 'services', areas: 'areas', blog: 'blog', projects: 'projects' };
const gitDate = (...files) => {
  const existing = files.filter((f) => existsSync(f));
  if (!existing.length) return undefined;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...existing], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
};
const lastmodFor = (pathname) => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return gitDate('src/pages/index.astro');
  const dir = contentDirs[parts[0]];
  if (dir && parts.length === 2) return gitDate(`src/content/${dir}/${parts[1]}.md`);
  if (dir && parts.length === 1) return gitDate(`src/content/${dir}`, `src/pages/${parts[0]}/index.astro`);
  return gitDate(`src/pages/${parts.join('/')}/index.astro`, `src/pages/${parts.join('/')}.astro`, `src/pages/${parts.join('/')}/[slug].astro`);
};

// أداء (LCP): أول صورة داخل محتوى Markdown (عنصر .prose) غالباً عنصر LCP في صفحات الأنواع والخدمات
// والمقالات، وAstro يضع لها loading="lazy" افتراضياً فيتأخر تحميلها. بعد البناء نجعل الصورة الأولى
// داخل .prose في كل صفحة loading="eager" (بأولوية عادية كي لا تنافس نص LCP في الصفحات التي عنصرها نص)، وتبقى بقية الصور كسولة.
// (معالج Markdown الافتراضي في Astro 7 لا يقبل إضافات rehype دون تثبيت حزمة إضافية.)
function firstContentImageEager() {
  return {
    name: 'first-content-image-eager',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d + e.name + '/') : e.name.endsWith('.html') ? [d + e.name] : []));
        let n = 0;
        for (const file of walk(root)) {
          let html = readFileSync(file, 'utf8');
          // sizes لصور Markdown (تُعرف بغياب class): 320px في القوالب التي تحصر الصور بـ prose-img:max-w-xs،
          // وإلا عرض عمود المحتوى. هكذا يختار الجوال نسخة 480–640 بكسل بدل الأصل.
          const narrow = /prose-img:max-w-xs/.test(html);
          html = html.replace(/<img\b(?![^>]*\bclass=)([^>]*\bdata-astro-image="constrained"[^>]*)>/g, (m) =>
            m.replace(/\bsizes="[^"]*"/, `sizes="${narrow ? '(min-width: 400px) 320px, 80vw' : '(min-width: 800px) 736px, 92vw'}"`));
          const start = html.search(/class="[^"]*\bprose\b/);
          const i = start < 0 ? -1 : html.indexOf('<img', start);
          if (i >= 0) {
            const end = html.indexOf('>', i);
            const tag = html.slice(i, end + 1);
            if (tag.includes('loading="lazy"')) {
              html = html.slice(0, i) + tag.replace('loading="lazy"', 'loading="eager"') + html.slice(end + 1);
              n++;
            }
          }
          writeFileSync(file, html);
        }
        logger.info(`first-content-image-eager: ${n} صفحة`);
      },
    },
  };
}

// موقع GitHub Pages من نوع <username>.github.io يُنشر على الجذر مباشرة (بدون base path)
export default defineConfig({
  site: 'https://alamcurtainskw.com',
  // صور المحتوى (داخل نصوص Markdown): srcset تلقائي بهذه الأحجام بدل إرسال الأصل (حتى 2000 بكسل).
  // قيمة sizes الصحيحة لها تُضبط بعد البناء في firstContentImageEager حسب عرض المحتوى في كل قالب.
  // صور القوالب (البطاقات، المنتج، المشاريع، الرئيسية) تحدد widths وsizes بنفسها.
  image: { layout: 'constrained', responsiveStyles: false, breakpoints: [320, 480, 640, 800, 1280] },
  integrations: [
    firstContentImageEager(),
    sitemap({
      filter: (page) => {
        const path = decodeURIComponent(new URL(page).pathname).replace(/\/$/, '');
        if (!hasPublishedProjects && path === '/projects') return false;
        return !noindexPaths.includes(path);
      },
      serialize(item) {
        const lastmod = lastmodFor(decodeURIComponent(new URL(item.url).pathname));
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
