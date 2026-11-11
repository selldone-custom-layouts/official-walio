<!--
  Kalio — a card's quantity in the basket.

  Once a product without sizes is in the basket, its card's "+" becomes
  "− n +": each "+" adds one more, "−" takes one away, and at one "−" takes
  the product out and the "+" comes back. As the foot of a home-shelf label
  (strip), or small on a journal card (inline).

  A product card's foot (card, 6 November 2026, after Amazon's grocery
  cards, which the owner pointed to): "Add to basket" across the card, and
  once tapped the same place reads "− 1 in basket +". A product with sizes
  says "See options", which opens the quick-buy sheet to pick one (the
  card's "+" used to open it without saying why). Out of stock, it says so.
  Laid into Selldone's card by kalio-card-basket.ts, or under a rail's card
  by KalioRail. `adder` is the card's own add (quickAdd through the page).

  The count changes the moment it is tapped and the basket follows
  (stepTo in kalio-basket.ts), so quick taps add up. It shows "1" as soon
  as "Add to basket" is pressed, before the server has answered.
-->
<template>
  <!-- A product card's foot: its own size container, so the words follow
       the pill's width, not the card's. -->
  <div v-if="card && foot" class="k-card-foot" @click.prevent.stop>
    <div
      v-if="foot === 'step'"
      :class="{ '-busy': busy }"
      :aria-label="t('card.qtyInBasket', 'Quantity in basket')"
      class="k-card-step -card"
      role="group"
    >
      <button :aria-label="shown > 1 ? t('cart.qty.fewer', 'One fewer') : t('cart.qty.remove', 'Remove from basket')" type="button" @click.prevent.stop="step(-1)">
        <v-icon size="19">{{ shown > 1 ? "remove" : "delete_outline" }}</v-icon>
      </button>
      <output aria-live="polite" class="k-card-step__count">{{ shown }}<small> {{ t("card.inBasket", "in basket") }}</small></output>
      <button :aria-label="t('cart.qty.more', 'One more')" type="button" @click.prevent.stop="step(1)">
        <v-icon size="19">add</v-icon>
      </button>
    </div>

    <button v-else-if="foot === 'add'" :class="{ '-options': sized }" class="k-card-add" type="button" @click.prevent.stop="add">
      <template v-if="sized">
        <span class="-long">{{ t("card.seeOptions", "See options") }}</span><span class="-short">{{ t("card.options", "Options") }}</span>
      </template>
      <template v-else>
        <v-icon size="18">add</v-icon><span class="-long">{{ t("card.addToBasket", "Add to basket") }}</span><span class="-short">{{ t("card.add", "Add") }}</span>
      </template>
    </button>

    <span v-else class="k-card-add -none">{{ t("card.outOfStock", "Out of stock") }}</span>
  </div>

  <div
    v-else-if="!card && line && shown > 0"
    :class="{ '-busy': busy, '-inline': inline, '-strip': strip }"
    :aria-label="t('card.qtyInBasket', 'Quantity in basket')"
    class="k-card-step"
    role="group"
    @click.prevent.stop
  >
    <button
      :aria-label="shown > 1 ? t('cart.qty.fewer', 'One fewer') : t('cart.qty.remove', 'Remove from basket')"
      type="button"
      @click.prevent.stop="step(-1)"
    >
      <v-icon :size="inline ? 18 : 20">{{ shown > 1 ? "remove" : "delete_outline" }}</v-icon>
    </button>
    <output aria-live="polite" class="k-card-step__count">
      {{ shown }}<small v-if="!inline">{{ t("card.inBasket", "in basket") }}</small>
    </output>
    <button :aria-label="t('cart.qty.more', 'One more')" type="button" @click.prevent.stop="step(1)">
      <v-icon :size="inline ? 18 : 20">add</v-icon>
    </button>
  </div>
</template>

<script>
import { basketLine, hasSizes, pendingLine, settling, shownCount, stepTo } from "./kalio-basket";

export default {
  name: "KalioCardStep",

  props: {
    product: { type: Object, required: true },
    /** Small, beside a price or over a small picture, without "in basket". */
    inline: Boolean,
    /** The foot of a home-shelf label: full width, square top corners. */
    strip: Boolean,
    /** A product card's foot: "Add to basket", "See options" or the count. */
    card: Boolean,
    /** The card's add (opens the sheet for a product with sizes). */
    adder: { type: Function, default: null },
    /** Whether the card may add (Selldone's own conditions for its "+"). */
    addable: { type: Function, default: null },
    /** Whether the card is for sale here but has none left. */
    soldOut: { type: Function, default: null },
  },

  computed: {
    sized() {
      return hasSizes(this.product);
    },
    line() {
      if (this.sized) return null;
      return basketLine(this, this.product) || pendingLine(this.product);
    },
    shown() {
      return shownCount(this.product, this.line);
    },
    busy() {
      return settling(this.product, this.line);
    },
    can_add() {
      return !!this.adder && (this.addable ? !!this.addable() : true);
    },
    sold_out() {
      return !!this.soldOut && !!this.soldOut();
    },
    /** What a card's foot shows: the count, the add, out of stock, or none. */
    foot() {
      if (this.line && this.shown > 0) return "step";
      if (this.can_add) return "add";
      if (this.sold_out) return "none";
      return null;
    },
  },

  methods: {
    step(delta) {
      if (!this.line) return;
      stepTo(this, this.product, this.line, this.shown + delta);
    },
    add() {
      this.adder?.();
    },
  },
};
</script>
