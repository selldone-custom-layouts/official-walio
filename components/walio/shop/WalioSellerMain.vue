<!--
  Walio — the seller page's main column above the grid (design B): a blue
  "<Seller>'s deals" banner with their best savings, then a row for each of
  the seller's first two aisles. The grid under it holds everything the
  seller sells. Shown on the seller's own page, not inside one of their
  aisles.
-->
<template>
  <div v-if="!$route.params.category_name" class="w-smain">
    <router-link v-if="on_sale" :to="dealsTo" class="w-sdeal">
      <span class="w-sdeal__tx">
        <small>{{ t("walio.seller.deals", "{name}'s deals", { name }) }}</small>
        <b>{{ best ? t("walio.seller.dealsUpTo", { one: "{n} product, up to {best}% off", other: "{n} products, up to {best}% off" }, { n: on_sale, best }) : t("walio.seller.onSale", { one: "{n} product on sale", other: "{n} products on sale" }, { n: on_sale }) }}</b>
        <em>{{ t("walio.seller.shopDeals", "Shop {name}'s deals", { name }) }}<v-icon class="k-flip" size="20">chevron_right</v-icon></em>
      </span>
      <span aria-hidden="true" class="w-sdeal__packs">
        <img v-for="p in deals.slice(0, 3)" :key="p.id" :src="full(p)" :srcset="srcset(p)" alt="" sizes="170px" @error="dropSrcset" />
      </span>
    </router-link>
    <walio-row
      v-for="a in rows"
      :key="a.id"
      :dir="a.name"
      :limit="10"
      :more-to="{ ...aisleRoute(a), query: { vendor_id: vendorId } }"
      :title="t('walio.seller.rowTitle', '{name}\'s {aisle}', { name, aisle: a.title || a.name })"
      :vendor="vendorId"
      lazy
      sort="bestselling"
    />
    <h2 class="w-sall">Everything from {{ name }}</h2>
  </div>
</template>

<script>
import { t } from "../../kalio/i18n/kalio-i18n";
import WalioRow from "../WalioRow.vue";
import { DEALS_FILTER, listProducts } from "../walio-home";
import { aisleRoute, aisles, countProducts, dropSrcset, featured, offers, percentOff, productImage, productSrcset } from "../../kalio/kalio-catalog";

export default {
  name: "WalioSellerMain",
  components: { WalioRow },
  inject: ["$shop"],

  props: {
    vendorId: { type: [Number, String], required: true },
  },

  data() {
    return { name: t("walio.seller.this", "This seller"), on_sale: null, deals: [], rows: [] };
  },

  computed: {
    best() {
      return this.deals.reduce((m, p) => Math.max(m, percentOff(this.$shop, p) || 0), 0);
    },
    dealsTo() {
      return { path: this.$route.path, query: { filter: DEALS_FILTER } };
    },
  },

  mounted() {
    const id = this.vendorId;
    window.$storefront.vendor
      .getVendor(id)
      .then(({ vendor }) => vendor?.name && (this.name = vendor.name))
      .catch(() => null);
    countProducts(null, { vendor_id: id, filter: DEALS_FILTER }).then((n) => (this.on_sale = n));
    listProducts(null, 20, { vendor_id: id, filter: DEALS_FILTER, sort: "bestselling" }).then((list) => {
      this.deals = list.filter((p) => p.icon).sort((a, b) => (percentOff(this.$shop, b) || 0) - (percentOff(this.$shop, a) || 0));
    });
    Promise.all([offers(), aisles()]).then(([{ shelfOf }, list]) => {
      const shelf = shelfOf.get(Number(id)) || shelfOf.get(id) || [];
      const counts = new Map();
      for (const p of shelf) counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1);
      this.rows = featured(list.filter((a) => counts.get(a.id) >= 3)).slice(0, 2);
    });
  },

  methods: {
    aisleRoute,
    dropSrcset,
    srcset(p) {
      return productSrcset(p);
    },
    full(p) {
      return productImage(p);
    },
    image(p) {
      return productImage(p, true);
    },
  },
};
</script>
