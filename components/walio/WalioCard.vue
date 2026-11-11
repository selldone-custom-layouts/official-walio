<!--
  Walio — a product card (design A, 7 November 2026).

  A big-box store's card, not Selldone's: the packshot on a light-grey well
  with the saving on a red tag, then the price first and large — red on
  offer, with "reg" and the old price beside it — the name in two lines,
  the rating, the unit and who sells it, and a full-width red "Add to cart"
  at the foot. The foot is Kalio's KalioCardStep, so every behaviour the
  owner asked for stays: "Add to cart" becomes "− n in cart +" in place, a
  product with sizes says "Choose options" and opens the quick-buy sheet,
  and nothing pops up.

  Prices are Selldone's own (discount dates, variants, the shopper's
  currency) through kalio-catalog's priceOf. The card emits "quick-buy";
  the row that shows it opens the sheet or adds straight away (quickAdd).
-->
<template>
  <article :class="{ '-sale': was }" class="t-card">
    <router-link :to="to" class="t-card__pic" tabindex="-1" aria-hidden="true">
      <img v-if="picture" :alt="product.title" :src="picture" :srcset="srcset(product)" loading="lazy" sizes="(max-width: 760px) 53vw, 260px" @error="dropSrcset" />
      <span v-if="off > 0" class="t-card__tag">-{{ off }}%</span>
    </router-link>

    <div class="t-card__price">
      <u-price :amount="now" :currency="price.currency" class="t-card__now" />
      <template v-if="was">
        <span class="t-card__was">{{ t("walio.card.reg", "reg") }} <u-price :amount="was" :currency="price.currency" /></span>
        <em class="t-card__sale">{{ t("walio.card.sale", "Sale") }}</em>
      </template>
    </div>

    <router-link :to="to" class="t-card__name">{{ product.title }}</router-link>

    <kalio-card-rating :product="product" class="t-card__rate" />

    <p v-if="product.unit" class="t-card__unit">{{ t("rail.perUnit", "per {unit}", { unit: product.unit }) }}</p>
    <kalio-seller-line :sellers="sellers" class="t-card__by" />

    <kalio-card-step
      :addable="() => !!product.quantity"
      :adder="() => $emit('quick-buy', product)"
      :product="product"
      :sold-out="() => !product.quantity"
      card
      class="t-card__foot"
    />
  </article>
</template>

<script>
import { currentCurrency } from "../region-switcher/region";
import CurrencyMixin from "@selldone/components-vue/mixin/currency/CurrencyMixin.ts";
import KalioCardStep from "../kalio/KalioCardStep.vue";
import KalioCardRating from "../kalio/KalioCardRating.vue";
import KalioSellerLine from "../kalio/KalioSellerLine.vue";
import { percentOff, priceOf, productImage, productSrcset, dropSrcset } from "../kalio/kalio-catalog";

export default {
  name: "WalioCard",
  components: { KalioCardStep, KalioCardRating, KalioSellerLine },
  mixins: [CurrencyMixin],

  props: {
    product: { type: Object, required: true },
    /** The sellers that offer it (kalio-catalog's offers()). */
    sellers: { type: Array, default: () => [] },
  },

  emits: ["quick-buy"],

  computed: {
    shop() {
      return this.$store.getters.getShop;
    },
    currency() {
      return currentCurrency();
    },
    price() {
      return priceOf(this.shop, this.product, this.currency);
    },
    now() {
      return this.price.now;
    },
    was() {
      return this.price.was;
    },
    off() {
      return percentOff(this.shop, this.product);
    },
    /* The original stays the src; the srcset (productSrcset) gives the
       browser the size the card is shown at. */
    picture() {
      return productImage(this.product);
    },
    to() {
      return { name: window.$storefront.routes.PRODUCT_PAGE, params: { product_id: this.product.id } };
    },
  },

  methods: {
    srcset(product) {
      return productSrcset(product);
    },
    dropSrcset,
  },
};
</script>
