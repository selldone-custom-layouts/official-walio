<!--
  Kalio — "Buy again": what the shopper has ordered before, newest first,
  as the shop sells it today (price, seller), each with a "+" that adds
  one (quickAdd in kalio-basket.ts; a product with sizes opens its page).
  Products the shop no longer sells are left out; with none left the
  section does not show.
-->
<template>
  <section v-if="products.length" class="k-again">
    <header class="k-sec__head">
      <h2>{{ t("account.buyAgain.title", "Buy again") }}</h2>
      <p>{{ t("account.buyAgain.lede", "From your past orders, at today's prices.") }}</p>
    </header>
    <div class="k-again__row">
      <div v-for="product in products" :key="product.id" class="k-again__item">
        <div class="k-again__pic">
          <router-link :aria-label="product.title" :to="productRoute(product)">
            <img v-if="image(product)" :src="image(product)" alt="" loading="lazy" />
          </router-link>
          <span v-if="inBasket(product)" class="k-again__have">{{ t("account.buyAgain.inBasket", "{n} in basket", { n: inBasket(product) }) }}</span>
          <button :aria-label="t('account.buyAgain.add', 'Add {name}', { name: product.title })" :disabled="adding(product)" class="k-again__add" type="button" @click="add(product)">
            <v-progress-circular v-if="adding(product)" indeterminate size="16" width="2" />
            <v-icon v-else size="20">add</v-icon>
          </button>
        </div>
        <router-link :to="productRoute(product)" class="k-again__name">{{ product.title }}</router-link>
        <div class="k-again__price">
          <u-price :amount="priceOf(product).now" :currency="priceOf(product).currency" />
          <small v-if="sellerOf(product)">{{ sellerOf(product) }}</small>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { currentCurrency } from "../../region-switcher/region";
import CurrencyMixin from "@selldone/components-vue/mixin/currency/CurrencyMixin.ts";
import { basketLine, pendingLine, quickAdd, shownCount } from "../kalio-basket";
import { offers, priceOf, productImage } from "../kalio-catalog";
import { t } from "../i18n/kalio-i18n";
import { account } from "./kalio-account";

export default {
  name: "KalioBuyAgain",
  mixins: [CurrencyMixin],
  inject: ["$shop"],

  props: {
    count: { type: Number, default: 6 },
  },

  data() {
    return {
      catalogue: new Map(),
      sellersOf: new Map(),
    };
  },

  computed: {
    currency() {
      return currentCurrency();
    },
    products() {
      if (!this.catalogue.size) return [];
      const ids = [];
      for (const order of account.orders) for (const item of order.items || []) if (!ids.includes(item.product_id)) ids.push(item.product_id);
      return ids
        .map((id) => this.catalogue.get(id))
        .filter((product) => product && product.quantity > 0)
        .slice(0, this.count);
    },
  },

  created() {
    offers().then(({ shelfOf, sellersOf }) => {
      const map = new Map();
      for (const shelf of shelfOf.values()) for (const product of shelf) if (!map.has(product.id)) map.set(product.id, product);
      this.catalogue = map;
      this.sellersOf = sellersOf;
    });
  },

  methods: {
    image(product) {
      return productImage(product, true);
    },
    priceOf(product) {
      return priceOf(this.$shop, product, this.currency);
    },
    sellerOf(product) {
      const list = this.sellersOf.get(product.id) || [];
      return list.length > 1 ? t("account.buyAgain.sellers", { one: "{n} seller", other: "{n} sellers" }, { n: list.length }) : list[0]?.name || null;
    },
    inBasket(product) {
      const line = basketLine(this, product) || pendingLine(product);
      return line ? shownCount(product, line) : 0;
    },
    adding(product) {
      return !!pendingLine(product);
    },
    add(product) {
      quickAdd(this, product, (picked) => this.$router.push(this.productRoute(picked)));
    },
    productRoute(product) {
      return { name: window.$storefront.routes.PRODUCT_PAGE, params: { product_id: product.id } };
    },
  },
};
</script>
