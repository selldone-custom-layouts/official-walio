<!--
  - Copyright (c) 2023-2024. Selldone® Business OS™
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
  Kalio — a physical order's page (design C, 4 November 2026,
  ../kalio-design/basket-flow-options/): a word on where the order stands
  with its number, the invoice and a share link; its steps (placed,
  confirmed, packing, sent, received) as a line; the items by seller; then
  Kalio's delivery card (KalioOrderDelivery) and the conversation with the
  shop (KalioOrderChat), and beside them the receipt with how the order is
  paid (KalioOrderReceipt, with "Pay now" while a payment waits). A bank
  transfer's details and receipt upload, the sellers' own orders, returns
  and refunds stay Selldone's own, in Kalio's cards. On a phone the
  receipt comes right after the items.
-->
<template xmlns:v-slot="http://www.w3.org/1999/XSL/Transform">
  <div class="k-order__page">
    <section :class="`-${tone}`" class="k-order__hero">
      <span aria-hidden="true" class="k-order__mark"><v-icon size="30">{{ toneIcon }}</v-icon></span>
      <div class="k-order__words">
        <h1>{{ heroTitle }}</h1>
        <p>
          {{ t("order.hero.order", "Order") }} <b>{{ getBasketOrderCode(basket) }}</b>
          <template v-if="placedAt"> · {{ placedAt }}</template>
          <template v-if="heroNote"> · {{ heroNote }}</template>
        </p>
        <p v-if="basket.subscription_id" class="k-order__sub">
          {{ t("order.hero.fromSubscription", "From the subscription") }}
          <router-link :to="{ name: 'MySubscriptionOrderInfoPage', params: { basket_id: basket.subscription_id } }">SN-{{ basket.subscription_id }}</router-link>
        </p>
      </div>
      <div class="k-order__acts">
        <button :disabled="busy_invoice" class="k-order__btn" type="button" @click="downloadInvoice">
          <v-progress-circular v-if="busy_invoice" indeterminate size="16" width="2" />
          <v-icon v-else size="18">download</v-icon>{{ t("order.hero.invoice", "Invoice") }}
        </button>
        <s-shop-share-order-button :basket="basket" class="k-order__share"></s-shop-share-order-button>
      </div>
    </section>

    <ol v-if="tone !== 'off'" :aria-label="t('orders.progress', 'Order progress')" class="k-order__track">
      <li
        v-for="(state, i) in states"
        :key="state.code"
        :class="{ '-done': i < stateIndex || (i === stateIndex && i === states.length - 1), '-now': i === stateIndex && i < states.length - 1 }"
        class="k-order__step"
      >
        <i aria-hidden="true"><v-icon v-if="i < stateIndex || (i === stateIndex && i === states.length - 1)" size="15">check</v-icon></i>
        <b>{{ $t(state.name) }}</b>
      </li>
    </ol>

    <div class="k-order__grid">
      <div class="k-order__main">
        <div class="k-lines -read">
          <section v-for="group in groups" :key="group.key" class="k-lines__seller">
            <header class="k-lines__head">
              <img v-if="group.logo" :src="group.logo" alt="" class="k-lines__logo" height="36" width="36" />
              <span v-else aria-hidden="true" class="k-lines__logo -shop"><v-icon size="18">storefront</v-icon></span>
              <span class="k-lines__who">
                <b class="k-lines__name">{{ group.name }}</b>
                <small>{{ t("orders.items", { one: "{n} item", other: "{n} items" }, { n: group.units }) }}</small>
              </span>
              <u-price :amount="group.subtotal" :currency="basket.currency" class="k-lines__subtotal" />
            </header>
            <div v-for="item in group.items" :key="item.id" class="k-lines__line">
              <router-link :to="productRoute(item.product_id)" class="k-lines__pic">
                <img v-if="image(item)" :src="image(item)" alt="" height="44" loading="lazy" width="44" />
              </router-link>
              <div class="k-lines__text">
                <router-link :to="productRoute(item.product_id)" class="k-lines__title">{{ item.product?.title }}</router-link>
                <small>
                  {{ [size(item), `${item.count} × `].filter(Boolean).join(" · ") }}<u-price :amount="item.price" :currency="basket.currency" />
                </small>
              </div>
              <p class="k-lines__price">
                <u-price :amount="item.price * item.count - (item.offer_amount || 0)" :currency="basket.currency" />
              </p>
            </div>
          </section>
        </div>

        <section v-if="transfers.length" class="k-ocard k-order__transfer">
          <header class="k-ocard__head">
            <span aria-hidden="true" class="k-ocard__ico"><v-icon size="22">account_balance</v-icon></span>
            <div class="k-ocard__titles">
              <h2>{{ t("order.transfer.title", "Pay by bank transfer") }}</h2>
              <p>{{ t("order.transfer.lede", "Send the amount with these details, then add a photo of the receipt.") }}</p>
            </div>
          </header>
          <table class="k-order__legacy">
            <tbody>
              <s-shop-row-customer-pending-payment v-for="t in transfers" :key="t.id" :order="basket" :transaction="t" />
            </tbody>
          </table>
        </section>
        <kalio-order-delivery :basket="basket" />
        <kalio-order-chat :basket="basket" />
        <s-basket-vendor-orders :basket="basket" class="k-order__box"></s-basket-vendor-orders>
        <s-order-basket-return :basket="basket" class="k-order__box" />
        <s-shop-customer-order-withdraw
          :order="basket"
          :payment="basket.payment"
          class="k-order__box"
          @request:refresh="$emit('request:refresh')"
        />
      </div>

      <aside class="k-order__side">
        <kalio-order-receipt :basket="basket" />
        <router-link :to="{ name: window.$storefront.routes.SHOP_PAGE }" class="k-order__more">
          <v-icon size="18">shopping_bag</v-icon>{{ t("order.keepShopping", "Keep shopping") }}
        </router-link>
      </aside>
    </div>
  </div>
</template>

<script lang="ts">
import SOrderBasketReturn from "@selldone/components-vue/storefront/order/basket/return/SOrderBasketReturn.vue";
import SShopRowCustomerPendingPayment from "@selldone/components-vue/storefront/order/payment/rows/SShopRowCustomerPendingPayment.vue";
import SShopCustomerOrderWithdraw from "@selldone/components-vue/storefront/order/payment/withdraw/SShopCustomerOrderWithdraw.vue";
import KalioOrderDelivery from "../../../../../components/kalio/order/KalioOrderDelivery.vue";
import KalioOrderChat from "../../../../../components/kalio/order/KalioOrderChat.vue";
import KalioOrderReceipt from "../../../../../components/kalio/order/KalioOrderReceipt.vue";

import SShopShareOrderButton from "@selldone/components-vue/storefront/order/share-order/SShopShareOrderButton.vue";
import { ProductType } from "@selldone/core-js/enums/product/ProductType";
import SBasketVendorOrders from "@selldone/components-vue/storefront/order/vendor-order/SBasketVendorOrders.vue";
import NotificationService from "@selldone/components-vue/plugins/notification/NotificationService.ts";
import { Basket } from "@selldone/core-js";
import { productImage, vendorImage, vendors } from "../../../../../components/kalio/kalio-catalog";
import { t } from "../../../../../components/kalio/i18n/kalio-i18n";

/* The size of a variant in words: its volume, weight, pack, colour or style. */
function sizeOf(variant) {
  if (!variant) return null;
  return variant.volume || variant.weight || variant.pack || variant.type || variant.style || null;
}

export default {
  name: "StorefrontPageBasketOrderPhysicalDashboard",
  components: {
    SBasketVendorOrders: SBasketVendorOrders,
    SShopShareOrderButton,
    SShopRowCustomerPendingPayment,
    SShopCustomerOrderWithdraw,
    SOrderBasketReturn,
    KalioOrderDelivery,
    KalioOrderChat,
    KalioOrderReceipt,
  },

  emits: ["request:refresh"],

  props: {
    basket: {
      type: Object,
      require: true,
    },
  },

  data: function () {
    return {
      ProductType: ProductType,

      orderType: ProductType.PHYSICAL,
      busy_invoice: false,
      sellers: new Map(),
    };
  },
  computed: {
    shop() {
      return this.getShop();
    },

    // ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅ Kalio ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅
    states() {
      return Object.values(Basket.PhysicalOrderStates || {});
    },
    stateIndex() {
      const at = this.states.findIndex((state) => state.code === this.basket?.delivery_state);
      return at < 0 ? 0 : at;
    },
    /** ok: paid or paying on delivery · wait: not paid yet · off: cancelled */
    tone() {
      const status = this.basket?.status;
      if (status === "Canceled") return "off";
      if (status === "Payed" || status === "COD") return "ok";
      return "wait";
    },
    toneIcon() {
      return { ok: "check", wait: "schedule", off: "close" }[this.tone];
    },
    heroTitle() {
      if (this.tone === "off") return t("order.hero.cancelled", "This order was cancelled");
      if (this.tone === "wait")
        return this.basket?.status === "Reserved" ? t("order.hero.waiting", "Your order is waiting for payment") : t("order.hero.notPaid", "This order is not paid yet");
      if (this.stateIndex === this.states.length - 1) return t("order.hero.reached", "Your order has reached you");
      return t("order.hero.thanks", "Thank you, your order is in");
    },
    heroNote() {
      if (this.tone !== "ok") return null;
      const state = this.states[this.stateIndex];
      return state ? this.$t(state.name) : null;
    },
    /** Bank transfers still waiting: their details and the receipt upload. */
    transfers() {
      return (this.basket?.transactions_pending || []).filter((t) => t.dir && t.status !== "Succeeded");
    },
    placedAt() {
      const at = this.basket?.reserved_at || this.basket?.created_at;
      if (!at) return null;
      return new Date(at).toLocaleString(this.$i18n?.locale || "en", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    },
    /* The items by seller, as the basket page shows them. */
    groups() {
      const groups = new Map();
      for (const item of this.basket?.items || []) {
        const key = item.vendor_id || 0;
        if (!groups.has(key)) {
          const vendor = this.sellers.get(item.vendor_id);
          groups.set(key, {
            key,
            name: vendor?.name || this.shop?.title || "",
            logo: vendor ? vendorImage(vendor, true) : null,
            items: [],
            units: 0,
            subtotal: 0,
          });
        }
        const group = groups.get(key);
        group.items.push(item);
        group.units += item.count || 0;
        group.subtotal += (item.price || 0) * (item.count || 0) - (item.offer_amount || 0);
      }
      return [...groups.values()];
    },
  },
  created() {
    vendors().then((list) => {
      this.sellers = new Map(list.map((vendor) => [vendor.id, vendor]));
    });
  },
  methods: {
    image(item) {
      if (item.variant?.image) return window.CDN.GET_SHOP_IMAGE_PATH(item.variant.image, 128);
      return productImage(item.product, true);
    },
    size(item) {
      return sizeOf(item.variant);
    },
    productRoute(id) {
      return { name: window.$storefront.routes.PRODUCT_PAGE, params: { product_id: id } };
    },

    downloadInvoice() {
      this.busy_invoice = true;

      axios
        .get(
          window.XAPI.GET_ORDER_BASKET_RECEIPT(
            this.shop.name,
            this.basket.id,
          ),
          {
            params: {
              code: this.basket.code || undefined,
              signature: this.$route.query.signature,
              timestamp: this.$route.query.timestamp,
            },
            responseType: "blob",
          },
        )
        .then(({ data }) => {
          const download_url = window.URL.createObjectURL(
            new Blob([data], { type: "application/pdf" }),
          );
          const link = document.createElement("a");
          link.href = download_url;
          link.download = `${this.getBasketOrderCode(this.basket)}.pdf`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.setTimeout(
            () => window.URL.revokeObjectURL(download_url),
            0,
          );
        })
        .catch((error) => {
          NotificationService.showLaravelError(error);
        })
        .finally(() => {
          this.busy_invoice = false;
        });
    },
  },
};
</script>

<style lang="scss" scoped></style>
