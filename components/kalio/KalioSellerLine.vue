<!--
  Kalio — Seller line.

  The line under a product card that makes Kalio read as a marketplace: who
  sells this. One seller is named and linked to their shop; several are
  shown as a stack of marks with a count, and the product page lists their
  offers side by side. A product with no seller on record shows nothing —
  never a guess.
-->
<template>
  <router-link
    v-if="sellers.length === 1"
    :to="route(sellers[0])"
    class="k-by"
  >
    <span class="k-by__marks">
      <img v-if="mark(sellers[0])" :src="mark(sellers[0])" alt="" height="20" width="20" loading="lazy" />
    </span>
    {{ t("seller.soldBy", "Sold by {name}", { name: sellers[0].name }) }}
  </router-link>

  <span v-else-if="sellers.length > 1" class="k-by">
    <span class="k-by__marks">
      <template v-for="seller in sellers.slice(0, 3)" :key="seller.id">
        <img v-if="mark(seller)" :src="mark(seller)" alt="" height="20" width="20" loading="lazy" />
      </template>
    </span>
    <span class="k-by__count">{{ t("seller.count", { one: "{n} seller", other: "{n} sellers" }, { n: sellers.length }) }}</span>
    <span class="k-sr">: {{ sellers.map((seller) => seller.name).join(", ") }}</span>
  </span>
</template>

<script>
import { sellerRoute, vendorImage } from "./kalio-catalog";

export default {
  name: "KalioSellerLine",

  props: {
    sellers: { type: Array, default: () => [] },
  },

  methods: {
    route: sellerRoute,
    mark(seller) {
      return vendorImage(seller, true);
    },
  },
};
</script>
