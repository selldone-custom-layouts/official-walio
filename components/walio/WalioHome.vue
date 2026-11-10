<!--
  Walio — the home page (design B of Tario's mockups, chosen for Walio on
  7 November 2026: kalio-design/tario-options/home-b.html).

  A split hero (a photo with the shop's line, and two stacked tiles: the
  week's deals and what is new, each with three packshots), "Best saving
  today" (a row of equal cards, the biggest saving first), the aisles as
  coloured tiles, "Top picks", "Shop the idea" (a photo beside a short list
  from the breakfast aisle with one Add all), how the order reaches you,
  "Trending in" the fresh aisle, and the sellers. Everything is read from
  the shop: products, prices, savings, aisles, delivery methods, sellers.
-->
<template>
  <div class="t-home w-home">
    <!-- ▆▆▆▆ Hero ▆▆▆▆ -->
    <section class="w-hero k-wrap">
      <router-link :to="catalogue" class="w-hero__main">
        <walio-photo :products="dealList" :src="photo('walio-hero-1-weekly')" class="w-hero__photo" shape="wide" />
        <span class="w-hero__text">
          <b>Everything for the week, in one cart</b>
          <small>
            {{ aisleList.length ? `${aisleList.length} aisles` : "Every aisle" }}<template v-if="sellerList.length > 1"
              >, {{ sellerList.length }} independent sellers</template
            >, one checkout.
          </small>
          <span class="w-hero__go">Start shopping<v-icon size="18">chevron_right</v-icon></span>
        </span>
      </router-link>
      <div class="w-hero__side">
        <router-link :to="deals" class="w-hero__tile -deals">
          <span>
            <small>Deals</small>
            <b>{{ best_off ? `Up to ${best_off}% off this week` : "This week's deals" }}</b>
            <em>Shop deals</em>
          </span>
          <span aria-hidden="true" class="w-hero__packs">
            <span v-for="p in dealList.slice(0, 3)" :key="p.id" class="w-hero__pack">
              <img :src="image(p)" :srcset="srcset(p)" alt="" sizes="(max-width: 1100px) 150px, 100px" @error="dropSrcset" />
            </span>
          </span>
        </router-link>
        <router-link :to="newest" class="w-hero__tile -new">
          <span>
            <small>New</small>
            <b>Just landed on the shelves</b>
            <em>See what's new</em>
          </span>
          <span aria-hidden="true" class="w-hero__packs">
            <span v-for="p in newList.slice(0, 3)" :key="p.id" class="w-hero__pack">
              <img :src="image(p)" :srcset="srcset(p)" alt="" sizes="(max-width: 1100px) 150px, 100px" @error="dropSrcset" />
            </span>
          </span>
        </router-link>
      </div>
    </section>

    <!-- ▆▆▆▆ Best saving today ▆▆▆▆
         A row of equal cards, the biggest saving first, as the big grocers
         show their deals (since 1.1.5; one large card beside four small
         ones left a gap under them and filled a tablet's screen). -->
    <walio-row :items="deals_ready ? dealList : null" :more-to="deals" title="Best saving today" />

    <!-- ▆▆▆▆ Shop by category ▆▆▆▆ -->
    <section v-if="aisleList.length" class="t-sec k-wrap">
      <header class="t-sec__head">
        <h2 class="t-sec__title">Shop by category</h2>
        <router-link :to="catalogue" class="t-sec__more">All aisles<v-icon size="20">chevron_right</v-icon></router-link>
      </header>
      <div class="w-cats">
        <router-link v-for="a in aisleList.slice(0, 8)" :key="a.id" :style="{ background: tint(a) }" :to="aisleRoute(a)" class="w-cat">
          <img v-if="a.icon" :src="aisleImage(a, 256)" alt="" loading="lazy" />
          <b>{{ a.title || a.name }}</b>
          <small>Shop now</small>
        </router-link>
      </div>
    </section>

    <walio-row :limit="12" lazy sort="bestselling" spread title="Top picks for you" />

    <!-- ▆▆▆▆ Shop the idea ▆▆▆▆ -->
    <section v-if="idea.items.length >= 2" class="t-sec k-wrap">
      <header class="t-sec__head">
        <h2 class="t-sec__title">Shop the idea</h2>
        <router-link v-if="idea.aisle" :to="aisleRoute(idea.aisle)" class="t-sec__more">More ideas<v-icon size="20">chevron_right</v-icon></router-link>
      </header>
      <div class="w-idea">
        <walio-photo :products="idea.items" :src="photo('walio-tile-breakfast')" class="w-idea__photo" />
        <div class="w-idea__list">
          <small class="w-idea__eyebrow">{{ idea.eyebrow }}</small>
          <h3>{{ idea.title }}</h3>
          <p>Everything on the table, from {{ $shop.title }}'s sellers.</p>
          <router-link v-for="p in idea.items" :key="p.id" :to="productRoute(p)" class="w-idea__row">
            <img :src="image(p)" alt="" />
            <span>{{ p.title }}</span>
            <u-price :amount="priceNow(p)" :currency="currency" />
          </router-link>
          <div class="w-idea__foot">
            <b>{{ idea.items.length }} items · <u-price :amount="idea_total" :currency="currency" /></b>
            <button :disabled="adding" class="t-btn -main" type="button" @click="addIdea">
              <v-progress-circular v-if="adding" indeterminate size="18" width="2" />
              <template v-else>Add all to cart</template>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ▆▆▆▆ Pickup or delivery ▆▆▆▆ -->
    <section v-if="ways.length" class="t-sec k-wrap">
      <div class="w-ways">
        <walio-photo :products="[]" :src="photo('walio-finds-dinner')" class="w-ways__photo" />
        <div class="w-ways__panel">
          <h2>{{ ways.length > 1 ? `${ways.map((w) => w.word).slice(0, 2).join(" or ")} — your call` : "How it reaches you" }}</h2>
          <ul>
            <li v-for="w in ways" :key="w.key">
              <span class="w-ways__ic"><v-icon size="22">{{ w.icon }}</v-icon></span>
              <span>
                <b>{{ w.word }}</b>
                <small
                  >{{ w.line }}<template v-if="w.free"> · Free</template
                  ><template v-else-if="w.freeOver"> · Free on orders over {{ money(w.freeOver, w.currency, "auto") }}</template
                ></small>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <walio-row
      v-if="fresh"
      :dir="fresh.name"
      :limit="12"
      :more-to="aisleRoute(fresh)"
      :title="`Trending in ${fresh.title || fresh.name}`"
      lazy
      sort="bestselling"
    />

    <!-- ▆▆▆▆ Shop our sellers ▆▆▆▆ -->
    <section v-if="sellerList.length" class="t-sec k-wrap">
      <header class="t-sec__head">
        <h2 class="t-sec__title">Shop our sellers</h2>
      </header>
      <div class="w-sellers">
        <router-link v-for="v in sellerList" :key="v.id" :to="sellerRoute(v)" class="w-seller">
          <span class="w-seller__mark"><img v-if="vendorImage(v)" :src="vendorImage(v)" alt="" /><b v-else>{{ v.name[0] }}</b></span>
          <span class="w-seller__who">
            <b>{{ v.name }}</b>
            <small>An independent seller on {{ $shop.title }}</small>
            <em>Visit shop</em>
          </span>
          <span aria-hidden="true" class="w-seller__packs">
            <img v-for="p in (shelfOf.get(v.id) || []).filter((x) => x.icon).slice(0, 4)" :key="p.id" :src="image(p)" alt="" />
          </span>
        </router-link>
      </div>
    </section>

    <div class="t-home__end k-wrap">
      <router-link :to="catalogue" class="t-btn -outline">Browse every product</router-link>
    </div>
    <kalio-quick-buy v-model="sheet" :product="picked" />
  </div>
</template>

<script>
import { currentCurrency } from "../region-switcher/region";
import WalioRow from "./WalioRow.vue";
import WalioPhoto from "./WalioPhoto.vue";
import KalioQuickBuy from "../kalio/KalioQuickBuy.vue";
import { DEALS_FILTER, findAisle, listProducts, money, photo, waysOf } from "./walio-home";
import {
  aisleImage,
  aisleRoute,
  aisles,
  catalogueRoute,
  dealsRoute,
  featured,
  offers,
  percentOff,
  priceOf,
  productImage,
  productSrcset,
  dropSrcset,
  sellerRoute,
  tintFor,
  vendorImage,
  vendors,
} from "../kalio/kalio-catalog";
import { basketLine, hasSizes, quickAdd } from "../kalio/kalio-basket";
import CurrencyMixin from "@selldone/components-vue/mixin/currency/CurrencyMixin.ts";

export default {
  name: "WalioHome",
  components: { WalioRow, WalioPhoto, KalioQuickBuy },
  mixins: [CurrencyMixin],
  inject: ["$shop"],

  data() {
    return {
      aisleList: [],
      sellerList: [],
      dealList: [],
      deals_ready: false,
      newList: [],
      shelfOf: new Map(),
      idea: { aisle: null, items: [], eyebrow: "", title: "" },
      sheet: false,
      picked: null,
      adding: false,
    };
  },

  computed: {
    currency() {
      return currentCurrency();
    },
    catalogue() {
      return catalogueRoute();
    },
    deals() {
      return dealsRoute();
    },
    newest() {
      return catalogueRoute({ sort: "newest" });
    },
    ways() {
      return waysOf(this.$shop).slice(0, 3);
    },
    best_off() {
      return this.dealList.reduce((max, p) => Math.max(max, this.percent(p)), 0);
    },
    fresh() {
      return findAisle(this.aisleList, /produce|fruit|veg|fresh/i) || this.aisleList[0] || null;
    },
    idea_total() {
      return this.idea.items.reduce((sum, p) => sum + this.priceNow(p), 0);
    },
  },

  mounted() {
    aisles().then((list) => {
      this.aisleList = featured(list);
      this.readIdea();
    });
    vendors().then((list) => (this.sellerList = list.filter((v) => v && v.name)));
    offers().then(({ shelfOf }) => {
      this.shelfOf = shelfOf;
    });
    /* The biggest savings first: Selldone sorts deals by sales, so the
       saving is ranked here. */
    listProducts(null, 40, { filter: DEALS_FILTER, sort: "bestselling" })
      .then((list) => {
        this.dealList = list.filter((p) => this.percent(p) > 0).sort((a, b) => this.percent(b) - this.percent(a)).slice(0, 12);
      })
      .catch(() => (this.dealList = []))
      .finally(() => (this.deals_ready = true));
    listProducts(null, 6, { sort: "newest" }).then((list) => (this.newList = list.filter((p) => p.icon)));
  },

  methods: {
    money,
    photo,
    aisleImage,
    aisleRoute,
    sellerRoute,
    image(p) {
      return productImage(p, true);
    },
    srcset(p) {
      return productSrcset(p);
    },
    dropSrcset,
    vendorImage(v) {
      return vendorImage(v, true);
    },
    tint(aisle) {
      return tintFor(aisle) || "#f2f6fb";
    },
    percent(p) {
      return percentOff(this.$shop, p) || 0;
    },
    priceNow(p) {
      return priceOf(this.$shop, p, this.currency).now || 0;
    },
    productRoute(p) {
      return { name: window.$storefront.routes.PRODUCT_PAGE, params: { product_id: p.id } };
    },
    /* A breakfast table from the breakfast aisle (else the first aisle):
       four products without sizes, so "Add all" is one tap. */
    readIdea() {
      const aisle = findAisle(this.aisleList, /breakfast|cereal/i) || findAisle(this.aisleList, /bakery|bread/i) || this.aisleList[0];
      if (!aisle) return;
      listProducts(aisle.name, 12, { sort: "bestselling" }).then((list) => {
        const items = list.filter((p) => !hasSizes(p) && p.icon).slice(0, 4);
        const breakfast = /breakfast|cereal/i.test(`${aisle.title} ${aisle.name}`);
        this.idea = {
          aisle,
          items,
          eyebrow: breakfast ? "Weekend breakfast" : aisle.title || aisle.name,
          title: breakfast ? "A slow weekend breakfast" : `The best of ${aisle.title || aisle.name}`,
        };
      });
    },
    async addIdea() {
      this.adding = true;
      try {
        for (const p of this.idea.items) {
          if (basketLine(this, p)) continue;
          await quickAdd(this, p, (picked) => {
            this.picked = picked;
            this.sheet = true;
          }).catch(() => null);
        }
      } finally {
        this.adding = false;
      }
    },
  },
};
</script>
