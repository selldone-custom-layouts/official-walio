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
import { currentLanguage } from "../../region-switcher/region";
import EDITIONS from "../i18n/data/blog-editions.json";

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

/* ━━━━━━━━━━━━ Language editions (11 November 2026) ━━━━━━━━━━━━
   Selldone's blog has no language editions of one post: each article is a
   record of its own with a `lang`, and the list neither filters by language
   nor sends `lang`. A Spanish edition is therefore a second article, and
   i18n/data/blog-editions.json pairs it with the original:

     { "<original article id>": { "es": <Spanish article id> | null } }

   Ids are the articles' own ids (the list's `id`), not the blog ids in the
   address. null means "not published yet". For a visitor reading L:
   - every list (the journal, Most read, More from the journal) shows a
     post's L edition in its place, and never another language's edition:
     without an L edition the original stands for every language;
   - an address of any edition opens the one for L (router.replace).
   An edition counts only once it is in the published list, so an id put in
   the file before its article is published changes nothing. With every
   value null none of this runs: the journal reads and shows what it always
   did. */
type Family = { original: string; editions: Record<string, string> };

const FAMILIES = new Map<string, Family>(); // any member's article id → its family
for (const [original, langs] of Object.entries(EDITIONS as Record<string, Record<string, number | string | null>>)) {
  const editions: Record<string, string> = {};
  for (const [lang, id] of Object.entries(langs || {})) if (id !== null && id !== undefined && String(id).trim()) editions[lang] = String(id).trim();
  if (!Object.keys(editions).length) continue;
  const family = { original: String(original), editions };
  FAMILIES.set(family.original, family);
  for (const id of Object.values(editions)) FAMILIES.set(id, family);
}

/** Whether any language edition is named in blog-editions.json. */
export function editionsActive(): boolean {
  return FAMILIES.size > 0;
}

/* Every published post, by article id: the editions' own list entries
   (blog id and slug for their address). One call, kept for the visit. */
const INDEX_LIMIT = 100;
let indexRead: Promise<Map<string, any>> | null = null;
let indexTotal = 0;

function journalIndex(): Promise<Map<string, any>> {
  if (!indexRead) {
    indexRead = listCall({ offset: 0, limit: INDEX_LIMIT })
      .then(({ articles, total }) => {
        indexTotal = total;
        return new Map(articles.map((article: any) => [String(article.id), article]));
      })
      .catch((e) => {
        indexRead = null;
        throw e;
      });
  }
  return indexRead;
}

/** The article id a visitor reading `lang` should see for this post, or
 *  null when the post has no editions (or neither member is published). */
function shownId(id: any, index: Map<string, any>, lang = currentLanguage()): string | null {
  const family = FAMILIES.get(String(id));
  if (!family) return null;
  const own = family.editions[lang];
  if (own && index.has(own)) return own;
  if (index.has(family.original)) return family.original;
  return null;
}

/* Each post in the visitor's edition, each post once, in the list's order. */
function localise(list: any[], index: Map<string, any>): any[] {
  if (!Array.isArray(list)) return list || [];
  const seen = new Set<string>();
  const out: any[] = [];
  for (const article of list) {
    const want = shownId(article?.id, index);
    const shown = want && want !== String(article.id) ? index.get(want) : article;
    const key = String(shown?.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(shown);
  }
  return out;
}

/** The post this visitor should read instead of `article` (its edition in
 *  their language, or the original), or null to stay. */
export function editionFor(article: any): Promise<any | null> {
  if (!editionsActive() || !FAMILIES.has(String(article?.id))) return Promise.resolve(null);
  return journalIndex()
    .then((index) => {
      const want = shownId(article.id, index);
      return want && want !== String(article.id) ? index.get(want) || null : null;
    })
    .catch(() => null);
}

function listCall(params: Record<string, any>): Promise<{ articles: any[]; total: number }> {
  return window.axios.get(window.XAPI.GET_SHOP_BLOGS(window.$storefront.name), { params }).then(({ data }: any) => {
    if (data?.error) throw new Error(data.error_msg);
    return { articles: data.articles || [], total: data.total || 0 };
  });
}

/* With editions, a page is cut from the whole list once each post is in the
   visitor's edition, so pages and the count only hold what is shown. */
function localisedPage(q: JournalQuery, limit: number): Promise<{ articles: any[]; total: number }> {
  const filtered = !!(q.category || q.author || q.author_id || q.tag || q.search);
  const read = filtered
    ? listCall({
        offset: 0,
        limit: INDEX_LIMIT,
        category: q.category || undefined,
        author: q.author || undefined,
        author_id: q.author_id || undefined,
        tags: q.tag ? [q.tag] : undefined,
        search: q.search || undefined,
      })
    : journalIndex().then((index) => ({ articles: [...index.values()], total: indexTotal }));
  return Promise.all([read, journalIndex()]).then(([{ articles: all, total }, index]) => {
    const kept = withoutSamples(localise(all, index));
    const start = ((q.page || 1) - 1) * limit;
    const complete = all.length >= total;
    return {
      articles: kept.slice(start, start + limit),
      total: complete ? kept.length : Math.max(kept.length, total - (all.length - kept.length)),
    };
  });
}

export function journalPage(q: JournalQuery): Promise<{ articles: any[]; total: number }> {
  const limit = q.limit || 10;
  /* Should the whole list not come (a busy server), the page as before. */
  if (editionsActive()) return localisedPage(q, limit).catch(() => plainPage(q, limit));
  return plainPage(q, limit);
}

function plainPage(q: JournalQuery, limit: number): Promise<{ articles: any[]; total: number }> {
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
let extraRaw: any = null; // the answer as it came, for the editions

/** The most read posts and the journal's categories, read once. */
export function journalExtra() {
  if (!extraRead) {
    extraRead = window.axios
      .get(window.XAPI.GET_SHOP_BLOGS(window.$storefront.name), { params: { extra: true, offset: 0, limit: 1 } })
      .then(({ data }: any) => {
        extraRaw = data || null;
        const latest = withoutSamples(data?.last_articles || []);
        return { popular: withoutSamples(data?.popular || []), categories: data?.categories || [], latest };
      })
      .catch(() => {
        extraRead = null;
        return { popular: [], categories: [], latest: [] };
      });
  }
  if (!editionsActive()) return extraRead!;
  /* Each post in the visitor's edition, worked out on every call: the
     visitor may have picked another language since the first read. */
  return extraRead!.then((plain) =>
    !extraRaw
      ? plain
      : journalIndex()
          .then((index) => ({
            popular: withoutSamples(localise(extraRaw.popular || [], index)),
            categories: plain.categories,
            latest: withoutSamples(localise(extraRaw.last_articles || [], index)),
          }))
          .catch(() => plain),
  );
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
   Spinach 10 oz" is "baby spinach" — the brand and the size are dropped.
   In Spanish the brand follows the product words ("Espinacas baby FreshArc
   10 oz" is "espinacas baby") and a count is "uds.": the brand is the
   product's `brand` when it has one, else its CamelCase word, else (as
   before) the first word. In English the first word is the brand, so the
   names are the same as they always were. */
const CAMEL = /^\p{Lu}\p{Ll}+\p{Lu}/u;

function everydayName(title: string, brand?: string): string {
  const words = String(title || "")
    .replace(/\b\d+(\.\d+)?\s*(oz|fl oz|lb|lbs|g|kg|ml|l|ct|pack|pk|gal|qt|count|uds?|unidades)\b/gi, " ")
    .replace(/[^\p{L}\p{N}&' -]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const named = typeof brand === "string" && brand.trim() ? words.findIndex((word) => word.toLowerCase() === brand.trim().toLowerCase()) : -1;
  const at = named >= 0 ? named : words.findIndex((word) => CAMEL.test(word));
  words.splice(at > 0 ? at : 0, 1);
  return words.join(" ").toLowerCase();
}

/** The shop's products a post names, at most `count`. */
export function productsIn(html: string, catalogue: Iterable<any>, count = 4): any[] {
  const text = ` ${String(html || "")
    .replace(/<[^>]*>/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")} `;
  const found: any[] = [];
  for (const product of catalogue) {
    const name = everydayName(product.title, product.brand);
    if (name.length < 4 || !product.icon) continue;
    if (text.includes(` ${name}`)) found.push(product);
    if (found.length >= count) break;
  }
  return found;
}
