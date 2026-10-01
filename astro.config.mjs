// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// صفحات المحافظات الموسومة noindex: true تُستبعد من sitemap (تتسق مع meta robots)
const areasDir = fileURLToPath(new URL('./src/content/areas/', import.meta.url));
const noindexAreas = readdirSync(areasDir)
  .filter((f) => f.endsWith('.md'))
  .filter((f) => /^noindex:\s*true\s*$/m.test(readFileSync(areasDir + f, 'utf8').split(/^---\s*$/m)[1] ?? ''))
  .map((f) => f.replace(/\.md$/, ''));

// P-WORKS: صفحة /projects/ تُنشر noindex ما دام لا يوجد مشروع منشور (غير مسودة)، فتُستبعد من sitemap أيضاً
const projectsDir = fileURLToPath(new URL('./src/content/projects/', import.meta.url));
const hasPublishedProjects = existsSync(projectsDir) && readdirSync(projectsDir)
  .filter((f) => f.endsWith('.md'))
  .some((f) => !/^draft:\s*true\s*$/m.test(readFileSync(projectsDir + f, 'utf8').split(/^---\s*$/m)[1] ?? ''));

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

// موقع GitHub Pages من نوع <username>.github.io يُنشر على الجذر مباشرة (بدون base path)
export default defineConfig({
  site: 'https://stayerkw.github.io',
  integrations: [
    sitemap({
      filter: (page) => {
        const path = decodeURIComponent(new URL(page).pathname).replace(/\/$/, '');
        if (!hasPublishedProjects && path === '/projects') return false;
        return !noindexAreas.some((slug) => path === `/areas/${slug}`);
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
