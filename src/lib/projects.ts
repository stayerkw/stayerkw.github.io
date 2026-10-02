// المشروع يُنشر فقط إن اكتمل ما لا يجوز نشره بدونه: موافقة العميل، وصورة، والمحافظة والغرفة.
// النقص لا يُفشل البناء؛ المشروع يبقى محفوظاً في اللوحة وينبّه seo-lint بالسبب.
export const publishableProject = ({ data }: { data: { draft?: boolean; consent?: boolean; images?: unknown[]; governorate?: string; room?: string } }) =>
  !data.draft && data.consent === true && (data.images?.length ?? 0) > 0 && Boolean(data.governorate) && Boolean(data.room);
