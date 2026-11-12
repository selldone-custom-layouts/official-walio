<!--
  Kalio — an order's receipt and how it is paid (4 November 2026).

  One card for the money: what the order costs, line by line as Selldone
  counts it (the items before discounts, what the sellers took off, any
  discount code, coupon, club or prize, delivery, tax, the wallet), the
  total, and below it how it is paid: by card with the date, cash to the
  courier, cash at the shop, a bank transfer, or not yet, with "Pay now"
  and "Use another way to pay" while an online payment waits. It replaces
  Selldone's payment table (SShopCustomerOrderPaymentWidget) on the order
  page; a bank transfer's details and receipt upload stay Selldone's own
  (SShopRowCustomerPendingPayment) in the page's main column.
-->
<template>
  <div class="k-cart__receipt k-order__receipt">
    <p class="k-eyebrow">{{ paidWord }} · {{ t("orders.items", { one: "{n} item", other: "{n} items" }, { n: units }) }}</p>
    <div class="k-cart__top">
      <p class="k-cart__total"><u-price :amount="total" :currency="basket.currency" /></p>
      <span :class="`-${tone}`" class="k-order__pill">{{ pillWord }}</span>
    </div>

    <div class="k-cart__rows">
      <p class="k-cart__row"><span>{{ t("order.receipt.items", "Items ({n})", { n: units }) }}</span><u-price :amount="itemsBefore" :currency="basket.currency" /></p>
      <p v-if="saved >= 0.01" class="k-cart__row -save">
        <span>{{ t("order.receipt.saved", "You saved") }}</span><span class="k-signed">−<u-price :amount="saved" :currency="basket.currency" /></span>
      </p>
      <p v-for="row in promoRows" :key="row.key" class="k-cart__row -save">
        <span>{{ row.label }}</span><span class="k-signed">−<u-price :amount="row.amount" :currency="basket.currency" /></span>
      </p>
      <p v-if="prizeProduct" class="k-cart__row -save">
        <span>{{ t("order.receipt.prize", "Prize") }}</span><span class="k-opay__prize">{{ prizeProduct }}</span>
      </p>
      <p :class="{ '-free': basket.delivery_price === 0 }" class="k-cart__row">
        <span>{{ t("order.receipt.delivery", "Delivery") }}</span>
        <u-price v-if="basket.delivery_price > 0" :amount="basket.delivery_price" :currency="basket.currency" />
        <span v-else-if="basket.delivery_price === 0">{{ t("order.receipt.free", "Free") }}</span>
        <span v-else>{{ t("order.receipt.paidOnDelivery", "Paid on delivery") }}</span>
      </p>
      <p v-if="basket.tax > 0" class="k-cart__row">
        <span>{{ basket.tax_included ? t("order.receipt.taxIncluded", "Tax (included)") : t("order.receipt.tax", "Tax") }}</span><u-price :amount="basket.tax" :currency="basket.currency" />
      </p>
      <p v-if="basket.tax_shipping > 0" class="k-cart__row">
        <span>{{ t("order.receipt.taxDelivery", "Tax on delivery") }}</span><u-price :amount="basket.tax_shipping" :currency="basket.currency" />
      </p>
      <p v-if="walletPaid > 0" class="k-cart__row -save">
        <span>{{ t("order.receipt.wallet", "From your wallet") }}</span><span class="k-signed">−<u-price :amount="walletPaid" :currency="basket.currency" /></span>
      </p>
    </div>

    <!-- How it is paid -->
    <div :class="`-${pay.tone}`" class="k-opay">
      <div class="k-opay__head">
        <span aria-hidden="true" class="k-opay__logo">
          <img v-if="pay.logo" :src="pay.logo" alt="" height="26" width="26" />
          <v-progress-circular v-else-if="pay.tone === 'busy'" indeterminate size="20" width="2" />
          <v-icon v-else size="20">{{ pay.icon }}</v-icon>
        </span>
        <span class="k-opay__words">
          <b>{{ pay.title }}</b>
          <small v-if="pay.note">{{ pay.note }}</small>
        </span>
        <span v-if="pay.test" class="k-opay__test">{{ t("order.receipt.test", "Test") }}</span>
      </div>

      <u-payment-card
        v-if="basket.payment?.card"
        :card="basket.payment.card"
        :currency="basket.payment.currency"
        :method="basket.payment.method"
        class="k-opay__card"
        horizontal
      />

      <p v-for="card in basket.gift_cards || []" :key="card.number" class="k-opay__also">
        <v-icon size="16">card_giftcard</v-icon>
        {{ t("order.receipt.giftCard", "Gift card {number}", { number: lastFour(card.number) }) }}<u-price :amount="card.amount" :currency="card.currency" />
      </p>

      <div v-if="pay.canPay || pay.canSwitch" class="k-opay__acts">
        <button v-if="pay.canPay" class="k-opay__go" type="button" @click="payNow">
          <v-icon size="18">lock</v-icon>{{ t("orders.payNow", "Pay now") }}
        </button>
        <button v-if="pay.canSwitch" class="k-opay__alt" type="button" @click="switchWay">{{ t("order.receipt.switch", "Use another way to pay") }}</button>
      </div>
    </div>

    <p v-if="basket.cashback_order" class="k-opay__back">
      <v-icon size="18">savings</v-icon>
      <span>
        <u-price :amount="basket.cashback_order.amount_cashback" :currency="basket.cashback_order.currency" />
        {{
          basket.cashback_order.cashback?.title
            ? t("order.receipt.cashbackWith", "comes back to you with {title}.", { title: basket.cashback_order.cashback.title })
            : t("order.receipt.cashback", "comes back to you.")
        }}
      </span>
    </p>
  </div>
</template>

<script lang="ts">
import UPaymentCard from "@selldone/components-vue/ui/payment/card/UPaymentCard.vue";
import { PriceHelper } from "@selldone/core-js";
import { t } from "../i18n/kalio-i18n";
import { gatewayKind, gatewayName } from "../checkout/kalio-gateway";
import { priceText } from "../i18n/price-text";

const sum = (list, pick) => (list || []).reduce((total, item) => total + (pick(item) || 0), 0);

export default {
  name: "KalioOrderReceipt",
  components: { UPaymentCard },

  props: {
    basket: { type: Object, required: true },
  },

  computed: {
    /** ok: paid or paying on delivery · wait: not paid yet · off: cancelled */
    tone() {
      const status = this.basket?.status;
      if (status === "Canceled") return "off";
      if (status === "Payed" || status === "COD") return "ok";
      return "wait";
    },
    cod() {
      return this.basket?.status === "COD";
    },
    paidWord() {
      return {
        ok: this.cod ? t("order.receipt.paid.onDelivery", "To pay on delivery") : t("order.receipt.paid.paid", "Paid"),
        wait: t("order.receipt.paid.toPay", "To pay"),
        off: t("order.receipt.paid.cancelled", "Cancelled"),
      }[this.tone];
    },
    pillWord() {
      return {
        ok: this.cod ? t("order.receipt.pill.onDelivery", "On delivery") : t("order.receipt.pill.paid", "Paid"),
        wait: t("order.receipt.pill.waiting", "Waiting"),
        off: t("order.receipt.pill.cancelled", "Cancelled"),
      }[this.tone];
    },
    units() {
      return sum(this.basket?.items, (item) => item.count);
    },

    // The rows, as Selldone counts them (SShopCustomerOrderPaymentWidget):
    // price is after every discount and the wallet, with delivery in it.
    walletPaid() {
      return this.basket?.wallet_transaction?.amount || 0;
    },
    deliveryPaid() {
      return this.basket?.delivery_price > 0 ? this.basket.delivery_price : 0;
    },
    itemsBefore() {
      const b = this.basket || {};
      return this.fix((b.price || 0) + this.walletPaid + (b.discount || 0) - this.deliveryPaid);
    },
    promoRows() {
      const b = this.basket || {};
      const rows = [];
      if (b.discount_order?.amount_discount)
        rows.push({
          key: "code",
          label: b.discount_order.discount_code?.title ? t("order.receipt.codeNamed", "Code · {title}", { title: b.discount_order.discount_code.title }) : t("order.receipt.discountCode", "Discount code"),
          amount: b.discount_order.amount_discount,
        });
      if (b.coupon_order?.amount_discount)
        rows.push({
          key: "coupon",
          label: b.coupon_order.coupon?.title ? t("order.receipt.couponNamed", "Coupon · {title}", { title: b.coupon_order.coupon.title }) : t("order.receipt.coupon", "Coupon"),
          amount: b.coupon_order.amount_discount,
        });
      if (b.club_order?.amount_discount) rows.push({ key: "club", label: t("order.receipt.members", "Members' price"), amount: b.club_order.amount_discount });
      if (b.lottery_order?.amount_discount) rows.push({ key: "prize", label: t("order.receipt.prize", "Prize"), amount: b.lottery_order.amount_discount });
      return rows;
    },
    prizeProduct() {
      const prize = this.basket?.lottery_order;
      return prize && !prize.amount_discount && prize.product ? prize.product.title : null;
    },
    /** What the sellers took off: item discounts, offers and bundles. */
    saved() {
      const promos = sum(this.promoRows, (row) => row.amount);
      return this.fix(Math.max(0, (this.basket?.discount || 0) - promos));
    },
    total() {
      const b = this.basket || {};
      return this.fix((b.price || 0) + (b.tax_included ? 0 : b.tax || 0) + (b.tax_shipping || 0));
    },

    /** The payment still open, latest first. */
    pending() {
      const list = this.basket?.transactions_pending || [];
      return list.length ? list[list.length - 1] : null;
    },
    /** How the order is paid, in words. */
    pay() {
      const b = this.basket || {};
      const money = (amount, currency) => this.money(amount, currency || b.currency);
      const tx = this.pending;
      const arrived = b.delivery_state === "ToCustomer";
      const onDelivery = (amount) =>
        arrived ? t("order.pay.codArrived", "{amount} in cash to the courier.", { amount }) : t("order.pay.codLater", "Pay the courier {amount} when your order arrives.", { amount });
      const out = { tone: "wait", icon: "schedule", logo: null, title: t("order.pay.notPaid", "Not paid yet"), note: null, test: false, canPay: false, canSwitch: false };

      if (b.status === "Canceled" && !b.payment)
        return { ...out, tone: "off", icon: "block", title: t("order.pay.cancelled", "Cancelled"), note: t("order.pay.nothing", "Nothing to pay for this order.") };

      if (b.payment && b.status === "Payed") {
        const p = b.payment;
        const at = p.payment_at || p.created_at;
        /* Cash on delivery and cash are named by their kind, in the
           visitor's language (Selldone sends the gateway's English name). */
        const kind = gatewayKind(p.gateway);
        return {
          ...out,
          tone: "ok",
          icon: "check",
          logo: p.gateway?.icon ? this.getShopImagePath(p.gateway.icon) : null,
          title:
            kind === "cod"
              ? t("order.pay.paidCod", "Paid in cash on delivery")
              : kind === "cash"
                ? t("order.pay.paidCash", "Paid in cash")
                : p.gateway?.name
                  ? t("order.pay.paidWith", "Paid with {gateway}", { gateway: p.gateway.name })
                  : t("order.pay.paidWithCard", "Paid with card"),
          note: [money(p.amount, p.currency), at ? this.when(at) : null].filter(Boolean).join(" · "),
          test: p.livemode === false,
        };
      }
      if (!tx) return b.status === "COD" ? { ...out, tone: "ok", icon: "payments", title: t("order.pay.cod", "Cash on delivery"), note: onDelivery(money(this.total)) } : out;

      const logo = tx.icon || tx.logo ? this.getShopImagePath(tx.icon || tx.logo) : null;
      /* The way to pay by its kind, not the gateway's English name ("Cash on delivery"). */
      const way = gatewayName(tx);
      if (tx.cod) return { ...out, tone: "ok", logo, icon: "payments", title: way, note: onDelivery(money(tx.amount, tx.currency)), test: tx.livemode === false };
      if (tx.cash)
        return {
          ...out,
          tone: "ok",
          logo,
          icon: "payments",
          title: way,
          note: t("order.pay.cashNote", "Pay {amount} in cash when you collect it.", { amount: money(tx.amount, tx.currency) }),
          test: tx.livemode === false,
        };
      if (tx.dir) {
        const sent = tx.status === "Processing";
        return {
          ...out,
          tone: sent ? "busy" : "wait",
          logo: sent ? null : logo,
          title: tx.name || t("order.pay.bank", "Bank transfer"),
          note: sent
            ? t("order.pay.bankChecking", "Your receipt is in. The shop is checking the transfer.")
            : t("order.pay.bankNote", "Send {amount} with the details on this page, then add the receipt.", { amount: money(tx.amount, tx.currency) }),
          test: tx.livemode === false,
        };
      }
      if (tx.status === "Processing") return { ...out, tone: "busy", title: t("order.pay.checking", "Checking your payment"), note: `${way} · ${money(tx.amount, tx.currency)}` };
      if (tx.status === "Canceled") return { ...out, tone: "off", logo, icon: "error", title: t("order.pay.failed", "The payment did not go through"), note: `${way} · ${money(tx.amount, tx.currency)}` };
      if (tx.expired)
        return {
          ...out,
          logo,
          title: t("order.pay.expired", "This payment has expired"),
          note: t("order.pay.expiredNote", "{gateway} · {amount}. Message the shop below to pay another way.", { gateway: way, amount: money(tx.amount, tx.currency) }),
        };
      return { ...out, logo, title: t("order.pay.waiting", "Waiting for payment"), note: `${way} · ${money(tx.amount, tx.currency)}`, test: tx.livemode === false, canPay: true, canSwitch: true };
    },
  },

  methods: {
    fix(value) {
      return PriceHelper.FixPrecisionForCurrency(value, this.basket?.currency);
    },
    /* As u-price writes money ("$26.42"): one way per page (price-text.ts). */
    money(amount, currency) {
      return priceText(amount, currency, this.$shop);
    },
    when(at) {
      return new Date(at).toLocaleString(this.$i18n?.locale || "en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    },
    lastFour(number) {
      const digits = String(number || "").replace(/\D/g, "");
      return digits ? `•••• ${digits.slice(-4)}` : "";
    },
    payNow() {
      const tx = this.pending;
      if (tx) this.TryToPayOrder(tx.gateway_code, tx.id, this.$route.params.basket_id);
    },
    switchWay() {
      const tx = this.pending;
      if (tx) this.TryToPayOrder(tx.gateway_code, tx.id, this.$route.params.basket_id, true);
    },
  },
};
</script>
