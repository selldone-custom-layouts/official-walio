<!--
  Kalio — the account's Overview (design B, 4 November 2026).

  The latest order as a card (its five steps with the times Selldone
  records, its lines, total, how it is paid and what to do next), beside
  four numbers (orders, saved with deals, wallet, gift cards) and a
  reminder when an order waits for payment; then the last few orders,
  "Buy again" and the delivery addresses.
-->
<template>
  <div class="k-ahome">
    <div class="k-ahome__grid">
      <!-- The latest order -->
      <section v-if="latest" class="k-ahome__latest">
        <p class="k-eyebrow">{{ t("account.home.latestOrder", "Latest order") }}</p>
        <div class="k-ahome__head">
          <router-link :to="orderRoute(latest)" class="k-ahome__code">{{ code(latest) }}</router-link>
          <span class="k-ahome__when">{{ when(latest.reserved_at) }}</span>
          <span :class="`-${tone.tone}`" class="k-tag">
            <span v-if="tone.tone === 'go'" class="k-tag__beat"></span>
            <v-icon v-else-if="tone.icon" size="15">{{ tone.icon }}</v-icon>
            {{ tone.word }}
          </span>
        </div>

        <ol v-if="!['pay', 'off'].includes(tone.tone)" :aria-label="t('orders.progress', 'Order progress')" class="k-ahome__steps">
          <li v-for="(state, i) in states" :key="state.code" :class="stepClass(i)">
            <i aria-hidden="true"><v-icon v-if="stepClass(i) === '-done'" size="15">check</v-icon></i>
            <b>{{ $t(state.name) }}</b>
            <small v-if="stepTime(i)">{{ stepTime(i) }}</small>
          </li>
        </ol>

        <!-- The lines: from the list at once (picture, name, how many), with
             prices and sellers once the full order is read. -->
        <ul v-if="lines.length" class="k-ahome__lines">
          <li v-for="line in lines" :key="line.key">
            <span class="k-ahome__pic"><img v-if="line.src" :src="line.src" alt="" loading="lazy" /></span>
            <span class="k-ahome__name">
              <b v-if="line.title">{{ line.title }}</b>
              <span v-else aria-hidden="true" class="k-ahome__nameghost"></span>
              <small v-if="line.price != null">{{ line.count }} × <u-price :amount="line.price" :currency="line.currency" /><template v-if="line.seller"> · {{ line.seller }}</template></small>
              <small v-else>{{ t("account.home.quantity", "Quantity {count}", { count: line.count }) }}</small>
            </span>
            <u-price v-if="line.total != null" :amount="line.total" :currency="line.currency" class="k-ahome__amount" />
          </li>
          <li v-if="moreLines" class="k-ahome__morelines">{{ t("account.home.moreLines", { one: "and {n} more", other: "and {n} more" }, { n: moreLines }) }}</li>
        </ul>

        <footer class="k-ahome__foot">
          <div class="k-ahome__sum">
            <u-price :amount="latest.price" :currency="latest.currency" />
            <small>{{ footWords }}</small>
          </div>
          <router-link :to="orderRoute(latest)" class="k-btn -line">
            <v-icon size="17">chat_bubble_outline</v-icon>{{ latest.chat?.length ? t("orders.messages", "Messages") : t("orders.askShop", "Ask the shop") }}
            <span v-if="latest.chat?.length" class="k-dot">{{ latest.chat.length }}</span>
          </router-link>
          <button v-if="['ok', 'off'].includes(tone.tone)" :disabled="busy_again" class="k-btn -line" type="button" @click="buyAgain">
            <v-progress-circular v-if="busy_again" indeterminate size="16" width="2" />
            <v-icon v-else size="17">{{ again_done ? "check" : "replay" }}</v-icon>{{ again_done ? t("orders.inYourBasket", "In your basket") : t("orders.buyAgain", "Buy again") }}
          </button>
          <router-link v-if="tone.tone === 'pay'" :to="orderRoute(latest)" class="k-btn -pay"><v-icon size="17">lock</v-icon>{{ t("orders.payNow", "Pay now") }}</router-link>
          <router-link v-else :to="orderRoute(latest)" class="k-btn -main">{{ t("orders.viewOrder", "View order") }}</router-link>
        </footer>
      </section>

      <section v-else-if="account.loaded" class="k-ahome__latest -empty">
        <v-icon size="34">shopping_basket</v-icon>
        <h2>{{ t("account.home.empty.title", "No orders yet") }}</h2>
        <p>{{ t("account.home.empty.text", "Fill a basket from the aisles; your orders and where they are show up here.") }}</p>
        <router-link :to="{ path: '/' }" class="k-btn -main">{{ t("account.startShopping", "Start shopping") }}</router-link>
      </section>
      <section v-else aria-busy="true" class="k-ahome__latest -wait"><span class="k-board__ghost"></span><span class="k-board__ghost"></span></section>

      <!-- The numbers -->
      <aside class="k-ahome__tiles">
        <router-link :to="ordersRoute" class="k-tile">
          <span class="k-tile__ico"><v-icon size="20">receipt_long</v-icon></span>
          <b>{{ account.loaded ? account.total : "–" }}</b>
          <span>{{ ordersWords }}</span>
        </router-link>
        <div class="k-tile -save">
          <span class="k-tile__ico"><v-icon size="20">sell</v-icon></span>
          <b><u-price :amount="saved" :currency="currency" /></b>
          <span>{{ savedWords }}</span>
        </div>
        <router-link :to="sectionRoute('USER_WALLETS_PAGE')" class="k-tile">
          <span class="k-tile__ico"><v-icon size="20">account_balance_wallet</v-icon></span>
          <b><u-price :amount="wallet.amount" :currency="wallet.currency" /></b>
          <span>{{ t("account.home.tile.wallet", "in your wallet") }}</span>
        </router-link>
        <router-link :to="sectionRoute('USER_GIFTCARDS_PAGE')" class="k-tile">
          <span class="k-tile__ico"><v-icon size="20">card_giftcard</v-icon></span>
          <b>{{ account.giftcards ?? "–" }}</b>
          <span>{{ t("account.home.tile.giftcards", { one: "gift card", other: "gift cards" }, { n: account.giftcards ?? 0 }) }}</span>
        </router-link>
        <router-link v-if="waiting" :to="orderRoute(waiting)" class="k-tile -wide -pay">
          <span class="k-tile__ico"><v-icon size="20">lock_clock</v-icon></span>
          <span class="k-tile__words">
            <b>{{ t("account.home.waiting.title", "{code} is waiting for payment", { code: code(waiting) }) }}</b>
            <span><u-price :amount="waiting.price" :currency="waiting.currency" /> · {{ t("account.home.waiting.keep", "pay to keep it") }}</span>
          </span>
          <span class="k-btn -pay -sm">{{ t("orders.pay", "Pay") }}</span>
        </router-link>
      </aside>
    </div>

    <!-- The last orders -->
    <section v-if="account.total > 1" class="k-sec">
      <header class="k-sec__head">
        <h2>{{ t("orders.history", "Order history") }}</h2>
        <router-link :to="ordersRoute" class="k-sec__link">{{ t("account.home.allOrders", "All orders") }}<v-icon size="18">chevron_right</v-icon></router-link>
      </header>
      <kalio-orders-board :limit="5" compact mode="table" />
    </section>

    <kalio-buy-again class="k-sec" />

    <!-- Addresses -->
    <section v-if="account.addresses" class="k-sec">
      <header class="k-sec__head">
        <h2>{{ t("account.home.addresses", "Delivery addresses") }}</h2>
        <router-link v-if="account.addresses.length" :to="sectionRoute('USER_ADDRESSES_PAGE')" class="k-sec__link">
          {{ t("account.home.allAddresses", "All {n}", { n: account.addresses.length }) }}<v-icon size="18">chevron_right</v-icon>
        </router-link>
      </header>
      <div class="k-ahome__addrs">
        <router-link v-for="address in account.addresses.slice(0, 3)" :key="address.id" :to="sectionRoute('USER_ADDRESSES_PAGE')" class="k-addrcard">
          <b><v-icon size="18">place</v-icon>{{ address.title || t("account.address.untitled", "Address") }}</b>
          <span>{{ addressLine(address) }}</span>
          <small v-if="address.name || address.phone">{{ [address.name, address.phone].filter(Boolean).join(" · ") }}</small>
        </router-link>
        <router-link :to="sectionRoute('USER_ADDRESSES_PAGE')" class="k-addrcard -add"><v-icon size="20">add</v-icon>{{ t("account.addAddress", "Add an address") }}</router-link>
      </div>
    </section>
  </div>
</template>

<script>
import NotificationService from "@selldone/components-vue/plugins/notification/NotificationService.ts";
import CurrencyMixin from "@selldone/components-vue/mixin/currency/CurrencyMixin.ts";
import { reorder } from "../kalio-basket";
import { t } from "../i18n/kalio-i18n";
import { productImage, productsById, vendors } from "../kalio-catalog";
import KalioBuyAgain from "./KalioBuyAgain.vue";
import KalioOrdersBoard from "./KalioOrdersBoard.vue";
import {
  STATES,
  account,
  loadAddresses,
  loadDetail,
  loadGiftcards,
  loadOrders,
  loadWallets,
  orderCode,
  paidWords,
  standing,
  stepOf,
  userKnown,
  when,
} from "./kalio-account";
import { priceText } from "../i18n/price-text";

const LINES = 4;

export default {
  name: "KalioAccountHome",
  components: { KalioOrdersBoard, KalioBuyAgain },
  mixins: [CurrencyMixin],
  inject: ["$shop"],

  data() {
    return {
      account,
      states: STATES,
      sellers: new Map(),
      catalogue: new Map(),
      busy_again: false,
      again_done: false,
    };
  },

  computed: {
    currency() {
      return this.latest?.currency || this.GetUserSelectedCurrency()?.code || this.$shop.currency;
    },
    latest() {
      return account.orders[0] || null;
    },
    detail() {
      return this.latest ? account.details[this.latest.id] : null;
    },
    tone() {
      return standing(this.latest);
    },
    lines() {
      const detail = this.detail;
      if (detail) {
        return (detail.items || []).slice(0, LINES).map((item) => ({
          key: item.id,
          src: this.image(item),
          title: item.product?.title || t("account.home.anItem", "An item"),
          count: item.count,
          price: item.price,
          total: this.lineTotal(item),
          seller: this.sellerName(item),
          currency: detail.currency,
        }));
      }
      // Before the full order (or without it): the list's products and counts.
      const missing = !!account.missing[this.latest?.id];
      return (this.latest?.items || []).slice(0, LINES).map((item, i) => {
        const product = this.catalogue.get(item.product_id);
        return {
          key: `l${i}`,
          src: (product && productImage(product, true)) || this.getProductImage(item.product_id),
          title: product?.title || (missing ? t("account.home.anItem", "An item") : null),
          count: item.count,
          price: null,
          total: null,
          seller: null,
          currency: this.latest.currency,
        };
      });
    },
    moreLines() {
      return Math.max(0, (this.detail?.items || this.latest?.items || []).length - LINES);
    },
    footWords() {
      const parts = [paidWords(this.latest)];
      if (this.detail?.discount > 0) parts.push(t("account.home.youSaved", "you saved {amount}", { amount: this.money(this.detail.discount, this.detail.currency) }));
      return parts.filter(Boolean).join(" · ");
    },
    moving() {
      return account.orders.filter((o) => ["go", "prep"].includes(standing(o).tone)).length;
    },
    /** "orders · 2 on the way", under the count of orders. */
    ordersWords() {
      const orders = t("account.home.tile.orders", { one: "order", other: "orders" }, { n: account.total });
      return this.moving ? t("account.home.tile.ordersMoving", "{orders} · {n} on the way", { orders, n: this.moving }) : orders;
    },
    waiting() {
      return account.orders.find((o) => standing(o).tone === "pay") || null;
    },
    /** What deals took off, over the orders read in full (not cancelled). */
    saved() {
      return Object.values(account.details)
        .filter((o) => o.status !== "Canceled")
        .reduce((sum, o) => sum + (o.discount || 0), 0);
    },
    savedWords() {
      const read = Object.keys(account.details).length;
      return read < account.total ? t("account.home.tile.savedRecent", "saved on recent orders") : t("account.home.tile.savedDeals", "saved with deals");
    },
    wallet() {
      const list = account.wallets || [];
      const mine = list.find((w) => w.currency === this.currency) || list[0];
      return { amount: mine?.balance || 0, currency: mine?.currency || this.currency };
    },
    ordersRoute() {
      return { name: window.$storefront.routes.HISTORY_ORDERS_PHYSICAL };
    },
  },

  watch: {
    latest: {
      handler(order) {
        if (order) loadDetail(this, order.id);
      },
      immediate: true,
    },
  },

  created() {
    this.setPageTitle?.(t("account.pageTitle.home", "My account"));
    vendors().then((list) => (this.sellers = new Map(list.map((v) => [v.id, v]))));
    productsById().then((map) => (this.catalogue = map));
    // After a reload the shopper is read first; a guest has only the
    // orders kept on this device.
    userKnown(this).then(() => {
      if (!this.USER()) {
        this.$router.replace(this.ordersRoute);
        return;
      }
      loadOrders(this);
      loadAddresses();
      loadWallets(this);
      loadGiftcards(this);
    });
  },

  methods: {
    when,
    code(order) {
      return orderCode(this, order);
    },
    orderRoute(order) {
      return { name: "MyPhysicalOrderInfoPage", params: { basket_id: order.id } };
    },
    sectionRoute(name) {
      return { name: window.$storefront.routes[name] };
    },
    stepClass(i) {
      const at = stepOf(this.latest);
      if (i < at || (i === at && at === this.states.length - 1)) return "-done";
      if (i === at) return "-now";
      return "";
    },
    /** The times Selldone records: placed, sent, delivered. */
    stepTime(i) {
      const trip = this.detail?.transportation_order;
      const at = i === 0 ? this.latest.reserved_at : i === 3 ? trip?.send_at : i === 4 ? this.detail?.delivery_at || trip?.deliver_at : null;
      if (!at || this.stepClass(i) !== "-done") return null;
      return new Date(at).toLocaleTimeString(document.documentElement.lang || "en", { hour: "numeric", minute: "2-digit" });
    },
    image(item) {
      if (item.variant?.image) return window.CDN.GET_SHOP_IMAGE_PATH(item.variant.image, 128);
      return productImage(item.product, true);
    },
    sellerName(item) {
      return this.sellers.get(item.vendor_id)?.name || null;
    },
    lineTotal(item) {
      return (item.price || 0) * (item.count || 0) - (item.offer_amount || 0);
    },
    /* As u-price writes money ("$26.42"): one way per page (price-text.ts). */
    money(amount, currency) {
      return priceText(amount, currency, this.$shop);
    },
    addressLine(a) {
      const street = [a.address, a.no ? t("account.address.no", "No. {no}", { no: String(a.no) }) : null, a.unit ? t("account.address.unit", "Unit {unit}", { unit: String(a.unit) }) : null].filter(Boolean).join(", ");
      return [street, [a.city, a.postal].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    },
    async buyAgain() {
      this.busy_again = true;
      try {
        const full = this.detail || (await loadDetail(this, this.latest.id));
        if (!full) throw new Error("no order");
        const { added, failed } = await reorder(this, full.items);
        if (added) {
          this.again_done = true;
          setTimeout(() => (this.again_done = false), 2400);
        }
        if (failed) NotificationService.showErrorAlert(null, t("orders.reorder.failed", { one: "{n} item is not sold any more and stayed out.", other: "{n} items are not sold any more and stayed out." }, { n: failed }));
      } catch (e) {
        NotificationService.showErrorAlert(null, t("orders.reorder.error", "This order could not be added again."));
      } finally {
        this.busy_again = false;
      }
    },
  },
};
</script>
