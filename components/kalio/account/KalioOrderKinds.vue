<!--
  Kalio — which kind of orders to see. Groceries (Selldone's physical
  orders) are the shop's own; the other kinds Selldone keeps (virtual
  items, downloads, services, subscriptions, in store, custom orders) sit
  in the menu, each with its count when Selldone has one.
-->
<template>
  <v-menu location="bottom end" offset="6">
    <template #activator="{ props }">
      <button v-bind="props" class="k-kinds" type="button">
        <v-icon size="19">{{ current === "PHYSICAL" ? "local_grocery_store" : "receipt_long" }}</v-icon>
        {{ currentWord }}
        <v-icon class="k-kinds__chev" size="18">expand_more</v-icon>
      </button>
    </template>
    <div class="k-kinds__menu">
      <p class="k-kinds__label">{{ t("orders.kinds.label", "Kind of order") }}</p>
      <router-link :class="{ '-on': current === 'PHYSICAL' }" :to="groceries">
        <v-icon size="19">local_grocery_store</v-icon>{{ t("orders.kind.groceries", "Groceries") }}
      </router-link>
      <router-link v-for="kind in kinds" :key="kind.key" :class="{ '-on': current === kind.key }" :to="kind.route">
        <v-icon size="19">{{ ICONS[kind.key] }}</v-icon>{{ kind.word }}<em v-if="countOf(kind.key)">{{ countOf(kind.key) }}</em>
      </router-link>
    </div>
  </v-menu>
</template>

<script>
import { t } from "../i18n/kalio-i18n";
import { otherKinds } from "./kalio-account";

const ICONS = { VIRTUAL: "language", FILE: "download", SERVICE: "support_agent", SUBSCRIPTION: "autorenew", POS: "storefront", AVO: "edit_note" };

export default {
  name: "KalioOrderKinds",
  props: {
    /** PHYSICAL, VIRTUAL, FILE, SERVICE, SUBSCRIPTION, POS or AVO */
    current: { type: String, default: "PHYSICAL" },
  },
  data() {
    return { ICONS };
  },
  computed: {
    kinds() {
      return otherKinds().filter((kind) => this.USER() || !["POS", "AVO"].includes(kind.key));
    },
    groceries() {
      return { name: window.$storefront.routes.HISTORY_ORDERS_PHYSICAL };
    },
    currentWord() {
      if (this.current === "PHYSICAL") return t("orders.kind.groceries", "Groceries");
      return this.kinds.find((kind) => kind.key === this.current)?.word || t("orders.kind.orders", "Orders");
    },
  },
  methods: {
    countOf(key) {
      const state = this.getOrdersState?.() || [];
      return state.filter((it) => it.type === key).reduce((sum, it) => sum + (it.count || 0), 0) || null;
    },
  },
};
</script>
