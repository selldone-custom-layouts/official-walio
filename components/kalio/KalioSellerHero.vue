<!--
  Kalio — Seller hero.

  The top of a seller's storefront, in the shelf head (KalioShelfHead) like
  every other shop page: their mark, their name in the display face, their
  own description, how many products they sell and how many are on offer,
  then the aisles they sell in as a row of words (each jumps to that aisle's
  row further down). Selldone's vendor header is one row: a small avatar
  beside the name.

  Everything comes from live records: the vendor, and the seller's own
  product list. A seller without a description gets a neutral line, never
  invented copy about them.
-->
<template>
  <kalio-shelf-head
    :crumbs="crumbs"
    :eyebrow="t('seller.eyebrow', 'Seller on {shop}', { shop: shopTitle })"
    :image="mark"
    :lede="vendor && vendor.description ? vendor.description : t('seller.fallbackLede', 'An independent seller on {shop}.', { shop: shopTitle })"
    :loading="busy"
    :meta="meta"
    :tabs="tabs"
    :title="vendor ? vendor.name : null"
    cover
    :tabs-label="t('seller.tabsLabel', 'Aisles this seller sells in')"
  />
</template>

<script>
import KalioShelfHead from "./KalioShelfHead.vue";
import { aisleIndex, countProducts, featured, offers, vendorImage } from "./kalio-catalog";
import { t } from "./i18n/kalio-i18n";

export default {
  name: "KalioSellerHero",
  components: { KalioShelfHead },

  props: {
    vendorId: { type: [Number, String], required: true },
  },

  data() {
    return {
      vendor: null,
      busy: true,
      sellsIn: [],
      total: null,
      on_offer: null,
    };
  },

  computed: {
    mark() {
      return vendorImage(this.vendor);
    },
    crumbs() {
      return [{ label: this.shopTitle, to: this.homeRoute }, { label: this.vendor ? this.vendor.name : t("seller.label", "Seller") }];
    },
    meta() {
      const parts = [];
      if (this.total !== null) parts.push(t("listing.productCount", { one: "{n} product", other: "{n} products" }, { n: this.total }));
      if (this.on_offer) parts.push(t("aisle.onOfferCount", { one: "{n} on offer", other: "{n} on offer" }, { n: this.on_offer }));
      return parts.join(" · ") || null;
    },
    tabs() {
      return this.sellsIn.map((aisle) => ({
        key: aisle.id,
        label: aisle.title || aisle.name,
        href: `#k-seller-aisle-${aisle.id}`,
        click: () => this.jump(aisle),
      }));
    },
    shopTitle() {
      return this.$store.getters.getShop?.title || "Kalio";
    },
    homeRoute() {
      return { name: window.$storefront.routes.SHOP_PAGE };
    },
  },

  watch: {
    vendorId() {
      this.fetch();
    },
  },

  mounted() {
    this.fetch();
  },

  methods: {
    fetch() {
      this.vendor = null;
      this.busy = true;
      this.sellsIn = [];
      this.total = null;
      this.on_offer = null;
      const id = this.vendorId;

      countProducts(null, { vendor_id: id }).then((count) => {
        if (String(id) === String(this.vendorId)) this.total = count;
      });
      countProducts(null, { vendor_id: id, filter: JSON.stringify({ only_has_discount: true }) }).then((count) => {
        if (String(id) === String(this.vendorId)) this.on_offer = count;
      });

      window.$storefront.vendor
        .getVendor(id)
        .then(({ vendor }) => {
          if (String(id) === String(this.vendorId)) this.vendor = vendor || null;
        })
        .catch(() => {
          this.vendor = null;
        })
        .finally(() => {
          this.busy = false;
        });

      /* The aisles this seller sells in, in Kalio's featured order. */
      Promise.all([offers(), aisleIndex()]).then(([{ shelfOf }, index]) => {
        if (String(id) !== String(this.vendorId)) return;
        const shelf = shelfOf.get(Number(id)) || [];
        const aisleIds = new Set(shelf.map((product) => product.category_id));
        this.sellsIn = featured([...index.values()].filter((aisle) => aisleIds.has(aisle.id)));
      });
    },

    jump(aisle) {
      const target = document.getElementById(`k-seller-aisle-${aisle.id}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  },
};
</script>
