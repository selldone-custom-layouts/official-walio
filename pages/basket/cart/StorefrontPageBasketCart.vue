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

<!--
  Kalio — the basket page (design C, drawn on 4 November 2026 in
  ../kalio-design/basket-page-options/ and basket-flow-options/).

  The lines by seller, the shopper's details in three small cards (Delivery method,
  Where, Who) and "Often added" on the left; on the right a receipt: the
  total large, what the shopper saves, every line of the bill Selldone
  works out, the discount code, and Pay. On a phone the receipt follows
  the details and a bar with the total and Pay stays at the foot of the
  window.

  Everything that works is Selldone's and stays as it was in the script
  below: the bill, the basket config (address, delivery, billing, custom
  form, guest email), coupons and lottery prizes (shown when the shopper
  has some), the club, the wallet, the
  shipping options, the payment dialog and the service order.
-->
<template>
  <div class="k-cart">
    <div class="k-wrap k-cart__wrap">
      <nav :aria-label="t('common.back', 'Back')" class="k-cart__crumbs">
        <a href="#" @click.prevent="$router.go(-1)"><v-icon class="k-flip" size="16">chevron_left</v-icon>{{ t("basket.keepShopping", "Keep shopping") }}</a>
      </nav>

      <div class="k-cart__head">
        <h1 class="k-cart__title">{{ t("walio.checkout.title", "Checkout") }}</h1>
        <span v-if="seller_count > 1" class="k-cart__one">
          <v-icon size="18">storefront</v-icon>{{ t("basket.sellers", { one: "{n} seller, one basket and one checkout.", other: "{n} sellers, one basket and one checkout." }, { n: seller_count }) }}
        </span>
        <s-shop-share-order-button v-if="basket?.items?.length" :basket="basket" class="k-cart__share" />
      </div>

      <!-- Walio 1.1.0 (checkout design B): where the shopper is, as steps.
           Each step is done when Selldone has what it needs: the items, an
           address (or nothing to deliver), a way to send the receipt. -->
      <ol v-if="basket?.items?.length" :aria-label="t('walio.checkout.steps', 'Checkout steps')" class="w-stepper">
        <li v-for="(st, i) in steps" :key="st.key" :class="st.state" class="w-stepper__s">
          <span v-if="i" aria-hidden="true" class="w-stepper__ln"></span>
          <i aria-hidden="true"><v-icon v-if="st.state === '-done'" size="16">check</v-icon><template v-else>{{ i + 1 }}</template></i>
          <span>{{ st.label }}</span>
        </li>
      </ol>

      <nav v-if="filtered_types.length > 1" :aria-label="t('basket.types', 'Baskets')" class="k-cart__types">
        <button
          v-for="item in filtered_types"
          :key="item.code"
          :class="{ '-on': type === item.code }"
          :disabled="!item.enable"
          type="button"
          @click="type = item.code"
        >
          {{ $t(item.name) }}<em>{{ getCount(item.code) }}</em>
        </button>
      </nav>

      <div v-if="basket && basket.items && basket.items.length" class="k-cart__grid">
        <!-- ▆▆▆▆▆▆▆▆ Left: lines, details, often added ▆▆▆▆▆▆▆▆ -->
        <div class="k-cart__main">
          <!-- Tario: the checkout reads as numbered steps. -->
          <h2 class="t-step"><span>1</span>{{ t("walio.checkout.review", "Review your items") }}</h2>
          <kalio-cart-lines :basket="basket" />

          <s-storefront-coupons-list
            v-if="!isSubscription"
            v-model="basket.coupon"
            :basket="basket"
            class="k-cart__offers"
            return-object
            selectable
            @loading="(val) => (refreshing_price = val)"
            @update:model-value="selectCoupon"
          ></s-storefront-coupons-list>

          <s-storefront-lottery-prizes-list
            v-if="!isSubscription"
            v-model="basket.lottery"
            :basket="basket"
            class="k-cart__offers"
            return-object
            selectable
            @loading="(val) => (refreshing_price = val)"
            @update:model-value="selectLottery"
          ></s-storefront-lottery-prizes-list>

          <h2 class="t-step"><span>2</span>{{ t("walio.checkout.delivery", "Delivery & contact") }}</h2>
          <div :class="`-n${detail_cards}`" class="k-cart__details">
            <!-- Delivery method (and when): "When · Truck" read as nonsense
                 to the owner (6 November 2026); the method is the heading's
                 subject, the time its chip. -->
            <section v-if="show_when" class="k-cart__detail">
              <h3><span class="k-cart__ico"><v-icon size="18">local_shipping</v-icon></span>{{ t("basket.delivery.title", "Delivery method") }}</h3>
              <p>{{ when_text }}</p>
              <div class="k-cart__chips">
                <span v-if="when_chip" class="k-cart__chip -on">{{ when_chip }}</span>
                <button class="k-cart__chip" type="button" @click="delivery_sheet = true">
                  {{ when_chip ? t("basket.change", "Change") : t("basket.choose", "Choose") }}
                </button>
              </div>
            </section>

            <!-- Where -->
            <section v-if="has_delivery" :class="{ '-todo': !is_valid_location }" class="k-cart__detail">
              <h3><span class="k-cart__ico"><v-icon size="18">place</v-icon></span>{{ t("basket.where.title", "Where") }}</h3>
              <template v-if="is_valid_location && receiver_info?.address">
                <p class="k-cart__addr">
                  <b v-if="receiver_info.name">{{ receiver_info.name }}</b>
                  {{ address_line }}
                  <span v-if="receiver_info.phone" class="k-cart__phone">{{ receiver_info.phone }}</span>
                </p>
                <p v-if="error_message_payment" class="k-cart__need">
                  <v-icon size="16">error_outline</v-icon>{{ error_message_payment }}
                </p>
                <button class="k-cart__link" type="button" @click="openAddress()">
                  {{ error_message_payment ? t("basket.where.addMissing", "Add the missing details") : t("basket.change", "Change") }}
                </button>
              </template>
              <template v-else>
                <p>
                  {{
                    isService
                      ? t("basket.where.service", "Where the service takes place.")
                      : all_is_pickup
                        ? t("basket.where.billing", "Your billing address.")
                        : t("address.lede.default", "Your address, for the receipt and the seller.")
                  }}
                </p>
                <button class="k-cart__map" type="button" @click="openAddress()">
                  <v-icon size="18">place</v-icon>{{ no_map ? t("basket.addAddress", "Add your address") : t("basket.where.addOnMap", "Add on the map") }}
                </button>
              </template>
            </section>

            <!-- Who -->
            <section class="k-cart__detail">
              <h3><span class="k-cart__ico"><v-icon size="18">mail_outline</v-icon></span>{{ t("basket.who.title", "Who") }}</h3>
              <template v-if="user">
                <div class="k-cart__user">
                  <img :src="getUserAvatar(user.id)" alt="" height="36" width="36" />
                  <span>
                    <b>{{ user.name }}</b>
                    <small>{{ user.email || user.phone }}</small>
                  </span>
                </div>
              </template>
              <!-- Back from signing in (Google and the rest come back to this
                   page), the account is still on its way: not "Sign in". -->
              <p v-else-if="busy_user" class="k-cart__user -wait">
                <v-progress-circular indeterminate size="18" width="2" />{{ t("basket.who.checking", "Checking your sign-in…") }}
              </p>
              <template v-else-if="has_guest_payment">
                <p>
                  {{ t("basket.who.receipt", "We send the receipt here.") }}
                  <button class="k-cart__link -inline" type="button" @click="NeedLogin">{{ t("common.signIn", "Sign in") }}</button>
                </p>
                <input
                  v-model.trim="guest_email"
                  :class="{ '-error': guest_email_touched && !guest_email_ok }"
                  :aria-label="t('basket.who.email', 'Email')"
                  autocomplete="email"
                  class="k-cart__input"
                  inputmode="email"
                  :placeholder="t('basket.who.email', 'Email')"
                  type="email"
                  @blur="onGuestEmail"
                />
                <small v-if="guest_email_touched && !guest_email_ok" class="k-cart__need">
                  <v-icon size="16">error_outline</v-icon>{{ t("basket.who.emailHint", "Enter an email like name@example.com") }}
                </small>
              </template>
              <template v-else>
                <p>{{ t("basket.who.signInToOrder", "Sign in to place the order.") }}</p>
                <button class="k-btn k-btn--solid" type="button" @click="NeedLogin">{{ t("common.signIn", "Sign in") }}</button>
              </template>
            </section>
          </div>

          <!-- Billing address and the shop's own checkout questions -->
          <section v-if="canPayAndComplete" class="k-cart__more">
            <p class="k-eyebrow">{{ t("basket.billing", "Billing") }}</p>
            <s-shop-billing-address-form
              v-model="billing"
              :receiver-info="receiver_info"
              @change="setBasketConfig"
            ></s-shop-billing-address-form>
          </section>
          <s-order-checkout-form
            :key="'socf-' + basket?.id /*Force update*/"
            v-model="form"
            :country="receiver_info?.country ? receiver_info.country : billing?.country"
            class="k-cart__form"
            @changed="setBasketConfig"
          ></s-order-checkout-form>
        </div>

        <!-- ▆▆▆▆▆▆▆▆ Right: the receipt ▆▆▆▆▆▆▆▆ -->
        <aside class="k-cart__side">
          <div :class="{ '-busy': busy_bill || refreshing_price }" class="k-cart__receipt">
            <u-loading-progress v-if="busy_save"></u-loading-progress>
            <h2 class="t-step -summary"><span>3</span>{{ t("walio.checkout.summary", "Order summary") }} <small>· {{ t("cart.units", { one: "{n} item", other: "{n} items" }, { n: units }) }}</small></h2>
            <div class="k-cart__top">
              <p class="k-cart__total">
                <u-loading-ellipsis v-if="busy_bill" css-mode light></u-loading-ellipsis>
                <u-price v-else :amount="final_price" :currency="basket.currency"></u-price>
                <small v-if="isSubscription && subscription_period_obj">/ {{ $t(subscription_period_obj.title) }}</small>
              </p>
              <span v-if="saved_total >= 0.01" class="k-cart__save">
                {{ save_words[0] }}<u-price :amount="saved_total" :currency="basket.currency"></u-price>{{ save_words[1] }}
              </span>
            </div>

            <div v-if="bill" class="k-cart__rows">
              <p class="k-cart__row">
                <span>{{ t("basket.receipt.items", "Items ({n})", { n: units }) }}</span><u-price :amount="raw_items_price" :currency="basket.currency"></u-price>
              </p>
              <p v-if="total_items_discount" class="k-cart__row -save">
                <span>{{ t("basket.receipt.youSave", "You save") }}</span><span class="k-signed">−<u-price :amount="total_items_discount" :currency="basket.currency"></u-price></span>
              </p>
              <p v-if="total_offers_amount" class="k-cart__row -save">
                <span>{{ t("basket.receipt.offers", "Offers") }}</span><span class="k-signed">−<u-price :amount="total_offers_amount" :currency="basket.currency"></u-price></span>
              </p>
              <p v-if="cross_selling_discount > 0" class="k-cart__row -save">
                <span>{{ t("basket.receipt.boughtTogether", "Bought together") }}</span><span class="k-signed">−<u-price :amount="cross_selling_discount" :currency="basket.currency"></u-price></span>
              </p>
              <p v-if="discount_code_amount > 0" class="k-cart__row -save">
                <span>{{ discount_code?.code ? t("basket.receipt.codeNamed", "Code {code}", { code: discount_code.code }) : t("basket.receipt.code", "Code") }}</span>
                <span class="k-signed">−<u-price :amount="discount_code_amount" :currency="basket.currency"></u-price></span>
              </p>
              <p v-if="customer_club_discount > 0" class="k-cart__row -save">
                <span>{{ t("basket.receipt.club", "Club") }}</span><span class="k-signed">−<u-price :amount="customer_club_discount" :currency="basket.currency"></u-price></span>
              </p>
              <p v-if="coupon" class="k-cart__row -save">
                <span>{{ coupon.title || $t("global.commons.coupon") }}</span>
                <span class="k-signed">−<u-price :amount="coupon_discount" :currency="basket.currency"></u-price></span>
              </p>
              <p v-if="prize" class="k-cart__row -save">
                <span>{{ prize.title || $t("global.commons.prize") }}</span>
                <span v-if="prize.discount || prize.amount" class="k-signed">−<u-price :amount="prize_discount" :currency="basket.currency"></u-price></span>
                <span v-else-if="prize.product">{{ prize.product.title }}</span>
              </p>
              <p v-if="wallet" class="k-cart__row -save">
                <span>{{ $t("global.commons.my_wallet") }}</span><span class="k-signed">−<u-price :amount="wallet" :currency="basket.currency"></u-price></span>
              </p>
              <p v-if="!isService && receiver_info && is_valid_location" :class="{ '-free': shipping_cost === 0 }" class="k-cart__row">
                <span>{{ all_is_pickup ? t("basket.receipt.pickup", "Pickup") : t("basket.receipt.delivery", "Delivery") }}</span>
                <u-price v-if="shipping_cost > 0" :amount="shipping_cost" :currency="basket.currency"></u-price>
                <span v-else-if="shipping_cost === 0">{{ t("shipping.free", "Free") }}</span>
                <span v-else>{{ t("shipping.paidOnDelivery", "Paid on delivery") }}</span>
              </p>
              <p v-if="bill.tax" class="k-cart__row">
                <span>{{ $t("global.commons.tax") }}</span><u-price :amount="bill.tax" :currency="basket.currency"></u-price>
              </p>
              <p v-if="bill.tax_shipping" class="k-cart__row">
                <span>{{ $t("global.commons.shipping_tax") }}</span><u-price :amount="bill.tax_shipping" :currency="basket.currency"></u-price>
              </p>
            </div>
            <p v-else-if="!busy_bill" class="k-cart__need">
              <v-icon size="16">error_outline</v-icon>{{ t("basket.receipt.billError", "We could not work out the bill. Please reload the page.") }}
            </p>

            <!-- Lottery prize with sizes: the shopper picks one -->
            <v-menu v-if="prize_available_variants && lottery_win_selected_variant">
              <template v-slot:activator="{ props }">
                <div class="k-cart__prize" v-bind="props">
                  <variant-item-mini :product-variant="lottery_win_selected_variant" force-enable selected />
                  <v-icon>expand_more</v-icon>
                </div>
              </template>
              <v-sheet class="py-2" color="#fff">
                <variant-item-mini
                  v-for="(product_variant, index) in prize_available_variants"
                  :key="index"
                  :product-variant="product_variant"
                  :selected="product_variant === lottery_win_selected_variant"
                  class="m-2"
                  @select="lottery_win_selected_variant = product_variant"
                />
              </v-sheet>
            </v-menu>

            <div v-if="!isSubscription" class="k-cart__code">
              <s-discount-code-input
                v-model="basket.discount_code"
                :basket="basket"
                :currency="basket.currency"
                @loading="(val) => (refreshing_price = val)"
                @update:model-value="selectDiscountCode"
              />
              <p v-if="discount_code" class="k-cart__code-info">
                <b>{{ discount_code.title }}</b> {{ discount_code.description }}
              </p>
            </div>

            <div v-if="bill?.user_messages?.length" class="k-cart__messages">
              <p v-for="(msg, i) in bill.user_messages" :key="i"><v-icon size="16">info</v-icon><span v-html="msg"></span></p>
            </div>

            <p v-if="extra_shipping_counts" class="k-cart__note">
              <v-icon size="16">local_shipping</v-icon>
              {{ $t("basket_page.extra_shipping_count", { count: has_custom_delivery ? 1 + extra_shipping_counts : extra_shipping_counts }) }}
            </p>

            <!-- Pay, or what is still needed to pay -->
            <div
              v-intersect="(isIntersecting) => (intersect_payment_btn = isIntersecting)"
              class="k-cart__pay"
            >
              <p v-if="pay_blocker" class="k-cart__need -center">
                <v-icon size="16">error_outline</v-icon>{{ pay_blocker }}
              </p>
              <button
                :class="{ '-off': !can_press_pay }"
                :disabled="busy_submit"
                class="k-cart__go"
                type="button"
                @click="onPay"
              >
                <v-progress-circular v-if="busy_save || busy_bill || busy_submit" indeterminate size="20" width="2" />
                <v-icon v-else size="20">{{ is_service_need_pricing ? "check_circle" : "lock" }}</v-icon>
                {{ pay_label }}
                <template v-if="final_price > 0 && !is_service_need_pricing">
                  <span aria-hidden="true" class="k-cart__dot">·</span>
                  <u-price :amount="final_price" :currency="basket.currency"></u-price>
                </template>
              </button>
              <p v-if="can_pay_cod" class="k-cart__note -center">
                <v-icon size="16">payments</v-icon>{{ $t("basket_page.can_pay_cod_message") }}
              </p>
            </div>

            <u-payment-stripe-split
              v-if="canPayAndComplete && !isService"
              :basket="basket"
              :country-code="receiver_info?.country"
            ></u-payment-stripe-split>
          </div>
        </aside>

        <kalio-often-added :count="4" class="k-cart__often" />
      </div>

      <!-- Kalio: an empty basket is a starting point, so it offers the way back
           to the aisles instead of only announcing itself. The heading keeps
           the translated platform string. -->
      <div v-else class="k-basket-empty">
        <img
          alt=""
          class="k-basket-empty__art"
          height="96"
          src="@selldone/components-vue/assets/icons/baskets.svg"
        />
        <h1 class="k-basket-empty__title">
          {{ $t("basket_page.basket_empty") }}
        </h1>
        <p class="k-basket-empty__lede">
          {{ t("basket.empty.lede", "The aisles are stocked. Pick up where you left off.") }}
        </p>
        <router-link
          :to="{ name: window.$storefront.routes.SHOP_PAGE }"
          class="k-btn k-btn--solid"
        >
          {{ t("pages.startShopping", "Start shopping") }}
        </router-link>
      </div>

      <div v-if="busy_shop" class="busy-overlay">
        <div class="text-h4 font-weight-thin">
          <v-icon class="me-2" size="large">hourglass_empty</v-icon>
          {{ $t("global.commons.waiting") }}...
        </div>
      </div>
    </div>

    <!-- On a phone: the total and Pay stay at the foot of the window
         while the receipt's own button is out of view. -->
    <div
      v-if="basket?.items?.length && !intersect_payment_btn"
      class="k-cart__bar"
    >
      <span class="k-cart__bar-total">
        <small>{{ t("basket.bar.total", "Total") }}</small>
        <u-price :amount="final_price" :currency="basket.currency"></u-price>
      </span>
      <button :class="{ '-off': !can_press_pay }" class="k-cart__go" type="button" @click="onPay">
        <v-icon size="20">{{ is_service_need_pricing ? "check_circle" : "lock" }}</v-icon>{{ pay_label_short }}
      </button>
    </div>

    <!-- ▆▆▆▆▆▆▆▆ When: the shipping options, in a sheet ▆▆▆▆▆▆▆▆ -->
    <v-dialog
      v-if="basket && !isService"
      v-model="delivery_sheet"
      :fullscreen="$vuetify.display.xs"
      class="k-sheet-dialog"
      content-class="k-sheet-host"
      eager
      max-width="580"
      scrollable
      :transition="$vuetify.display.xs ? 'dialog-bottom-transition' : 'dialog-transition'"
    >
      <div class="k-sheet">
        <div class="k-sheet__head">
          <div>
            <h2>{{ t("shipping.sheet.title", "How should it reach you?") }}</h2>
            <p>{{ t("shipping.sheet.lede", "The delivery method, and a day and time if you want one.") }}</p>
          </div>
          <button :aria-label="t('common.close', 'Close')" class="k-sheet__x" type="button" @click="delivery_sheet = false">
            <v-icon>close</v-icon>
          </button>
        </div>
        <div class="k-sheet__body">
          <s-shop-connect-shipping-options
            :basket="basket"
            :start-package-index="0"
            @change="
              (connect_shippings) => {
                delivery_info.connect_shippings = connect_shippings;
                setBasketConfig();
              }
            "
          ></s-shop-connect-shipping-options>
          <s-order-shipping-vendors-options
            :basket="basket"
            :deliveryInfo="delivery_info"
            :start-package-index="bill?.connect_shipping_options?.length"
            @set-basket-config="setBasketConfig"
          ></s-order-shipping-vendors-options>
          <s-order-shipping-stores-options
            :basket="basket"
            :delivery-info="delivery_info"
            :start-package-index="bill?.connect_shipping_options?.length + bill?.vendor_shipping_options?.length"
            @set-basket-config="setBasketConfig"
          ></s-order-shipping-stores-options>
          <p v-if="extra_shipping_counts" class="k-cart__note">
            <v-icon size="16">info</v-icon>{{ $t("basket_page.extra_shipping_message") }}
          </p>
        </div>
        <div class="k-sheet__foot">
          <button class="k-sheet__go" type="button" @click="delivery_sheet = false">{{ t("common.done", "Done") }}</button>
        </div>
      </div>
    </v-dialog>

    <!-- ▆▆▆▆▆▆▆▆ Where: the address sheet (replaces Selldone's full-screen map) ▆▆▆▆▆▆▆▆ -->
    <kalio-address-sheet
      v-if="has_delivery"
      v-model="address_sheet"
      :center="center"
      :countries="$shop.countries?.length ? $shop.countries : null"
      :heading="isService ? t('address.title.service', 'Where should we come?') : all_is_pickup ? t('address.title.billing', 'Your billing address') : t('address.title.go', 'Where should it go?')"
      :lede="isService ? t('address.lede.service', 'The address for the service.') : t('address.lede.default', 'Your address, for the receipt and the seller.')"
      :no-map="no_map"
      :receiver-info="receiver_info"
      @save="onClickSetLocation"
    />
  </div>
</template>

<script lang="ts">
import NotificationService from "@selldone/components-vue/plugins/notification/NotificationService.ts";

import { ShopTransportations } from "@selldone/core-js/enums/logistic/ShopTransportations";
import SDiscountCodeInput from "@selldone/components-vue/storefront/discount-code/input/SDiscountCodeInput.vue";
import { GtagEcommerce } from "@selldone/components-vue/plugins/gtag/GtagEcommerce";
import SStorefrontCouponsList from "@selldone/components-vue/storefront/coupon/list/SStorefrontCouponsList.vue";
import { ProductType } from "@selldone/core-js/enums/product/ProductType";
import SStorefrontLotteryPrizesList from "@selldone/components-vue/storefront/lottery/prizes-list/SStorefrontLotteryPrizesList.vue";
import VariantItemMini from "@selldone/components-vue/storefront/product/variant/VariantItemMini.vue";
import { ShopOptionsHelper } from "@selldone/core-js/helper/shop/ShopOptionsHelper";
import UTextValueDashed from "@selldone/components-vue/ui/text/value-dashed/UTextValueDashed.vue";
import { StorefrontLocalStorages } from "@selldone/core-js/helper/local-storage/StorefrontLocalStorages";
import SShopShareOrderButton from "@selldone/components-vue/storefront/order/share-order/SShopShareOrderButton.vue";
import SShopBillingAddressForm from "@selldone/components-vue/storefront/order/billing/SShopBillingAddressForm.vue";
import BillingPeriod from "@selldone/core-js/enums/subscription/BillingPeriod";
import SShopConnectShippingOptions from "@selldone/components-vue/storefront/order/shipping/connect/SShopConnectShippingOptions.vue";
import { ETA } from "@selldone/core-js/enums/logistic/ETA";
import { ShadeColor } from "@selldone/core-js/helper/color/ColorGenerator";
import { throttle } from "lodash-es";
import UPaymentStripeSplit from "@selldone/components-vue/ui/payment/stripe/split/UPaymentStripeSplit.vue";
import { BasketHelper } from "@selldone/core-js/helper/shop/BasketHelper";
import SOrderShippingVendorsOptions from "@selldone/components-vue/storefront/order/shipping/vendor/SOrderShippingVendorsOptions.vue";
import SOrderShippingStoresOptions from "@selldone/components-vue/storefront/order/shipping/store/SOrderShippingStoresOptions.vue";
import ULoadingEllipsis from "@selldone/components-vue/ui/loading/ellipsis/ULoadingEllipsis.vue";
import { Basket } from "@selldone/core-js/models";
import TemplateMixin from "@selldone/components-vue/mixin/template/TemplateMixin.ts";
import CurrencyMixin from "@selldone/components-vue/mixin/currency/CurrencyMixin.ts";
import ProductMixin from "@selldone/components-vue/mixin/product/ProductMixin.ts";
import MapMixin from "@selldone/components-vue/mixin/map/MapMixin.ts";
import AuthMixin from "@selldone/components-vue/mixin/auth/AuthMixin.ts";
import ClubMixin from "@selldone/components-vue/mixin/club/ClubMixin.ts";
import DateMixin from "@selldone/components-vue/mixin/date/DateMixin.ts";
import SOrderCheckoutForm from "@selldone/components-vue/storefront/order/checkout/SOrderCheckoutForm.vue";
import { WeekDays } from "@selldone/core-js/enums/logistic/WeekDays";
import { TimeSpans } from "@selldone/core-js/enums/logistic/TimeSpans";
import KalioCartLines from "../../../components/kalio/checkout/KalioCartLines.vue";
import KalioOftenAdded from "../../../components/kalio/KalioOftenAdded.vue";
import KalioAddressSheet from "../../../components/kalio/checkout/KalioAddressSheet.vue";
import { formatDate, t } from "../../../components/kalio/i18n/kalio-i18n";

export default {
  name: "StorefrontPageBasketCart",
  mixins: [
    TemplateMixin,
    CurrencyMixin,
    ProductMixin,
    MapMixin,
    AuthMixin,
    ClubMixin,
    DateMixin,
  ],

  components: {
    KalioCartLines,
    KalioOftenAdded,
    KalioAddressSheet,
    SOrderCheckoutForm,
    ULoadingEllipsis,
    SOrderShippingStoresOptions,
    SOrderShippingVendorsOptions,
    UPaymentStripeSplit,

    SShopConnectShippingOptions,
    SShopBillingAddressForm,
    SShopShareOrderButton,

    VariantItemMini,
    SStorefrontLotteryPrizesList,
    SStorefrontCouponsList,
    SDiscountCodeInput,
  },

  inject: ["$shop"],
  /**
   * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   *  🔷 Props
   * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   */
  props: {},
  /**
   * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   *  🔷 Data
   * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   */
  data: () => ({
    ETA: ETA,

    types: ProductType,
    type: ProductType.PHYSICAL.code,

    center: null, //{ lat: 40.943397271692135, lng: -73.83711692458752 },

    map_dialog: false,
    dialog_pre: false,

    delivery_info: {},

    startup_mode_map_dialog: "default",

    //-------------- Lottery Prize ---------------
    lottery_win_selected_variant: null,

    show_package_info: false,

    //-------------- Billing Info -------------
    busy_bill: false,

    same_billing: true,

    billing: null,

    busy_save: false,

    guest_email: null,

    form: null,
    //-------------- Billing Info -------------

    refreshing_price: false,

    //-------------- Service -------------
    busy_submit: false,

    //-------------- Dynamic buttons -------------
    intersect_location_btn: false,
    intersect_payment_btn: false,

    //-------------- Kalio -------------
    delivery_sheet: false,
    address_sheet: false,
    guest_email_touched: false,
  }),
  /**
   * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   *  🔷 Computed
   * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   */
  computed: {
    receiver_info() {
      return this.basket?.receiver_info || null; // Kalio: no basket yet (a guest with nothing in it)
    },
    theme() {
      return this.$shop.theme;
    },
    busy_shop() {
      return this.$store.getters.getBusyShop;
    },

    isSubscription() {
      return this.type === ProductType.SUBSCRIPTION.code;
    },

    checkout() {
      return ShopOptionsHelper.GetCheckout(this.$shop);
    },
    no_map() {
      return !ShopOptionsHelper.HasMap(this.$shop);
    },

    size_unit() {
      return ShopOptionsHelper.GetSizeUnit(this.$shop);
    },

    mass_unit() {
      return ShopOptionsHelper.GetMassUnit(this.$shop);
    },

    light_checkout() {
      return this.$shop.theme?.light_checkout;
    },
    //-------------- Lottery Prize ---------------
    prize() {
      if (!this.basket) return null;
      return this.basket?.lottery;
    },

    //-------------- Discount Code ---------------
    discount_code() {
      return this.basket?.discount_code;
    },

    basket() {
      return this.getBasket(this.type) as Basket;
    },

    bill() {
      return this.basket ? (this.basket.bill as Basket.ICalculatedBill) : null;
    },
    can_pay() {
      return this.bill?.can_pay; // IMPORTANT! If for any reason user can not pay this order then it should be false!
    },

    isPhysical() {
      return this.type === ProductType.PHYSICAL.code;
    },
    isVirtual() {
      return this.type === ProductType.VIRTUAL.code;
    },
    isFile() {
      return this.type === ProductType.FILE.code;
    },
    isService() {
      return this.type === ProductType.SERVICE.code;
    },
    is_service_need_pricing() {
      /**
       * It needs pricing by the seller after checkout.
       */
      return BasketHelper.IsServiceAndNeedPricing(this.basket);
    },

    wallet() {
      return this.bill.wallet;
    },

    net_price() {
      return this.bill.price - (this.bill.tax_included ? this.bill.tax : 0);
    },

    final_price() {
      return this.bill && this.bill.sum;
    },

    filtered_types() {
      return Object.values(ProductType).filter((type) => {
        return this.getCount(type.code);
      });
    },

    raw_items_price() {
      return this.bill ? this.bill.items_price : 0;
    },

    //-------------- Coupon ---------------
    coupon() {
      return this.basket?.coupon;
    },
    discount_code_amount() {
      return this.bill ? this.bill.discount_code : 0;
    },

    customer_club_discount() {
      return this.bill ? this.bill.club : 0;
    },

    coupon_discount() {
      return this.bill ? this.bill.coupon : 0;
    },

    prize_discount() {
      return this.bill ? this.bill.lottery : 0;
    },

    /**
     * It determines delivery and product type support COD or not!
     */
    deliverySupportCOD() {
      return this.bill?.can_cod; // Only for physical and service!
    },

    can_pay_cod() {
      return (
        this.deliverySupportCOD &&
        this.$shop.gateways?.some(
          (gateway) => gateway.currency === this.basket.currency && gateway.cod,
        )
      );
    },

    shipping_cost() {
      return this.bill ? this.bill.delivery_price : 0;
    },
    has_custom_delivery() {
      // True when at least one item deliver by this shop (Not selldone drop-shipping or connect)
      return this.bill && this.bill.has_custom_delivery;
    },
    extra_shipping_counts() {
      // Number of shops drop shop (Main sellers)
      return this.bill && this.bill.extra_shipping_counts;
    },

    items() {
      if (!this.basket || !this.basket.items) return [];
      return this.basket?.items || [];
    },

    max_lead_time() {
      if (!this.basket) return 0;
      let max_lead = 0;
      this.basket.items.forEach((item) => {
        let lead = this.leadProduct(
          item.product,
          item.variant,
          item.vendor_product,
        );
        if (lead) max_lead = Math.max(max_lead, lead);
      });

      return max_lead;
    },

    total_price() {
      return this.bill ? this.bill.items_price : 0;
    },

    total_price_after_offer() {
      return this.total_price - this.total_offers_amount;
    },

    total_price_with_delivery() {
      let total = this.total_price_after_offer;
      if (this.shipping_cost > 0) total += this.shipping_cost;
      return total;
    },
    total_price_with_delivery_and_discount() {
      return this.total_price_with_delivery - this.discount_code_amount;
    },

    total_items_discount() {
      return this.bill ? this.bill.items_discount : 0;
    },

    cross_selling_discount() {
      return this.bill ? this.bill.cross_selling_discount : 0;
    },

    total_offers_amount() {
      return this.bill ? this.bill.offer : 0;
    },

    basketTypeCanCOD() {
      return this.type === ProductType.PHYSICAL.code;
    },

    canPayAndComplete() {
      if (this.isPhysical || this.isService || this.isSubscription) {
        if (!this.has_delivery) return true; // Seller select do not ask for shipping address.

        return (
          this.receiver_info &&
          this.receiver_info.address &&
          this.receiver_info.phone &&
          this.is_valid_location
        );
      } else if (this.isVirtual) {
        return true;
      } else if (this.isFile) {
        return true;
      }

      return false;
    },

    hasErrorInReceiverInfo() {
      if (this.isPhysical && this.has_delivery) {
        return (
          this.receiver_info &&
          this.receiver_info.address &&
          (!this.receiver_info.phone || !this.is_valid_location)
        );
      }
      return false;
    },

    has_delivery() {
      return ShopOptionsHelper.AskShippingAddress(this.$shop, this.type);
    },

    showCustomDeliveryTimeButton() {
      return (
        this.has_delivery &&
        this.receiver_info &&
        this.receiver_info.address &&
        this.is_valid_location
      );
    },

    error_message_payment() {
      if (this.isPhysical && this.has_delivery) {
        if (this.receiver_info) {
          if (!this.receiver_info.address)
            return this.$t("basket_page.errors.no_address");
          if (!this.receiver_info.phone)
            return this.$t("basket_page.errors.no_phone");
        }
      }

      return null;
    },

    is_valid_location() {
      if (this.no_map) return !!this.receiver_info.address; // Only enter address!
      return (
        this.receiver_info.location &&
        !!this.receiver_info.location.lat &&
        !!this.receiver_info.location.lng
      );
    },

    // ---------- Lottery --------
    prize_available_variants() {
      if (!this.prize || !this.prize || !this.prize.product) return [];
      return this.prize.variant
        ? [this.prize.variant]
        : this.prize.product.product_variants;
    },

    club() {
      return this.getClub();
    },

    // ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅ Address Button (SHipping or Billing) ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅

    vendor_shipping_options() {
      return this.bill?.vendor_shipping_options;
    },
    store_shipping_options() {
      return this.bill?.store_shipping_options;
    },
    connect_shipping_options() {
      return this.bill?.connect_shipping_options;
    },
    /**
     * Check here all shipping methods are pickup!?
     */
    all_is_pickup() {
      if (
        !this.delivery_info ||
        this.connect_shipping_options
          ?.length /*In connect shipping mode always we ask shipping address*/
      )
        return false;

      if (this.vendor_shipping_options?.length) {
        return this.delivery_info.vendor_shippings.every(
          (vendor_shipping) =>
            vendor_shipping.type == ShopTransportations.Pickup.code,
        );
      }
      if (this.store_shipping_options?.length) {
        return (
          this.delivery_info.delivery_type == ShopTransportations.Pickup.code
        );
      }
      return false;
    },

    // ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅ 🎗️ Subscription ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅
    subscription_prices() {
      return this.items.map((item) => item.subscription_price);
    },
    subscription_period() {
      return (
        this.subscription_prices.length && this.subscription_prices[0].period
      );
    },
    subscription_period_obj() {
      return (
        this.subscription_period && BillingPeriod[this.subscription_period]
      );
    },

    // ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅ Checkout Flow ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅
    user() {
      return this.USER();
    },
    busy_user() {
      return this.$store.getters.getBusyUser;
    },
    has_guest_payment() {
      return ShopOptionsHelper.HasGuestPayment(this.$shop);
    },
    enter_guest_email_error(){
      return   !this.user &&  this.has_guest_payment && !this.guest_email // Guest email is required!
    },

    // ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅ Kalio ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅
    /** How many things are in the basket (2 breads are 2). */
    units() {
      return this.items.reduce((sum, item) => sum + (item.count || 0), 0);
    },
    seller_count() {
      return new Set(this.items.map((item) => item.vendor_id || 0)).size;
    },
    /** Everything the shopper saves, for the receipt's pill. */
    saved_total() {
      return (
        (this.total_items_discount || 0) +
        (this.total_offers_amount || 0) +
        (this.cross_selling_discount > 0 ? this.cross_selling_discount : 0) +
        (this.discount_code_amount > 0 ? this.discount_code_amount : 0) +
        (this.customer_club_discount > 0 ? this.customer_club_discount : 0) +
        (this.coupon ? this.coupon_discount || 0 : 0) +
        (this.prize ? this.prize_discount || 0 : 0)
      );
    },
    address_line() {
      const info = this.receiver_info;
      if (!info) return "";
      return [
        info.address,
        info.no && t("basket.where.no", "No. {no}", { no: String(info.no) }),
        info.unit && t("basket.where.unit", "Unit {unit}", { unit: String(info.unit) }),
      ]
        .filter(Boolean)
        .join(", ");
    },
    /** "You save {amount}": the words before and after the price the
     *  template draws, so a language can put the amount where it reads. */
    save_words() {
      const text = t("basket.receipt.youSaveAmount", "You save {amount}");
      const at = text.indexOf("{amount}");
      return at < 0 ? [text + " ", ""] : [text.slice(0, at), text.slice(at + "{amount}".length)];
    },
    /** Every way the shop has to send this basket (shipping methods, pickup
     *  points), from the bill. */
    transportation_list() {
      const out = [];
      for (const option of this.store_shipping_options || []) out.push(...(option.transportations || []));
      for (const option of this.vendor_shipping_options || []) out.push(...(option.transportations || []));
      return out;
    },
    /** The Delivery method card shows when there is something to choose: a shipping
     *  method, a pickup point, or a delivery service. */
    show_when() {
      if (!this.has_delivery || this.isService || !this.bill) return false;
      if (this.connect_shipping_options?.length) return true;
      return this.transportation_list.some(
        (t) => t.type !== ShopTransportations.Pickup.code || t.pickups?.length,
      );
    },
    transportation_now() {
      const type = this.delivery_info?.type;
      return type ? this.transportation_list.find((t) => t.type === type) : null;
    },
    when_chip() {
      const info = this.delivery_info || {};
      const parts = [];
      if (info.date) {
        parts.push(formatDate(info.date, { weekday: "short", month: "short", day: "numeric" }));
      } else if (info.custom && info.days?.length && info.days.length < 7) {
        parts.push(info.days.map((day) => (WeekDays[day] ? this.$t(WeekDays[day].name).slice(0, 3) : day)).join(", "));
      }
      if (info.custom && info.time_spans?.length && info.time_spans.length < (this.transportation_now?.time_spans?.length || 99)) {
        parts.push(info.time_spans.map((span) => (TimeSpans[span] ? this.$t(TimeSpans[span].name) : span)).join(", "));
      }
      if (!parts.length && this.transportation_now && this.transportation_now.type !== ShopTransportations.Pickup.code)
        parts.push(t("shipping.anyTime", "Any time"));
      return parts.join(" · ");
    },
    when_text() {
      const way = this.transportation_now;
      if (!way) return t("basket.delivery.chooseHow", "Choose how it reaches you.");
      const name = this.transportationName(way);
      if (way.type === ShopTransportations.Pickup.code) {
        const place = this.receiver_info?.title || this.receiver_info?.name || this.receiver_info?.address;
        return place ? t("basket.delivery.pickupFrom", "Pickup from {place}.", { place }) : t("basket.delivery.method", "{name}.", { name });
      }
      return this.shipping_cost === 0 ? t("basket.delivery.methodFree", "{name}, free.", { name }) : t("basket.delivery.method", "{name}.", { name });
    },
    /* Walio: the four steps over the checkout. */
    steps() {
      const delivery = !this.has_delivery || this.isService || (this.is_valid_location && !this.error_message_payment);
      const contact = !!this.user || (this.has_guest_payment && !!this.guest_email && this.guest_email_ok);
      const list = [
        { key: "cart", label: t("walio.cart.title", "Cart"), done: true },
        { key: "delivery", label: t("walio.checkout.stepDelivery", "Delivery"), done: delivery },
        { key: "contact", label: t("walio.checkout.stepContact", "Contact"), done: contact },
        { key: "pay", label: t("walio.checkout.stepPay", "Review & pay"), done: false },
      ];
      const now = list.findIndex((s) => !s.done);
      return list.map((s, i) => ({ ...s, state: s.done ? "-done" : i === now ? "-now" : "" }));
    },
    detail_cards() {
      return (this.show_when ? 1 : 0) + (this.has_delivery ? 1 : 0) + 1;
    },
    guest_email_ok() {
      return !this.guest_email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.guest_email);
    },
    /** The ways to pay this basket: the shop's gateways in its currency
     *  (cash on delivery only when the delivery allows it), as Selldone's
     *  payment window lists them. null when the shop did not say. */
    payment_ways() {
      const gateways = this.$shop?.gateways;
      if (!Array.isArray(gateways)) return null;
      const currency = this.basket?.currency;
      return gateways.filter(
        (g) => g.enable !== false && (!currency || g.currency === currency) && (this.deliverySupportCOD || !g.cod),
      );
    },
    /** What still stands between the shopper and paying, in a line. */
    pay_blocker() {
      if (!this.user && !this.has_guest_payment) return t("basket.who.signInToOrder", "Sign in to place the order.");
      if (this.has_delivery && !this.is_valid_location) return t("basket.pay.needAddress", "Add your address to pay.");
      if (this.error_message_payment) return this.error_message_payment;
      if (this.enter_guest_email_error) return t("basket.pay.needEmail", "Add your email to pay.");
      if (!this.guest_email_ok) return t("basket.pay.checkEmail", "Check your email address.");
      if (this.bill && !this.can_pay) return t("basket.pay.cannotPay", "This basket cannot be paid yet.");
      if (
        this.payment_ways &&
        !this.payment_ways.length &&
        this.final_price > 0 &&
        !this.is_service_need_pricing &&
        !this.isSubscription
      )
        return t("basket.pay.noGateways", "This shop is not taking payments yet. Please check back soon.");
      return null;
    },
    can_press_pay() {
      return !this.pay_blocker && this.canPayAndComplete;
    },
    pay_label() {
      if (this.is_service_need_pricing) return this.$t("basket_page.pre_confirm_service");
      if (!this.user && !this.has_guest_payment) return t("common.signIn", "Sign in");
      if (this.has_delivery && !this.is_valid_location) return t("basket.addAddress", "Add your address");
      return t("basket.pay.label", "Pay");
    },
    pay_label_short() {
      return this.is_service_need_pricing ? this.$t("basket_page.pre_confirm_service") : this.pay_label;
    },
  },

  /**
   * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   *  🔷 Watch
   * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   */

  watch: {
    map_dialog(val) {
      this.$store.commit("setForceHideNavigation", val);
    },
    address_sheet(val) {
      this.$store.commit("setForceHideNavigation", val);
    },

    prize(prize) {
      this.lottery_win_selected_variant =
        prize &&
        this.prize_available_variants &&
        this.prize_available_variants.length
          ? this.prize_available_variants[0]
          : null;
    },

    type(type) {
      if (type !== this.$route.params.type)
        this.$router.replace({ params: { type: type } });
    },
    "$route.params"(params) {
      this.resetToDefault(); // 🞇 Reset to default
      this.type = params.type;
    },

    //------------- Customer previous auto save -----------

    basket(basket) {
      //  console.log("Debug basket",'Change basket!',basket)
      this.loadFromBasket();
    },
  },
  /**
   * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   *  🔷 Component Lifecycle Section
   * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   */
  created() {
    //  console.log("Debug basket",'Create basket page.')
    this.center = this.$store.getters.getInitialLocation;

    this.type = this.$route.params.type;

    this.setPageTitle(t("basket.pageTitle", "Open cart")); // Set Page Title!

    GtagEcommerce.MeasuringCheckoutSteps(this.basket, 0, "");

    this.loadFromBasket();
  },
  mounted() {
    if (
      ShopOptionsHelper.HasMap(this.$shop) &&
      (!this.basket ||
        !this.basket.receiver_info ||
        !this.basket.receiver_info.location)
    )
      try {
        navigator.geolocation.getCurrentPosition((position, error) => {
          if (error) {
            console.error("Get current location", error);
            return;
          }

          if (this.basket?.receiver_info?.location) return; // Prevent lagged update location bug!
          //const userCoordinates = [position.coords.longitude, position.coords.latitude];
          this.center = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        });
      } catch (e) {
        console.error(e);
      }
  },

  /**
   * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   *  🔷 Methods Section
   * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   */
  methods: {
    ShadeColor,

    // ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅ Kalio ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅
    transportationName(transportation) {
      return transportation.title || this.$t(ShopTransportations[transportation.type]?.name || transportation.type);
    },
    openAddress() {
      this.address_sheet = true;
    },
    onGuestEmail() {
      this.guest_email_touched = true;
      if (this.guest_email_ok) this.setBasketConfig();
    },
    /* Pay, or take the shopper to what is still missing. */
    onPay() {
      if (!this.user && !this.has_guest_payment) return this.NeedLogin();
      if (this.has_delivery && !this.is_valid_location) return this.openAddress();
      if (this.error_message_payment) return this.openAddress();
      if (this.enter_guest_email_error || !this.guest_email_ok) {
        this.guest_email_touched = true;
        const input = this.$el?.querySelector?.(".k-cart__input");
        input?.scrollIntoView({ behavior: "smooth", block: "center" });
        input?.focus({ preventScroll: true });
        return;
      }
      if (!this.canPayAndComplete || this.pay_blocker) {
        // Nothing to fill in: show the receipt's reason (out of view on a phone).
        this.$el?.querySelector?.(".k-cart__pay")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (this.is_service_need_pricing) return this.submitServiceOrder();
      this.goToPaymentBasket(null);
    },
    selectLottery(lottery) {
      // console.log("---selectLottery---", lottery);
      this.basket.lottery = lottery;
      this.$store.dispatch("setBasket", this.basket);
    },

    selectCoupon(coupon) {
      // console.log("---selectCoupon---", coupon);
      this.basket.coupon = coupon;
      this.$store.dispatch("setBasket", this.basket);
    },
    selectDiscountCode(discount_code) {
      // console.log("---selectDiscountCode---", discount_code);
      this.basket.discount_code = discount_code;
      this.$store.dispatch("setBasket", this.basket);
    },

    loadFromBasket() {
      if (!this.basket) return;

      //  console.log("watch ===> basket : Load saved values");

      // Prevent critical values be null:
      if (
        !this.basket.delivery_info ||
        Array.isArray(this.basket.delivery_info)
      )
        this.basket.delivery_info = {};
      if (
        !this.basket.receiver_info ||
        Array.isArray(this.basket.receiver_info)
      )
        this.basket.receiver_info = {};
      if (!this.basket.billing || Array.isArray(this.basket.billing))
        this.basket.billing = {};

      // this.receiver_info = Object.assign({}, this.basket.receiver_info); // Local Clone

      this.delivery_info = Object.assign({}, this.basket.delivery_info); // Local Clone

      this.billing = this.basket.billing;

      // Set map center:
      if (this.basket.delivery_info && this.basket.receiver_info.location) {
        //console.log("load-center-map", this.basket.receiver_info.location);
        this.center = {
          lat: this.basket.receiver_info.location.lat,
          lng: this.basket.receiver_info.location.lng,
        };
      }

      this.form = Object.assign({}, this.basket.form);

      this.guest_email=this.basket.guest_email;


      if (!this.bill) {
        // Fetch if not loaded!
        this.fetchBill();
      }
    },
    //---------------------------- Get Calculated Bill --------------------
    fetchBill() {
      // console.log("watch ===> basket : fetchBill");

      this.busy_bill = true;

      axios
        .get(window.XAPI.GET_BASKET_BILL(this.$shop.name, this.type))
        .then(({ data }) => {
          if (!data.error) {
            this.setBasketBill(this.basket, data.bill);
          } else {
            NotificationService.showErrorAlert(null, data.error_msg);
          }
        })
        .catch((error) => {
          NotificationService.showLaravelError(error);
        })
        .finally(() => {
          this.busy_bill = false;
        });
    },
    //---------------------------- Update customer info set --------------------

    setBasketConfig() {
      this.PENDING_UPDATE = true;
      this.setBasketConfigThrottle();
    },
    setBasketConfigThrottle: throttle(
      function setBasketConfig() {
        this.PENDING_UPDATE = false;

        this.busy_save = true;
        //console.log("🧨 setBasketConfig");

        axios
          .put(
            window.XAPI.PUT_SET_BASKET_CONFIG(this.$shop.name, this.basket.id),
            {
              // currency:this.GetUserSelectedCurrency().code, // Not important! currency set in change currency api call! Guest + User
              receiver_info: this.receiver_info,
              delivery_info: this.delivery_info,
              billing: this.billing,
              form: this.form,
              guest_email: this.guest_email,
            },
          )
          .then(({ data }) => {
            if (!data.error) {
              if (this.PENDING_UPDATE) {
                console.log(
                  "⏳ Not update local basket because of pending update!",
                );
                return; // Update only on last function call to prevent jump back basket changes!
              }
              console.log("✅ Local cart updated.");

              // ➔ Update tax in basket (Only these items changed!)
              this.setBasketBill(this.basket, data.bill);

              // ➔ Update user delivery info:
              this.basket.receiver_info = data.receiver_info;
              this.basket.delivery_info = data.delivery_info;
              this.basket.billing = this.isObject(data.billing)
                ? data.billing
                : {}; // Solve return array!

              this.basket.form = data.form;

              this.basket.guest_email=data.guest_email
            } else {
              NotificationService.showErrorAlert(null, data.error_msg);
            }
          })
          .catch((error) => {
            NotificationService.showLaravelError(error);
          })
          .finally(() => {
            this.busy_save = false;
          });
      },
      3000,
      {
        leading: true, // Call immediately on the first call
        trailing: true, // Optional: Set to false if you don't want it called after the wait period
      },
    ),

    getCount(type) {
      let basket = this.getBasket(type);
      return basket && basket.items ? basket.items.length : 0;
    },

    getShopTransportationObject(type) {
      return ShopTransportations[type];
    },

    onClickSetLocation(info) {
      if (!info.phone) info.phone = this.USER() ? this.USER().phone : null; // Autofill phone!

      this.basket.receiver_info = info;
      this.map_dialog = false;
      this.address_sheet = false;

      this.setBasketConfig();

      GtagEcommerce.MeasuringCheckoutSteps(this.basket, 1, "");
    },

    showMap() {
      this.dialog_pre = false;
      this.$nextTick(() => {
        this.dialog_pre = true;
        this.$nextTick(() => {
          this.map_dialog = true;
        });
      });
    },

    //―――――――――――――――――――――― Final Step > Go to payment (Physical, Virtual, File) ――――――――――――――――――――

    goToPaymentBasket(gateway) {
      //―――――― 🎗️ Subscription ――――――
      // The payment process for subscription is different! We send permitted gateways from the backend.
      if (this.isSubscription) {
        if (!this.USER()) {
          // Force to log in for subscription.
          this.NeedLogin();
          return;
        }

        // Get list of gateways from subscription_price:
        const gateway_codes = this.items
          .map((item) => item.subscription_price?.gateway_code)
          .filter((g) => !!g)
          .unique();

        //  console.log('gateway_codes,',gateway_codes)

        this.ShowPaymentDialogSubscription(
          this.basket.currency,
          this.basket,
          this.bill,
          gateway_codes,
          /*Used for in site payment flow & free orders!*/
          (data) => {
            if (!this._isDestroyed)
              this.goToOrderInfo(this.type, data.target_id);
          },
        );
        return;
      }

      if (
        !this.USER() &&
        !ShopOptionsHelper.HasGuestPayment(this.getShop()) /*🥶 Guest*/
      ) {
        this.NeedLogin();
        return;
      }

      console.log(
        "🧨 goToPaymentBasket | Selected Gayteway: ",
        gateway,
        "Can COD: ",
        this.deliverySupportCOD,
      );
      /* Kalio (8 November 2026): a guest's order is bound to the device's
         guest code at the moment of buying, and Selldone's payment window
         saves that code for the order (so the order page opens it after the
         code rotates). It saves basket.code, which Selldone no longer sends
         with a guest's cart: nothing was saved, and a guest who had just
         ordered read "We can't open this order" (the owner's buyer test).
         Pass the device's guest code when the cart has none. */
      this.ShowPaymentDialogBasket(
        this.basket.code || (!this.USER() ? StorefrontLocalStorages.GetShopGuestCode() : undefined) /*🥶 Guest*/,
        this.basket,
        this.type,
        this.bill,
        this.lottery_win_selected_variant
          ? this.lottery_win_selected_variant.id
          : null,
        gateway,
        this.deliverySupportCOD,
        /*Used for in site payment flow & free orders!*/
        (data) => {
          if (!this._isDestroyed) this.goToOrderInfo(this.type, data.target_id);
        },
      );

      GtagEcommerce.MeasuringCheckoutSteps(this.basket, 2, gateway);
    },
    //―――――――――――――――――――――― Final Step > Submit service order (No payment here) (Service) ――――――――――――――――――――

    submitServiceOrder() {
      this.busy_submit = true;

      axios
        .post(
          window.XAPI.POST_SUBMIT_SERVICE_BASKET(this.$shop.name, this.type),
          {
            currency: this.GetUserSelectedCurrency().code,
            selected_variant_id: this.lottery_win_selected_variant
              ? this.lottery_win_selected_variant.id
              : null,

            code: this.basket.code /*🥶 Guest*/,
          },
        )
        .then(({ data }) => {
          if (!data.error) {
            // ▀▀▀▀▀▀▀▀▀ 🥶 Guest ▀▀▀▀▀▀▀▀▀
            if (!this.USER()) {
              // Save array of guest codes in local storage:
              StorefrontLocalStorages.AddCurrentGuestCodeToHistory(
                this.type,
                data.basket_id,
                data.code,
              );
            }

            this.fetchBasketAndShop();
            NotificationService.showSuccessAlert(
              t("basket.toast.submittedTitle", "Order submitted"),
              t("basket.toast.submittedText", "Your order has been submitted successfully. We will send bill to you."),
            );
            this.$router.push({
              name: "MyServiceOrderInfoPage",
              params: { basket_id: data.basket_id },
            });
          } else {
            NotificationService.showErrorAlert(null, data.error_msg);
          }
        })
        .catch((error) => {
          NotificationService.showLaravelError(error);
        })
        .finally(() => {
          this.busy_submit = false;
        });
    },
  },
};
</script>

<style lang="scss" scoped>
.receipt {
  position: relative;
  padding: 12px !important;

  &.dark {
    .receipt-container {
      //background-image: linear-gradient(-20deg, var(--theme-dark) 0%, var(--theme-deep-dark) 100%);
      background-image: linear-gradient(
        160deg,
        var(--color-bg-1) 0%,
        var(--color-bg-2) 100%
      );
      color: #fff;

      .total-price-after-discount {
        .label {
          color: rgba(255, 255, 255, 0.9);
        }
      }

      .total-price-after-discount {
        .label {
          color: #ffffff;
        }

        .value {
          color: #ffffff;
        }
      }
    }
  }

  //-----------------------------------------------------------

  --spacer-border-color: #333; /* Default border color */
  --spacer-bg-color: #333; /* Default background color */
  --spacer-text-color: #fff; /* Default text color */

  &.dark {
    --spacer-border-color: #fff; /* Dark mode border color */
    --spacer-bg-color: #fff; /* Dark mode background color */
    --spacer-text-color: #000; /* Dark mode text color */
  }

  ::v-deep(.spacer-line) {
    display: block;
    border-bottom: thick double var(--spacer-border-color); /* Variable border color */
    width: 80%;
    margin: 0 auto;
    position: relative;

    &::before {
      content: attr(caption); /* Get text from the caption attribute */
      position: absolute;
      top: 50%;
      left: 50%;
      border-radius: 4px;
      transform: translate(-50%, -40%);
      background: var(--spacer-bg-color); /* Variable background color */
      padding: 0 10px;
      font-size: 12px; /* Adjust font size as needed */
      font-weight: 600;
      color: var(--spacer-text-color); /* Variable text color */
      white-space: nowrap; /* Prevent text wrapping */
    }
  }
  //-----------------------------------------------------------

  .text-success {
    color: #2ab27b !important;
  }

  .receipt-bg {
    width: 100%;
    padding: 4px 4px 4px 4px !important;
    max-width: 100%;

    background-image: linear-gradient(-20deg, #fefefe 0%, #f1f1f1 100%);

    border-radius: 22px;

    &.success {
      background-image: linear-gradient(-60deg, #16a085 0%, #afb42b 100%);
    }

    &.error {
      background-image: linear-gradient(to top, #f77062 0%, #fe5196 100%);
    }
  }

  .receipt-container {
    text-align: start !important;
    padding: 12px;
    //background-image: linear-gradient(-20deg, #fefefe 0%, #f1f1f1 100%);
    background: #fff;
    border-radius: 16px;

    .total-price {
      font-size: 1.2rem;
      font-weight: 400;
    }

    .total-discount {
      font-size: 1rem;
      font-weight: 400;
      color: #2ab27b;
    }

    .total-price-after-discount {
      margin-top: 14px;
      text-align: center;
      font-size: 1.5rem;

      .label {
        color: #6c757d;
        font-weight: 400;
        font-size: 1.1rem;
      }

      .value {
        color: #444;
        font-weight: 500;
      }
    }
  }

  .select-address-button {
    display: block;
    font-size: 1.1em;
    min-height: 54px;
    min-width: 164px;
    margin: 12px 0;
  }

  .select-time-button {
    display: inline-block;
    font-size: 0.9rem;
    min-height: 36px;

    padding: 4px 12px !important;
    @media screen and (max-width: 900px) {
      font-size: 0.7rem;
    }
  }

  .data-row {
    padding: 6px 0;

    p {
      margin: 0;
    }
  }

  .bg-danger-match {
    background-color: #dc3545 !important;
    background-image: linear-gradient(
      to right,
      #fa6179 0%,
      #dc3545 20%,
      #dc3545 80%,
      #fa6279 100%
    ) !important;
  }
}

.busy-overlay {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.69);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.s--shop-basket-buy-button {
  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  user-select: none;
  position: fixed !important;
  border-radius: 0 !important;
  margin: 0 !important;
  left: 0;
  bottom: 0;
  width: 100%;
  z-index: 80;
  color: white !important;
  font-size: 1rem;
  transition: all 0.35s linear;
  background: #2ab27b;
  min-height: 48px;

  p {
    padding: 10px;
  }

  &.is-mobile {
    p {
      font-size: 0.9rem;
      max-width: calc(100% - 80px);
    }
  }

  &:hover {
    opacity: 0.8;
  }

  &.-up {
    bottom: 92px;
    left: 8px;
    right: 8px;
    width: calc(100% - 16px);
    border-radius: 8px !important;
    border: 1px solid #249567;
    transition: all 0.35s;
  }
}
</style>
