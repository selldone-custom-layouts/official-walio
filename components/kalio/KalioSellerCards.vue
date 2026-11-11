<!--
  Kalio — Shop by seller.

  One card per marketplace seller: their mark, their name, their own
  description (or a neutral line when they have none — never invented copy
  about them), a link to their shop and four products from their shelf.
  Products only one seller offers are shown first, so each card shows what
  is particular to that seller. No seller, no section.
-->
<template>
  <section v-if="cards.length" aria-labelledby="k-sellers-title" class="k-sellers k-wrap">
    <header class="k-section-head">
      <div>
        <h2 id="k-sellers-title" class="k-section-head__title">{{ t("seller.shopBy", "Shop by seller") }}</h2>
        <p class="k-section-head__meta">{{ t("seller.cards.meta", "Every product on {shop} comes from one of these shops", { shop: shopTitle }) }}</p>
      </div>
    </header>

    <div class="k-sellers__row">
      <article v-for="card in cards" :key="card.vendor.id" class="k-seller">
        <div class="k-seller__id">
          <span class="k-seller__mark">
            <img v-if="card.mark" :src="card.mark" alt="" height="64" width="64" loading="lazy" />
            <v-icon v-else size="28">storefront</v-icon>
          </span>
          <h3 class="k-seller__name">{{ card.vendor.name }}</h3>
          <p class="k-seller__lede">
            {{ card.vendor.description || t("seller.fallbackLede", "An independent seller on {shop}.", { shop: shopTitle }) }}
          </p>
          <router-link :to="card.to" class="k-more">
            {{ t("seller.visitShop", "Visit {name}’s shop", { name: card.vendor.name }) }}
            <v-icon class="k-flip" size="18">chevron_right</v-icon>
          </router-link>
        </div>

        <ul class="k-seller__shelf">
          <li v-for="product in card.pics" :key="product.id" :style="{ '--k-tint': tint(product) }">
            <router-link :to="productRoute(product)" :aria-label="product.title">
              <img :src="picture(product)" :srcset="srcset(product)" alt="" loading="lazy" sizes="72px" @error="dropSrcset" />
            </router-link>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<script>
import { aisleIndex, offers, productImage, sellerRoute, tintFor, vendorImage, vendors, productSrcset, dropSrcset } from "./kalio-catalog";

export default {
  name: "KalioSellerCards",

  data() {
    return {
      cards: [],
      aisle_of: new Map(),
    };
  },

  computed: {
    shopTitle() {
      return this.$store.getters.getShop?.title || "Kalio";
    },
  },

  mounted() {
    Promise.all([vendors(), offers(), aisleIndex()]).then(([list, { sellersOf, shelfOf }, index]) => {
      this.aisle_of = index;
      this.cards = list.map((vendor) => {
        const shelf = (shelfOf.get(vendor.id) || []).filter((product) => product.icon);
        const own = shelf.filter((product) => (sellersOf.get(product.id) || []).length === 1);
        const shared = shelf.filter((product) => !own.includes(product));
        return {
          vendor,
          mark: vendorImage(vendor),
          to: sellerRoute(vendor),
          pics: [...own, ...shared].slice(0, 4),
        };
      });
    });
  },

  methods: {
    srcset(product) {
      return productSrcset(product);
    },
    dropSrcset,
    /* The 128px thumbnail is soft at this size on a dense screen, and no
       size in between exists, so the original is used. */
    picture(product) {
      return productImage(product);
    },
    tint(product) {
      return tintFor(this.aisle_of.get(product.category_id));
    },
    productRoute(product) {
      return { name: window.$storefront.routes.PRODUCT_PAGE, params: { product_id: product.id } };
    },
  },
};
</script>
