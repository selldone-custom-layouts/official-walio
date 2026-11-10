<!--
  Kalio — a small product card for the journal (5 November 2026).

  The journal's "On offer this week" and a post's shopping list: the pack on
  the shop's warm well, a "+" in its corner, the price (and what it was) and
  the name. "+" puts it straight in the basket; in the basket the "+"
  becomes a small "− n +" on the well's foot, as on the catalogue's cards.
  A product with sizes asks its parent to open the quick-buy sheet.
-->
<template>
  <div class="k-mini">
    <div class="k-mini__well">
      <router-link :to="productRoute" aria-hidden="true" tabindex="-1">
        <img :src="picture" :srcset="srcset(product)" alt="" loading="lazy" sizes="64px" @error="dropSrcset" />
      </router-link>
      <kalio-card-step v-if="inBasket" :product="product" class="k-mini__step" inline />
      <button v-else :aria-label="`Add ${product.title}`" class="k-mini__add" type="button" @click="add">
        <v-icon size="20">add</v-icon>
      </button>
    </div>
    <span class="k-mini__price">
      <u-price :amount="price.now" :currency="price.currency" />
      <s v-if="price.was"><u-price :amount="price.was" :currency="price.currency" /></s>
    </span>
    <router-link :to="productRoute" class="k-mini__name">{{ product.title }}</router-link>
  </div>
</template>

<script>
import { currentCurrency } from "../../region-switcher/region";
import CurrencyMixin from "@selldone/components-vue/mixin/currency/CurrencyMixin.ts";
import KalioCardStep from "../KalioCardStep.vue";
import { basketLine, hasSizes, pendingLine, quickAdd, shownCount } from "../kalio-basket";
import { priceOf, productImage, productSrcset, dropSrcset } from "../kalio-catalog";

export default {
  name: "KalioMiniProduct",
  components: { KalioCardStep },
  mixins: [CurrencyMixin],
  emits: ["sheet"],

  props: {
    product: { type: Object, required: true },
  },

  computed: {
    currency() {
      return currentCurrency();
    },
    price() {
      return priceOf(this.$store.getters.getShop, this.product, this.currency);
    },
    picture() {
      return productImage(this.product);
    },
    productRoute() {
      return { name: window.$storefront.routes.PRODUCT_PAGE, params: { product_id: this.product.id } };
    },
    inBasket() {
      return (
        !hasSizes(this.product) &&
        shownCount(this.product, basketLine(this, this.product) || pendingLine(this.product)) > 0
      );
    },
  },

  methods: {
    srcset(product) {
      return productSrcset(product);
    },
    dropSrcset,
    add() {
      return quickAdd(this, this.product, (picked) => this.$emit("sheet", picked));
    },
  },
};
</script>
