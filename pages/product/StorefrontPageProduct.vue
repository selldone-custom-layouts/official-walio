<!--
  - Copyright (c) 2023. Selldone® Business OS™
  -
  - Author: M.Pajuhaan
  - Web: https://selldone.com
  - ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -
  - All rights reserved. In the weave of time, where traditions and innovations intermingle, this content was crafted.
  - From the essence of thought, through the corridors of creativity, each word, and sentiment has been molded.
  - Not just to exist, but to inspire. Like an artist's stroke or a sculptor's chisel, every nuance is deliberate.
  - Our journey is not just about reaching a destination, but about creating a masterpiece.
  - Tread carefully, for you're treading on dreams.
  -->

<template xmlns:v-slot="http://www.w3.org/1999/XSL/Transform">
  <!--
    Kalio — product page.

    Selldone's product sections and commerce components, arranged and dressed
    as Kalio's own page: a plain breadcrumb, the Kalio overview (packshot on
    its aisle tint beside one buy column), then the product's story —
    highlights, description, spec, reviews — and more from the same aisle.
    Merchant section ordering (theme.order) still decides the order below
    the overview.
  -->
  <div class="s--product k-product">
    <!-- ⬬⬬⬬⬬⬬⬬⬬⬬⬬⬬⬬⬬ Product info ⬬⬬⬬⬬⬬⬬⬬⬬⬬⬬⬬⬬ -->
    <div style="order: 0">
      <div class="s--product-section-info">
        <!-- ⬬⬬⬬⬬⬬⬬⬬⬬⬬⬬⬬⬬ Top Shop Menu ⬬⬬⬬⬬⬬⬬⬬⬬⬬⬬⬬⬬ -->
        <slot name="header" :center="true"></slot>

        <!-- ⬬⬬⬬⬬ Breadcrumb, admin shortcut, QR ⬬⬬⬬⬬ -->
        <nav :aria-label="t('pdp.breadcrumb', 'Breadcrumb')" class="k-crumbs">
          <router-link :to="{ name: window.$storefront.routes.SHOP_PAGE }">{{ $shop.title }}</router-link>
          <template v-if="product && product.category">
            <v-icon aria-hidden="true" class="k-flip" size="16">chevron_right</v-icon>
            <router-link
              :to="{
                name: window.$storefront.routes.SHOP_CATEGORY_PAGE,
                params: { category_name: product.category.name },
              }"
              >{{ product.category.title || product.category.name }}</router-link
            >
          </template>
          <template v-if="product">
            <v-icon aria-hidden="true" class="k-flip" size="16">chevron_right</v-icon>
            <span aria-current="page" class="k-crumbs__here">{{ product.title }}</span>
          </template>
          <span class="k-crumbs__tools">
            <s-product-admin-button v-if="$vuetify.display.mdAndUp"></s-product-admin-button>
            <s-product-qr></s-product-qr>
          </span>
        </nav>

        <walio-product-overview v-if="product" can-buy show-cover />
        <s-product-overview-loading v-else />
        <u-loading-progress v-if="busy"></u-loading-progress>
      </div>
    </div>

    <template v-if="product">
      <!-- ▁▁▁▁▁▁ 🞇 Cross selling (the merchant's own pairs) 🞇 ▁▁▁▁▁▁ -->
      <div :style="{ order: getOrder('cross') }">
        <s-product-cross-sells class="s--product-section k-pdp-block"></s-product-cross-sells>
      </div>
      <div :style="{ order: getOrder('offer') }">
        <s-product-offers class="s--product-section k-pdp-block"></s-product-offers>
      </div>

      <!-- ▁▁▁▁▁▁ 🞇 Walio (product page A): "About this item" in tabs 🞇 ▁▁▁▁▁▁ -->
      <div :style="{ order: getOrder('spec') }">
        <section aria-labelledby="w-about" class="w-about k-wrap">
          <h2 id="w-about" class="w-about__h">{{ t("walio.pdp.about", "About this item") }}</h2>
          <div class="w-tabs" role="tablist">
            <button
              v-for="tb in tabs"
              :key="tb.key"
              :aria-selected="tab === tb.key"
              :class="{ '-on': tab === tb.key }"
              role="tab"
              type="button"
              @click="tab = tb.key"
            >
              {{ tb.label }}
            </button>
          </div>
          <div v-show="tab === 'details'" class="w-about__details" role="tabpanel">
            <div v-if="highlight_rows.length">
              <h4>{{ t("pdp.highlights", "Highlights") }}</h4>
              <ul class="w-hl">
                <li v-for="h in highlight_rows" :key="h.key">
                  <v-icon aria-hidden="true" size="20">check_circle</v-icon><span><b>{{ h.key }}:</b> {{ h.value }}</span>
                </li>
              </ul>
              <ul v-if="cons_list.length" class="w-hl -cons">
                <li v-for="item in cons_list" :key="'c' + item.key">
                  <v-icon aria-hidden="true" size="20">remove_circle_outline</v-icon><span><b>{{ item.key }}</b> {{ item.value }}</span>
                </li>
              </ul>
            </div>
            <div>
              <s-product-article hide-title></s-product-article>
              <s-product-spec v-if="!article" class="k-pdp-spec"></s-product-spec>
            </div>
          </div>
          <div v-show="tab === 'spec'" role="tabpanel">
            <s-product-spec class="k-pdp-spec"></s-product-spec>
          </div>
          <div v-show="tab === 'ship'" role="tabpanel">
            <ul v-if="ways.length" class="w-ways2">
              <li v-for="w in ways" :key="w.key">
                <v-icon aria-hidden="true">{{ w.icon }}</v-icon>
                <span
                  ><b>{{ w.word }}</b> — {{ w.line }}.
                  <template v-if="w.free">{{ t("walio.way.freeSentence", "Free.") }}</template>
                  <template v-else-if="w.freeOver">{{ t("walio.way.freeOverSentence", "Free on orders over {amount}.", { amount: money(w.freeOver, w.currency, "auto") }) }}</template>
                </span>
              </li>
            </ul>
            <s-product-shipping class="k-pdp-block"></s-product-shipping>
            <s-product-warranty class="k-pdp-block"></s-product-warranty>
            <s-product-guide class="k-pdp-block"></s-product-guide>
          </div>
        </section>
      </div>

      <div :style="{ order: getOrder('includes') }">
        <s-product-includes class="k-pdp-block"></s-product-includes>
      </div>
      <div :style="{ order: getOrder('files') }">
        <s-product-files-list class="k-pdp-block"></s-product-files-list>
      </div>
      <div :style="{ order: getOrder('contents') }">
        <s-product-subscription-membership class="k-pdp-block"></s-product-subscription-membership>
      </div>
      <div :style="{ order: getOrder('page') }">
        <s-product-landing></s-product-landing>
      </div>

      <!-- ▅▅▅▅▅▅▅▅▅▅ Reviews ▅▅▅▅▅▅▅▅▅▅ -->
      <div :style="{ order: getOrder('comments') }">
        <section aria-labelledby="k-reviews" class="k-pdp-block k-reviews">
          <h2 id="k-reviews" class="k-pdp-block__title">{{ t("walio.reviews.title", "Ratings & reviews") }}</h2>
          <kalio-reviews></kalio-reviews>
        </section>
      </div>

      <!-- ⬬⬬⬬⬬ More from this aisle, as Walio cards ⬬⬬⬬⬬ -->
      <div :style="{ order: getOrder('related-products') }">
        <walio-row
          v-if="product.category"
          :key="'aisle-' + product.category.id"
          :dir="product.category.name"
          :exclude="product.id"
          :more-to="{
            name: window.$storefront.routes.SHOP_CATEGORY_PAGE,
            params: { category_name: product.category.name },
          }"
          :title="t('walio.pdp.moreIn', 'More in {aisle}', { aisle: product.category.title || product.category.name })"
          lazy
          sort="bestselling"
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import NotificationService from "@selldone/components-vue/plugins/notification/NotificationService.ts";

import WalioProductOverview from "../../components/walio/product/WalioProductOverview.vue";
import WalioRow from "../../components/walio/WalioRow.vue";
import { money, waysOf } from "../../components/walio/walio-home";
import { EventBus } from "@selldone/components-vue/utils/events/EventBus.ts";
import SProductOverviewLoading from "@selldone/components-vue/storefront/product/overview/loading/SProductOverviewLoading.vue";

import { GtagEcommerce } from "@selldone/components-vue/plugins/gtag/GtagEcommerce";

import SProductIncludes from "@selldone/components-vue/storefront/product/includes/SProductIncludes.vue";
import SProductShipping from "@selldone/components-vue/storefront/product/shipping/SProductShipping.vue";
import SProductWarranty from "@selldone/components-vue/storefront/product/warranty/SProductWarranty.vue";
import SProductGuide from "@selldone/components-vue/storefront/product/guide/SProductGuide.vue";
import SProductFilesList from "@selldone/components-vue/storefront/product/file/list/SProductFilesList.vue";
import KalioReviews from "../../components/kalio/product/KalioReviews.vue";
import SProductSubscriptionMembership from "@selldone/components-vue/storefront/product/subscription/membership/SProductSubscriptionMembership.vue";
import SProductOffers from "@selldone/components-vue/storefront/product/offers/SProductOffers.vue";
import SProductCrossSells from "@selldone/components-vue/storefront/product/cross-sells/SProductCrossSells.vue";
import ProductSection from "@selldone/core-js/enums/product/ProductSection";
import { Article } from "@selldone/core-js";
import { computed } from "vue";
import SProductAdminButton from "@selldone/components-vue/storefront/product/admin/button/SProductAdminButton.vue";
import SProductQr from "@selldone/components-vue/storefront/product/qr/SProductQr.vue";
import SProductSpec from "@selldone/components-vue/storefront/product/spec/SProductSpec.vue";
import SProductArticle from "@selldone/components-vue/storefront/product/article/SProductArticle.vue";
import { XapiProductGetTypes } from "@selldone/sdk-storefront/product";
import SProductLanding from "@selldone/components-vue/storefront/product/landing/SProductLanding.vue";
import CurrencyMixin from "@selldone/components-vue/mixin/currency/CurrencyMixin.ts";
import {StorefrontSeo} from "../../helpers/StorefrontSeo";
import { t } from "@app-storefront/components/kalio/i18n/kalio-i18n";

export default {
  name: "StorefrontPageProduct",
  mixins: [CurrencyMixin],

  inject: ["$shop"],
  props: {},
  components: {
    SProductLanding,
    SProductArticle,
    SProductSpec,
    SProductQr,
    SProductAdminButton,
    SProductCrossSells,
    SProductOffers,
    SProductSubscriptionMembership,
    KalioReviews,
    SProductFilesList,
    SProductGuide,
    SProductWarranty,
    SProductShipping,
    SProductIncludes,

    SProductOverviewLoading,
    WalioProductOverview,
    WalioRow,

  },

  /**
   * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   *  🔷 Provide
   * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   */
  provide() {
    return {
      $product: computed(() => this.product),

      /**
       * Current selected variant by user
       */
      $variant: computed(() => this.current_variant),
    };
  },
  /**
   * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   *  🔷 Data
   * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   */
  data: function () {
    return {
      show_article: true, // For refresh article!
      tab: "details",

      product: null,

      busy: false,

      article_type: Article.Types.Product,
    };
  },

  computed: {
    theme() {
      return this.$shop.theme && !Array.isArray(this.$shop.theme)
        ? this.$shop.theme
        : {};
    },

    current_variant() {
      return this.$store.getters.getCurrentSelectedVariant;
    },

    article() {
      return (
        this.product &&
        this.product.article_pack &&
        this.product.article_pack.article &&
        this.product.article_pack.article
      );
    },

    // ▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃ Admin URLs: ▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃

    /* The product's pros and cons, as label → note pairs, for Highlights. */
    pros_list() {
      return this.toPairs(this.product?.pros);
    },
    cons_list() {
      return this.toPairs(this.product?.cons);
    },
    ways() {
      return waysOf(this.$shop);
    },
    tabs() {
      return [
        { key: "details", label: t("walio.pdp.tab.details", "Details") },
        { key: "spec", label: t("walio.pdp.tab.spec", "Specifications") },
        { key: "ship", label: t("walio.pdp.tab.ship", "Shipping & returns") },
      ];
    },
    /* Highlights: the merchant's pros, else the spec's first group. */
    highlight_rows() {
      if (this.pros_list.length) return this.pros_list.slice(0, 6);
      const spec = this.product?.spec;
      if (!spec || typeof spec !== "object") return [];
      const order = Array.isArray(spec.spec_order) && spec.spec_order.length ? spec.spec_order : Object.keys(spec);
      const out = [];
      let groups = 0;
      for (const key of order) {
        if (key === "spec_order") continue;
        const value = spec[key];
        if (value === "group") {
          if (++groups > 1) break;
          continue;
        }
        if (value === null || value === undefined || value === "") continue;
        out.push({ key, value: Array.isArray(value) ? value.join(", ") : String(value) });
        if (out.length >= 6) break;
      }
      return out;
    },
    has_pros_cons() {
      return (
        (this.product?.pros && Object.keys(this.product.pros).length > 0) ||
        (this.product?.cons && Object.keys(this.product.cons).length > 0)
      );
    },
  },

  watch: {
    $route() {
      this.getProduct();
      this.$forceUpdate(); // Notice we have to use a $ here
    },
  },
  created() {
    this.getProduct();
  },

  methods: {
    money,
    askToSignIn() {
      EventBus.$emit("need-login", true);
    },
    toPairs(value) {
      if (!value || typeof value !== "object") return [];
      return Object.entries(value)
        .filter(([key, note]) => key && note != null)
        .map(([key, note]) => ({ key, value: String(note) }));
    },
    getOrder(code) {
      if (!this.theme?.order || !Array.isArray(this.theme?.order)) {
        this.theme.order = Object.values(ProductSection).map((x) => x.code);
      } else {
        // Add missing sections
        Object.values(ProductSection).forEach((t) => {
          if (!this.theme.order.includes(t)) this.theme.order.push(t);
        });
      }

      return this.theme.order.indexOf(code) + 1;
    },

    getProduct() {
      const seoNavigation = StorefrontSeo.captureNavigation();
      const handleSuccessResponse = ({
        product,
      }: XapiProductGetTypes.IResponse) => {
        this.product = product;

        GtagEcommerce.MeasuringViewsOfProductDetails(
          this.$shop,
          product,
          this.GetUserSelectedCurrency().code,
          "product-page",
        );

        // Reject initial-load and superseded responses, including SDK cache callbacks.
        StorefrontSeo.updateProduct(
          product,
          this.$shop,
          seoNavigation,
          this.GetUserSelectedCurrency().code,
        );
      };

      if (window.PRE_LOADED_DATA?.PRODUCT_PACK) {
        console.log("⚡ Turbo load product.");
        handleSuccessResponse(window.PRE_LOADED_DATA.PRODUCT_PACK);
        window.PRE_LOADED_DATA = null; // Clear!
      } else {
        this.busy = true; // Do not show loading!
      }

      window.$storefront.products
        .optimize(60)
        .get(this.getId(this.$route.params.product_id), {
          "augmented-categories": 3, // Return 3 categories in the parent folder of current category
          "augmented-cross-sells": true, // Return max 3 cross-selling items
        })
        .cache(handleSuccessResponse)
        .then(handleSuccessResponse)
        .catch((e) => {
          NotificationService.showLaravelError(e);
        })
        .finally(() => {
          this.busy = false;
        });
    },
  },
};
</script>

<style lang="scss" scoped></style>
