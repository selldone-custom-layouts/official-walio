<!--
  Kalio — a product card's rating line (design A of the reviews options,
  7 November 2026): "★★★★☆ 4.2 (19)" on one line under the name, small amber
  stars, the score and how many people rated it. Selldone's own line (big
  yellow stars and "4.2 ● 19 reviews", cut to "19 rev…" in a card) is hidden
  in kalio-platform.scss. Nothing shows until somebody has rated the product.
  Laid into Selldone's card by kalio-card-basket.ts.
-->
<template>
  <div
    v-if="count > 0 && rate > 0"
    :aria-label="t('card.rating', { one: 'Rated {score} out of 5 by {n} person', other: 'Rated {score} out of 5 by {n} people' }, { n: count, score })"
    class="k-card-rate"
    role="img"
  >
    <span :style="{ '--k-rate': rate }" class="k-stars"></span>
    <b>{{ score }}</b>
    <span class="k-card-rate__n">({{ short }})</span>
  </div>
</template>

<script>
import { t } from "./i18n/kalio-i18n";

export default {
  name: "KalioCardRating",

  props: {
    product: { type: Object, required: true },
  },

  computed: {
    rate() {
      return Math.min(5, Math.max(0, Number(this.product?.rate) || 0));
    },
    count() {
      return Number(this.product?.rate_count) || 0;
    },
    score() {
      return this.rate.toFixed(1);
    },
    /** 1240 reads "1.2k"; a card has no room for "1,240". */
    short() {
      const n = this.count;
      if (n < 1000) return String(n);
      return t("card.thousands", "{n}k", { n: (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "") });
    },
  },
};
</script>
