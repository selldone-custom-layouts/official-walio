<!--
  Kalio — In the basket (product page and quick-buy sheet).

  Once the product is in the basket the buy button gives way to this:
  how many are in the basket and from which seller, a quantity stepper, and
  checkout with the basket's total beside it. Selldone turned the button
  into a blue number field and pinned a green strip to the window's foot;
  design C of three drawn on 3 November 2026
  (../kalio-design/basket-options/).

  The stepper sets the line's count through the storefront's own basket
  methods (stepTo in kalio-basket.ts): the number changes as it is tapped
  and the basket follows, one request at a time. At one, "−" takes the
  product out and the buy button comes back once the basket has answered.
-->
<template>
  <div :class="{ '-busy': busy }" class="k-basket-line">
    <p class="k-basket-line__cap">
      <i aria-hidden="true"></i>
      <template v-if="shown > 0">
        {{
          seller
            ? t("pdp.basket.inBasketFrom", { one: "{n} in your basket, from {seller}", other: "{n} in your basket, from {seller}" }, { n: shown, seller: seller })
            : t("pdp.basket.inBasket", { one: "{n} in your basket", other: "{n} in your basket" }, { n: shown })
        }}
      </template>
      <template v-else>{{ t("pdp.basket.removing", "Taking it out of your basket…") }}</template>
    </p>
    <div class="k-basket-line__row">
      <div :aria-label="t('pdp.basket.qty', 'Quantity in basket')" class="k-basket-line__qty" role="group">
        <button
          :aria-label="shown > 1 ? t('pdp.basket.oneFewer', 'One fewer') : t('pdp.basket.remove', 'Remove from basket')"
          :disabled="shown <= 0"
          type="button"
          @click="step(-1)"
        >
          <v-icon size="22">{{ shown > 1 ? "remove" : "delete_outline" }}</v-icon>
        </button>
        <output aria-live="polite">{{ shown }}</output>
        <button :disabled="shown >= max" :aria-label="t('pdp.basket.oneMore', 'One more')" type="button" @click="step(1)">
          <v-icon size="22">add</v-icon>
        </button>
      </div>
      <router-link :to="checkoutRoute" class="k-basket-line__go">
        {{ t("pdp.basket.checkout", "Checkout") }}
        <template v-if="total !== null">
          <span aria-hidden="true">·</span>
          <span>{{ money(total, currency) }}</span>
        </template>
      </router-link>
    </div>
  </div>
</template>

<script>
import { money } from "../../walio/walio-home";
import { settling, shownCount, stepTo } from "../kalio-basket";

export default {
  name: "KalioBasketLine",

  props: {
    /** The basket line for this product (and size). */
    line: { type: Object, required: true },
    product: { type: Object, required: true },
    /** The chosen offer, for the seller's name. */
    vendorProduct: { type: Object, default: null },
    /** Stock the stepper may not pass. */
    stock: { type: Number, default: null },
  },

  computed: {
    shown() {
      return shownCount(this.product, this.line);
    },
    busy() {
      return settling(this.product, this.line);
    },
    max() {
      return this.stock ?? this.vendorProduct?.quantity ?? this.product.quantity ?? 99;
    },
    seller() {
      return this.vendorProduct?.vendor?.name || null;
    },
    basket() {
      return this.getBasket(this.product.type || "PHYSICAL");
    },
    total() {
      const price = this.basket?.bill?.price;
      return typeof price === "number" ? price : null;
    },
    currency() {
      return this.basket?.bill?.currency || this.basket?.currency;
    },
    checkoutRoute() {
      return { name: window.$storefront.routes.BASKET_PAGE, params: { type: this.product.type || "PHYSICAL" } };
    },
  },

  methods: {
    money,
    step(delta) {
      stepTo(this, this.product, this.line, this.shown + delta);
    },
  },
};
</script>
