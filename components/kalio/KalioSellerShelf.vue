<!--
  Kalio — Seller shelf.

  Sits under the seller hero on a vendor page and makes it a storefront:
  what this seller has on offer, then one row for every aisle they sell in
  (each row the hero's aisle chips jump to), and a heading over the full
  catalogue of their products that follows (Selldone's listing, with its
  filters). Every row is a KalioRail scoped by vendor_id, so it self-empties
  and lazy-loads like the home page's rows.
-->
<template>
  <div class="k-seller-shelf">
    <kalio-rail
      :filter="{ only_has_discount: true }"
      :title="t('seller.shelf.onOffer', 'On offer from {name}', { name: name })"
      :vendor-id="vendorId"
      sort="bestselling"
    />

    <div v-for="(aisle, i) in sellsIn" :id="`k-seller-aisle-${aisle.id}`" :key="aisle.id" class="k-seller-shelf__aisle">
      <kalio-rail
        :dir="aisle.name"
        :lazy="i > 1"
        :title="t('seller.shelf.aisleFrom', '{aisle} from {name}', { aisle: aisle.title || aisle.name, name: name })"
        :vendor-id="vendorId"
        sort="bestselling"
      />
    </div>

    <header class="k-wrap k-seller-shelf__all">
      <h2 class="k-section-head__title">{{ t("seller.shelf.everything", "Everything from {name}", { name: name }) }}</h2>
      <p class="k-section-head__meta">{{ t("seller.shelf.filterHint", "Filter by price, brand or size, or sort the whole range.") }}</p>
    </header>
  </div>
</template>

<script>
import KalioRail from "./KalioRail.vue";
import { aisleIndex, featured, offers, vendors } from "./kalio-catalog";
import { t } from "./i18n/kalio-i18n";

export default {
  name: "KalioSellerShelf",
  components: { KalioRail },

  props: {
    vendorId: { type: [Number, String], required: true },
  },

  data() {
    return {
      /* The seller's own name, once read. */
      vendor_name: null,
      sellsIn: [],
    };
  },

  computed: {
    name() {
      return this.vendor_name || t("seller.thisSeller", "this seller");
    },
  },

  mounted() {
    vendors().then((list) => {
      const vendor = list.find((item) => String(item.id) === String(this.vendorId));
      if (vendor) this.vendor_name = vendor.name;
    });
    Promise.all([offers(), aisleIndex()]).then(([{ shelfOf }, index]) => {
      const aisleIds = new Set((shelfOf.get(Number(this.vendorId)) || []).map((product) => product.category_id));
      this.sellsIn = featured([...index.values()].filter((aisle) => aisleIds.has(aisle.id)));
    });
  },
};
</script>
