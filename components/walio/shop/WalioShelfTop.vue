<!--
  Walio — the top of a listing (shop page design B and search design B,
  given to Walio on 7 November 2026).

  An aisle: a banner on the aisle's own tint with the crumbs, "Aisle", the
  title and description from the live record, three facts (products, on
  sale, sellers) and a few of the aisle's packshots. The catalogue (a
  search, the deals, every product): the title and count, the aisles the
  results sit in, and on a search its top match as one wide card.
-->
<template>
  <div class="w-top">
    <nav aria-label="Breadcrumb" class="t-crumbs">
      <router-link :to="{ name: window.$storefront.routes.SHOP_PAGE }">{{ $shop.title }}</router-link>
      <v-icon aria-hidden="true" size="16">chevron_right</v-icon>
      <span aria-current="page">{{ crumb }}</span>
    </nav>

    <section v-if="mode === 'aisle'" :style="{ background: tint }" class="w-banner">
      <div class="w-banner__tx">
        <small>Aisle</small>
        <h1>{{ aisle ? aisle.title || aisle.name : "" }}</h1>
        <p v-if="aisle && aisle.description">{{ aisle.description }}</p>
        <div class="w-banner__facts">
          <span v-if="total !== null">{{ total.toLocaleString() }} {{ total === 1 ? "product" : "products" }}</span>
          <span v-if="onSale" class="-hot"><v-icon size="16">local_offer</v-icon>{{ onSale.toLocaleString() }} on sale</span>
          <span v-if="sellers.length">{{ sellers.length === 1 ? `Sold by ${sellers[0]}` : `${sellers.length} sellers` }}</span>
        </div>
      </div>
      <div aria-hidden="true" class="w-banner__packs">
        <img v-for="(p, i) in packs" :key="p.id" :class="'-p' + i" :src="image(p, false)" :srcset="srcset(p)" alt="" sizes="130px" @error="dropSrcset" />
      </div>
    </section>

    <template v-else>
      <div class="t-top__q">
        <h1 class="t-top__h1">{{ title }}</h1>
        <span v-if="total !== null" class="t-top__count">{{ total.toLocaleString() }} {{ total === 1 ? "product" : "products" }}</span>
      </div>
      <div v-if="hits.length" class="t-inaisles">
        <span class="t-inaisles__l">In aisles:</span>
        <router-link v-for="h in hits" :key="h.aisle.id" :to="h.to" class="t-inaisles__a">
          <img v-if="h.image" :src="h.image" alt="" />{{ h.aisle.title || h.aisle.name }}<b v-if="h.count">{{ h.count }}</b>
        </router-link>
      </div>
      <router-link v-if="search && top" :to="productTo(top)" class="w-match">
        <span class="w-match__im"><img :src="image(top, false)" :srcset="srcset(top)" alt="" sizes="(max-width: 760px) 96px, 200px" @error="dropSrcset" /></span>
        <span class="w-match__tx">
          <small>Top match</small>
          <b>{{ top.title }}</b>
          <span class="w-match__price">
            <u-price :amount="price(top).now" :currency="price(top).currency" :class="{ '-sale': price(top).was }" />
            <s v-if="price(top).was"><u-price :amount="price(top).was" :currency="price(top).currency" /></s>
          </span>
          <em>See the product<v-icon size="18">chevron_right</v-icon></em>
        </span>
      </router-link>
    </template>
  </div>
</template>

<script>
import { currentCurrency } from "../../region-switcher/region";
import CurrencyMixin from "@selldone/components-vue/mixin/currency/CurrencyMixin.ts";
import { aisleImage, aisleIndex, dropSrcset, priceOf, productImage, productSrcset, tintFor } from "../../kalio/kalio-catalog";

export default {
  name: "WalioShelfTop",
  mixins: [CurrencyMixin],
  inject: ["$shop"],

  props: {
    mode: { type: String, default: "aisle" },
    aisle: { type: Object, default: null },
    categoryName: { type: String, default: null },
    filter: { type: Object, default: null },
    total: { type: Number, default: null },
    onSale: { type: Number, default: null },
    sellers: { type: Array, default: () => [] },
    products: { type: Array, default: () => [] },
  },

  data() {
    return { window, index: null };
  },

  computed: {
    currency() {
      return currentCurrency();
    },
    search() {
      return String(this.$route.query.search || "").trim();
    },
    deals() {
      return !!this.filter?.only_has_discount;
    },
    title() {
      if (this.search) return `Results for “${this.search}”`;
      if (this.deals) return "Today’s deals";
      return "All products";
    },
    crumb() {
      if (this.mode === "aisle") return this.aisle ? this.aisle.title || this.aisle.name : this.categoryName;
      return this.search ? "Search" : this.title;
    },
    tint() {
      return tintFor(this.aisle) || "#e6f1fc";
    },
    packs() {
      return this.products.filter((p) => p.icon).slice(0, 4);
    },
    top() {
      return this.products[0] || null;
    },
    hits() {
      if (!this.index || !this.products.length) return [];
      const all = this.total !== null && this.products.length >= this.total;
      const by = new Map();
      for (const p of this.products) {
        const aisle = this.index.get(p.category_id);
        if (!aisle) continue;
        if (!by.has(aisle.id)) by.set(aisle.id, { aisle, count: 0, image: aisleImage(aisle, 64) || productImage(p, true) });
        by.get(aisle.id).count++;
      }
      return [...by.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map((h) => ({
          ...h,
          count: all ? h.count : null,
          to: {
            name: window.$storefront.routes.SHOP_CATEGORY_PAGE,
            params: { category_name: h.aisle.name },
            query: this.search ? { search: this.search } : this.deals ? { filter: JSON.stringify({ only_has_discount: true }) } : {},
          },
        }));
    },
  },

  mounted() {
    if (this.mode !== "aisle") aisleIndex().then((index) => (this.index = index));
  },

  methods: {
    dropSrcset,
    srcset(p) {
      return productSrcset(p);
    },
    image(p, thumb = true) {
      return productImage(p, thumb);
    },
    price(p) {
      return priceOf(this.$shop, p, this.currency);
    },
    productTo(p) {
      return { name: window.$storefront.routes.PRODUCT_PAGE, params: { product_id: p.id } };
    },
  },
};
</script>
