/*
 * Walio — the home page's shared pieces (design A, 7 November 2026).
 *
 * The owner rejected the first Walio ("Molino with the colour turned red")
 * and approved design A: a big-box store's home — a red promo strip, a split
 * hero carousel, round categories, deal rows with a red "Add to cart",
 * promo tiles per aisle, "Ways to get it", editorial tiles, more rows and
 * the sellers. This module holds what several of those sections share:
 *
 *  - the lifestyle photos, bundled from assets/walio/ (the owner has them
 *    made from kalio-design/walio-options/image-prompts-A.md). A photo that
 *    is not there yet is simply absent, and the section draws a collage of
 *    the aisle's own packshots instead, so the page is finished either way;
 *  - which aisle each tile or slide belongs to, matched on the aisle's
 *    title, never on an id, so another shop's "Bakery" finds its tile too;
 *  - the delivery methods, as "Pickup / Delivery / Shipping", read from the
 *    shop's own transportations with their free-shipping rule.
 *
 * Nothing here names a product, a price or a seller.
 */

declare const window: any;

import { baseCurrency, money as regionMoney } from "../region-switcher/region";
import { t } from "../kalio/i18n/kalio-i18n";

/* ━━━━━━━━━━━━ Photos ━━━━━━━━━━━━
   import.meta.glob lists only the files that exist when the Layout is
   built, so a missing photo costs nothing and breaks nothing. */
const FILES = import.meta.glob("../../assets/walio/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const BY_NAME = new Map<string, string>(
  Object.entries(FILES).map(([path, url]) => [path.split("/").pop()!.replace(/\.\w+$/, ""), url]),
);

/** The bundled photo with this base name (no extension), or null. */
export function photo(name: string | null | undefined): string | null {
  return (name && BY_NAME.get(name)) || null;
}

/* ━━━━━━━━━━━━ Aisle matching ━━━━━━━━━━━━ */

export const label = (aisle: any) => `${aisle?.title || ""} ${aisle?.name || ""}`;

/** The first aisle whose title matches, skipping the ones already used. */
export function findAisle(list: any[], pattern: RegExp, used: Set<number> = new Set()): any | null {
  return list.find((aisle) => !used.has(aisle.id) && pattern.test(label(aisle))) || null;
}

/* The promo tiles of "Deals for every aisle", in the order of design A.
   `deal` is the caption when the aisle has products on offer, `plain` when
   it has none. "{off}" is the best saving, "{from}" the lowest price. */
export const TILES = [
  { pattern: /breakfast|cereal/i, photo: "walio-tile-breakfast", deal: "Up to {off}% off breakfast favourites", plain: "Breakfast, sorted" },
  { pattern: /snack|sweet|candy/i, photo: "walio-tile-snacks", deal: "Snack-time savings", plain: "The snack drawer" },
  { pattern: /bread|bakery/i, photo: "walio-tile-bakery", deal: "Fresh-baked, up to {off}% off", plain: "Fresh-baked, from {from}" },
  { pattern: /household|clean|laundry/i, photo: "walio-tile-household", deal: "Stock up the home for less", plain: "Stock up the home" },
  { pattern: /meat|seafood|fish|poultry/i, photo: "walio-tile-meat", deal: "Dinner, sorted — up to {off}% off", plain: "Dinner, sorted" },
];

/* "Fresh finds": three tall editorial tiles. */
export const FINDS = [
  { pattern: /produce|fruit|veg/i, photo: "walio-finds-produce", title: "Picked this week" },
  { pattern: /beverage|drink|coffee|tea/i, photo: "walio-finds-coffee", title: "Your morning, brewed" },
  { pattern: /meat|seafood|fish|poultry|deli|prepared/i, photo: "walio-finds-dinner", title: "Weeknight dinners" },
];

/* A headline for an aisle that has no tile of its own. */
const HEADLINES: [RegExp, string][] = [
  [/produce|fruit|veg/i, "Picked for the week"],
  [/dairy|egg|milk/i, "Fridge, restocked"],
  [/bread|bakery/i, "Fresh from the oven"],
  [/meat|seafood|fish/i, "From the butcher’s counter"],
  [/breakfast|cereal/i, "Breakfast, sorted"],
  [/snack/i, "The snack drawer"],
  [/pantry/i, "Stock the cupboard"],
  [/beverage|drink/i, "Something to sip"],
  [/frozen/i, "Ready when you are"],
  [/household|clean/i, "Stock up the home"],
];

export function headline(aisle: any): string {
  const hit = HEADLINES.find(([pattern]) => pattern.test(label(aisle)));
  return hit ? hit[1] : aisle?.title || aisle?.name || "";
}

/* ━━━━━━━━━━━━ Products ━━━━━━━━━━━━ */

/** Products of an aisle (or the whole shop) that have a picture. */
export function listProducts(dir: string | null, limit: number, options: Record<string, any> = {}): Promise<any[]> {
  return window.$storefront.products
    .list(dir, 0, limit, { products_only: true, available: true, ...options })
    .then(({ products }: any) => products || [])
    .catch(() => []);
}

export const DEALS_FILTER = JSON.stringify({ only_has_discount: true });

/* ━━━━━━━━━━━━ Ways to get it ━━━━━━━━━━━━
   Selldone's transportation types, grouped as a shopper says them. A type
   not listed here is shown under its own title, as "Delivery". */
/* key: a code the Layout compares (never a translated word); word and line
   are read when drawn, so they follow the visitor's language. */
const WAYS: { types: string[]; key: string; word: () => string; icon: string; line: () => string }[] = [
  { types: ["Pickup"], key: "Pickup", word: () => t("walio.way.pickup", "Pickup"), icon: "storefront", line: () => t("walio.way.pickupLine", "Order online, collect at the shop") },
  { types: ["Motorbike", "Bicycle"], key: "Delivery", word: () => t("walio.way.delivery", "Delivery"), icon: "two_wheeler", line: () => t("walio.way.deliveryLine", "A courier brings it to your door") },
  { types: ["CargoSmall", "Cargo", "Truck"], key: "Shipping", word: () => t("walio.way.shipping", "Shipping"), icon: "local_shipping", line: () => t("walio.way.shippingLine", "Shipped to your address") },
  { types: ["Post", "PostFast"], key: "Post", word: () => t("walio.way.post", "By post"), icon: "local_post_office", line: () => t("walio.way.postLine", "Sent to your address by post") },
  { types: ["Airplane", "Global"], key: "Worldwide", word: () => t("walio.way.worldwide", "Worldwide"), icon: "public", line: () => t("walio.way.worldwideLine", "Shipped wherever you are") },
];

export interface Way {
  key: string;
  word: string;
  icon: string;
  line: string;
  /** Free, at any basket size. */
  free: boolean;
  /** Free from this basket total (in `currency`). */
  freeOver: number | null;
  currency: string | null;
}

/** The shop's enabled delivery methods, one card per kind. */
export function waysOf(shop: any): Way[] {
  const out: Way[] = [];
  for (const tr of (shop?.transportations || []).filter((x: any) => x && x.enable)) {
    const kind = WAYS.find((w) => w.types.includes(tr.type));
    const key = kind ? kind.key : tr.type;
    const free = !!tr.free_shipping && !(Number(tr.free_shipping_limit) > 0);
    const freeOver = tr.free_shipping && Number(tr.free_shipping_limit) > 0 ? Number(tr.free_shipping_limit) : null;
    const known = out.find((w) => w.key === key);
    if (known) {
      /* Two methods of one kind: the more generous free rule wins. */
      known.free = known.free || free;
      if (freeOver != null && (known.freeOver == null || freeOver < known.freeOver)) known.freeOver = freeOver;
      continue;
    }
    out.push({
      key,
      word: tr.title || (kind ? kind.word() : t("walio.way.delivery", "Delivery")),
      icon: kind ? kind.icon : "local_shipping",
      line: kind ? kind.line() : t("walio.way.otherLine", "Brought to your address"),
      free,
      freeOver,
      currency: tr.currency || null, // null: the shop's base currency (shop.currency does not exist)
    });
  }
  /* In the order shoppers expect: pickup, delivery, shipping, post. */
  const rank = (way: Way) => {
    const at = WAYS.findIndex((w) => w.key === way.key);
    return at === -1 ? WAYS.length : at;
  };
  return out.sort((a, b) => rank(a) - rank(b));
}

/** The lowest basket total that ships for free, for the promo strip. A
 *  method that is free at any size is pickup-like and not promoted. */
export function freeShippingFrom(shop: any): { amount: number; currency: string } | null {
  const paid = (shop?.transportations || []).filter(
    (t: any) => t && t.enable && t.type !== "Pickup" && t.free_shipping && Number(t.free_shipping_limit) > 0,
  );
  if (!paid.length) return null;
  const best = paid.reduce((a: any, b: any) => (Number(b.free_shipping_limit) < Number(a.free_shipping_limit) ? b : a));
  return { amount: Number(best.free_shipping_limit), currency: best.currency || baseCurrency() };
}

/* ━━━━━━━━━━━━ Money ━━━━━━━━━━━━ */

/** Walio's money(): `amount` is in `currency` (omit it, or null, for the
 *  shop's base currency); the result is in the visitor's currency, converted
 *  with the shop's rates (the region switcher, 10 November 2026).
 *  short: true drops the decimals; "auto" only when the amount is whole. */
export function money(amount: number, currency?: string | null, short: boolean | "auto" = false): string {
  return regionMoney(amount, currency || baseCurrency(), { short });
}
