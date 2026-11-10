<!--
  Kalio — "Often added".

  A few products to add with one tap, under the basket (the drawer and the
  basket page): none already in the basket, none that needs a size chosen,
  in stock; first from the aisles the basket already has, best deal first.
  Each "+" adds straight away (quickAdd in kalio-basket.ts) and turns into a
  spinner until the basket answers; the product then leaves the row and the
  next one takes its place.
-->
<template>
  <div v-if="suggestions.length" class="k-often">
    <p class="k-eyebrow k-often__label">Often added</p>
    <div :style="{ '--k-often-cols': count }" class="k-often__row">
      <div v-for="product in suggestions" :key="product.id" class="k-often__item">
        <div class="k-often__pic">
          <router-link :aria-label="product.title" :to="productRoute(product.id)" @click="$emit('navigate')">
            <img v-if="image(product)" :src="image(product)" :srcset="srcset(product)" alt="" loading="lazy" sizes="(max-width: 600px) 30vw, 160px" @error="dropSrcset" />
          </router-link>
          <button
            :aria-label="`Add ${product.title}`"
            :disabled="adding(product)"
            class="k-often__add"
            type="button"
            @click="add(product)"
          >
            <v-progress-circular v-if="adding(product)" indeterminate size="16" width="2" />
            <v-icon v-else size="18">add</v-icon>
          </button>
        </div>
        <router-link :to="productRoute(product.id)" class="k-often__name" @click="$emit('navigate')">
          {{ product.title }}
        </router-link>
        <u-price :amount="priceOf(product).now" :currency="priceOf(product).currency" class="k-often__price" />
      </div>
    </div>
  </div>
</template>

<script>
import { currentCurrency } from "../region-switcher/region";
import CurrencyMixin from "@selldone/components-vue/mixin/currency/CurrencyMixin.ts";
import { hasSizes, pendingLine, quickAdd } from "./kalio-basket";
import { offers, priceOf, productImage, productSrcset, dropSrcset } from "./kalio-catalog";

export default {
  name: "KalioOftenAdded",
  mixins: [CurrencyMixin],
  inject: ["$shop"],

  props: {
    /** How many to show (and columns on a wide screen). */
    count: { type: Number, default: 3 },
  },

  /* navigate: a product was opened (the drawer closes). */
  emits: ["navigate"],

  data() {
    return {
      catalogue: [],
    };
  },

  computed: {
    currency() {
      return currentCurrency();
    },

    basketItems() {
      return this.getBaskets().flatMap((basket) => basket?.items || []);
    },

    suggestions() {
      if (!this.catalogue.length) return [];
      const inBasket = new Set(this.basketItems.map((item) => item.product_id));
      const aisles = new Set(this.basketItems.map((item) => item.product?.category_id).filter(Boolean));
      return this.catalogue
        .filter((product) => !inBasket.has(product.id) && !hasSizes(product) && product.quantity > 0)
        .map((product) => ({
          product,
          near: aisles.has(product.category_id) ? 1 : 0,
          off: product.discount && product.price ? product.discount / product.price : 0,
        }))
        .sort((a, b) => b.near - a.near || b.off - a.off || a.product.id - b.product.id)
        .slice(0, this.count)
        .map(({ product }) => product);
    },
  },

  created() {
    offers().then(({ shelfOf }) => {
      const seen = new Map();
      for (const shelf of shelfOf.values()) for (const product of shelf) if (!seen.has(product.id)) seen.set(product.id, product);
      this.catalogue = [...seen.values()];
    });
  },

  methods: {
    srcset(product) {
      return productSrcset(product);
    },
    dropSrcset,
    image(product) {
      return productImage(product, true);
    },

    priceOf(product) {
      return priceOf(this.$shop, product, this.currency);
    },

    /* Its "+" was pressed and the basket has not answered yet. */
    adding(product) {
      return !!pendingLine(product);
    },

    add(product) {
      quickAdd(this, product, (picked) => {
        this.$emit("navigate");
        this.$router.push(this.productRoute(picked.id));
      });
    },

    productRoute(id) {
      return { name: window.$storefront.routes.PRODUCT_PAGE, params: { product_id: id } };
    },
  },
};
</script>
