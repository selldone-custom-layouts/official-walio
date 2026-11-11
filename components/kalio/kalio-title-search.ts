/*
 * Kalio — a search also finds products by their names in the visitor's
 * language (ES-08, 11 November 2026).
 *
 * Selldone's search looks only at the shop's own names (English): in Spanish
 * "plátanos" found nothing, while "bananas" found the product shown as
 * "Plátanos Cavendish FreshArc 2 lb". The translated names are in
 * i18n/data/<lang>-titles.json (product id → name), fetched only when that
 * language is the visitor's. A plain search in that language also matches
 * the query against them, ignoring case and accents ("platanos",
 * "PLÁTANOS"; the ñ counts as its own letter, except that "panales" still
 * finds "pañales"): every word of the query must start a word of the name
 * ("plátano" finds "Plátanos"), and a plural also finds the singular
 * ("plátanos" finds "puré de plátano", "limones" finds "limón"); little
 * words ("de", "con") are skipped when the query has others.
 *
 * The products found only that way are read with the listing's own request
 * minus the search words (same aisle, filters, seller, availability and
 * sort), so a price, aisle, brand or spec filter still holds and the cards
 * have exactly the shape the listing draws. They come after the server's
 * results, in the listing's sort order, and are counted in the total. When
 * the server's results run to more pages, their ids are read once so that
 * nothing shows twice, and the extra products join after the last page.
 *
 * English, and any language without a names file, is untouched, and so is
 * a search the shopper picked from the suggestions (search_type "exact" or
 * "category").
 */
import { currentLanguage } from "../region-switcher/region";

const TITLES: Record<string, () => Promise<any>> = {
  es: () => import("./i18n/data/es-titles.json"),
};

/* Words a query may carry that say nothing about the product. */
const LITTLE: Record<string, Set<string>> = {
  es: new Set(["a", "al", "con", "de", "del", "e", "el", "en", "la", "las", "lo", "los", "o", "para", "por", "u", "un", "una", "y"]),
};

/* A plural also finds its singular: the word without "s" or "es". */
const PLURAL: Record<string, (word: string) => string[]> = {
  es: (word) => {
    const out = [word];
    if (word.length >= 4 && word.endsWith("s")) out.push(word.slice(0, -1));
    if (word.length >= 5 && word.endsWith("es")) out.push(word.slice(0, -2));
    return out;
  },
};

/* How many products the shelf read (the request without the search words)
   brings back at most; molino has 160. */
const SHELF_LIMIT = 250;

type Index = Array<[number, string[]]>;
const indexes: Record<string, Promise<Index>> = {};

/** Lower case, no accents: "PLÁTANOS" → "platanos". The ñ stays: in
 *  Spanish it is a letter of its own ("pan" is not "pañales"). */
export function fold(text: unknown): string {
  return String(text ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/ñ/g, "@N@")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/@N@/g, "ñ");
}

function words(text: unknown): string[] {
  return fold(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/* A word of the query starts a word of the name. Without an ñ of its own, a
   query word of five letters or more also matches the name's ñ as n
   ("panales" finds "pañales"); a shorter one does not ("pan"). */
function starts(part: string, way: string): boolean {
  if (part.startsWith(way)) return true;
  return way.length >= 5 && !way.includes("ñ") && part.includes("ñ") && part.replace(/ñ/g, "n").startsWith(way);
}

function index(lang: string): Promise<Index> | null {
  const load = TITLES[lang];
  if (!load) return null;
  if (!indexes[lang])
    indexes[lang] = load()
      .then((mod: any) => {
        const names: Record<string, string> = (mod && mod.default) || mod || {};
        return Object.entries(names).map(([id, name]) => [Number(id), words(name)] as [number, string[]]);
      })
      .catch(() => {
        delete indexes[lang];
        return [] as Index;
      });
  return indexes[lang];
}

/** Whether this search also looks at the names in the visitor's language. */
export function titleSearchOn(search: unknown, searchType: unknown): boolean {
  const query = typeof search === "string" ? search.trim() : "";
  return !!query && query !== "*" && !searchType && !!TITLES[currentLanguage()];
}

/** Ids of the products whose name in the visitor's language matches the query. */
export async function titleMatches(search: string, lang: string = currentLanguage()): Promise<number[]> {
  const read = index(lang);
  if (!read) return [];
  let query = words(search);
  const little = LITTLE[lang];
  if (little) {
    const kept = query.filter((word) => !little.has(word));
    if (kept.length) query = kept;
  }
  if (!query.length) return [];
  const forms = query.map((word) => (PLURAL[lang] ? PLURAL[lang](word) : [word]));
  const list = await read;
  return list
    .filter(([, name]) => forms.every((ways) => name.some((part) => ways.some((way) => starts(part, way)))))
    .map(([id]) => id);
}

/** What the first page leaves for the last one when the server's results run to more pages. */
export interface TitleSearchPending {
  serverTotal: number;
  extras: any[];
}

/** The listing's request with other values: (offset, limit, options to override). */
export type ListAgain = (offset: number, limit: number, overrides: Record<string, any>) => Promise<any>;

const ONLY_PRODUCTS = { products_only: true, with_parent: false, with_page: false, with_total: false };

/**
 * A listing answer with the products found by their translated names.
 *
 * `page` is the server's answer and is never changed (the SDK keeps it in
 * its cache, and the cached copy is shown again). `offset` is where the page
 * starts in the server's list; `pending` what the first page left.
 */
export async function withTitleMatches(
  page: any,
  { search, offset, pending, list }: { search: string; offset: number; pending: TitleSearchPending | null; list: ListAgain },
): Promise<{ page: any; pending: TitleSearchPending | null }> {
  const products: any[] | null = Array.isArray(page?.products) ? page.products : null;
  if (!products) return { page, pending };
  const total = typeof page.total === "number" ? page.total : products.length;

  /* A later page: the products found by name come after the server's last. */
  if (offset > 0) {
    if (!pending) return { page, pending: null };
    const out = { ...page, total: pending.serverTotal + pending.extras.length };
    if (offset + products.length < pending.serverTotal) return { page: out, pending };
    const here = new Set(products.map((product) => product.id));
    out.products = products.concat(pending.extras.filter((product) => !here.has(product.id)));
    return { page: out, pending: null };
  }

  const ids = await titleMatches(search);
  if (!ids.length) return { page, pending: null };
  const found = new Set(products.map((product) => product.id));
  let wanted = ids.filter((id) => !found.has(id));
  if (!wanted.length) return { page, pending: null };

  /* The server's other pages: their ids, so a product it finds there is not added twice. */
  const paged = total > products.length;
  if (paged) {
    const rest = await list(products.length, Math.min(total - products.length, SHELF_LIMIT), ONLY_PRODUCTS);
    for (const product of rest?.products || []) found.add(product.id);
    wanted = wanted.filter((id) => !found.has(id));
    if (!wanted.length) return { page, pending: null };
  }

  /* The same shelf without the search words: aisle, filters, seller and sort still hold. */
  const want = new Set(wanted);
  const shelf = await list(0, SHELF_LIMIT, { ...ONLY_PRODUCTS, search: null, search_type: null });
  const extras = (shelf?.products || []).filter((product: any) => product && want.has(product.id));
  if (!extras.length) return { page, pending: null };

  if (paged) return { page: { ...page, total: total + extras.length }, pending: { serverTotal: total, extras } };
  return { page: { ...page, products: products.concat(extras), total: total + extras.length }, pending: null };
}
