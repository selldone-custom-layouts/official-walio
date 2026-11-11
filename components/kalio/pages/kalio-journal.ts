/*
 * Kalio — the journal (the shop's blog), 5 November 2026.
 *
 * Read through the storefront's own axios and Selldone's shop blog API:
 *   GET_SHOP_BLOGS       the list. Asked with `extra` it answers the side
 *                        lists (latest, popular, categories) but an empty
 *                        `articles` (seen on molino, 5 November 2026), so
 *                        the page and the side lists are two calls.
 *   GET_SHOP_BLOG_DATA   one post, by its blog id (the article's parent_id,
 *                        not the article's own id).
 */

import { formatDate } from "../i18n/kalio-i18n";

export interface JournalQuery {
  page?: number;
  limit?: number;
  category?: string | number;
  author?: string;
  author_id?: string | number;
  tag?: string;
  search?: string;
}

/* Selldone seeds a new shop's blog with another shop's sample posts
   (molino's power tools, AI, microphones and MSI posts came from shop 839).
   Once the shop has written posts of its own (7 November 2026: four grocery
   articles), the samples are left out of every list: the journal, "Most
   read", "More from the journal". They stay on Selldone, untouched, and
   their own links still open. */
let ownPosts = false;

function withoutSamples(list: any[]): any[] {
  const shop = (window as any).shop;
  if (!shop?.id || !Array.isArray(list)) return list || [];
  if (list.some((article) => !isDemoPost(article, shop))) ownPosts = true;
  return ownPosts ? list.filter((article) => !isDemoPost(article, shop)) : list;
}

export function journalPage(q: JournalQuery): Promise<{ articles: any[]; total: number }> {
  const limit = q.limit || 10;
  return window.axios
    .get(window.XAPI.GET_SHOP_BLOGS(window.$storefront.name), {
      params: {
        offset: ((q.page || 1) - 1) * limit,
        limit,
        category: q.category || undefined,
        author: q.author || undefined,
        author_id: q.author_id || undefined,
        tags: q.tag ? [q.tag] : undefined,
        search: q.search || undefined,
      },
    })
    .then(({ data }: any) => {
      if (data?.error) throw new Error(data.error_msg);
      const all = data.articles || [];
      const kept = withoutSamples(all);
      return { articles: kept, total: Math.max(kept.length, (data.total || 0) - (all.length - kept.length)) };
    });
}

let extraRead: Promise<{ popular: any[]; categories: any[]; latest: any[] }> | null = null;

/** The most read posts and the journal's categories, read once. */
export function journalExtra() {
  if (!extraRead) {
    extraRead = window.axios
      .get(window.XAPI.GET_SHOP_BLOGS(window.$storefront.name), { params: { extra: true, offset: 0, limit: 1 } })
      .then(({ data }: any) => {
        const latest = withoutSamples(data?.last_articles || []);
        return { popular: withoutSamples(data?.popular || []), categories: data?.categories || [], latest };
      })
      .catch(() => {
        extraRead = null;
        return { popular: [], categories: [], latest: [] };
      });
  }
  return extraRead!;
}

export function journalPost(blogId: string | number): Promise<any> {
  return window.axios
    .get(window.XAPI.GET_SHOP_BLOG_DATA(window.$storefront.name, blogId), { params: { relatives: false } })
    .then(({ data }: any) => {
      if (data?.error || !data?.article) throw new Error(data?.error_msg || "Not found");
      return data;
    });
}

export function journalRoute(query: Record<string, any> = {}) {
  return { name: window.$storefront.routes.BLOGS_PAGE, query };
}

/** A post's page, from a list item, a popular item or the post itself. */
export function postRoute(article: any) {
  const blogId = article?.parent_id || article?.id;
  return article?.slug
    ? { name: window.$storefront.routes.SHOP_BLOG_PAGE_SLUG, params: { slug: article.slug, blog_id: blogId } }
    : { name: window.$storefront.routes.SHOP_BLOG_PAGE, params: { blog_id: blogId } };
}

/** A post that came with Selldone's demo content: its picture is kept in
 *  another shop's folder (molino's four posts are shop 839's). The page then
 *  says it is sample text, as the owner asked. */
export function isDemoPost(article: any, shop: any): boolean {
  const match = /\/shops\/(\d+)\//.exec(String(article?.image || ""));
  return !!match && !!shop?.id && Number(match[1]) !== Number(shop.id);
}

/* A date's parts in the visitor's language ("05", "Nov", "Nov 5, 2026" in
   English): the month names and the order are Intl's, not ours. */
export function dateParts(iso: string | null | undefined) {
  const date = iso ? new Date(iso) : null;
  if (!date || isNaN(date.getTime())) return { day: "", mon: "", full: "" };
  return {
    day: formatDate(date, { day: "2-digit" }),
    mon: formatDate(date, { month: "short" }),
    full: formatDate(date, { month: "short", day: "numeric", year: "numeric" }),
  };
}

export function readMinutes(html: string | null | undefined): number {
  const words = String(html || "")
    .replace(/<[^>]*>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function initials(name: string | null | undefined): string {
  return (
    String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "•"
  );
}

let dealsRead: Promise<any[]> | null = null;

/** This week's deals: products on offer, best sellers first. */
export function deals(count = 4): Promise<any[]> {
  if (!dealsRead) {
    dealsRead = window.$storefront.products
      .list(null, 0, 12, {
        products_only: true,
        available: true,
        sort: "bestselling",
        filter: JSON.stringify({ only_has_discount: true }),
      })
      .then(({ products }: any) => (products || []).filter((product: any) => product.icon))
      .catch(() => {
        dealsRead = null;
        return [];
      });
  }
  return dealsRead!.then((list) => list.slice(0, count));
}

/* A product's everyday name, for finding it in a post: "FreshArc Baby
   Spinach 10 oz" is "baby spinach" — the brand and the size are dropped. */
function everydayName(title: string): string {
  const words = String(title || "")
    .replace(/\b\d+(\.\d+)?\s*(oz|fl oz|lb|lbs|g|kg|ml|l|ct|pack|pk|gal|qt|count)\b/gi, " ")
    .replace(/[^\p{L}\p{N}&' -]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(1).join(" ").toLowerCase();
}

/** The shop's products a post names, at most `count`. */
export function productsIn(html: string, catalogue: Iterable<any>, count = 4): any[] {
  const text = ` ${String(html || "")
    .replace(/<[^>]*>/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")} `;
  const found: any[] = [];
  for (const product of catalogue) {
    const name = everydayName(product.title);
    if (name.length < 4 || !product.icon) continue;
    if (text.includes(` ${name}`)) found.push(product);
    if (found.length >= count) break;
  }
  return found;
}
