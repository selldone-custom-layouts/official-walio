<!--
  Kalio — Market shelf.

  A shop shelf in the middle of the home page: pick an aisle from the tabs
  and its best sellers stand on a wooden board, each with a shelf-edge label
  under it — the price, then what it was or the unit it is sold by, then the
  name, and at the label's foot a strip: "+ Add", and once the product is in
  the basket "− n +" in the same place (design A, chosen by the owner on 5
  November 2026, so nothing jumps onto the packshot or over the price). A
  product with sizes keeps "+ Add", which opens the quick-buy sheet. A label
  on offer is yellow with the saving on a coral sticker, as a supermarket
  marks one.

  The aisles are passed in by the home page. An aisle's products are read
  the first time its tab is chosen, and the first tab only when the shelf is
  about to scroll into view. Prices are Selldone's own, in the shopper's
  currency; nothing on the shelf is named by hand.
-->
<template>
  <section v-if="list.length" ref="root" aria-labelledby="k-shelf-title" class="k-shelf k-wrap">
    <div class="k-shelf__board">
      <p class="k-eyebrow">{{ t("shelf.eyebrow", "On the shelf at {shop}", { shop: shopTitle }) }}</p>
      <h2 id="k-shelf-title" class="k-shelf__title">{{ t("shelf.title", "Pick an aisle, fill your basket") }}</h2>

      <div :aria-label="t('aisle.aisles', 'Aisles')" class="k-shelf__tabs" role="tablist">
        <button
          v-for="aisle in list"
          :key="aisle.id"
          :aria-selected="aisle.id === current ? 'true' : 'false'"
          :class="{ '-on': aisle.id === current }"
          :style="{ '--k-tint': tint(aisle) }"
          class="k-shelf__tab"
          role="tab"
          type="button"
          @click="choose(aisle)"
        >
          <img v-if="aisle.icon" :src="aisleImage(aisle, 64)" alt="" height="32" width="32" />
          {{ aisle.title || aisle.name }}
        </button>
      </div>

      <div class="k-shelf__wood" role="tabpanel">
        <div :class="{ '-swap': swapping }" class="k-shelf__row">
          <template v-if="!products">
            <div v-for="n in 6" :key="'s' + n" aria-hidden="true" class="k-shelf__item -skeleton">
              <span class="k-shelf__pic"></span>
              <span class="k-shelf__tag"></span>
            </div>
          </template>

          <template v-else>
            <div v-for="product in products" :key="product.id" class="k-shelf__item">
              <router-link :to="productRoute(product)" aria-hidden="true" class="k-shelf__pic" tabindex="-1">
                <img :src="picture(product)" :srcset="srcset(product)" alt="" loading="lazy" sizes="(max-width: 600px) 40vw, 180px" @error="dropSrcset" />
              </router-link>
              <div :class="{ '-offer': labels.get(product.id).was }" class="k-shelf__tag">
                <span v-if="labels.get(product.id).off" class="k-shelf__save">
                  {{ t("shelf.save", "Save {percent}%", { percent: labels.get(product.id).off }) }}
                </span>
                <router-link :to="productRoute(product)" class="k-shelf__link">
                  <span class="k-shelf__price">
                    <u-price :amount="labels.get(product.id).now" :currency="currency" />
                  </span>
                  <span class="k-shelf__was">
                    <template v-if="labels.get(product.id).was">
                      <template v-for="(part, i) in t('shelf.was', 'was {price}').split('{price}')" :key="i"><s v-if="i"><u-price :amount="labels.get(product.id).was" :currency="currency" /></s>{{ part }}</template>
                    </template>
                    <template v-else-if="product.unit">{{ t("rail.perUnit", "per {unit}", { unit: product.unit }) }}</template>
                  </span>
                  <span class="k-shelf__name">{{ product.title }}</span>
                </router-link>
                <kalio-card-step v-if="inBasket(product)" :product="product" class="k-shelf__strip" strip />
                <button
                  v-else
                  :aria-label="t('shelf.addProduct', 'Add {name}', { name: product.title })"
                  class="k-shelf__strip"
                  type="button"
                  @click="add(product)"
                >
                  <v-icon size="20">add</v-icon>{{ t("shelf.add", "Add") }}
                </button>
              </div>
            </div>

            <div v-if="currentAisle && products.length" class="k-shelf__item -all">
              <router-link :to="aisleRoute(currentAisle)">
                <span class="k-round"><v-icon class="k-flip" size="22">chevron_right</v-icon></span>
                {{ t("shelf.allOfAisle", "All {aisle}", { aisle: currentAisle.title || currentAisle.name }) }}
              </router-link>
            </div>
          </template>
        </div>
      </div>

      <div class="k-shelf__foot">
        <span class="k-shelf__key"><i></i>{{ t("shelf.legend", "Yellow labels are on offer") }}</span>
        <router-link :to="catalogueRoute" class="k-more">
          {{ t("shelf.everyProduct", "Every product") }}
          <v-icon class="k-flip" size="20">chevron_right</v-icon>
        </router-link>
      </div>
    </div>

    <kalio-quick-buy v-model="quick_buy" :product="picked" />
  </section>
</template>

<script>
import { currentCurrency } from "../region-switcher/region";
import CurrencyMixin from "@selldone/components-vue/mixin/currency/CurrencyMixin.ts";
import KalioQuickBuy from "./KalioQuickBuy.vue";
import KalioCardStep from "./KalioCardStep.vue";
import { basketLine, hasSizes, pendingLine, quickAdd, shownCount } from "./kalio-basket";
import {
  aisleImage,
  aisleRoute,
  catalogueRoute,
  percentOff,
  priceOf,
  productImage,
  tintFor,
  productSrcset,
  dropSrcset,
} from "./kalio-catalog";

const PER_SHELF = 6;

export default {
  name: "KalioShelf",
  components: { KalioQuickBuy, KalioCardStep },
  mixins: [CurrencyMixin],

  props: {
    /** The aisles offered as tabs, in order. */
    aisles: { type: Array, default: () => [] },
  },

  data() {
    return {
      current: null,
      shelves: {},
      swapping: false,
      quick_buy: false,
      picked: null,
    };
  },

  computed: {
    shop() {
      return this.$store.getters.getShop;
    },
    shopTitle() {
      return this.shop?.title || "Kalio";
    },
    currency() {
      return currentCurrency();
    },
    catalogueRoute() {
      return catalogueRoute();
    },
    list() {
      return this.aisles.filter((aisle) => aisle && aisle.id);
    },
    currentAisle() {
      return this.list.find((aisle) => aisle.id === this.current) || null;
    },
    products() {
      return this.shelves[this.current] || null;
    },
    /* Each label's prices, worked out once per shelf. */
    labels() {
      return new Map(
        (this.products || []).map((product) => {
          const { now, was } = priceOf(this.shop, product, this.currency);
          return [product.id, { now, was, off: was ? percentOff(this.shop, product) : 0 }];
        }),
      );
    },
  },

  watch: {
    list: {
      handler(list) {
        if (!list.length || this.current) return;
        this.current = list[0].id;
        this.$nextTick(this.watchRoot);
      },
      immediate: true,
    },
  },

  beforeUnmount() {
    this.observer?.disconnect();
  },

  methods: {
    srcset(product) {
      return productSrcset(product);
    },
    dropSrcset,
    aisleRoute,
    aisleImage,

    tint(aisle) {
      return tintFor(aisle);
    },

    picture(product) {
      return productImage(product);
    },

    productRoute(product) {
      return { name: window.$storefront.routes.PRODUCT_PAGE, params: { product_id: product.id } };
    },

    /* The first shelf is read when the section nears the screen. */
    watchRoot() {
      const root = this.$refs.root;
      if (!root || !("IntersectionObserver" in window)) {
        this.fill(this.currentAisle);
        return;
      }
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            this.observer.disconnect();
            this.fill(this.currentAisle);
          }
        },
        { rootMargin: "600px 0px" },
      );
      this.observer.observe(root);
    },

    fill(aisle) {
      if (!aisle || this.shelves[aisle.id]) return Promise.resolve();
      return window.$storefront.products
        .list(aisle.name, 0, PER_SHELF, { products_only: true, available: true, sort: "bestselling" })
        .then(({ products }) => (products || []).filter((product) => product.icon))
        .catch(() => [])
        .then((products) => {
          this.shelves = { ...this.shelves, [aisle.id]: products };
        });
    },

    /* The row fades down, the new aisle's packs are read, and it fades up. */
    async choose(aisle) {
      if (aisle.id === this.current) return;
      this.swapping = true;
      await Promise.all([this.fill(aisle), new Promise((done) => setTimeout(done, 180))]);
      this.current = aisle.id;
      this.swapping = false;
    },

    /* "+ Add" puts the product straight into the basket; one with sizes
       opens the sheet. In the basket, the strip shows − n + instead. */
    add(product) {
      quickAdd(this, product, (picked) => {
        this.picked = picked;
        this.quick_buy = true;
      });
    },

    inBasket(product) {
      return !hasSizes(product) && shownCount(product, basketLine(this, product) || pendingLine(product)) > 0;
    },
  },
};
</script>
