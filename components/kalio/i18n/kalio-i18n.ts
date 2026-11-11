/*
 * Kalio i18n: the Layout's own words in the visitor's language (the owner,
 * 10 November 2026: "after a language pick, every word the Layout writes is
 * in that language"). Product data, brand names and Selldone's own strings
 * are not ours and are never passed through here.
 *
 * Copy this file to components/kalio/i18n/kalio-i18n.ts (unchanged). It
 * sits on the region switcher (components/region-switcher/region.ts): the
 * visitor's language is region's currentLanguage(), and every dictionary
 * loaded here is also handed to region's defineMessages(), so the pill's
 * and the sheet's own words (region.*) translate too.
 *
 *   t("cart.empty", "Your basket is empty")               a word
 *   t("cart.items", { one: "{n} item", other: "{n} items" }, { n })   a count
 *   t("pdp.by", "Sold by {name}", { name })               a placeholder
 *
 * The English is written at the call site, so the code reads as before and
 * a key missing from a language falls back to it. tools/i18n-extract.cjs
 * builds en.ts from these calls; every other language file has the same
 * keys. A count picks its form with Intl.PluralRules for the language
 * (Arabic has zero/one/two/few/many/other; English one/other): the key is
 * "<key>.<form>", then "<key>.other", then the English forms.
 *
 * Languages load lazily: bootI18n({ ar: () => import("./lang-ar"), … })
 * with one entry per language the Layout ships; a language's file is
 * fetched only when a visitor picks it. On every change <html> gets lang
 * and dir (Selldone never sets dir), and the script's font is requested
 * (Noto Sans Arabic / Gurmukhi / Devanagari) only when that script is used.
 */
import { reactive, watch } from "vue";
import { currentLanguage, defineMessages, isRtl, regionState } from "../../region-switcher/region";

type Dict = Record<string, string>;
type Loader = () => Promise<{ default: Dict } | Dict>;
type English = string | Partial<Record<Intl.LDMLPluralRule, string>>;

const store = reactive<{ dicts: Record<string, Dict>; version: number }>({ dicts: {}, version: 0 });
let loaders: Record<string, Loader> = {};
const loading = new Map<string, Promise<void>>();

/* Scripts that need a font the Layout's Latin face does not have. */
const SCRIPT_FONTS: Record<string, string> = {
  ar: "Noto+Sans+Arabic:wght@400..700",
  fa: "Noto+Sans+Arabic:wght@400..700",
  ur: "Noto+Sans+Arabic:wght@400..700",
  pa: "Noto+Sans+Gurmukhi:wght@400..700",
  hi: "Noto+Sans+Devanagari:wght@400..700",
  mr: "Noto+Sans+Devanagari:wght@400..700",
};

function fill(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(typeof v === "number" ? formatNumber(v) : String(v));
  return s;
}

/** The visitor's locale for numbers and dates ("en" → "en-US"). */
export function locale(lang: string = currentLanguage()): string {
  return lang === "en" ? "en-US" : lang;
}

/** A number in the visitor's locale (digits as the language writes them). */
export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(locale(), options).format(n);
  } catch {
    return String(n);
  }
}

/** A date in the visitor's locale. */
export function formatDate(d: Date | string | number, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  try {
    return new Intl.DateTimeFormat(locale(), options).format(new Date(d));
  } catch {
    return String(d);
  }
}

/** The Layout's word for `key` in the visitor's language. Reactive. */
export function t(key: string, en?: English | Record<string, string | number>, vars?: Record<string, string | number>): string {
  void store.version; // redraw when a language file arrives
  // t(key, vars) without an English source (older call sites)
  if (en && typeof en === "object" && !vars && !isForms(en)) {
    vars = en as Record<string, string | number>;
    en = undefined;
  }
  const lang = currentLanguage();
  const dict = store.dicts[lang] || {};
  const base = store.dicts.en || {};
  if (en && typeof en === "object") {
    const n = Number(vars?.n ?? vars?.count ?? 0);
    let form: string = "other";
    try {
      form = new Intl.PluralRules(locale(lang)).select(n);
    } catch {}
    const enForm = new Intl.PluralRules("en-US").select(n);
    const s =
      dict[`${key}.${form}`] ?? dict[`${key}.other`] ?? base[`${key}.${enForm}`] ?? (en as any)[enForm] ?? (en as any).other ?? key;
    return fill(s, vars);
  }
  return fill(dict[key] ?? base[key] ?? (en as string) ?? key, vars);
}

function isForms(o: object): boolean {
  return ["one", "other", "zero", "two", "few", "many"].some((k) => k in o) && Object.values(o).every((v) => typeof v === "string");
}

/** Make sure a language's words are here (fetched once, on demand). */
export function loadLanguage(lang: string): Promise<void> {
  if (store.dicts[lang] || !loaders[lang]) return Promise.resolve();
  if (!loading.has(lang)) {
    loading.set(
      lang,
      loaders[lang]()
        .then((mod: any) => {
          store.dicts[lang] = mod.default || mod;
          defineMessages({ ...store.dicts });
          store.version++;
        })
        .catch((e) => {
          console.error(`i18n: could not load "${lang}"`, e);
          loading.delete(lang);
        }),
    );
  }
  return loading.get(lang)!;
}

function applyDocument(lang: string) {
  const html = document.documentElement;
  html.setAttribute("lang", lang);
  html.setAttribute("dir", isRtl(lang) ? "rtl" : "ltr");
  const family = SCRIPT_FONTS[lang];
  if (family) {
    const href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
    if (!document.head.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }
}

/**
 * Boot once, after bootRegion(): `en` is the Layout's English (bundled), the
 * loaders fetch the other languages when picked.
 */
export function bootI18n(en: Dict, languageLoaders: Record<string, Loader>): void {
  store.dicts.en = en;
  loaders = languageLoaders;
  defineMessages({ ...store.dicts });
  const sync = () => {
    const lang = currentLanguage();
    applyDocument(lang);
    loadLanguage(lang);
  };
  sync();
  watch(() => regionState.language, sync);
}

/** For templates: app.config.globalProperties.t = t (see README). */
export const i18nGlobals = { t, formatNumber, formatDate };
