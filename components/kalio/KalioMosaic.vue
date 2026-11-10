<!--
  Kalio — Aisle mosaic.

  The middle of the home page: five tiles at once, no slider. One large tile
  leads an aisle with a grocer's line, its description and three of its
  products; three smaller tiles each send a shopper into another aisle with
  its lowest price; the last is the marketplace's biggest seller. Every tile
  stands on its aisle's tint with its packs standing on the tile's floor.

  The aisles are passed in by the home page; the headline is a short grocer's
  line for aisles Kalio knows and the aisle's own title for any other, so a
  new aisle still gets a correct tile. "From" is the lowest price among the
  aisle's cheapest products, by Selldone's own pricing.
-->
<template>
  <section v-if="tiles.length" aria-label="Aisle picks" class="k-mosaic k-wrap">
    <router-link
      v-for="tile in tiles"
      :key="tile.key"
      :class="`-${tile.kind}`"
      :style="{ '--k-tint': tile.ground }"
      :to="tile.to"
      class="k-mtile"
    >
      <span class="k-eyebrow k-mtile__eyebrow">
        <img v-if="tile.mark" :src="tile.mark" alt="" class="k-mtile__mark" height="30" width="30" />
        {{ tile.eyebrow }}
      </span>
      <span class="k-mtile__title">{{ tile.title }}</span>
      <span v-if="tile.lede" class="k-mtile__lede">{{ tile.lede }}</span>
      <span v-if="tile.from" class="k-mtile__from">
        from <u-price :amount="tile.from" :currency="currency" />
      </span>
      <span v-else-if="tile.note" class="k-mtile__from">{{ tile.note }}</span>
      <span :class="tile.kind === 'lead' ? 'k-btn k-btn--solid' : 'k-mtile__go'">
        {{ tile.cta }}
        <v-icon class="k-flip" size="18">chevron_right</v-icon>
      </span>
      <span v-if="tile.sticker" aria-hidden="true" class="k-mtile__sticker">
        <small>Up to</small>
        <strong>{{ tile.sticker }}%</strong>
        <small>off</small>
      </span>
      <span aria-hidden="true" class="k-mtile__pics">
        <img v-for="product in tile.pics" :key="product.id" :src="picture(product)" :srcset="srcset(product)" alt="" loading="lazy" sizes="(max-width: 600px) 30vw, 140px" @error="dropSrcset" />
      </span>
    </router-link>
  </section>
</template>

<script>
import { currentCurrency } from "../region-switcher/region";
import CurrencyMixin from "@selldone/components-vue/mixin/currency/CurrencyMixin.ts";
import {
  aisleRoute,
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
} from "./kalio-catalog";

const HEADLINES = [
  [/breakfast|cereal/i, "Breakfast, sorted"],
  [/snack/i, "The snack drawer"],
  [/produce|fruit|veg/i, "Picked for the week"],
  [/dairy|egg|milk/i, "Fridge, restocked"],
  [/bread|bakery/i, "Fresh from the oven"],
  [/meat|seafood|fish/i, "From the butcher’s counter"],
  [/pantry/i, "Stock the cupboard"],
  [/beverage|drink/i, "Something to sip"],
  [/frozen/i, "Ready when you are"],
];
const SELLER_GROUND = "#fbe6d8";

/* The lead tile's ground is its aisle's tint taken a step deeper, so the
   largest tile holds its own against the white page. */
const deepen = (tint) => `color-mix(in oklab, ${tint} 88%, #4a4a4a)`;

export default {
  name: "KalioMosaic",
  mixins: [CurrencyMixin],

  props: {
    /** The lead aisle first, then up to three more. */
    aisles: { type: Array, default: () => [] },
  },

  data() {
    return {
      tiles: [],
    };
  },

  computed: {
    shop() {
      return this.$store.getters.getShop;
    },
    currency() {
      return currentCurrency();
    },
  },

  watch: {
    aisles: {
      handler() {
        this.build();
      },
      immediate: true,
    },
  },

  methods: {
    srcset(product) {
      return productSrcset(product);
    },
    dropSrcset,
    picture(product) {
      return productImage(product);
    },

    list(dir, limit, sort) {
      return window.$storefront.products
        .list(dir, 0, limit, { products_only: true, available: true, sort })
        .then(({ products }) => (products || []).filter((product) => product.icon))
        .catch(() => []);
    },

    headline(aisle) {
      const label = `${aisle.title || ""} ${aisle.name || ""}`;
      const hit = HEADLINES.find(([pattern]) => pattern.test(label));
      return hit ? hit[1] : aisle.title || aisle.name;
    },

    async build() {
      const picks = this.aisles.slice(0, 4);
      if (!picks.length) return;

      const [reads, sellerList, { shelfOf }] = await Promise.all([
        Promise.all(
          picks.map((aisle, i) =>
            Promise.all([this.list(aisle.name, i ? 2 : 3, "bestselling"), this.list(aisle.name, 3, "cheapest")]),
          ),
        ),
        vendors(),
        offers(),
      ]);

      const tiles = [];
      picks.forEach((aisle, i) => {
        const [popular, cheapest] = reads[i];
        if (!popular.length) return;
        const title = aisle.title || aisle.name;
        const seen = [...popular, ...cheapest];
        const from = Math.min(...seen.map((product) => priceOf(this.shop, product, this.currency).now).filter((n) => n > 0));
        const lead = i === 0;
        tiles.push({
          key: "aisle-" + aisle.id,
          kind: lead ? "lead" : "aisle",
          ground: lead ? deepen(tintFor(aisle)) : tintFor(aisle),
          eyebrow: lead ? title : "Aisle",
          title: lead ? this.headline(aisle) : title,
          lede: lead ? aisle.description || null : null,
          from: lead || !Number.isFinite(from) ? null : from,
          cta: lead ? `Shop ${title.toLowerCase()}` : "Shop the aisle",
          to: aisleRoute(aisle),
          sticker: lead ? Math.max(0, ...seen.map((product) => percentOff(this.shop, product))) || null : null,
          pics: popular,
        });
      });

      /* The seller with the most on their shelf. */
      const seller = [...sellerList].sort(
        (a, b) => (shelfOf.get(b.id)?.length || 0) - (shelfOf.get(a.id)?.length || 0),
      )[0];
      const shelf = seller ? (shelfOf.get(seller.id) || []).filter((product) => product.icon) : [];
      if (seller && shelf.length) {
        tiles.push({
          key: "seller-" + seller.id,
          kind: "seller",
          ground: SELLER_GROUND,
          eyebrow: "Seller",
          mark: vendorImage(seller, true),
          title: `${seller.name}’s shelf`,
          note: `${shelf.length} products`,
          cta: "Visit the shop",
          to: sellerRoute(seller),
          /* Two packs from two different aisles of their shelf. */
          pics: [shelf[0], shelf.find((product) => product.category_id !== shelf[0].category_id)].filter(Boolean),
        });
      }

      this.tiles = tiles;
    },
  },
};
</script>
