<!--
  Kalio — Catalogue header.

  The top of the whole catalogue ("Every product", a search, the deals), in
  the shelf head (KalioShelfHead): what the shopper is looking at and how
  many products it holds, then the row of aisles with "All products" first.
  Selldone's catalogue opened on a column of tall aisle cards with no title
  and no count.

  The count is the listing's own total, passed in by the page.
-->
<template>
  <kalio-shelf-head :crumbs="crumbs" :eyebrow="eyebrow" :meta="meta" :tabs="tabs" :title="title" />
</template>

<script>
import KalioShelfHead from "./KalioShelfHead.vue";
import { aisleRoute, aisles, catalogueRoute } from "./kalio-catalog";
import { t } from "./i18n/kalio-i18n";

export default {
  name: "KalioCatalogueHeader",
  components: { KalioShelfHead },
  inject: ["$shop"],

  props: {
    /** The listing's total for the current query; null until it is read. */
    total: { type: Number, default: null },
  },

  data() {
    return {
      list: [],
    };
  },

  computed: {
    search() {
      return String(this.$route.query.search || "").trim();
    },
    deals() {
      try {
        return !!JSON.parse(this.$route.query.filter || "{}").only_has_discount;
      } catch {
        return false;
      }
    },
    eyebrow() {
      if (this.search) return t("listing.searchResults", "Search results");
      if (this.deals) return t("listing.onOffer", "On offer");
      return null;
    },
    title() {
      if (this.search) return t("listing.searchQuery", "“{query}”", { query: this.search });
      if (this.deals) return t("listing.todaysDeals", "Today’s deals");
      return t("listing.allProducts", "All products");
    },
    crumbs() {
      return [
        { label: this.$shop?.title || "Kalio", to: { name: window.$storefront.routes.SHOP_PAGE } },
        { label: this.search ? t("common.search", "Search") : this.title },
      ];
    },
    meta() {
      if (this.total === null) return null;
      return t("listing.productCount", { one: "{n} product", other: "{n} products" }, { n: this.total });
    },
    tabs() {
      if (!this.list.length) return [];
      return [
        { key: "all", label: t("listing.allProducts", "All products"), to: catalogueRoute(), on: !this.search && !this.deals },
        ...this.list.map((item) => ({ key: item.id, label: item.title || item.name, to: aisleRoute(item) })),
      ];
    },
  },

  mounted() {
    aisles().then((list) => (this.list = list));
  },
};
</script>
