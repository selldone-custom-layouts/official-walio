<!--
  The "⇄ Compare 2" pill (8 November 2026, first in Dino).

  The same pill as Selldone's SComparisonButton (kalio-platform.scss,
  .k-compare-fab), but it opens the Layout's own compare page
  (KalioCompare, design 1 of the two mockups, the owner's pick) instead of
  Selldone's full-screen table. The page's address carries the list, so it
  can be shared. It bumps once when a product joins the list.
-->
<template>
  <div v-if="products.length" class="s--storefront-products-comparison-button">
    <button
      :aria-label="t('compare.fab.label', { one: 'Compare {n} product', other: 'Compare {n} products' }, { n: products.length })"
      :class="{ '-bump': bump }"
      class="s--storefront-products-comparison-circle-progress k-compare-fab k-cmp-fab"
      type="button"
      @click="open"
    >
      <v-icon :size="20">compare_arrows</v-icon>
      <span>{{ $t("product_comparison.action_button") }}</span>
      <b class="k-compare-fab__n">{{ products.length }}</b>
    </button>
  </div>
</template>

<script>
import { compareListParam } from "./kalio-compare";

export default {
  name: "KalioCompareButton",

  data: () => ({ bump: false }),

  computed: {
    products() {
      return this.$store.getters.getProductsComparison || [];
    },
  },

  watch: {
    "products.length"(now, before) {
      if (!(now > (before || 0))) return;
      this.bump = false;
      this.$nextTick(() => {
        this.bump = true;
        clearTimeout(this.bump_timer);
        this.bump_timer = setTimeout(() => (this.bump = false), 1400);
      });
    },
  },

  beforeUnmount() {
    clearTimeout(this.bump_timer);
  },

  methods: {
    open() {
      this.$router.push({
        name: window.$storefront.routes.COMPARISON_PAGE,
        query: { list: compareListParam(this.products.map((p) => ({ p: p.id, v: p.variant?.id || null }))) },
      });
    },
  },
};
</script>
