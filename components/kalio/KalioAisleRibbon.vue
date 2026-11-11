<!--
  Kalio — Aisle row.

  Every aisle as a round picture on its own tint, read live from the shop's
  root categories in the merchant's order. A new aisle in the dashboard
  appears here, a removed one disappears, and a shop with no categories
  renders nothing rather than an empty heading.

  Counts are deliberately not shown: the category count is a cached number,
  and "0 products" on an aisle that is being restocked is worse than none.
-->
<template>
  <section v-if="busy || list.length" aria-labelledby="k-aisles-title" class="k-aisles k-wrap">
    <header class="k-section-head">
      <h2 id="k-aisles-title" class="k-section-head__title">{{ t("aisle.shopBy", "Shop by aisle") }}</h2>
      <router-link :to="allRoute" class="k-more">
        {{ t("listing.allProducts", "All products") }}
        <v-icon class="k-flip" size="20">chevron_right</v-icon>
      </router-link>
    </header>

    <div v-if="busy" aria-hidden="true" class="k-aisles__row" style="--k-cols: 8">
      <div v-for="n in 16" :key="'s' + n" class="k-aisle -skeleton">
        <span class="k-aisle__ring"></span>
        <span class="k-aisle__bar"></span>
      </div>
    </div>

    <nav v-else :style="{ '--k-cols': Math.ceil(list.length / 2) }" :aria-label="t('aisle.aisles', 'Aisles')" class="k-aisles__row">
      <router-link
        v-for="aisle in list"
        :key="aisle.id"
        :to="route(aisle)"
        class="k-aisle"
      >
        <span :style="{ '--k-tint': tint(aisle) }" class="k-aisle__ring">
          <img
            v-if="aisle.icon"
            :src="image(aisle)"
            alt=""
            height="104"
            loading="lazy"
            width="104"
          />
          <span v-else class="k-aisle__initial">{{ initial(aisle) }}</span>
        </span>
        <span class="k-aisle__label">{{ aisle.title || aisle.name }}</span>
      </router-link>
    </nav>
  </section>
</template>

<script>
import { aisleImage, aisleRoute, aisles, catalogueRoute, tintFor } from "./kalio-catalog";

export default {
  name: "KalioAisleRibbon",

  data() {
    return {
      list: [],
      busy: true,
    };
  },

  computed: {
    allRoute() {
      return catalogueRoute();
    },
  },

  mounted() {
    aisles()
      .then((list) => (this.list = list))
      .finally(() => (this.busy = false));
  },

  methods: {
    route: aisleRoute,
    tint: tintFor,
    image(aisle) {
      return aisleImage(aisle, 192);
    },
    initial(aisle) {
      return (aisle.title || aisle.name || "?").trim().charAt(0).toUpperCase();
    },
  },
};
</script>
