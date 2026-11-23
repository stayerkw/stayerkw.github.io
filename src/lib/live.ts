// النشر المجدول (طلب المالك 2026-11-23، قبل سفره شهرين): المنتج أو العمل الذي له publishDate في المستقبل
// يبقى مخفياً تماماً — لا تُبنى صفحته ولا يظهر في القوائم ولا في sitemap — حتى يحين تاريخه بتوقيت الكويت.
// يُعاد بناء الموقع تلقائياً كل صباح (deploy.yml: schedule) فيظهر المحتوى في يومه دون أي تدخل.
export const todayKuwait = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuwait", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const dayOf = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));

export const isDue = (publishDate?: Date | string) => !publishDate || dayOf(publishDate) <= todayKuwait();

// المرشّح الموحّد للمنتجات: غير مسودة + حان تاريخ نشرها
export const liveProduct = ({ data }: { data: { draft?: boolean; publishDate?: Date } }) => !data.draft && isDue(data.publishDate);
