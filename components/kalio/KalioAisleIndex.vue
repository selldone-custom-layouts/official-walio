<!--
  Kalio — Aisle index.

  Every aisle as a line in a directory: a small packshot on the stone well,
  the aisle's name and the first line of its own description. It closes the
  product page, where a shopper who has finished with one product looks for
  the next aisle; the home page keeps its round aisle row.

  Read live from the shop's root categories in the merchant's order, like
  the aisle row: a new aisle appears, a removed one disappears, a shop with
  no categories renders nothing. No counts, for the same reason as the row:
  the category count is a cached number.
-->
<template>
  <section v-if="busy || list.length" aria-labelledby="k-aisle-index-title" class="k-aisle-index k-wrap">
    <header class="k-section-head">
      <h2 id="k-aisle-index-title" class="k-section-head__title">{{ t("aisle.shopBy", "Shop by aisle") }}</h2>
      <router-link :to="allRoute" class="k-more">
        {{ t("listing.allProducts", "All products") }}
        <v-icon class="k-flip" size="20">chevron_right</v-icon>
      </router-link>
    </header>

    <div v-if="busy" aria-hidden="true" class="k-aisle-index__grid">
      <div v-for="n in 8" :key="'s' + n" class="k-aisle-index__item -skeleton">
        <span class="k-aisle-index__well"></span>
        <span class="k-aisle-index__bar"></span>
      </div>
    </div>

    <nav v-else :aria-label="t('aisle.aisles', 'Aisles')" class="k-aisle-index__grid">
      <router-link v-for="aisle in list" :key="aisle.id" :to="route(aisle)" class="k-aisle-index__item">
        <span class="k-aisle-index__well">
          <img v-if="aisle.icon" :src="image(aisle)" alt="" height="44" loading="lazy" width="44" />
        </span>
        <span class="k-aisle-index__copy">
          <span class="k-aisle-index__name">{{ aisle.title || aisle.name }}</span>
          <span v-if="aisle.description" class="k-aisle-index__lede">{{ aisle.description }}</span>
        </span>
        <v-icon aria-hidden="true" class="k-aisle-index__go k-flip" size="18">chevron_right</v-icon>
      </router-link>
    </nav>
  </section>
</template>

<script>
import { aisleImage, aisleRoute, aisles, catalogueRoute } from "./kalio-catalog";

export default {
  name: "KalioAisleIndex",

  data() {
    return {
      busy: true,
      list: [],
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
    image(aisle) {
      return aisleImage(aisle, 96);
    },
  },
};
</script>
