<!--
  Kalio — Quick-buy sheet.

  The sheet every "+" opens: the hero, the rails, the shelf, and (through
  kalio-listing-quick-buy.ts) the catalogue grid. It fetches the full
  product, provides it as $product and renders the product page's own Kalio
  overview (KalioProductOverview) in quick-buy mode, so variants, sellers
  and the basket behave exactly as on the product page and look like it.
  Selldone's sheet showed its default overview. A link at the top opens the
  full product page; leaving the page closes the sheet.
-->
<template>
  <v-bottom-sheet
    :model-value="modelValue"
    :max-width="1280"
    content-class="rounded-t-xl k-quickbuy"
    max-height="92vh"
    width="98vw"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="position-relative" rounded="t-xl">
      <div class="k-quickbuy__bar">
        <router-link v-if="product" :to="productRoute" class="k-more">
          {{ t("quickbuy.fullDetails", "Full details") }}
          <v-icon class="k-flip" size="20">chevron_right</v-icon>
        </router-link>
        <button :aria-label="t('common.close', 'Close')" class="k-quickbuy__close" type="button" @click="$emit('update:modelValue', false)">
          <v-icon>close</v-icon>
        </button>
      </div>
      <v-card-text class="k-quickbuy__body thin-scroll">
        <s-product-overview-loading v-if="busy && !full" />
        <kalio-product-overview v-if="full" can-buy quick-buy-mode show-cover />
      </v-card-text>
    </v-card>
  </v-bottom-sheet>
</template>

<script>
import { computed } from "vue";
import KalioProductOverview from "./product/KalioProductOverview.vue";
import SProductOverviewLoading from "@selldone/components-vue/storefront/product/overview/loading/SProductOverviewLoading.vue";
import NotificationService from "@selldone/components-vue/plugins/notification/NotificationService.ts";

export default {
  name: "KalioQuickBuy",
  components: { KalioProductOverview, SProductOverviewLoading },

  props: {
    modelValue: Boolean,
    /** The product summary that was tapped. */
    product: { type: Object, default: null },
  },

  emits: ["update:modelValue"],

  /* The overview injects $product; the listing provides it the same way. */
  provide() {
    return {
      $product: computed(() => this.full),
    };
  },

  data() {
    return {
      full: null,
      busy: false,
    };
  },

  computed: {
    productRoute() {
      return { name: window.$storefront.routes.PRODUCT_PAGE, params: { product_id: this.product.id } };
    },
  },

  watch: {
    modelValue(open) {
      if (open && this.product) this.load(this.product);
    },
    /* A link inside the sheet (the aisle, the brand, a seller, "Full
       details") goes to another page; the sheet does not stay over it. */
    "$route.fullPath"() {
      if (this.modelValue) this.$emit("update:modelValue", false);
    },
  },

  methods: {
    load(product) {
      this.full = null;
      this.busy = true;

      const done = ({ product: full }) => {
        if (product === this.product) this.full = full;
      };

      window.$storefront.products
        .optimize(60)
        .get(product.id, { no_article: true })
        .cache(done)
        .then(done)
        .catch((error) => {
          NotificationService.showLaravelError(error);
          this.$emit("update:modelValue", false);
        })
        .finally(() => {
          this.busy = false;
        });
    },
  },
};
</script>
