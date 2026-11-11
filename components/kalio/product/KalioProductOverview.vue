<!--
  Kalio — Product overview.

  The top of a product page, laid out the Kalio way: the packshot on its
  aisle's tint on one side; on the other a single buy column that reads top
  to bottom — aisle and brand, the name, the price, the size, who sells it,
  the basket button, then the quieter things (compare, save, share, the
  shop's assurances).

  Every behaviour is Selldone's SProductOverview, inherited whole through
  `extends`: variant selection and deep links, the seller choice and its
  basket update, preferences, valuation, subscriptions, coupons, extra
  pricing, the buy button with its sticky mode, Stripe split, the basket
  line note and the discount countdown. This file only supplies the markup,
  and every commerce control in it is the platform's own component wired
  exactly as SProductOverview wires it.
-->
<template>
  <div class="k-pdp" :style="{ '--k-tint': tint }">
    <div class="k-pdp__grid">
      <!-- ▆▆▆▆▆▆▆▆ Packshot ▆▆▆▆▆▆▆▆ -->
      <section v-if="showCover" :aria-label="t('pdp.images', 'Product images')" class="k-pdp__media">
        <div class="k-pdp__stage">
          <s-shop-product-slide-show :current-variant="current_variant" :vertical="false" />
        </div>
      </section>

      <!-- ▆▆▆▆▆▆▆▆ Buy column ▆▆▆▆▆▆▆▆ -->
      <section class="k-pdp__buy">
        <p class="k-pdp__kicker">
          <router-link v-if="aisle" :to="aisleRoute" class="k-pdp__aisle">{{ aisle.title || aisle.name }}</router-link>
          <span v-if="aisle && $product.brand" aria-hidden="true" class="k-pdp__dot">·</span>
          <router-link
            v-if="$product.brand"
            :to="{ name: window.$storefront.routes.SHOP_PAGE, query: { search: $product.brand } }"
            class="k-pdp__brand"
            >{{ $product.brand }}</router-link
          >
        </p>

        <h1 class="k-pdp__title">{{ $product.title }}</h1>

        <p v-if="$product.title_en" class="k-pdp__sub">{{ $product.title_en?.limitWords(limit_title_en) }}</p>

        <!-- Design A of the reviews options (7 November 2026): the stars,
             the score and how many rated it, which leads to the reviews. -->
        <div v-if="$product.rate_count && $product.rate" class="k-pdp__rating">
          <span :style="{ '--k-rate': $product.rate }" class="k-stars"></span>
          <b>{{ numeralFormat($product.rate, "0.0") }}</b>
          <a class="k-pdp__rating-link" href="#k-reviews" @click.prevent="toReviews">
            {{ t("reviews.ratingCount", { one: "{n} rating", other: "{n} ratings" }, { n: Number($product.rate_count) }) }}
          </a>
        </div>

        <p v-if="!has_original_warranty" class="k-pdp__warn">
          <v-icon size="16">error_outline</v-icon>
          {{ $t("product_info.fake") }}
        </p>

        <!-- Price -->
        <div class="k-pdp__price">
          <s-subscription-price-select
            v-if="isSubscription"
            v-model="selected_subscription_price"
            :class="{ pen: !!corresponding_basket_item?.subscription_price_id || !!membership_subscribed_plan }"
            :disabled="!$product.quantity"
            :subscription-prices="subscription_prices"
            return-object
          ></s-subscription-price-select>
          <s-product-section-price
            v-else
            :preferences="preferences"
            :selected-vendor-product="selected_vendor_product"
          ></s-product-section-price>
          <s-product-section-tax></s-product-section-tax>
          <s-product-section-cashback :amount="0" :currency="GetUserSelectedCurrency()?.code"></s-product-section-cashback>
        </div>

        <!-- Size and options -->
        <div class="k-pdp__options">
          <s-product-section-variants
            v-model:current-variant="current_variant"
            v-model:filter="filter"
            v-model:selection-values="selection_values"
          ></s-product-section-variants>
          <s-product-section-service v-model:preferences="preferences"></s-product-section-service>
          <s-product-section-valuation
            v-if="preferences && preferences.valuation"
            :correspondingBasketItem="corresponding_basket_item"
            :current-variant="current_variant"
            :preferences="preferences"
          ></s-product-section-valuation>
        </div>

        <!-- Who sells it -->
        <kalio-seller-offers
          v-if="vendor_products && vendor_products.length"
          v-model="selected_vendor_product_id"
          :vendor-products="vendor_products"
          force-show-all
          @change="changeVendor"
        ></kalio-seller-offers>

        <s-product-section-extra-pricings
          :current-variant="current_variant"
          :preferences="preferences"
          :quantity="corresponding_basket_item?.count"
          :selected-vendor-product="selected_vendor_product"
          @select="(val) => $refs.buy_section?.triggerBuyButton(val.min)"
        ></s-product-section-extra-pricings>

        <s-storefront-coupons-list
          :product-id="$product.id"
          :variant-id="current_variant ? current_variant.id : undefined"
        ></s-storefront-coupons-list>

        <!-- Basket: in it, the quantity and checkout (KalioBasketLine);
             otherwise Selldone's buy button. -->
        <kalio-basket-line
          v-if="canBuy && corresponding_basket_item"
          :line="corresponding_basket_item"
          :product="$product"
          :stock="selected_vendor_product ? selected_vendor_product.quantity : current_variant ? current_variant.quantity : $product.quantity"
          :vendor-product="selected_vendor_product"
          class="k-pdp__basket"
        />
        <s-product-section-buy-button
          v-else
          ref="buy_section"
          :can-buy="canBuy"
          :current-variant="current_variant"
          :hss-sticky-but-button="hssStickyButButton"
          :preferences="preferences"
          :quick-buy-mode="quickBuyMode"
          :selected-subscription-price="selected_subscription_price"
          :selected-vendor-product="selected_vendor_product"
          class="k-pdp__basket"
        ></s-product-section-buy-button>

        <s-product-section-incentivise
          :variant="current_variant"
          :vendorProduct="selected_vendor_product"
        ></s-product-section-incentivise>

        <u-payment-stripe-split
          :basket="corresponding_basket_item ? basket : null"
          :country-code="basket?.receiver_info?.country"
          :preferences="preferences"
          :selected-subscription-price="selected_subscription_price"
          :selected-vendor-product="selected_vendor_product"
          :variant="current_variant"
          :vendor-product="selected_vendor_product"
        ></u-payment-stripe-split>

        <!-- Compare, save, share -->
        <div class="k-pdp__actions">
          <s-product-section-extra-buttons :current-variant="current_variant"></s-product-section-extra-buttons>
          <v-menu :close-on-content-click="false" location="bottom end" max-width="360">
            <template v-slot:activator="{ props }">
              <button class="k-pdp__share" type="button" v-bind="props">
                <v-icon size="18">ios_share</v-icon>
                {{ $t("global.commons.share") }}
              </button>
            </template>
            <div class="k-pdp__share-sheet">
              <p class="k-eyebrow">{{ $t("global.commons.share") }}</p>
              <u-button-share-group
                :description="$product.title_en"
                :media="getShopImagePath($product.icon)"
                :title="$product.title"
                :url="ShopURLs.GetProductLink(shop, $product.id, $product.slug)"
                small
              ></u-button-share-group>
            </div>
          </v-menu>
        </div>

        <!-- The shop's own assurances (delivery, support, guarantee) -->
        <s-product-section-badges class="k-pdp__assurances"></s-product-section-badges>
      </section>
    </div>

    <basket-item-user-message-form
      v-if="basket"
      :basket="basket"
      :product="$product"
      :variant-id="current_variant ? current_variant.id : null"
      class="k-pdp__note"
    ></basket-item-user-message-form>

    <product-discount-countdown></product-discount-countdown>
  </div>
</template>

<script>
import { computed } from "vue";
import SProductOverview from "@selldone/components-vue/storefront/product/overview/SProductOverview.vue";
import KalioSellerOffers from "./KalioSellerOffers.vue";
import KalioBasketLine from "./KalioBasketLine.vue";
import { aisleIndex, aisleRoute, tintFor } from "../kalio-catalog";
import { switchOffer } from "../kalio-basket";
import "../kalio-offer-price"; // the struck price follows the chosen seller

export default {
  name: "KalioProductOverview",
  extends: SProductOverview,
  components: { KalioSellerOffers, KalioBasketLine },

  /* Selldone's sections inside (the price, tax, cashback) read the chosen
     variant from an injected $variant. The product page provides it; the
     quick-buy sheet did not, so the sheet's price stayed at the product's own
     price while an option with its own price was picked (the cart got the
     right one). The overview now provides its own choice (Digito 1.0.15). */
  provide() {
    return { $variant: computed(() => this.current_variant) };
  },

  data() {
    return {
      window: window,
      aisle: null,
    };
  },

  computed: {
    tint() {
      return tintFor(this.aisle) || null;
    },
    aisleRoute() {
      return this.aisle ? aisleRoute(this.aisle) : { name: window.$storefront.routes.SHOP_PAGE };
    },
  },

  watch: {
    "$product.category_id": {
      handler() {
        this.findAisle();
      },
      immediate: true,
    },
  },

  methods: {
    toReviews() {
      document.getElementById("k-reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    /* SProductOverview reaches the basket through its buy button, which is
       not on the page while the product is in the basket (KalioBasketLine
       stands in for it). */
    buy(variant = null) {
      if (variant) this.current_variant = variant;
      this.$nextTick(() => this.$refs.buy_section?.triggerBuyButton(1));
    },

    /* Another seller chosen while the product is in the basket: the line
       moves to that seller's offer, keeping its count. */
    /* A line already in the basket moves to the seller just chosen, with
       its count; after any count taps still on their way (kalio-basket.ts),
       so a slow answer cannot bring the old count back. */
    changeVendor() {
      if (!this.corresponding_basket_item) return;
      switchOffer(
        this,
        this.$product,
        this.current_variant,
        this.selected_vendor_product,
        this.preferences,
        this.selected_subscription_price,
      );
    },

    /* The product's own category record when the product carries it, else
       the aisle with that id from the shop's aisle list. */
    findAisle() {
      const category = this.$product?.category;
      if (category && category.id) {
        this.aisle = category;
        return;
      }
      const id = this.$product?.category_id;
      if (!id) {
        this.aisle = null;
        return;
      }
      aisleIndex().then((index) => {
        if (this.$product?.category_id === id) this.aisle = index.get(id) || null;
      });
    },
  },
};
</script>
