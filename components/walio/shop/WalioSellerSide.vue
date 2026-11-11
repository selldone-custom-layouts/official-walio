<!--
  Walio — the seller's card in the side column (seller page design B,
  "a shop in the shop", given to Walio on 7 November 2026).

  The seller's mark, name and a line from their own aisles, three live
  numbers (products, on sale, aisles), and their aisles as a menu with how
  many products each holds, like a small shop's own menu: "Everything"
  shows all of the seller's products, an aisle opens that aisle with only
  this seller's products.
-->
<template>
  <aside class="w-scard">
    <span class="w-scard__mark">
      <img v-if="mark" :src="mark" alt="" />
      <v-icon v-else size="40">storefront</v-icon>
    </span>
    <h1>{{ vendor ? vendor.name : "" }}</h1>
    <p>
      {{ sells_line ? t("walio.seller.blurbSells", "An independent seller on {shop}: {sells}, in the same cart as every other seller.", { shop: $shop.title, sells: sells_line }) : t("walio.seller.blurb", "An independent seller on {shop}, in the same cart as every other seller.", { shop: $shop.title }) }}
    </p>
    <div class="w-scard__facts">
      <div><b>{{ total !== null ? formatNumber(total) : "–" }}</b><span>{{ t("walio.seller.factProducts", "products") }}</span></div>
      <div><b>{{ on_sale !== null ? formatNumber(on_sale) : "–" }}</b><span>{{ t("walio.seller.factOnSale", "on sale") }}</span></div>
      <div><b>{{ formatNumber(tiles.length) }}</b><span>{{ t("walio.seller.factAisles", "aisles") }}</span></div>
    </div>
    <nav :aria-label="t('walio.seller.aisles', 'The seller\'s aisles')" class="w-scard__nav">
      <router-link :class="{ '-on': !$route.params.category_name }" :to="sellerTo">{{ t("walio.seller.everything", "Everything") }} <span>{{ total ?? "" }}</span></router-link>
      <router-link
        v-for="a in tiles"
        :key="a.aisle.id"
        :class="{ '-on': $route.params.category_name === a.aisle.name }"
        :to="{ ...aisleRoute(a.aisle), query: { vendor_id: vendorId } }"
      >
        {{ a.aisle.title || a.aisle.name }} <span>{{ a.count }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<script>
import { aisleRoute, aisles, countProducts, featured, offers, sellerRoute, vendorImage } from "../../kalio/kalio-catalog";
import { locale } from "../../kalio/i18n/kalio-i18n";

export default {
  name: "WalioSellerSide",
  inject: ["$shop"],
  emits: ["tab"],

  props: {
    vendorId: { type: [Number, String], required: true },
    tab: { type: String, default: "shop" },
  },

  data() {
    return { vendor: null, total: null, on_sale: null, tiles: [] };
  },

  computed: {
    mark() {
      return vendorImage(this.vendor);
    },
    sellerTo() {
      return this.vendor ? sellerRoute(this.vendor) : { name: window.$storefront.routes.SHOP_PAGE };
    },
    sells_line() {
      const names = this.tiles.slice(0, 3).map((a) => String(a.aisle.title || a.aisle.name).toLowerCase().replace(/&amp;/g, "&"));
      if (names.length < 2) return names[0] || "";
      try {
        return new Intl.ListFormat(locale(), { type: "conjunction" }).format(names);
      } catch {
        return names.join(", ");
      }
    },
  },

  watch: {
    vendorId: { handler: "fetch", immediate: true },
  },

  methods: {
    aisleRoute,
    fetch() {
      const id = this.vendorId;
      const mine = () => String(id) === String(this.vendorId);
      window.$storefront.vendor
        .getVendor(id)
        .then(({ vendor }) => mine() && (this.vendor = vendor || null))
        .catch(() => null);
      countProducts(null, { vendor_id: id }).then((n) => mine() && (this.total = n));
      countProducts(null, { vendor_id: id, filter: JSON.stringify({ only_has_discount: true }) }).then((n) => mine() && (this.on_sale = n));
      Promise.all([offers(), aisles()]).then(([{ shelfOf }, list]) => {
        if (!mine()) return;
        const shelf = shelfOf.get(Number(id)) || shelfOf.get(id) || [];
        const counts = new Map();
        for (const p of shelf) counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1);
        this.tiles = featured(list.filter((a) => counts.has(a.id))).map((aisle) => ({ aisle, count: counts.get(aisle.id) }));
      });
    },
  },
};
</script>
