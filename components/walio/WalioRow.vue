<!--
  Walio — a row of product cards (design A): "Top deals", "New arrivals",
  "Trending in Produce".

  One products.list call, as Kalio's rail makes it: the caller passes the
  aisle, sort and filter, nothing here names a product. Six cards to a
  screen on a computer, four on a tablet, two and a bit on a phone, where
  the row scrolls sideways. A row with nothing to show renders nothing.
  `lazy` rows wait until they are about to scroll into view.

  The cards' add is Kalio's quickAdd: a product without sizes goes straight
  into the cart, one with sizes opens the same quick-buy sheet the
  catalogue opens.
-->
<template>
  <section
    v-if="busy || products.length"
    ref="root"
    :aria-labelledby="headingId"
    class="t-sec t-row k-wrap"
  >
    <header class="t-sec__head">
      <h2 :id="headingId" class="t-sec__title">{{ title }}</h2>
      <div class="t-sec__tools">
        <router-link v-if="moreTo" :to="moreTo" class="t-sec__more">
          {{ moreLabel || t("common.seeAll", "See all") }}<v-icon class="k-flip" size="20">chevron_right</v-icon>
        </router-link>
        <button :disabled="at_start" :aria-label="t('rail.scrollBack', 'Scroll back')" class="t-arrow -small" type="button" @click="scrollBy(-1)">
          <v-icon class="k-flip" size="20">chevron_left</v-icon>
        </button>
        <button :disabled="at_end" :aria-label="t('rail.scrollForward', 'Scroll forward')" class="t-arrow -small" type="button" @click="scrollBy(1)">
          <v-icon class="k-flip" size="20">chevron_right</v-icon>
        </button>
      </div>
    </header>

    <div ref="track" class="t-row__track" @scroll.passive="measure">
      <template v-if="busy">
        <div v-for="n in 6" :key="'s' + n" aria-hidden="true" class="t-row__cell -skeleton">
          <i></i><b></b><b class="-short"></b>
        </div>
      </template>
      <div v-for="product in products" v-else :key="product.id" class="t-row__cell">
        <walio-card :product="product" :sellers="sellersOf.get(product.id) || []" @quick-buy="quickBuy" />
      </div>
    </div>

    <kalio-quick-buy v-model="quick_buy" :product="picked" />
  </section>
</template>

<script>
import WalioCard from "./WalioCard.vue";
import KalioQuickBuy from "../kalio/KalioQuickBuy.vue";
import { offers } from "../kalio/kalio-catalog";
import { quickAdd } from "../kalio/kalio-basket";

let rowCount = 0;

/* The first of every aisle, then the second of every aisle, and so on. */
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
  name: "WalioRow",
  components: { WalioCard, KalioQuickBuy },

  props: {
    title: { type: String, required: true },
    sort: { type: String, default: "bestselling" },
    /** A storefront filter object, e.g. { only_has_discount: true }. */
    filter: { type: Object, default: null },
    /** One aisle, by its category name. */
    dir: { type: String, default: null },
    limit: { type: Number, default: 12 },
    moreTo: { type: Object, default: null },
    moreLabel: { type: String, default: null },
    lazy: Boolean,
    /** Deal the products out aisle by aisle. */
    spread: Boolean,
    /** One seller's products only. */
    vendor: { type: [Number, String], default: null },
    /** A product to leave out (the one the page is about). */
    exclude: { type: [Number, String], default: null },
    /** Products the caller has already read (the home's deals, ranked by
        saving): shown as given, nothing is fetched. null while the caller
        is still reading them; leave it out to have the row fetch. */
    items: { type: Array, default: undefined },
  },

  emits: ["loaded"],

  data() {
    return {
      headingId: `t-row-${++rowCount}`,
      products: [],
      busy: true,
      sellersOf: new Map(),
      at_start: true,
      at_end: false,
      quick_buy: false,
      picked: null,
    };
  },

  watch: {
    items() {
      this.take();
    },
  },

  mounted() {
    offers().then(({ sellersOf }) => (this.sellersOf = sellersOf));
    if (this.items !== undefined) {
      this.take();
    } else if (this.lazy && "IntersectionObserver" in window) {
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
    take() {
      this.busy = this.items === null;
      this.products = (this.items || []).slice(0, this.limit);
      if (!this.busy) this.$nextTick(this.measure);
    },

    fetch() {
      this.busy = true;
      const options = { products_only: true, sort: this.sort, available: true };
      if (this.filter) options.filter = JSON.stringify(this.filter);
      if (this.vendor) options.vendor_id = this.vendor;
      window.$storefront.products
        .list(this.dir, 0, this.limit, options)
        .then(({ products }) => {
          products = (products || []).filter((p) => !this.exclude || String(p.id) !== String(this.exclude)).slice(0, this.limit);
          this.products = this.spread ? spreadByAisle(products) : products;
        })
        .catch(() => (this.products = []))
        .finally(() => {
          this.busy = false;
          this.$emit("loaded", this.products);
          this.$nextTick(this.measure);
        });
    },

    quickBuy(product) {
      quickAdd(this, product, (picked) => {
        this.picked = picked;
        this.quick_buy = true;
      });
    },

    scrollBy(step) {
      const track = this.$refs.track;
      if (!track) return;
      const rtl = getComputedStyle(track).direction === "rtl";
      track.scrollBy({ left: (rtl ? -step : step) * Math.round(track.clientWidth * 0.9), behavior: "smooth" });
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
