<!--
  Kalio — Home.

  The front of the marketplace, built like a big grocery front: the deals
  counter, every aisle, then rows of products — each aisle in turn — with
  the aisle mosaic, the sellers and the market shelf set between them.
  Almost everything on the page is a product a shopper can add.

  It is shown on the bare shop page only. Any query — a search, a filter, a
  sort, "All products" — means the shopper wants the catalogue itself, and the
  shop page shows Selldone's listing instead.

  The aisle order comes from kalio-catalog's featured(): fresh, everyday
  aisles first, every other aisle after them in the merchant's order. Rows
  below the first two load as they approach the screen. The deals have no
  row of their own: the counter at the top is that row.
-->
<template>
  <div class="k-home">
    <kalio-hero />

    <kalio-aisle-ribbon />

    <kalio-rail
      v-for="aisle in leadAisles"
      :key="aisle.id"
      :dir="aisle.name"
      :more-to="aisleRoute(aisle)"
      :title="aisle.title || aisle.name"
      sort="bestselling"
    />

    <kalio-mosaic :aisles="mosaicAisles" />

    <kalio-seller-cards />

    <kalio-rail
      v-for="aisle in laterAisles.slice(0, ROWS_BEFORE_SHELF)"
      :key="aisle.id"
      :dir="aisle.name"
      :more-to="aisleRoute(aisle)"
      :title="aisle.title || aisle.name"
      lazy
      sort="bestselling"
    />

    <kalio-shelf :aisles="shelfAisles" />

    <kalio-rail
      v-for="aisle in laterAisles.slice(ROWS_BEFORE_SHELF)"
      :key="aisle.id"
      :dir="aisle.name"
      :more-to="aisleRoute(aisle)"
      :title="aisle.title || aisle.name"
      lazy
      sort="bestselling"
    />

    <div v-if="ordered.length" class="k-home__end k-wrap">
      <router-link :to="catalogueRoute" class="k-btn k-btn--line">
        {{ t("home.browseAll", "Browse every product") }}
        <v-icon class="k-flip" size="20">chevron_right</v-icon>
      </router-link>
    </div>
  </div>
</template>

<script>
import KalioHero from "./KalioHero.vue";
import KalioAisleRibbon from "./KalioAisleRibbon.vue";
import KalioRail from "./KalioRail.vue";
import KalioMosaic from "./KalioMosaic.vue";
import KalioSellerCards from "./KalioSellerCards.vue";
import KalioShelf from "./KalioShelf.vue";
import { aisleRoute, aisles, catalogueRoute, featured } from "./kalio-catalog";

const LEAD_ROWS = 2;
const ROWS_BEFORE_SHELF = 3;
const SHELF_TABS = 8;
const PROMO_PATTERN = /breakfast|cereal|snack/i;

export default {
  name: "KalioHome",
  components: { KalioHero, KalioAisleRibbon, KalioRail, KalioMosaic, KalioSellerCards, KalioShelf },

  data() {
    return {
      ordered: [],
      ROWS_BEFORE_SHELF,
    };
  },

  computed: {
    shopTitle() {
      return this.$store.getters.getShop?.title || "Kalio";
    },
    catalogueRoute() {
      return catalogueRoute();
    },
    leadAisles() {
      return this.ordered.slice(0, LEAD_ROWS);
    },
    laterAisles() {
      return this.ordered.slice(LEAD_ROWS);
    },
    /* Breakfast leads the mosaic and snacks follow when the shop has them;
       the featured aisles after the lead rows fill the other tiles. */
    mosaicAisles() {
      const label = (aisle) => `${aisle.title || ""} ${aisle.name || ""}`;
      const promos = this.ordered.filter((aisle) => PROMO_PATTERN.test(label(aisle)));
      const rest = this.laterAisles.filter((aisle) => !promos.includes(aisle));
      return [...promos.slice(0, 2), ...rest].slice(0, 4);
    },
    shelfAisles() {
      return this.ordered.slice(0, SHELF_TABS);
    },
  },

  mounted() {
    aisles().then((list) => (this.ordered = featured(list)));
  },

  methods: {
    aisleRoute,
  },
};
</script>
