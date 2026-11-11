/*
  The compare page (8 November 2026): the pieces KalioCompare and
  KalioCompareButton share — the list in the page's address, the product
  details grouped as the shop wrote them, and the price per ounce.

  The address is Selldone's own: ?list=p713727_p713728v55 (p = product id,
  v = variant id), so a link copied from Selldone's table still opens here.
*/
import { t } from "../i18n/kalio-i18n";

export interface CompareRef {
  p: number;
  v: number | null;
}

export function parseCompareList(param: unknown): CompareRef[] {
  if (typeof param !== "string" || !param) return [];
  const out: CompareRef[] = [];
  for (const part of param.split("_")) {
    const m = /^p(\d+)(?:v(\d+))?$/.exec(part.trim());
    if (!m) continue;
    const ref = { p: Number(m[1]), v: m[2] ? Number(m[2]) : null };
    if (!out.some((r) => r.p === ref.p && r.v === ref.v)) out.push(ref);
  }
  return out;
}

export function compareListParam(list: CompareRef[]): string {
  return list.map((r) => `p${r.p}${r.v ? `v${r.v}` : ""}`).join("_");
}

/** A spec value as text: lists joined, true and false as Yes and No. */
export function specText(value: any): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(specText).filter(Boolean).join(", ");
  if (value === true || value === "true") return t("compare.yes", "Yes");
  if (value === false || value === "false") return t("compare.no", "No");
  if (typeof value === "object") return "";
  return String(value).trim();
}

/** One product's value for a spec key (the flat form, or the old list). */
export function specValue(product: any, key: string): string {
  const spec = product?.spec;
  if (!spec) return "";
  if (Array.isArray(spec)) {
    const row = spec.find((r: any) => Array.isArray(r) && r[0] === key);
    return row ? specText(row[1]) : "";
  }
  const value = spec[key];
  return value === "group" ? "" : specText(value);
}

export interface SpecGroup {
  title: string;
  keys: string[];
}

/** The details, in the groups and order the shop wrote them ("At a Glance",
 *  "Product Details", …), merged across the compared products: a key keeps
 *  the group of the first product that has it. Keys before any group go
 *  under "Details". */
export function specGroups(products: any[]): SpecGroup[] {
  const groups: SpecGroup[] = [];
  const byTitle = new Map<string, SpecGroup>();
  const seen = new Set<string>();
  const put = (title: string, key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    if (!byTitle.has(title)) {
      const group = { title, keys: [] as string[] };
      byTitle.set(title, group);
      groups.push(group);
    }
    byTitle.get(title)!.keys.push(key);
  };
  for (const product of products) {
    const spec = product?.spec;
    if (!spec) continue;
    let current = t("compare.group.details", "Details");
    if (Array.isArray(spec)) {
      for (const row of spec) {
        if (!row) continue;
        if (!Array.isArray(row) && row.group) current = String(row.group);
        else if (Array.isArray(row) && row[0]) put(current, String(row[0]));
      }
      continue;
    }
    const order: string[] = Array.isArray(product.spec_order) && product.spec_order.length ? product.spec_order : Object.keys(spec);
    for (const key of order) {
      const value = spec[key];
      if (value === "group") current = key;
      else if (value !== undefined && value !== null) put(current, key);
    }
  }
  return groups;
}

/** A Material icon for a group, by what its title says. */
export function groupIcon(title: string): string {
  if (/glance|overview|summary/i.test(title)) return "info";
  if (/storage|keep|use|care/i.test(title)) return "kitchen";
  if (/allerg|nutrition|diet|ingredient/i.test(title)) return "health_and_safety";
  if (/serv|prep|cook|recipe/i.test(title)) return "restaurant";
  if (/size|option|pick/i.test(title)) return "straighten";
  return "inventory_2";
}

/* ━━━━━━━━━━━━ Price per unit ━━━━━━━━━━━━
   From the product's size: a variant's own volume, weight or pack, the
   "Pack Size" detail, then its name ("… 32 oz"). "Size range" is skipped:
   "1-2 lb" is a band, not the pack. */
const UNIT = /(\d+(?:\.\d+)?)\s*(fl\.?\s?oz|oz|lbs?|kg|g|ml|l|ct|count|pk|pack)\b/i;
const SIZE_KEYS = /^(pack size|net (weight|contents?)|weight|volume|size|count)$/i;

export function unitSize(product: any, variant: any = null): { n: number; unit: string } | null {
  const sources: string[] = [];
  if (variant) for (const k of ["volume", "weight", "pack"]) if (variant[k]) sources.push(String(variant[k]));
  const spec = product?.spec;
  if (spec && !Array.isArray(spec)) for (const key of Object.keys(spec)) if (SIZE_KEYS.test(key)) sources.push(specText(spec[key]));
  if (product?.title) sources.push(product.title);
  for (const text of sources) {
    const m = UNIT.exec(text || "");
    if (!m) continue;
    const n = parseFloat(m[1]);
    if (!(n > 0)) continue;
    let unit = m[2].toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
    if (unit === "floz") unit = "fl oz";
    if (unit === "lbs") unit = "lb";
    if (["ct", "count", "pk", "pack"].includes(unit)) unit = "each";
    return { n, unit };
  }
  return null;
}

/** A unit from unitSize() in the visitor's language ("each" is written by
 *  the price-per-unit line itself). */
export function unitLabel(unit: string): string {
  switch (unit) {
    case "oz":
      return t("compare.unit.oz", "oz");
    case "fl oz":
      return t("compare.unit.flOz", "fl oz");
    case "lb":
      return t("compare.unit.lb", "lb");
    case "kg":
      return t("compare.unit.kg", "kg");
    case "g":
      return t("compare.unit.g", "g");
    case "ml":
      return t("compare.unit.ml", "ml");
    case "l":
      return t("compare.unit.l", "l");
    default:
      return unit;
  }
}
