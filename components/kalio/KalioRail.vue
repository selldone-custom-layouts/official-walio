<!--
  Kalio — Product rail.

  A row of products pulled live with one products.list call: an aisle's
  range, the shop's current deals, one seller's newest. The caller passes the
  aisle, sort, filter or seller; nothing in here names a product, a price or
  a brand, so the row cannot go stale when the catalogue changes.

  The card is the platform's SShopProductCard with quick-buy on: it carries
  basket, variant, discount, badge and currency behaviour that a hand-built
  card would only imitate. Kalio adds two lines under it — the selling unit
  and who sells it — and sets the card's tint from the product's aisle.

  The card's add button emits "quick-buy" and expects its parent to open the
  product overview; the rail opens KalioQuickBuy, which does that exactly as
  SProductsListing does, so adding from a rail and adding from the catalogue
  grid are one and the same flow.

  A rail with no products renders nothing, not a heading over an empty row.
  `lazy` rails wait until they are about to scroll into view before asking
  for products, so a home page of many aisles costs only what is seen.
-->
<template>
  <section
    v-if="busy || products.length"
    ref="root"
    :aria-labelledby="headingId"
    :class="{ '-at-end': at_end }"
    class="k-rail k-wrap"
  >
    <header class="k-rail__head">
      <div class="k-rail__titles">
        <h2 :id="headingId" class="k-rail__title">{{ title }}</h2>
        <p v-if="meta" class="k-rail__meta">{{ meta }}</p>
      </div>

      <div class="k-rail__tools">
        <router-link v-if="moreTo" :to="moreTo" class="k-more">
          {{ moreLabel || t("common.seeAll", "See all") }}
          <v-icon class="k-flip" size="20">chevron_right</v-icon>
        </router-link>
        <button
          :disabled="at_start"
          :aria-label="t('rail.scrollBack', 'Scroll back')"
          class="k-round k-rail__arrow"
          type="button"
          @click="scrollBy(-1)"
        >
          <v-icon class="k-flip" size="20">chevron_left</v-icon>
        </button>
        <button
          :disabled="at_end"
          :aria-label="t('rail.scrollForward', 'Scroll forward')"
          class="k-round k-rail__arrow"
          type="button"
          @click="scrollBy(1)"
        >
          <v-icon class="k-flip" size="20">chevron_right</v-icon>
        </button>
      </div>
    </header>

    <div ref="track" class="k-rail__track" @scroll.passive="measure">
      <template v-if="busy">
        <div v-for="n in 6" :key="'s' + n" aria-hidden="true" class="k-rail__cell">
          <div class="k-rail__skeleton"></div>
          <div class="k-rail__skeleton-line"></div>
          <div class="k-rail__skeleton-line -short"></div>
        </div>
      </template>

      <div
        v-for="product in products"
        v-else
        :key="product.id"
        :style="{ '--k-tint': tintOf(product) }"
        class="k-rail__cell"
      >
        <s-shop-product-card
          :product="product"
          :to="{
            name: window.$storefront.routes.PRODUCT_PAGE,
            params: { product_id: product.id },
          }"
          quick-buy
          @quick-buy="quickBuy(product)"
        />
        <p v-if="product.unit" class="k-rail__unit">{{ t("rail.perUnit", "per {unit}", { unit: product.unit }) }}</p>
        <kalio-seller-line :sellers="sellersOf.get(product.id) || []" />
        <!-- The card's foot, under the unit and the sellers: "Add to
             basket", "See options", or "− n in basket +". -->
        <kalio-card-step
          :addable="() => !!product.quantity"
          :adder="() => quickBuy(product)"
          :product="product"
          :sold-out="() => !product.quantity"
          card
          class="k-rail__foot"
        />
      </div>
    </div>

    <!-- The same quick-buy sheet the catalogue grid opens. -->
    <kalio-quick-buy v-model="quick_buy" :product="picked" />
  </section>
</template>

<script>
import SShopProductCard from "@selldone/components-vue/storefront/product/card/SShopProductCard.vue";
import KalioSellerLine from "./KalioSellerLine.vue";
import KalioCardStep from "./KalioCardStep.vue";
import KalioQuickBuy from "./KalioQuickBuy.vue";
import { aisleIndex, offers, tintFor } from "./kalio-catalog";
import { quickAdd } from "./kalio-basket";
import "./kalio-card-basket"; // a card in the basket shows − n +

let railCount = 0;

/* Round-robin over aisles, keeping each aisle's own order: the first of
   every aisle, then the second of every aisle, and so on. */
function spreadByAisle(products) {
  const queues = new Map();
  for (const product of products) {
    if (!queues.has(product.category_id)) queues.set(product.category_id, []);
    queues.get(product.category_id).push(product);
  }
  const out = [];
  while (out.length < products.length) {
    for (const queue of queues.values()) if (queue.length) out.push(queue.shift());
  }
  return out;
}

export default {
  name: "KalioRail",
  components: { SShopProductCard, KalioSellerLine, KalioQuickBuy, KalioCardStep },

  props: {
    title: { type: String, required: true },
    meta: { type: String, default: null },

    /** Any sort the storefront API accepts: newest, bestselling, cheapest, most_popular, most_visited. */
    sort: { type: String, default: "newest" },
    /** A storefront filter object, e.g. { only_has_discount: true }. */
    filter: { type: Object, default: null },
    /** Real product tags from the shop. Never a display-only label. */
    tags: { type: Array, default: null },
    /** Restrict the rail to one marketplace seller. */
    vendorId: { type: [Number, String], default: null },
    /** Restrict the rail to one aisle, by its category name. */
    dir: { type: String, default: null },

    limit: { type: Number, default: 12 },
    /** A product left out of the row, such as the one on the page above it. */
    exclude: { type: [Number, String], default: null },
    moreTo: { type: Object, default: null },
    /** The link's words; "See all" in the visitor's language when not given. */
    moreLabel: { type: String, default: null },

    /** Fetch only when the rail is about to scroll into view. */
    lazy: Boolean,
    /** Deal the products out aisle by aisle, so one aisle does not fill the row. */
    spread: Boolean,
  },

  emits: ["loaded"],

  data() {
    return {
      window: window,
      headingId: `k-rail-${++railCount}`,

      products: [],
      busy: true,
      aisle_of: new Map(),
      sellersOf: new Map(),

      at_start: true,
      at_end: false,

      quick_buy: false,
      picked: null,
    };
  },

  mounted() {
    aisleIndex().then((index) => (this.aisle_of = index));
    offers().then(({ sellersOf }) => (this.sellersOf = sellersOf));

    if (this.lazy && "IntersectionObserver" in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            this.observer.disconnect();
            this.fetch();
          }
        },
        { rootMargin: "600px 0px" },
      );
      this.observer.observe(this.$refs.root);
    } else {
      this.fetch();
    }
  },

  beforeUnmount() {
    this.observer?.disconnect();
  },

  methods: {
    fetch() {
      this.busy = true;

      const options = {
        products_only: true,
        sort: this.sort,
        available: true,
      };
      if (this.filter) options.filter = JSON.stringify(this.filter);
      if (this.tags && this.tags.length) options.tags = this.tags;
      if (this.vendorId) options.vendor_id = this.vendorId;

      window.$storefront.products
        .list(this.dir, 0, this.limit + (this.exclude ? 1 : 0), options)
        .then(({ products }) => {
          products = (products || [])
            .filter((product) => String(product.id) !== String(this.exclude))
            .slice(0, this.limit);
          this.products = this.spread ? spreadByAisle(products) : products;
        })
        .catch(() => {
          this.products = [];
        })
        .finally(() => {
          this.busy = false;
          this.$emit("loaded", this.products);
          this.$nextTick(this.measure);
        });
    },

    tintOf(product) {
      return tintFor(this.aisle_of.get(product.category_id)) || null;
    },

    /* "+" puts the product straight into the basket; one with sizes opens
       the sheet. */
    quickBuy(product) {
      quickAdd(this, product, (picked) => {
        this.picked = picked;
        this.quick_buy = true;
      });
    },

    /* One screen of the row per press, so the arrows move the same distance
       whatever the viewport. scrollLeft is negative in RTL, so direction is
       taken from the document, not assumed. */
    scrollBy(step) {
      const track = this.$refs.track;
      if (!track) return;
      const rtl = getComputedStyle(track).direction === "rtl";
      track.scrollBy({
        left: (rtl ? -step : step) * Math.round(track.clientWidth * 0.9),
        behavior: "smooth",
      });
    },

    measure() {
      const track = this.$refs.track;
      if (!track) return;
      const travelled = Math.abs(track.scrollLeft);
      this.at_start = travelled < 4;
      this.at_end = travelled + track.clientWidth >= track.scrollWidth - 4;
    },
  },
};
</script>
