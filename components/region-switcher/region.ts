/*
 * Region switcher: the visitor's language and currency, the Selldone way.
 *
 * Copied unchanged into every Layout (components/region-switcher/). Nothing
 * here knows a Layout's name; words come from the Layout's messages file
 * (defineMessages) and a few options from bootRegion().
 *
 * Currency, as Selldone's own storefront does it (UCurrencySelector +
 * StorefrontMixin.onChangeUserSelectedCurrency):
 *   - the visitor's currency is window.$storefront.currency (the storefront
 *     SDK's getter/setter over its CurrencyDatabase: localStorage key
 *     StorefrontLocalStorages.GetUserCurrencyPath("shop/@<name>/") and
 *     TrackConfig.SetCurrency). It is what CurrencyHelper.GetUserSelectedCurrency
 *     and the CurrencyMixin (GetUserSelectedCurrency) read, so Selldone's
 *     u-price, product prices, cart, checkout and gateways all follow it;
 *   - picking one: window.$storefront.currency = code, then the global mixin's
 *     onChangeUserSelectedCurrency() (StorefrontMixin): it tells the server
 *     (window.$storefront.user.setUserCurrency, guest or signed in), refetches
 *     the baskets and the shop (fetchBasketAndShop: the cart comes back in
 *     the new currency) and the coupons and offers. When the shop comes back,
 *     StorefrontApp's :key (unique_key_shop = shop-currency-language) changes
 *     and the whole app redraws in the new currency;
 *   - rates: shop.shop_exchange_rates, read by PriceHelper.getBuyRateValue
 *     (direct, else reverse; null when the shop has no rate).
 * regionState mirrors the code reactively, so this package's money() redraws
 * at once, before the server answers.
 *
 * Language: ShopOptionsHelper.GetLanguages(shop) (+ shop.language) and the
 * global mixin's setCurrentLanguage(code, true) (StorefrontMixin: loads the
 * pack, X-Localization header, saves in the storefront database, Vuetify RTL
 * through the linked i18n; the app's :key changes with the language).
 * Selldone never sets <html dir>: RTL reaches only what is inside v-app, so
 * this package's teleported panels take dir from isRtl() themselves.
 */
import { computed, reactive } from "vue";
import { Currency } from "@selldone/core-js/enums/payment/Currency";
import { Language } from "@selldone/core-js/enums/language/Language";
import { PriceHelper } from "@selldone/core-js/helper/price/PriceHelper";
import { ShopOptionsHelper } from "@selldone/core-js/helper/shop/ShopOptionsHelper";
import { SetupService } from "@selldone/core-js/server/SetupService";

export interface RegionOptions {
  /** Number format locale: "language" (the visitor's language, en-US for
   *  English) or a fixed BCP 47 tag. */
  numberLocale?: "language" | string;
  /** How the currency shows in money(): "symbol" ("$1.00", "DKK 1.00", "€1.00")
   *  or "code" ("USD 1.00"). */
  currencyDisplay?: "symbol" | "code" | "narrowSymbol";
  /** Show the language chips only when the shop has at least this many. */
  minLanguages?: number;
  /** The Layout's own writer for an amount, so this package's money matches
   *  the prices Selldone's components draw beside it (u-price: "$26.42" in
   *  every language). Without it: Intl in numberLocale ("26,42 US$" in
   *  Spanish next to u-price's "$26.42", the owner's Spanish test order,
   *  12 November 2026). */
  format?: ((amount: number, code: string, decimals: number) => string) | null;
}

const DEFAULTS: Required<RegionOptions> = { numberLocale: "language", currencyDisplay: "symbol", minLanguages: 2, format: null };

/* The package's own words, in English. A Layout overrides them (and adds
   other languages) through defineMessages(). */
const OWN: Record<string, string> = {
  "region.title": "Language & currency",
  "region.language": "Language",
  "region.currency": "Currency",
  "region.done": "Done",
  "region.close": "Close",
  "region.note": "Prices everywhere change at once: cards, filters, cart and checkout.",
};

const RTL = new Set(["ar", "fa", "he", "ur", "ps", "ckb", "ku"]);

const state = reactive({ currency: "", language: "", booted: false, words: 0 });
let opts: Required<RegionOptions> = { ...DEFAULTS };
let store: any = null;
let messages: Record<string, Record<string, string>> = { en: { ...OWN } };

/** Read-only view of the visitor's choice; components may watch it. */
export const regionState = state as Readonly<typeof state>;

/* ━━━━━━━━━━━━ Boot ━━━━━━━━━━━━ */

/** Call once in storefront.ts, after the storefront SDK is set up:
 *  bootRegion(store, { ... }). store is the app's Vuex store. */
export function bootRegion(vuexStore: any, options: RegionOptions = {}): void {
  store = vuexStore;
  opts = { ...DEFAULTS, ...options };
  syncFromSelldone();
  state.booted = true;
  /* Selldone may change the currency itself when the shop arrives (a stored
     code the shop no longer offers falls back to the shop's first). */
  try {
    store?.watch?.(
      (_s: any, g: any) => g.getShop,
      () => syncFromSelldone(),
    );
  } catch {
    /* no store watch: the components sync on mount */
  }
}

/** Take the code from Selldone's own state. */
export function syncFromSelldone(): void {
  const code = (window as any).$storefront?.currency?.code;
  if (code && code !== state.currency) state.currency = code;
  const lang = (window as any).$language?.code;
  if (lang && lang !== state.language) state.language = lang;
}

function shop(): any {
  return store?.getters?.getShop || null;
}

/* ━━━━━━━━━━━━ Currency ━━━━━━━━━━━━ */

export interface RegionCurrency {
  code: string;
  /** The short sign for the chip: "$", "kr", "€", "A$", "د.إ". */
  sign: string;
}

/** The shop's currencies, in the merchant's order (shop.currencies). */
export function currencies(): RegionCurrency[] {
  const codes: string[] = (shop()?.currencies || []).filter((c: string) => (Currency as any)[c]?.enable !== false && (Currency as any)[c]);
  return codes.map((code) => ({ code, sign: signOf(code) }));
}

/** The visitor's currency code (reactive). */
export function currentCurrency(): string {
  if (!state.currency) syncFromSelldone();
  return state.currency || baseCurrency();
}

/** The currency the shop's own amounts are in when an amount carries none:
 *  the shop's default currency (Selldone's meta), else its first. */
export function baseCurrency(): string {
  const s = shop();
  return s?.currency || SetupService.DefaultCurrency() || s?.currencies?.[0] || "USD";
}

/** Pick a currency. vm: the calling component (any component has the
 *  global StorefrontMixin, whose onChangeUserSelectedCurrency does the rest). */
export function setCurrency(code: string, vm?: any): void {
  if (!code || !(Currency as any)[code] || code === state.currency) return;
  const sf = (window as any).$storefront;
  if (sf) sf.currency = code; // Selldone: localStorage + TrackConfig
  state.currency = code;
  try {
    if (vm && typeof vm.onChangeUserSelectedCurrency === "function") vm.onChangeUserSelectedCurrency();
  } catch (e) {
    console.error("region: onChangeUserSelectedCurrency failed", e);
  }
}

/** The shop's rate from one currency to another (null when it has none). */
export function rateOf(from: string, to: string = currentCurrency()): number | null {
  if (!from || !to || from === to) return 1;
  const s = shop();
  if (!s) return null;
  try {
    return PriceHelper.getBuyRateValue(s, from as any, to as any) || null;
  } catch {
    return null;
  }
}

/** An amount in `from`, in the visitor's currency (or `to`); null when the
 *  shop has no rate for the pair. */
export function convert(amount: number, from: string = baseCurrency(), to: string = currentCurrency()): number | null {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  const r = rateOf(from, to);
  return r == null ? null : n * r;
}

function locale(): string {
  if (opts.numberLocale !== "language") return opts.numberLocale;
  const lang = state.language || (window as any).$language?.code || "en";
  if (lang === "en") return "en-US";
  return (Language as any)[lang]?.full_locale || "en-US";
}

/** How short: true drops the decimals (rounds: "Up to $120 off", "From $35");
 *  "auto" drops them only when the amount is whole ("Save $60", "Save $12.50"). */
export type MoneyShort = boolean | "auto";

/** Format an amount already in `code`: "$1,059.90", "DKK 6,359.40", "€950". */
export function formatMoney(amount: number, code: string = currentCurrency(), options: { short?: MoneyShort } = {}): string {
  const n = Number(amount) || 0;
  const short = options.short === "auto" ? Math.abs(n - Math.round(n)) < 0.005 : !!options.short;
  const floats = short ? 0 : ((Currency as any)[code]?.floats ?? 2);
  let out: string;
  try {
    if (opts.format) out = opts.format(n, code, floats);
    else out = new Intl.NumberFormat(locale(), {
      style: "currency",
      currency: code,
      currencyDisplay: opts.currencyDisplay,
      minimumFractionDigits: floats,
      maximumFractionDigits: floats,
    }).format(n);
  } catch {
    out = `${code} ${n.toFixed(floats)}`;
  }
  /* In a right-to-left language an amount is one left-to-right piece inside
     the sentence (LRI … PDI); otherwise the bidi algorithm splits "US$" around
     the number ("$US 589"). */
  return isRtl() ? `\u2066${out.replace(/[\u200e\u200f\u061c]/g, "")}\u2069` : out;
}

/** THE money helper: `amount` is in `from` (default: the shop's base
 *  currency); it is shown in the visitor's currency, converted with the
 *  shop's rates. Without a rate it shows honestly in its own currency. */
export function money(amount: number, from: string = baseCurrency(), options: { short?: MoneyShort } = {}): string {
  const to = currentCurrency();
  const v = convert(amount, from || baseCurrency(), to);
  return v == null ? formatMoney(amount, from, options) : formatMoney(v, to, options);
}

/** The currency's sign for chips and the price filter's boxes. */
export function signOf(code: string): string {
  const fmt = (display: string) => {
    try {
      const part = new Intl.NumberFormat("en-US", { style: "currency", currency: code, currencyDisplay: display as any })
        .formatToParts(0)
        .find((p) => p.type === "currency");
      return part?.value || "";
    } catch {
      return "";
    }
  };
  const sym = fmt("symbol");
  if (sym && sym !== code) return sym;
  const narrow = fmt("narrowSymbol");
  if (narrow && narrow !== code && narrow !== "$") return narrow;
  return (Currency as any)[code]?.unicode || narrow || code;
}

/** For components: everything above, plus a computed code. */
export function useMoney() {
  return { money, convert, formatMoney, rateOf, signOf, currency: computed(() => currentCurrency()), base: computed(() => baseCurrency()) };
}

/* ━━━━━━━━━━━━ Language ━━━━━━━━━━━━ */

export interface RegionLanguage {
  code: string;
  /** In its own language: "English", "Dansk", "العربية". */
  title: string;
  rtl: boolean;
}

/** The shop's languages (Selldone's ShopOptionsHelper.GetLanguages, with the
 *  shop's own language first). */
export function languages(): RegionLanguage[] {
  const s = shop();
  if (!s) return [];
  let codes: string[] = [];
  try {
    codes = ShopOptionsHelper.GetLanguages(s) || [];
  } catch {
    codes = [];
  }
  if (s.language && !codes.includes(s.language)) codes = [s.language, ...codes];
  return codes
    .filter((c) => (Language as any)[c])
    .map((code) => ({ code, title: (Language as any)[code].title || code, rtl: RTL.has(code) || (Language as any)[code].dir === "rtl" }));
}

export function currentLanguage(): string {
  if (!state.language) syncFromSelldone();
  return state.language || shop()?.language || "en";
}

/** Whether the visitor's language reads right to left (for teleported panels). */
export function isRtl(code: string = currentLanguage()): boolean {
  return RTL.has(code) || (Language as any)[code]?.dir === "rtl";
}

/* What a language needs before it takes over (the Layout's words for it).
   Without it the sheet kept "Language & currency" in English after Español
   was picked, while the words loaded (the owner's Spanish test order,
   12 November 2026). Waits PREPARE_WAIT at most. */
const PREPARE_WAIT = 2500;
let prepare: ((code: string) => Promise<unknown>) | null = null;

/** The Layout hands what to fetch before a language takes over:
 *  prepareLanguage((code) => loadLanguage(code)). */
export function prepareLanguage(fn: (code: string) => Promise<unknown>): void {
  prepare = fn;
}

/** Pick a language: Selldone's setCurrentLanguage(code, true) on the global
 *  mixin (pack, header, storage, Vuetify RTL), once prepareLanguage's words
 *  are in. */
export async function setLanguage(code: string, vm?: any): Promise<void> {
  if (!code || code === state.language) return;
  if (prepare) {
    try {
      await Promise.race([prepare(code), new Promise((done) => setTimeout(done, PREPARE_WAIT))]);
    } catch {
      /* the words come later: t() redraws when they do */
    }
  }
  state.language = code;
  try {
    if (vm && typeof vm.setCurrentLanguage === "function") await vm.setCurrentLanguage(code, true);
  } catch (e) {
    console.error("region: setCurrentLanguage failed", e);
  }
}

/* ━━━━━━━━━━━━ Pills and rows ━━━━━━━━━━━━ */

/** Whether to show any switcher: more than one currency or language. */
export function hasChoice(): boolean {
  return currencies().length > 1 || showLanguages();
}

/** Whether the language chips show (the shop has minLanguages or more). */
export function showLanguages(): boolean {
  return languages().length >= opts.minLanguages;
}

/** "EN · DKK", or "DKK" with one language. */
export function regionLabel(): string {
  const cur = currentCurrency();
  return showLanguages() ? `${currentLanguage().toUpperCase()} · ${cur}` : cur;
}

/* ━━━━━━━━━━━━ The Layout's own words (i18n) ━━━━━━━━━━━━ */

/** Register the Layout's messages: { en: {...}, da: {...} }. English first;
 *  a language without a key falls back to English, then to the key. */
export function defineMessages(dict: Record<string, Record<string, string>>): void {
  const out: Record<string, Record<string, string>> = { en: { ...OWN } };
  for (const [lang, m] of Object.entries(dict || {})) out[lang] = { ...(out[lang] || {}), ...m };
  messages = out;
  state.words++; // redraw every t() that was drawn before these words arrived
}

/** A word in the visitor's language: t("header.account"), t("cart.items", { n: 3 }). Reactive. */
export function t(key: string, vars?: Record<string, string | number>): string {
  void state.words;
  const lang = currentLanguage();
  let s = messages[lang]?.[key] ?? messages.en?.[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
