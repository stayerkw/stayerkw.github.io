// المشروع يُنشر فقط إن اكتمل ما لا يجوز نشره بدونه: موافقة العميل وصورة واحدة على الأقل.
// المحافظة والغرفة اختياريتان (قرار المالك 2 أكتوبر): بلا محافظة يُعرض «الكويت» ولا يظهر في صفحات المحافظات.
// النقص لا يُفشل البناء؛ المشروع يبقى محفوظاً في اللوحة وينبّه seo-lint بالسبب.
export const publishableProject = ({ data }: { data: { draft?: boolean; consent?: boolean; images?: unknown[]; governorate?: string; room?: string } }) =>
  !data.draft && data.consent === true && (data.images?.length ?? 0) > 0;
