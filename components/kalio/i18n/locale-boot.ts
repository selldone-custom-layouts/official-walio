/*
 * The visitor's language from the first moment, and no English while another
 * language loads (ES-10, 11 November 2026: on molino in Spanish the header
 * said "ES · USD" while the page still read "Saved", "Sign in", "Your basket",
 * and a product showed "bunch", "At a Glance", "Freshness & Storage" and its
 * English highlights for seconds before they turned Spanish).
 *
 * Why it happened:
 *  1. Selldone settles the visitor's language late. storefront.ts set
 *     window.$language to English; the saved language (localStorage
 *     `local-shop-<shop>`) was applied only when the shop's info came back
 *     (StorefrontMixin.fetchBasketAndShop → setCurrentLanguage). On a live
 *     shop the page is drawn at once from the shop the HTML carries
 *     (window.shop), so for the first second or more the region package and
 *     the data interceptor (shop-data.ts) took the visitor for English: the
 *     product's own request went out with `x-localization: es` but its spec,
 *     unit and highlights were not translated, and the Layout's Spanish words
 *     were not even asked for until then. On the dev server (no window.shop)
 *     the first shop request went out with no language at all.
 *  2. Three things load lazily for a language and nothing waited for them:
 *     the Layout's words (lang-<code>.ts, kalio-i18n), the shop dictionaries
 *     (data/<code>.json and data/<code>-titles.json, shop-data) and Selldone's
 *     own pack (lang/<code>.ts). Until each arrived its words were English.
 *  3. Selldone's response cache (APIAbstract's LRU, keyed by the address,
 *     not the language) answered a product page from a read made in the
 *     previous language after a pick (.optimize(60) sends no request at all
 *     within a minute), and its product page drew the product the HTML
 *     carries (PRE_LOADED_DATA, in the HTML's language) before its own
 *     request; see shop-data.ts localizePreloaded().
 *  4. The shop the HTML carries (window.shop) is in the HTML's language too
 *     (the shop's initial-language, English on molino): its footer menu read
 *     "Home", "Shop", "Privacy" until the shop's info came back in Spanish
 *     ("Inicio", "Tienda", "Privacidad").
 *
 * What this does:
 *  - bootLocale(), before bootRegion(): takes the saved language as the
 *    visitor's at once (window.$language, the X-Localization header of the
 *    very first request, so shop-data.ts sees it from the first response)
 *    and starts Selldone's pack for it.
 *  - localeReady(lang, store): while a language other than English loads,
 *    at boot or after a pick, <html> carries `k-locale-pending`: the app is
 *    hidden and a small loading ring shows in its place. It ends when the
 *    Layout's words, the shop dictionaries, Selldone's pack and the shop in
 *    that language are in, or after LOCALE_TIMEOUT (3.5 s) so the page never
 *    stays blank; whatever is late then follows as soon as it arrives (the
 *    documented fallback: the English for what is genuinely missing). The
 *    promise resolves as soon as the words are in (not the shop, which the
 *    app itself asks for): storefront.ts mounts the app then, so the first
 *    drawing is already in the language.
 *  - watchLocale(store): after a pick, Selldone's response cache is emptied
 *    (no answer from the old language is reused) and the same gate covers
 *    the switch, until the shop comes back in the new language. Back to
 *    English: no gate (English is bundled), the cache is still emptied.
 *  - onLocaleChange(fn): for a Layout module that keeps reads for the visit
 *    (an order list, a seller's shelf): read again after a pick.
 */
import { watch } from "vue";
import { Language } from "@selldone/core-js/enums/language/Language";
import { CleanCache } from "@selldone/core-js/server/APIAbstract";
import { SetupService } from "@selldone/core-js/server/SetupService";
import { i18n, loadLanguageAsyncShop } from "../../../lang/i18n_shop";
import { currentLanguage, regionState } from "../../region-switcher/region";
import { loadLanguage } from "./kalio-i18n";
import { loadShopData } from "./shop-data";

declare const window: any;

/** How long a language may keep the page hidden before it shows anyway. */
export const LOCALE_TIMEOUT = 3500;
const PENDING = "k-locale-pending";

/* The loading ring's name for screen readers, in the language being loaded
   (its own words are what is loading). */
const LOADING: Record<string, string> = {
  en: "Loading…",
  es: "Cargando…",
  fr: "Chargement…",
  da: "Indlæser…",
  ar: "جارٍ التحميل…",
  pa: "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…",
};

function selldoneLocale(): string {
  const l: any = (i18n.global as any).locale;
  return typeof l === "string" ? l : l?.value;
}

function setSelldoneLocale(lang: string): void {
  const g: any = i18n.global;
  if (g.locale && typeof g.locale === "object" && "value" in g.locale) g.locale.value = lang;
  else g.locale = lang;
}

/**
 * Call in storefront.ts after StorefrontSDK.Setup() and before bootRegion().
 * Returns the visitor's language. A saved language Selldone knows is taken
 * at once (Selldone checks it against the shop's languages when the shop
 * arrives, as before, and falls back to the shop's own when it is not
 * offered); without one nothing changes (Selldone's initial-language meta,
 * then the shop's language).
 */
export function bootLocale(): string {
  let code: string | null = null;
  try {
    code = window.$storefront?.database?.language?.getLanguage()?.code || null;
  } catch {
    code = null;
  }
  if (!code || !(Language as any)[code]) return window.$language?.code || "en";
  const language = (Language as any)[code];
  window.$language = language;
  try {
    window.axios.defaults.headers.common["X-Localization"] = language.locale || code;
  } catch {
    /* the header follows when Selldone sets the language */
  }
  if (code !== "en")
    loadLanguageAsyncShop(code, (l: string) => setSelldoneLocale(l)).catch((e: any) => console.error(`locale: Selldone's "${code}" pack`, e));
  return code;
}

/* Resolves when Selldone's own words are in `lang` (its pack loaded and set). */
function selldoneReady(lang: string): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    let stop: (() => void) | null = null;
    stop = watch(
      selldoneLocale,
      (v) => {
        if (done || v !== lang) return;
        done = true;
        resolve();
        stop?.();
      },
      { immediate: true },
    );
    if (done) stop();
  });
}

/* Resolves when the store holds a shop other than `skip`: the shop as the
   server sends it for the request's language (fetchBasketAndShop). */
function shopAfter(store: any, skip: any): Promise<void> {
  if (!store?.watch) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    let stop: (() => void) | null = null;
    stop = store.watch(
      (_s: any, g: any) => g.getShop,
      (shop: any) => {
        if (done || !shop || shop === skip) return;
        done = true;
        resolve();
        stop?.();
      },
    );
  });
}

let token = 0;

function style(): void {
  if (document.getElementById("k-locale-style")) return;
  const css = document.createElement("style");
  css.id = "k-locale-style";
  css.textContent = `
html.${PENDING} #app { visibility: hidden !important; }
.k-locale-wait { position: fixed; inset: 0; z-index: 1900; display: grid; place-items: center; background: var(--k-paper, #fff); }
html:not(.${PENDING}) .k-locale-wait { display: none; }
.k-locale-wait__ring { width: 36px; height: 36px; border-radius: 50%; border: 3px solid var(--k-green-soft, #e9f3ed); border-top-color: var(--k-green, #155b42); animation: k-locale-spin .8s linear infinite; }
.k-locale-wait__label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@keyframes k-locale-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .k-locale-wait__ring { animation: none; border-color: var(--k-green, #155b42); opacity: .5; } }
`;
  document.head.appendChild(css);
}

function showWait(lang: string): void {
  style();
  let wait = document.querySelector(".k-locale-wait") as HTMLElement | null;
  if (!wait) {
    wait = document.createElement("div");
    wait.className = "k-locale-wait";
    wait.setAttribute("role", "status");
    wait.innerHTML = '<span class="k-locale-wait__ring" aria-hidden="true"></span><span class="k-locale-wait__label"></span>';
    document.body.appendChild(wait);
  }
  const label = wait.querySelector(".k-locale-wait__label");
  if (label) label.textContent = LOADING[lang] || LOADING.en;
  wait.setAttribute("lang", lang);
  document.documentElement.classList.add(PENDING);
  document.getElementById("app")?.setAttribute("aria-busy", "true");
}

function hideWait(): void {
  document.documentElement.classList.remove(PENDING);
  document.getElementById("app")?.removeAttribute("aria-busy");
}

/**
 * Hold the page while `lang` loads: the Layout's words, the shop
 * dictionaries, Selldone's pack and, with `store`, the shop as the server
 * sends it in that language (the next shop the store receives other than
 * `skipShop`). The ring goes when all are in or after LOCALE_TIMEOUT. The
 * promise resolves when the words are in (or at the timeout): mount the app
 * then. English (bundled) resolves at once.
 */
export function localeReady(lang: string = currentLanguage(), store?: any, skipShop: any = undefined): Promise<void> {
  const mine = ++token;
  if (!lang || lang === "en") {
    hideWait();
    return Promise.resolve();
  }
  showWait(lang);
  const late = new Promise<string>((resolve) => setTimeout(() => resolve("timeout"), LOCALE_TIMEOUT));
  const words = Promise.all([loadLanguage(lang), loadShopData(lang), selldoneReady(lang)]).then(() => "ready");
  const shop = store ? shopAfter(store, skipShop) : Promise.resolve();
  Promise.race([Promise.all([words, shop]).then(() => "ready"), late]).then((how) => {
    if (how === "timeout") console.warn(`locale: "${lang}" still loading after ${LOCALE_TIMEOUT} ms; showing the page`);
    if (mine === token) hideWait();
  });
  return Promise.race([words, late]).then(() => undefined);
}

/**
 * At boot: hold the page until `lang` is in. The shop the HTML carries
 * (window.shop) is in the HTML's language (Selldone's initial-language
 * meta); when the visitor reads another, or the HTML carries none (the dev
 * server), the ring also waits for the shop the app asks for.
 */
export function bootLocaleGate(lang: string, store: any): Promise<void> {
  const embedded = window.shop;
  const htmlLang = SetupService.GetInitialLanguage() || "en";
  const waitShop = !embedded || lang !== htmlLang;
  return localeReady(lang, waitShop ? store : undefined, embedded);
}

const listeners = new Set<(lang: string, old: string) => void>();

/** Run `fn` after every language pick (not at boot). Returns a function that stops it. */
export function onLocaleChange(fn: (lang: string, old: string) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Call once after bootRegion(): a language pick empties Selldone's response
 * cache, tells onLocaleChange() listeners and holds the page while the new
 * language loads (with `store`, until the shop comes back in it).
 */
export function watchLocale(store?: any): void {
  let last = currentLanguage();
  watch(
    () => regionState.language,
    (lang) => {
      if (!lang || lang === last) return;
      const old = last;
      last = lang;
      CleanCache();
      for (const fn of listeners)
        try {
          fn(lang, old);
        } catch (e) {
          console.error("locale: a listener failed", e);
        }
      localeReady(lang, store, store?.getters?.getShop).then(() => CleanCache());
    },
  );
}
