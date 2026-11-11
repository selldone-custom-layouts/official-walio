/* Walio — the filters of a listing, read from Selldone's own filter record.

   An aisle's record (`parent.filters`, or `shop.filters` on the whole
   catalogue) holds:
     prices        [{ currency, min, max }]
     brands        ["…"]
     volumes, weights, packs, colors, styles, types   (variant values)
     <spec key>    ["…"]   one per spec key the merchant listed
     ignore        ["price", "discount", "original"]
   and the listing takes a filter in the shape SCategoryFilter emits:
     { only_is_original, only_has_discount, prices: { USD: [lo, hi] } | null,
       brands: [], selected_spec: { Key: [v] }, selected_variants: { volumes: [v] } }
   Pills in one group are OR, groups are AND (Selldone's own rule).

   The words are shown in the visitor's language (ES-06, 11 November 2026):
   a spec key ("Type") and its values ("Fruit") are the shop's own English
   words, so the group's `label` and valueLabel() pass them through
   shopText() (the shop dictionary, data/<lang>.json). Only what is drawn
   changes: the group's `key` and its `values` stay the shop's words, and
   they are what goes to the server and into the address, so "Fruta" and
   "Fruit" send the same selected_spec. */

import { t } from "../../kalio/i18n/kalio-i18n";
import { shopText } from "../../kalio/i18n/shop-data";

export interface WalioGroup {
  /** "spec" groups live in selected_spec, "variant" ones in selected_variants. */
  kind: "spec" | "variant" | "brand";
  key: string;
  label: string;
  values: string[];
}

export interface WalioFilter {
  only_is_original?: boolean;
  only_has_discount?: boolean;
  prices?: Record<string, number[]> | null;
  brands?: string[];
  selected_spec?: Record<string, string[]>;
  selected_variants?: Record<string, string[]>;
}

/* Read when drawn, so they follow the visitor's language. */
const VARIANT_LABEL: Record<string, () => string> = {
  volumes: () => t("walio.filters.size", "Size"),
  weights: () => t("walio.filters.weight", "Weight"),
  packs: () => t("walio.filters.pack", "Pack"),
  colors: () => t("walio.filters.color", "Color"),
  styles: () => t("walio.filters.style", "Style"),
  types: () => t("walio.filters.kind", "Kind"),
};
const RESERVED = ["prices", "brands", "ignore"];

function list(value: any): string[] {
  if (!value) return [];
  const out = Array.isArray(value) ? value : Object.values(value);
  return out.filter(Boolean).map(String);
}

/** Every group a shopper can narrow by, in the order Walio shows them:
 *  the sizes first (what a grocery shopper reaches for), then the
 *  merchant's spec keys in their own order, then the brands. */
export function groupsOf(filters: any): WalioGroup[] {
  if (!filters) return [];
  const out: WalioGroup[] = [];
  for (const key of Object.keys(VARIANT_LABEL)) {
    const values = list(filters[key]);
    if (values.length) out.push({ kind: "variant", key, label: VARIANT_LABEL[key](), values });
  }
  for (const key of Object.keys(filters)) {
    if (RESERVED.includes(key) || VARIANT_LABEL[key]) continue;
    const values = list(filters[key]);
    if (values.length) out.push({ kind: "spec", key, label: shopText(key), values });
  }
  const brands = list(filters.brands);
  if (brands.length > 1) out.push({ kind: "brand", key: "brands", label: t("walio.filters.brand", "Brand"), values: brands });
  return out;
}

/** The values picked in one group. */
export function picked(filter: WalioFilter | null, group: WalioGroup): string[] {
  if (!filter) return [];
  if (group.kind === "brand") return filter.brands || [];
  if (group.kind === "variant") return filter.selected_variants?.[group.key] || [];
  return filter.selected_spec?.[group.key] || [];
}

/** A copy of the filter with one group's values replaced. */
export function withGroup(filter: WalioFilter | null, group: WalioGroup, values: string[]): WalioFilter {
  const next = clone(filter);
  if (group.kind === "brand") next.brands = [...values];
  else if (group.kind === "variant") next.selected_variants = { ...(next.selected_variants || {}), [group.key]: [...values] };
  else next.selected_spec = { ...(next.selected_spec || {}), [group.key]: [...values] };
  return next;
}

export function clone(filter: WalioFilter | null): WalioFilter {
  const f = filter || {};
  return {
    only_is_original: !!f.only_is_original,
    only_has_discount: !!f.only_has_discount,
    prices: f.prices ? JSON.parse(JSON.stringify(f.prices)) : null,
    brands: [...(f.brands || [])],
    selected_spec: JSON.parse(JSON.stringify(f.selected_spec || {})),
    selected_variants: JSON.parse(JSON.stringify(f.selected_variants || {})),
  };
}

/** How many narrowing choices are on (each picked value and each switch). */
export function countOn(filter: WalioFilter | null): number {
  if (!filter) return 0;
  let n = 0;
  if (filter.only_has_discount) n++;
  if (filter.prices && Object.keys(filter.prices).length) n++;
  n += (filter.brands || []).length;
  for (const v of Object.values(filter.selected_spec || {})) n += (v || []).length;
  for (const v of Object.values(filter.selected_variants || {})) n += (v || []).length;
  return n;
}

/** The filter the address carries (?filter=…), if any. */
export function fromRoute(query: any): WalioFilter | null {
  try {
    return query?.filter ? JSON.parse(query.filter) : null;
  } catch {
    return null;
  }
}

/** A value as the shopper reads it: Selldone stores a variant's picture
 *  after a "|" in the value itself; the shop's word in the visitor's
 *  language (display only, the value itself is what is sent). */
export function valueLabel(value: string): string {
  return shopText(String(value).split("|")[0].trim());
}

export const SORTS = [
  { val: "bestselling", get name() { return t("walio.sort.bestselling", "Best selling"); } },
  { val: "newest", get name() { return t("walio.sort.newest", "Newest"); } },
  { val: "cheapest", get name() { return t("walio.sort.cheapest", "Price: low to high"); } },
  { val: "most_expensive", get name() { return t("walio.sort.expensive", "Price: high to low"); } },
  { val: "most_popular", get name() { return t("walio.sort.popular", "Most liked"); } },
  { val: "most_visited", get name() { return t("walio.sort.visited", "Most viewed"); } },
];

export function sortName(val: string | null | undefined, fallback?: string | null): string {
  return SORTS.find((s) => s.val === val)?.name || fallback || t("walio.sort.featured", "Featured");
}
