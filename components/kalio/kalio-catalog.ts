/*
 * Kalio — shared catalogue reads.
 *
 * Several sections need the same three facts about the live shop: its
 * aisles, its sellers, and which sellers offer which product. Each is read
 * once per visit and shared, so a home page with eight rails makes one aisle
 * call and one call per seller, not one per rail. A failed read resolves to
 * an empty answer and is retried on the next request; every caller treats
 * "nothing" as "render nothing".
 *
 * Nothing here names a product, an aisle or a seller. A new aisle in the
 * dashboard gets a row, a removed one loses it.
 */

import { PriceHelper } from "@selldone/core-js";

declare const window: any;

/* ━━━━━━━━━━━━ Aisle tints ━━━━━━━━━━━━
   Each aisle's products sit on a pale ground of their own — leafy green for
   produce, milk blue for dairy, wheat for bakery — so a row of cards says
   which aisle it came from before a label is read. Matched on the aisle's
   title; an aisle no pattern knows takes a spare tint by id, so it is stable
   from one visit to the next. Baby comes before personal care because "Baby
   Care" contains "care". */
const TINTS: [RegExp, string][] = [
  [/baby|kid|infant/i, "#eceffa"],
  [/produce|fruit|veg/i, "#e9f3de"],
  [/dairy|egg|milk|cheese/i, "#e5eef7"],
  [/bread|bakery/i, "#f7eddc"],
  [/meat|seafood|fish|poultry/i, "#f8e4de"],
  [/beverage|drink|juice|coffee|tea/i, "#e2f1ef"],
  [/snack|sweet|candy|chocolate/i, "#fbefd5"],
  [/frozen|ice/i, "#e6edf8"],
  [/breakfast|cereal/i, "#fceed6"],
  [/pantry|staple|grocer/i, "#f2ece1"],
  [/deli|prepared|ready/i, "#f5e8df"],
  [/health|vitamin|wellness/i, "#eaf3e6"],
  [/household|clean|laundry|home/i, "#eceff3"],
  [/kitchen|cook/i, "#f0ede8"],
  [/beauty|cosmetic|skin|makeup/i, "#f8e7ee"],
  [/personal|care|hygiene/i, "#f4eaf2"],
];
const SPARE_TINTS = ["#eef2e6", "#f6ece4", "#e8eef5", "#f3eee4", "#efe9f4", "#e6f1ee"];

export function tintFor(aisle: { id?: number; title?: string; name?: string } | null): string | null {
  if (!aisle) return null;
  const label = `${aisle.title || ""} ${aisle.name || ""}`;
  for (const [pattern, tint] of TINTS) if (pattern.test(label)) return tint;
  return SPARE_TINTS[Math.abs(Number(aisle.id) || 0) % SPARE_TINTS.length];
}

/* ━━━━━━━━━━━━ Aisles ━━━━━━━━━━━━ */

let aislesRead: Promise<any[]> | null = null;

/** The shop's root categories, in the merchant's order. */
export function aisles(): Promise<any[]> {
  if (!aislesRead) {
    aislesRead = window.$storefront.products
      .list(null, 0, 1, { categories_only: true, categories_count: 48 })
      .then(({ folders }: any) =>
        (folders || [])
          .filter((folder: any) => folder && folder.id)
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
      )
      .catch(() => {
        aislesRead = null;
        return [];
      });
  }
  return aislesRead!;
}

/** Aisle by category id, for tinting a product by its category_id. */
export function aisleIndex(): Promise<Map<number, any>> {
  return aisles().then((list) => new Map(list.map((aisle) => [aisle.id, aisle])));
}

/* ━━━━━━━━━━━━ Sellers ━━━━━━━━━━━━ */

let vendorsRead: Promise<any[]> | null = null;

/** The marketplace's sellers, through the storefront's own axios transport. */
export function vendors(): Promise<any[]> {
  if (!vendorsRead) {
    vendorsRead = window.axios
      .get(window.XAPI.GET_VENDORS(window.$storefront.name))
      .then(({ data }: any) => (data?.error ? [] : data?.vendors || []))
      .catch(() => {
        vendorsRead = null;
        return [];
      });
  }
  return vendorsRead!;
}

/* A marketplace with dozens of sellers would make the seller line cost a
   call each; past this many the line simply names fewer sellers. */
const SELLERS_READ = 12;
const PRODUCTS_PER_SELLER = 250;

export interface Offers {
  /** Product id → the sellers that offer it. */
  sellersOf: Map<number, any[]>;
  /** Seller id → the products that seller offers. */
  shelfOf: Map<number, any[]>;
}

let offersRead: Promise<Offers> | null = null;

/** Who sells what, read once from each seller's own product list. */
export function offers(): Promise<Offers> {
  if (!offersRead) {
    offersRead = vendors()
      .then((list) =>
        Promise.all(
          list.slice(0, SELLERS_READ).map((vendor) =>
            window.$storefront.products
              .list(null, 0, PRODUCTS_PER_SELLER, {
                products_only: true,
                vendor_id: vendor.id,
              })
              .then(({ products }: any) => [vendor, products || []])
              .catch(() => [vendor, []]),
          ),
        ),
      )
      .then((pairs) => {
        const sellersOf = new Map<number, any[]>();
        const shelfOf = new Map<number, any[]>();
        for (const [vendor, products] of pairs as [any, any[]][]) {
          shelfOf.set(vendor.id, products);
          for (const product of products) {
            if (!sellersOf.has(product.id)) sellersOf.set(product.id, []);
            sellersOf.get(product.id)!.push(vendor);
          }
        }
        return { sellersOf, shelfOf };
      })
      .catch(() => {
        offersRead = null;
        return { sellersOf: new Map(), shelfOf: new Map() };
      });
  }
  return offersRead!;
}

/** Product id → the product, from the sellers' lists read by offers(). */
export function productsById(): Promise<Map<number, any>> {
  return offers().then(({ shelfOf }) => {
    const map = new Map<number, any>();
    for (const shelf of shelfOf.values()) for (const product of shelf) if (!map.has(product.id)) map.set(product.id, product);
    return map;
  });
}

/* ━━━━━━━━━━━━ Featured aisles ━━━━━━━━━━━━
   The order the home page features aisles in: the fresh, everyday aisles
   first, as a grocer lays out a store, then every other aisle in the
   merchant's own order. Unknown aisles are never dropped, only placed
   after the known ones. */
const FEATURE_ORDER = [
  /produce|fruit|veg/i,
  /dairy|egg|milk/i,
  /bread|bakery/i,
  /meat|seafood|fish/i,
  /breakfast|cereal/i,
  /snack/i,
  /pantry/i,
  /beverage|drink/i,
  /frozen/i,
  /deli|prepared/i,
];

export function featured(list: any[]): any[] {
  const rank = (aisle: any) => {
    const label = `${aisle.title || ""} ${aisle.name || ""}`;
    const at = FEATURE_ORDER.findIndex((pattern) => pattern.test(label));
    return at === -1 ? FEATURE_ORDER.length : at;
  };
  return list
    .map((aisle, index) => ({ aisle, index }))
    .sort((a, b) => rank(a.aisle) - rank(b.aisle) || a.index - b.index)
    .map(({ aisle }) => aisle);
}

/** Saving in whole percent, by Selldone's own discount rule (dates, variants). */
export function percentOff(shop: any, product: any): number {
  try {
    return shop ? Math.round(PriceHelper.discountProductPercent(shop, product, null) || 0) : 0;
  } catch {
    return 0;
  }
}

/** What a product costs now and, on offer, what it cost before — by
 *  Selldone's own pricing (discount dates, currency rates), in the currency
 *  the shopper has chosen. */
export function priceOf(shop: any, product: any, currency: string): { now: number; was: number | null; currency: string } {
  try {
    const now = PriceHelper.priceProductByCurrency(shop, product, null, currency as any);
    const off = PriceHelper.getProductDiscountAmountByCurrency(shop, product, null, currency as any) || 0;
    return { now, was: off > 0 ? now + off : null, currency };
  } catch {
    /* No rate for this pair (PriceHelper throws): the product's own price, in
       its own currency, rather than 0. */
    const own = product?.currency || currency;
    const price = Number(product?.price || 0) + Number(product?.commission || 0);
    const off = Number(product?.discount || 0);
    const live = off > 0 && (!product?.dis_end || Date.parse(product.dis_end) > Date.now()) && (!product?.dis_start || Date.parse(product.dis_start) <= Date.now());
    return { now: live ? price - off : price, was: live ? price : null, currency: own };
  }
}

/* ━━━━━━━━━━━━ Links and images ━━━━━━━━━━━━ */

export function aisleRoute(aisle: any) {
  return {
    name: window.$storefront.routes.SHOP_CATEGORY_PAGE,
    params: { category_name: aisle.name },
  };
}

export function sellerRoute(vendor: any) {
  return {
    name: window.$storefront.routes.SHOP_VENDOR_PAGE,
    params: { slug: vendor.name, vendor_id: vendor.id },
  };
}

/** The whole catalogue, as the listing shows it. A query is what tells the
 *  shop page to show the listing rather than the home sections. */
export function catalogueRoute(query: Record<string, string> = { sort: "newest" }) {
  return { name: window.$storefront.routes.SHOP_PAGE, query };
}

export function dealsRoute() {
  return catalogueRoute({ filter: JSON.stringify({ only_has_discount: true }) });
}

/* Image sizes, as the CDN serves them on 3 November 2026: category icons
   resize to any size; seller and product images exist only as the original
   and a 128px thumbnail — any other size is a 404, which is how Market
   Hall's 256px seller mark ended up showing its alt text. So shop images
   take 128 or nothing. */
export function aisleImage(aisle: any, size = 256): string | null {
  return aisle?.icon ? window.CDN.GET_CATEGORY_ICON(aisle.id, size) : null;
}

export function vendorImage(vendor: any, thumb = false): string | null {
  return vendor?.icon ? window.CDN.GET_SHOP_IMAGE_PATH(vendor.icon, thumb ? 128 : null) : null;
}

export function productImage(product: any, thumb = false): string | null {
  return product?.icon ? window.CDN.GET_SHOP_IMAGE_PATH(product.icon, thumb ? 128 : null) : null;
}

/* ━━━━━━━━━━━━ Product photos at the size they are shown ━━━━━━━━━━━━
   Selldone keeps every product photo at 1000x1000 (about 110KB as WebP) and
   its CDN offers only 64 and 128 thumbnails, so a card 200px wide pulled the
   whole photo (a tester measured the traffic, 7 November 2026). A srcset
   lets the browser take the smallest that is sharp on its screen: Selldone's
   own 128 thumbnail, or 256 to 768 from the shop's resizer (the kalio
   Worker's /img route: Cloudflare Images, AVIF or WebP at quality 65, cached
   for a year, Selldone's CDN only). The full photo stays the src, and an
   image that fails drops the srcset and loads it (dropSrcset). */
const RESIZER = "https://kalio.selldone.shop/img";
const RESIZED = [256, 384, 512, 768];

export function photoSrcset(full: string | null, thumb: string | null = null): string | null {
  if (!full || !full.startsWith("https://cdn.selldone.com/")) return null;
  const list = thumb ? [`${thumb} 128w`] : [];
  for (const w of RESIZED) list.push(`${RESIZER}?u=${encodeURIComponent(full)}&w=${w} ${w}w`);
  return list.join(", ");
}

/** The srcset of a product's main photo (or a variant's own picture). */
export function productSrcset(product: any, icon: string | null = null): string | null {
  const path = icon || product?.icon;
  if (!path) return null;
  return photoSrcset(window.CDN.GET_SHOP_IMAGE_PATH(path, null), window.CDN.GET_SHOP_IMAGE_PATH(path, 128));
}

/** An <img>'s error handler: forget the srcset and show the full photo. */
export function dropSrcset(event: Event): void {
  const img = event?.target as HTMLImageElement | null;
  if (img && img.getAttribute("srcset")) {
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    const src = img.getAttribute("src");
    if (src) img.src = src;
  }
}

/* How many products a listing holds: an aisle (its category name), a
   seller (vendor_id), or the whole shop, optionally narrowed by a filter. */
export function countProducts(dir: string | null, options: Record<string, any> = {}): Promise<number | null> {
  return window.$storefront.products
    .list(dir, 0, 1, { products_only: true, available: true, with_total: true, ...options })
    .then(({ total }: any) => (typeof total === "number" ? total : null))
    .catch(() => null);
}
