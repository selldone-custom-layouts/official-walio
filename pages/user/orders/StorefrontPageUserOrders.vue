<!--
  - Copyright (c) 2023. Selldone® Business OS™
  -
  - Kalio (4 November 2026): Selldone's row of order-type icons is gone.
  - Grocery orders are Kalio's own list, which carries its own heading and
  - the kind picker (KalioOrderKinds); the other kinds (virtual, downloads,
  - services, subscriptions, in store, custom orders) keep Selldone's table
  - under a Kalio heading with the same picker.
  -->

<template>
  <div class="k-orders">
    <header v-if="kind !== 'PHYSICAL'" class="k-board__head">
      <div class="k-board__titles">
        <h2>{{ title }}</h2>
        <p>{{ t("orders.kinds.apart", "Kept apart from your grocery orders.") }}</p>
      </div>
      <kalio-order-kinds :current="kind" />
    </header>
    <router-view :class="{ 'k-orders__selldone': kind !== 'PHYSICAL' }" />
  </div>
</template>

<script lang="ts">
import KalioOrderKinds from "../../../components/kalio/account/KalioOrderKinds.vue";
import { otherKinds } from "../../../components/kalio/account/kalio-account";
import { t } from "../../../components/kalio/i18n/kalio-i18n";

export default {
  name: "StorefrontPageUserOrders",
  components: { KalioOrderKinds },

  computed: {
    kind() {
      const r = window.$storefront.routes;
      const byRoute = {
        [r.HISTORY_ORDERS_VIRTUAL]: "VIRTUAL",
        [r.HISTORY_ORDERS_FILE]: "FILE",
        [r.HISTORY_ORDERS_SERVICE]: "SERVICE",
        [r.HISTORY_ORDERS_SUBSCRIPTION]: "SUBSCRIPTION",
        [r.HISTORY_ORDERS_POS]: "POS",
        [r.HISTORY_ORDERS_AVOCADO]: "AVO",
      };
      return byRoute[this.$route.name] || "PHYSICAL";
    },
    title() {
      return otherKinds().find((k) => k.key === this.kind)?.word || t("orders.kind.orders", "Orders");
    },
  },

  watch: {
    $route() {
      this.toGroceries();
    },
  },

  created() {
    this.setPageTitle(t("account.pageTitle.orders", "My orders"));
    this.toGroceries();
  },

  methods: {
    /** /user/orders alone opens the grocery orders. */
    toGroceries() {
      if (this.$route.name === window.$storefront.routes.ORDERS_PAGE) this.$router.replace({ name: window.$storefront.routes.HISTORY_ORDERS_PHYSICAL });
    },
  },
};
</script>
