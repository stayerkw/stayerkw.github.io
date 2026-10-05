// F1: أزواج الصفحات العربية/الإنجليزية (translationKey ← slugAr/slugEn). مصدر واحد لـ hreflang وزر اللغة.
// كل صفحة إنجليزية مستقلة بنص طبيعي يستهدف نية الباحث بالإنجليزية — لا ترجمة حرفية.
export const pagePairs: { key: string; ar: string; en: string }[] = [
  { key: "home", ar: "/", en: "/en/" },
  { key: "tailoring", ar: "/services/tailoring/", en: "/en/custom-curtains/" },
  { key: "installation", ar: "/services/installation/", en: "/en/curtain-installation/" },
  { key: "prices", ar: "/prices/", en: "/en/curtain-prices/" },
  { key: "roll", ar: "/curtains/roll/", en: "/en/roller-blinds/" },
  { key: "blackout", ar: "/curtains/blackout/", en: "/en/blackout-curtains/" },
  { key: "contact", ar: "/contact/", en: "/en/contact/" },
];

export const isEnglishPath = (p: string) => p === "/en" || p.startsWith("/en/");

/** المقابل في اللغة الأخرى إن وُجد. */
export function alternatesFor(pathname: string): { ar: string; en: string } | undefined {
  const p = pathname.endsWith("/") ? pathname : pathname + "/";
  return pagePairs.find((x) => x.ar === p || x.en === p);
}

export const nameEn = "Alam Curtains Kuwait";

export const enNav = [
  { label: "Home", href: "/en/" },
  { label: "Custom Curtains", href: "/en/custom-curtains/" },
  { label: "Roller Blinds", href: "/en/roller-blinds/" },
  { label: "Blackout Curtains", href: "/en/blackout-curtains/" },
  { label: "Installation", href: "/en/curtain-installation/" },
  { label: "Prices", href: "/en/curtain-prices/" },
  { label: "Contact", href: "/en/contact/" },
];
