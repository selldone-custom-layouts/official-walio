<!--
  Kalio — Hero: the deals counter.

  The top of the home page is a deep-green board: the week's offer on one
  side, the deals themselves on the other — real products a shopper can add
  to the basket without leaving the home page. Everything on it is live:

  - The deals are the shop's discounted best sellers, dealt out aisle by
    aisle so one aisle does not fill the row, in a KalioRail — each card is
    the platform card with its quick-buy sheet.
  - The headline's saving is the best one among them, by Selldone's own
    discount rule; the aisle chips are the aisles those deals come from.
  - A shop with no discounts gets the same board with its best sellers and
    a headline that promises no saving.

  No delivery, timing or count claim is made anywhere.
-->
<template>
  <section aria-labelledby="k-counter-title" class="k-hero k-wrap">
    <div class="k-counter">
      <div class="k-counter__copy">
        <p class="k-eyebrow">{{ t("hero.eyebrow", "This week at {shop}", { shop: shopTitle }) }}</p>
        <h2 id="k-counter-title" class="k-counter__title">
          {{ t("hero.title", "Fresh picks,") }}
          <em v-if="best">{{ t("hero.upTo", "up to {percent}% off", { percent: best }) }}</em>
          <em v-else-if="has_deals === false">{{ t("hero.fromEveryAisle", "from every aisle") }}</em>
        </h2>
        <p class="k-counter__lede">
          <template v-if="has_deals === false">
            {{ t("hero.lede.bestSellers", "{shop}’s best sellers — add them to your basket right here.", { shop: shopTitle }) }}
          </template>
          <template v-else>
            {{ t("hero.lede.savings", "Real savings from {shop}’s sellers — add them to your basket right here.", { shop: shopTitle }) }}
          </template>
        </p>
        <div class="k-counter__ctas">
          <router-link :to="has_deals === false ? catalogueRoute : dealsRoute" class="k-btn k-btn--light">
            {{ has_deals === false ? t("home.browseAll", "Browse every product") : t("hero.shopAllDeals", "Shop all deals") }}
            <v-icon class="k-flip" size="20">chevron_right</v-icon>
          </router-link>
          <button class="k-btn k-btn--ghost" type="button" @click="toAisles">{{ t("hero.browseAisles", "Browse aisles") }}</button>
        </div>
        <div v-if="chips.length" class="k-counter__in">
          {{ t("hero.dealsWaitingIn", "Deals waiting in") }}
          <nav :aria-label="t('hero.aislesWithDeals', 'Aisles with deals')" class="k-counter__chips">
            <router-link v-for="aisle in chips" :key="aisle.id" :to="aisleRoute(aisle)" class="k-counter__chip">
              <img v-if="aisle.icon" :src="aisleImage(aisle, 64)" alt="" height="26" width="26" />
              {{ aisle.title || aisle.name }}
            </router-link>
          </nav>
        </div>
      </div>

      <kalio-rail
        :key="has_deals === false ? 'popular' : 'deals'"
        :filter="has_deals === false ? null : { only_has_discount: true }"
        :limit="16"
        :title="has_deals === false ? t('hero.popularThisWeek', 'Popular this week') : t('hero.bestSavings', 'Today’s best savings')"
        class="k-counter__rail"
        sort="bestselling"
        spread
        @loaded="onLoaded"
      />
    </div>
  </section>
</template>

<script>
import KalioRail from "./KalioRail.vue";
import {
  aisleImage,
  aisleIndex,
  aisleRoute,
  catalogueRoute,
  dealsRoute,
  featured,
  percentOff,
} from "./kalio-catalog";

const CHIPS = 3;

export default {
  name: "KalioHero",
  components: { KalioRail },

  data() {
    return {
      /* null until the deals have been read. */
      has_deals: null,
      best: 0,
      chips: [],
    };
  },

  computed: {
    shop() {
      return this.$store.getters.getShop;
    },
    shopTitle() {
      return this.shop?.title || "Kalio";
    },
    dealsRoute() {
      return dealsRoute();
    },
    catalogueRoute() {
      return catalogueRoute();
    },
  },

  methods: {
    aisleRoute,
    aisleImage,

    async onLoaded(products) {
      if (this.has_deals === false) return;
      if (!products.length) {
        this.has_deals = false;
        return;
      }
      this.has_deals = true;
      this.best = Math.max(0, ...products.map((product) => percentOff(this.shop, product)));

      /* The aisles the deals come from, in the order the home page features
         aisles, so the chips name fresh aisles before household ones. */
      const index = await aisleIndex();
      const withDeals = new Set(products.map((product) => product.category_id));
      this.chips = featured([...index.values()])
        .filter((aisle) => withDeals.has(aisle.id))
        .slice(0, CHIPS);
    },

    toAisles() {
      document.getElementById("k-aisles-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  },
};
</script>
