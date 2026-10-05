// F1: أزواج الصفحات العربية/الإنجليزية (translationKey ← slugAr/slugEn). مصدر واحد لـ hreflang وزر اللغة.
// كل صفحة إنجليزية مستقلة بنص طبيعي يستهدف نية الباحث بالإنجليزية — لا ترجمة حرفية.
import { projectsEn } from "./projects-en";

export const pagePairs: { key: string; ar: string; en: string }[] = [
  { key: "projects", ar: "/projects/", en: "/en/projects/" },
  ...projectsEn.map((p) => ({ key: `project-${p.slug}`, ar: `/projects/${p.slug}/`, en: `/en/projects/${p.slug}/` })),
  { key: "home", ar: "/", en: "/en/" },
  { key: "tailoring", ar: "/services/tailoring/", en: "/en/custom-curtains/" },
  { key: "installation", ar: "/services/installation/", en: "/en/curtain-installation/" },
  { key: "prices", ar: "/prices/", en: "/en/curtain-prices/" },
  { key: "roll", ar: "/curtains/roll/", en: "/en/roller-blinds/" },
  { key: "blackout", ar: "/curtains/blackout/", en: "/en/blackout-curtains/" },
  { key: "contact", ar: "/contact/", en: "/en/contact/" },
  { key: "zebra", ar: "/curtains/zebra/", en: "/en/zebra-blinds/" },
  { key: "wave", ar: "/curtains/wave/", en: "/en/wave-curtains/" },
  { key: "sheer", ar: "/curtains/sheer/", en: "/en/sheer-curtains/" },
  { key: "wooden", ar: "/curtains/wooden/", en: "/en/wooden-blinds/" },
  { key: "kids", ar: "/curtains/kids/", en: "/en/kids-blinds/" },
  { key: "office", ar: "/curtains/office/", en: "/en/office-blinds/" },
];

export const isEnglishPath = (p: string) => p === "/en" || p.startsWith("/en/");

/** المقابل في اللغة الأخرى إن وُجد. */
export function alternatesFor(pathname: string): { ar: string; en: string } | undefined {
  const p = pathname.endsWith("/") ? pathname : pathname + "/";
  return pagePairs.find((x) => x.ar === p || x.en === p);
}

export const nameEn = "Alam Curtains Kuwait";

export const enTypes = [
  { label: "Wave Curtains", href: "/en/wave-curtains/" },
  { label: "Sheer Curtains", href: "/en/sheer-curtains/" },
  { label: "Zebra Blinds", href: "/en/zebra-blinds/" },
  { label: "Wooden Blinds", href: "/en/wooden-blinds/" },
  { label: "Kids' Blinds", href: "/en/kids-blinds/" },
  { label: "Office Blinds", href: "/en/office-blinds/" },
];

export const enAreas = [
  { label: "Salmiya", href: "/en/curtains-salmiya/" },
  { label: "Mangaf & Mahboula", href: "/en/curtains-mangaf-mahboula/" },
  { label: "Kuwait City", href: "/en/curtains-kuwait-city/" },
  { label: "Sharq (offices)", href: "/en/curtains-sharq/" },
  { label: "Offices, Schools & Embassies", href: "/en/commercial-curtains/" },
  { label: "Farwaniya & Khaitan", href: "/en/curtains-farwaniya-khaitan/" },
];

export const enNav = [
  { label: "Home", href: "/en/" },
  { label: "Custom Curtains", href: "/en/custom-curtains/" },
  { label: "Roller Blinds", href: "/en/roller-blinds/" },
  { label: "Blackout Curtains", href: "/en/blackout-curtains/" },
  { label: "Installation", href: "/en/curtain-installation/" },
  { label: "Prices", href: "/en/curtain-prices/" },
  { label: "Our Work", href: "/en/projects/" },
  { label: "Guides", href: "/en/blog/" },
  { label: "Guides", href: "/en/blog/" },
  { label: "Contact", href: "/en/contact/" },
];
