/*
 * Country names in the visitor's language (ES-04, 11 November 2026).
 *
 * An address keeps its country as an ISO 3166-1 alpha-2 code ("ES"); only
 * the name shown for it changes. Selldone names countries from its
 * `countries.*` messages, which exist in English and Persian only, so a
 * Spanish shopper read "Spain", "Germany", "United States of America" in
 * the address sheet's list and under the order's address. The browser
 * knows every region's name in every language (Intl.DisplayNames), so the
 * name comes from there, in region's currentLanguage(); Selldone's English
 * name, then the code, are the fallbacks. Nothing here changes a stored
 * code, which countries the shop ships to, or how an address is checked.
 *
 * Buyer-written text (street, city, county) is never passed through here.
 */
import { Countries } from "@selldone/core-js/models/general/country/country.model";
import { getCountryName } from "@selldone/core-js/models/general/country/country-helper";
import { currentLanguage } from "../../region-switcher/region";
import { MapHelper } from "@selldone/core-js/helper/map/MapHelper";

const namers = new Map<string, Intl.DisplayNames | null>();

function namer(lang: string): Intl.DisplayNames | null {
  if (!namers.has(lang)) {
    let dn: Intl.DisplayNames | null = null;
    try {
      dn = new Intl.DisplayNames([lang, "en"], { type: "region", fallback: "none" });
    } catch {
      dn = null;
    }
    namers.set(lang, dn);
  }
  return namers.get(lang) || null;
}

/** "ES" → "España" (es), "Spain" (en), "إسبانيا" (ar). The code itself when nothing knows it;
 *  anything that is not a two-letter code (a name already) as it is. */
export function countryName(code: string | null | undefined, lang: string = currentLanguage()): string {
  if (!code) return "";
  const raw = String(code).trim();
  if (!/^[A-Za-z]{2}$/.test(raw)) return raw;
  const c = raw.toUpperCase();
  try {
    const name = namer(lang)?.of(c);
    if (name && name !== c) return name;
  } catch {
    /* not a region code the browser accepts */
  }
  return getCountryName(c) || c;
}

/** Selldone's one-line address (MapHelper.GenerateFullAddressFromMapInfo) with
 *  the country named in the visitor's language: "…, Madrid, España", not
 *  "…, Madrid, ES" (the cart's billing line in the owner's Spanish test order,
 *  12 November 2026). */
export function addressLine(info: any, lang: string = currentLanguage()): string | null {
  if (!info) return null;
  return MapHelper.GenerateFullAddressFromMapInfo({ ...info, country: info.country ? countryName(info.country, lang) : info.country });
}

export interface CountryOption {
  code: string;
  name: string;
}

/**
 * The countries to pick from, named and sorted in the visitor's language
 * ("Alemania" before "España" in Spanish). `allowed`: the shop's
 * countries (codes or {code|alpha2}); every country when empty.
 */
export function countryOptions(allowed?: Array<string | { code?: string; alpha2?: string }> | null, lang: string = currentLanguage()): CountryOption[] {
  let list = Countries.map((c) => c.code).filter(Boolean) as string[];
  if (allowed?.length) {
    const keep = new Set(allowed.map((c) => String(typeof c === "string" ? c : c.code || c.alpha2 || "").toUpperCase()));
    list = list.filter((code) => keep.has(code.toUpperCase()));
  }
  let collator: Intl.Collator | null = null;
  try {
    collator = new Intl.Collator(lang, { sensitivity: "base" });
  } catch {
    collator = null;
  }
  return list
    .map((code) => ({ code, name: countryName(code, lang) }))
    .sort((a, b) => (collator ? collator.compare(a.name, b.name) : a.name.localeCompare(b.name, lang)));
}

/**
 * Every country's name in one language, as Selldone's `countries` messages
 * hold them ({ ES: "España", … }). Selldone's own components name a
 * country with $t("countries.<code>") and fall back to the English pack;
 * the language packs in lang/ that ship without a countries section take
 * this one, so the billing form's country list follows the language too.
 */
export function countryMessages(lang: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of Countries) {
    if (!c.code) continue;
    const name = countryName(c.code, lang);
    if (name && name !== c.code) out[c.code] = name;
  }
  return out;
}
