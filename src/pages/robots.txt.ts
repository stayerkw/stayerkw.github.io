import type { APIRoute } from "astro";

// robots.txt ديناميكي: رابط sitemap يتبع `site` في astro.config.mjs تلقائياً، فلا يلزم تعديله يدوياً عند نقل النطاق (A1).
export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL("https://stayerkw.github.io")).origin;
  const body = `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${origin}/sitemap-index.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
