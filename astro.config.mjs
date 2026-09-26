// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// موقع GitHub Pages من نوع <username>.github.io يُنشر على الجذر مباشرة (بدون base path)
export default defineConfig({
  site: 'https://stayerkw.github.io',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
