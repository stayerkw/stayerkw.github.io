import { getCollection, type CollectionEntry } from "astro:content";

export type Review = CollectionEntry<"reviews">;

/** المراجعات المقبولة فقط، الأحدث أولاً */
export const approvedReviews = async () =>
  (await getCollection("reviews", (r) => r.data.approved)).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

export const reviewsFor = async (productId: string) => (await approvedReviews()).filter((r) => r.data.product === productId);

export const ratingSummary = (list: Review[]) => {
  if (!list.length) return undefined;
  const avg = list.reduce((s, r) => s + r.data.rating, 0) / list.length;
  return { average: Math.round(avg * 10) / 10, count: list.length };
};

export const stars = (n: number) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
export const dateAr = (d: Date) => d.toLocaleDateString("ar-KW", { year: "numeric", month: "long", day: "numeric" });
export const REVIEWS_PATH = "/reviews/";
export const REVIEWS_API = "https://alamcurtains-reviews.netlify.app/api/review";
