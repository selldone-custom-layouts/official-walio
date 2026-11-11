<!--
  Walio — the top of a product page (product page A, "the classic", given
  to Walio on 7 November 2026: kalio-design/tario-options/product-a.html).

  Thumbnails beside the picture; one buy column: "Shop all <brand>", the
  name, the rating, the price, the sizes, "How do you want it?" (the shop's
  own Pickup / Delivery / Shipping with what each costs), the sellers as
  cards to choose from, Add to cart, and the shop's free rules under it.
  Every behaviour is Kalio's overview, which is Selldone's SProductOverview
  (extends): this file supplies the markup.
-->
<template>
  <div :style="{ '--k-tint': tint }" class="k-pdp w-pdp">
    <div class="k-pdp__grid">
      <!-- ▆▆▆▆▆▆▆▆ Packshot ▆▆▆▆▆▆▆▆ -->
      <section v-if="showCover" :aria-label="t('pdp.images', 'Product images')" class="k-pdp__media">
        <div class="k-pdp__stage">
          <s-shop-product-slide-show :current-variant="current_variant" :vertical="false" />
        </div>
      </section>

      <!-- ▆▆▆▆▆▆▆▆ Buy column ▆▆▆▆▆▆▆▆ -->
      <section class="k-pdp__buy">
        <router-link
          v-if="$product.brand"
          :to="{ name: window.$storefront.routes.SHOP_PAGE, query: { search: $product.brand } }"
          class="w-pdp__brand"
          >{{ t("walio.pdp.shopAll", "Shop all {brand}", { brand: $product.brand }) }}</router-link
        >
        <router-link v-else-if="aisle" :to="aisleRoute" class="w-pdp__brand">{{ aisle.title || aisle.name }}</router-link>

        <h1 class="k-pdp__title">{{ $product.title }}</h1>

        <p v-if="$product.title_en" class="k-pdp__sub">{{ $product.title_en?.limitWords(limit_title_en) }}</p>

        <!-- Design A of the reviews options (7 November 2026): the stars,
             the score and how many rated it, which leads to the reviews. -->
        <div v-if="$product.rate_count && $product.rate" class="k-pdp__rating">
          <span :style="{ '--k-rate': $product.rate }" class="k-stars"></span>
          <b>{{ numeralFormat($product.rate, "0.0") }}</b>
          <a class="k-pdp__rating-link" href="#k-reviews" @click.prevent="toReviews">
            {{ t("reviews.ratingCount", { one: "{n} rating", other: "{n} ratings" }, { n: $product.rate_count }) }}
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

        <!-- How do you want it? (product page A): the shop's ways, with what each costs -->
        <template v-if="ways.length">
          <p class="w-pdp__lbl">{{ t("walio.pdp.how", "How do you want it?") }}</p>
          <div :class="'-n' + ways.length" class="w-ful" role="radiogroup" :aria-label="t('walio.pdp.how', 'How do you want it?')">
            <button
              v-for="w in ways"
              :key="w.key"
              :aria-checked="w.key === way_key"
              :class="{ '-on': w.key === way_key }"
              class="w-ful__it"
              role="radio"
              type="button"
              @click="way_key = w.key"
            >
              <v-icon size="22">{{ w.icon }}</v-icon>
              <span class="w-ful__tx">
                <b>{{ w.word }}</b>
                <span>{{ w.key === "Pickup" ? t("walio.way.atShop", "At the shop") : w.key === "Delivery" ? t("walio.way.toDoor", "To your door") : t("walio.way.toAddress", "To your address") }}</span>
                <em v-if="w.free">{{ t("shipping.free", "Free") }}</em>
                <em v-else-if="w.freeOver">{{ t("shipping.freeOver", "Free over {amount}", { amount: money(w.freeOver, w.currency, "auto") }) }}</em>
                <em v-else class="-n">{{ t("walio.way.priceWithAddress", "Price with your address") }}</em>
              </span>
            </button>
          </div>
        </template>

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

        <div v-if="perks.length" class="w-pdp__perks">
          <span v-for="p in perks" :key="p.text"><v-icon size="18">{{ p.icon }}</v-icon>{{ p.text }}</span>
        </div>

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
import KalioProductOverview from "../../kalio/product/KalioProductOverview.vue";
import { money, waysOf } from "../walio-home";
import { t } from "../../kalio/i18n/kalio-i18n";

export default {
  name: "WalioProductOverview",
  extends: KalioProductOverview,

  data() {
    return { way_key: null, compact: false };
  },

  computed: {
    ways() {
      return waysOf(this.shop || this.$shop).slice(0, 3);
    },
    /* The shop's own free rules, as two short lines. */
    perks() {
      const out = [];
      const ship = this.ways.find((w) => w.freeOver);
      if (ship) out.push({ icon: "local_shipping", text: t("walio.pdp.perkFree", "Free {way} on orders over {amount}", { way: ship.word.toLowerCase(), amount: this.money(ship.freeOver, ship.currency, "auto") }) });
      const pick = this.ways.find((w) => w.key === "Pickup" && w.free);
      if (pick) out.push({ icon: "storefront", text: t("walio.pdp.perkPickup", "Free pickup at the shop") });
      return out;
    },
  },

  watch: {
    ways: {
      handler(list) {
        if (!list.some((w) => w.key === this.way_key)) {
          this.way_key = (list.find((w) => w.key === "Delivery") || list[0] || {}).key || null;
        }
      },
      immediate: true,
    },
  },

  mounted() {
    this.onResize();
    window.addEventListener("resize", this.onResize, { passive: true });
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.onResize);
  },

  methods: {
    onResize() {
      this.compact = window.innerWidth <= 960;
    },
    /* An amount in `from` (null: the shop's base), in the visitor's currency. */
    money(n, from, short) {
      return money(n, from, short);
    },
  },
};
</script>
