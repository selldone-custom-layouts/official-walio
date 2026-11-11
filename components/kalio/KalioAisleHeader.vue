<!--
  Kalio — Aisle header.

  The top of a category page, in the shelf head (KalioShelfHead): a
  breadcrumb, the aisle's picture, its title and description from the live
  category record, how many products it holds and how many are on offer,
  then every aisle as a row of words so a shopper can step to the next one.
  Selldone's default category page opens straight onto a breadcrumb and a
  grid.

  The record is fetched with with_parent on a one-product page of that
  aisle, which returns the category itself as "parent". A stale link with no
  record shows only the crumbs and the aisle row; the listing below shows
  its own empty state.

  That "parent" comes in the shop's own language whatever the visitor reads
  (the server translates the folder lists, not the record), so its title and
  description are taken from the translated aisle list (aisleInLanguage):
  the title matches the header's aisle words (ES-05, 11 November 2026).
-->
<template>
  <kalio-shelf-head
    :crumbs="crumbs"
    :image="image"
    :lede="aisle && aisle.description"
    :loading="busy"
    :meta="meta"
    :tabs="tabs"
    :title="aisle ? aisle.title || aisle.name : null"
  />
</template>

<script>
import KalioShelfHead from "./KalioShelfHead.vue";
import { aisleImage, aisleInLanguage, aisleRoute, aisles, countProducts } from "./kalio-catalog";
import { t } from "./i18n/kalio-i18n";
import { currentLanguage } from "../region-switcher/region";

export default {
  name: "KalioAisleHeader",
  components: { KalioShelfHead },

  props: {
    categoryName: { type: String, required: true },
    /** The listing's own total, as it is filtered; null until it is read. */
    total: { type: Number, default: null },
  },

  data() {
    return {
      aisle: null,
      busy: true,
      list: [],
      on_offer: null,
    };
  },

  computed: {
    /* The visitor's language: a pick reads the aisle again in it. */
    lang() {
      return currentLanguage();
    },
    image() {
      return this.aisle && this.aisle.icon ? aisleImage(this.aisle, 128) : null;
    },
    crumbs() {
      return [
        { label: this.$store.getters.getShop?.title || "Kalio", to: { name: window.$storefront.routes.SHOP_PAGE } },
        { label: this.aisle ? this.aisle.title || this.aisle.name : this.categoryName },
      ];
    },
    meta() {
      const parts = [];
      if (this.total !== null) parts.push(t("listing.productCount", { one: "{n} product", other: "{n} products" }, { n: this.total }));
      if (this.on_offer) parts.push(t("aisle.onOfferCount", { one: "{n} on offer", other: "{n} on offer" }, { n: this.on_offer }));
      return parts.join(" · ") || null;
    },
    tabs() {
      return this.list.map((item) => ({
        key: item.id,
        label: item.title || item.name,
        to: aisleRoute(item),
        on: item.name === this.categoryName,
      }));
    },
  },

  watch: {
    categoryName() {
      this.fetch();
    },
    lang() {
      this.fetch();
      aisles().then((list) => (this.list = list));
    },
  },

  mounted() {
    this.fetch();
    aisles().then((list) => (this.list = list));
  },

  methods: {
    fetch() {
      const name = this.categoryName;
      this.aisle = null;
      this.on_offer = null;
      this.busy = true;
      window.$storefront.products
        .list(name, 0, 1, { with_parent: true, products_only: true })
        .then(({ parent }) => (parent && parent.id ? aisleInLanguage(parent) : null))
        .then((record) => {
          if (name === this.categoryName) this.aisle = record;
        })
        .catch(() => {
          this.aisle = null;
        })
        .finally(() => {
          this.busy = false;
        });
      countProducts(name, { filter: JSON.stringify({ only_has_discount: true }) }).then((count) => {
        if (name === this.categoryName) this.on_offer = count;
      });
    },
  },
};
</script>
