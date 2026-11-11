/*
 * The shop's own data in the visitor's language, for the parts Selldone does
 * not translate itself (11 November 2026, the owner: a Spanish shopper who
 * reads no English must understand every page, with no slips).
 *
 * Selldone translates per language on its own server (the request's
 * x-localization header): product names (title, title_en), category names
 * and descriptions, and each product's article (one article per language).
 * Those are written in the shop (Selldone's translation and article APIs).
 * It has no translation for a product's spec table, its pros and cons, its
 * rating names or its sale unit ("per pack"). Those come from a dictionary
 * per language here, data/<lang>.json (the English text → the translation),
 * fetched only when a visitor picks that language, and applied to every
 * product in an API response before anything (our components or Selldone's)
 * draws it.
 *
 * Product names where the server sends neither the name in the language nor
 * `translations` (ES-03, 11 November 2026): a basket's and an order's lines
 * carry the product as the shop stores it, in English, even when the request
 * asks for Spanish (basket/<id>, shops/@<shop>/info's baskets, baskets/<id>),
 * so the mini-cart, the checkout and the order page read "FreshArc Cavendish
 * Bananas 2 lb" beside a product page that says "Plátanos Cavendish FreshArc
 * 2 lb". data/<lang>-titles.json (product id → the name in that language,
 * the same names written in the shop) fills those in, by the product's id.
 * Display only: ids, prices, counts, variants and sellers are never touched,
 * nothing here is sent back to the server, and an order's line simply shows
 * today's name of its product. A product the file does not know keeps the
 * name it came with.
 *
 * The English stays on the product for code that reads English words:
 * _spec_en (the price per unit looks for "Net Weight", "Pack Size"),
 * _unit_en and _title_en. A string the dictionary does not know is shown as
 * it is.
 *
 * Only objects that are products are touched (an id, a title and a price),
 * so a filter's own spec values, which go back to the server as they are,
 * never change.
 *
 * Data that reaches the page without axios: the product Selldone's server
 * writes into a product page's HTML (window.PRE_LOADED_DATA.PRODUCT_PACK,
 * "turbo load") is in the HTML's language, not the visitor's; see
 * localizePreloaded() (ES-10).
 *
 * A product's article after moving from one product page to another in the
 * app (found 11 November 2026, the QA's 713664 and 713682 in Spanish): the
 * product page stays mounted, so Selldone's article viewer (SProductArticle,
 * ArticleViewer) reads the new product's article again from
 * gapi.selldone.com/articles/product/<id>, which answers the shop's first
 * article (English, lang "en") whatever x-localization says, while
 * products/<id>/info, read for the same page a moment before, carries the
 * article in the visitor's language. Such an answer gets that article
 * instead (localizeArticle); a cold load was already right (the viewer
 * starts from the product's own article_pack).
 */
import { SetupService } from "@selldone/core-js/server/SetupService";
import { currentLanguage } from "../../region-switcher/region";

type Dict = Record<string, string>;

const LOADERS: Record<string, () => Promise<{ default: Dict } | Dict>> = {
  es: () => import("./data/es.json"),
};
/* Product id → the product's name in that language (ES-03). */
const TITLE_LOADERS: Record<string, () => Promise<{ default: Dict } | Dict>> = {
  es: () => import("./data/es-titles.json"),
};

function cachedLoader(loaders: Record<string, () => Promise<any>>) {
  const done: Record<string, Dict> = {};
  const loading: Record<string, Promise<Dict>> = {};
  return {
    done,
    get(lang: string): Promise<Dict> | null {
      if (done[lang]) return Promise.resolve(done[lang]);
      const load = loaders[lang];
      if (!load) return null;
      if (!loading[lang])
        loading[lang] = load()
          .then((m: any) => (done[lang] = (m && m.default) || m || {}))
          .catch(() => {
            delete loading[lang]; // a failed fetch is tried again with the next response
            return {};
          });
      return loading[lang];
    },
  };
}
/* Language → product id → the product's article in that language, as the
   product's own answer carried it (article_pack.article, lang = language). */
const articles: Record<string, Map<number, any>> = {};

const dictionaries = cachedLoader(LOADERS);
const titleFiles = cachedLoader(TITLE_LOADERS);
const dicts = dictionaries.done;

/** Fetch a language's shop dictionaries (spec words, product names). Resolves when both are in (or failed). */
export function loadShopData(lang: string = currentLanguage()): Promise<void> {
  return Promise.all([dictionaries.get(lang), titleFiles.get(lang)]).then(() => undefined);
}

function tr(d: Dict, s: any): any {
  if (typeof s !== "string") return s;
  const hit = d[s] ?? d[s.trim()];
  return hit === undefined ? s : hit;
}

function isProduct(o: any): boolean {
  return o && typeof o === "object" && !Array.isArray(o) && "id" in o && "title" in o && ("price" in o || "final_price" in o || "spec" in o);
}

/* A product as Selldone sends it (not an offer, a shipping method or a
   variant that happens to carry an id, a title and a price): it names its
   category, its English subtitle or its type. */
function looksLikeProduct(o: any): boolean {
  return isProduct(o) && ("category_id" in o || "title_en" in o || o.type === "PHYSICAL" || o.type === "VIRTUAL" || o.type === "FILE" || o.type === "SERVICE" || o.type === "SUBSCRIPTION");
}

function translateProduct(p: any, d: Dict): void {
  if (p.__kalioLang) return;
  p.__kalioLang = true;
  const spec = p.spec;
  if (spec && typeof spec === "object" && !Array.isArray(spec)) {
    p._spec_en = spec;
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(spec)) out[tr(d, k)] = v === "group" ? v : Array.isArray(v) ? v.map((x) => tr(d, x)) : tr(d, v);
    p.spec = out;
    if (Array.isArray(p.spec_order)) {
      p._spec_order_en = p.spec_order;
      p.spec_order = p.spec_order.map((k: string) => tr(d, k));
    }
  }
  for (const f of ["pros", "cons"]) {
    const o = p[f];
    if (o && typeof o === "object" && !Array.isArray(o)) {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(o)) out[tr(d, k)] = tr(d, v);
      p[f] = out;
    }
  }
  if (Array.isArray(p.ratings)) for (const r of p.ratings) if (r && typeof r.name === "string") r.name = tr(d, r.name);
  if (typeof p.unit === "string" && p.unit) {
    p._unit_en = p.unit;
    p.unit = tr(d, p.unit);
  }
}

/* Selldone's own translations, where an endpoint sends them without using
   them: products/list (the compare page, rails) and the category lists send
   `translations: { es: { title, title_en, description } }` beside the
   English, while products/<id>/info already answers in the language. The
   English stays as _<field>_en. Any language, dictionary or not. */
const NATIVE = ["title", "title_en", "description"];
function applyNative(o: any, lang: string): boolean {
  const t = o.translations;
  const own = t && typeof t === "object" && !Array.isArray(t) ? t[lang] : null;
  if (!own || typeof own !== "object") return false;
  if (o.__kalioNative === lang) return true;
  o.__kalioNative = lang;
  let named = false;
  for (const f of NATIVE) {
    const v = own[f];
    if (typeof v === "string" && v.trim() && typeof o[f] === "string") {
      if (!(`_${f}_en` in o)) o[`_${f}_en`] = o[f];
      o[f] = v;
      if (f === "title") named = true;
    }
  }
  return named;
}

/* The name by the product's id where neither the server nor `translations`
   gave one (ES-03): basket and order lines, and any product the shop has
   not translated yet. The server's own name in the language, when it sent
   one, is the same text (data/<lang>-titles.json is built from it). */
function applyTitle(p: any, titles: Dict, d: Dict | null): void {
  const name = titles[String(p.id)];
  if (typeof name !== "string" || !name.trim() || typeof p.title !== "string" || p.title === name) return;
  if (!("_title_en" in p)) p._title_en = p.title;
  p.title = name;
  /* The English subtitle, when the dictionary knows it. */
  if (d && typeof p.title_en === "string" && p.title_en && d[p.title_en] && !("_title_en_en" in p)) {
    p._title_en_en = p.title_en;
    p.title_en = d[p.title_en];
  }
}

function rememberArticle(p: any, lang: string): void {
  const a = p.article_pack?.article;
  if (a && typeof a === "object" && a.lang === lang && typeof a.body === "string") (articles[lang] ||= new Map()).set(Number(p.id), a);
}

function walk(node: any, d: Dict | null, titles: Dict | null, lang: string, depth = 0): void {
  if (!node || typeof node !== "object" || depth > 8) return;
  if (Array.isArray(node)) {
    for (const n of node) walk(n, d, titles, lang, depth + 1);
    return;
  }
  if (node.article_pack && "id" in node) rememberArticle(node, lang);
  const named = "translations" in node ? applyNative(node, lang) : false;
  if (titles && !named && looksLikeProduct(node)) applyTitle(node, titles, d);
  if (d && isProduct(node)) translateProduct(node, d);
  for (const [k, v] of Object.entries(node)) if (k !== "translations" && v && typeof v === "object") walk(v, d, titles, lang, depth + 1);
}

/** Put any API answer (or a part of one) into `lang` in place: names, spec, pros, units. Waits for the dictionaries. */
export async function localizeData(data: any, lang: string = currentLanguage()): Promise<void> {
  if (!lang || lang === "en" || !data || typeof data !== "object") return;
  await loadShopData(lang);
  const d = dicts[lang];
  const titles = titleFiles.done[lang];
  walk(data, d && Object.keys(d).length ? d : null, titles && Object.keys(titles).length ? titles : null, lang);
}

const PRODUCT_ARTICLE = /\/articles\/product\/(\d+)(?:[/?#]|$)/;

/* gapi's product article in the shop's first language → the article the
   product's own answer carried in the visitor's language (read now if this
   visit has not read that product yet). Display only: nothing is written. */
async function localizeArticle(res: any, lang: string): Promise<void> {
  if (!lang || lang === "en") return;
  const m = String(res?.config?.url || "").match(PRODUCT_ARTICLE);
  if (!m || String(res?.config?.method || "get").toLowerCase() !== "get") return;
  const art = res.data?.article;
  if (!art || typeof art !== "object" || !art.lang || art.lang === lang) return;
  const id = Number(m[1]);
  let own = articles[lang]?.get(id);
  if (!own) {
    try {
      const w = window as any;
      await w.axios.get(w.XAPI.GET_PRODUCT_INFO(w.$storefront.name, id));
      own = articles[lang]?.get(id);
    } catch {
      own = null;
    }
  }
  if (own && own.id !== art.id) res.data.article = { user: art.user, structures: null, ...own };
}

/** Puts the shop's data in the visitor's language in every API response (any language but English). */
export function installShopData(axios: any): void {
  if (!axios?.interceptors?.response) return;
  axios.interceptors.response.use(async (res: any) => {
    try {
      const lang = currentLanguage();
      if (res && res.data && typeof res.data === "object") {
        await localizeData(res.data, lang);
        await localizeArticle(res, lang);
      }
    } catch (e) {
      /* never stop a response over a missing word */
    }
    return res;
  });
  /* Fetch the dictionaries early when the visitor already reads that language. */
  if (currentLanguage() !== "en") loadShopData(currentLanguage());
  localizePreloaded();
}

/**
 * The product Selldone's server writes into a product page's HTML
 * (window.PRE_LOADED_DATA.PRODUCT_PACK) never passes through axios, and it
 * is in the HTML's language (the shop's `initial-language`, English on
 * molino), whatever the visitor picked: its spec, unit, highlights and
 * subtitle showed in English until the page's own request came back (ES-10,
 * "bunch", "At a Glance"). For a visitor in another language the pack is
 * dropped, so the product page waits for that request (it shows its loading
 * state) and draws the product once, in the visitor's language.
 */
export function localizePreloaded(): void {
  try {
    const pre = (window as any).PRE_LOADED_DATA;
    if (!pre?.PRODUCT_PACK) return;
    const lang = currentLanguage();
    const htmlLang = SetupService.GetInitialLanguage() || "en";
    if (lang && lang !== htmlLang) delete pre.PRODUCT_PACK;
  } catch (e) {
    /* keep Selldone's turbo load */
  }
}

/** A shop string (a unit, a spec word) in the visitor's language, once the dictionary is in. */
export function shopText(s: string): string {
  const d = dicts[currentLanguage()];
  return d ? tr(d, s) : s;
}
