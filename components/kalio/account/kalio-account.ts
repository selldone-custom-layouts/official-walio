/*
 * Kalio — the shopper's account (4 November 2026).
 *
 * Two designs share these reads and words:
 *   "home" (B): a greeting and tabs across the top, an Overview page with
 *               the latest order, a few numbers, the history, "Buy again"
 *               and the addresses;
 *   "desk" (A): a side rail of sections and the orders as cards.
 * The build picks one: VITE_KALIO_ACCOUNT=desk builds A, anything else B.
 *
 * Orders come from Selldone's history list (GET_MY_ORDERS_HISTORY_PHYSICAL),
 * which gives each order's status, delivery state, price, items as product
 * ids and counts, chat, place and date, but no label ("SM-1"), sellers or
 * payment. Those come from the order itself (GET_ORDER_BASKET_INFO), read
 * only for the orders on screen and kept for the visit.
 */

import { reactive } from "vue";
import { Basket } from "@selldone/core-js";
import { StorefrontLocalStorages } from "@selldone/core-js/helper/local-storage/StorefrontLocalStorages";
import { locale, t } from "../i18n/kalio-i18n";
import { gatewayName } from "../checkout/kalio-gateway";

declare const window: any;

export const ACCOUNT_STYLE: "home" | "desk" = (import.meta as any).env?.VITE_KALIO_ACCOUNT === "desk" ? "desk" : "home";

/** The Overview page (design B); design A sends /user to the orders. */
export const ACCOUNT_HOME = "KalioAccountHome";

/* ━━━━━━━━━━━━ The orders ━━━━━━━━━━━━ */

const PAGE = 30;

/** One shared, reactive copy of the shopper's grocery orders for the visit. */
export const account = reactive({
  orders: [] as any[],
  total: 0,
  loaded: false,
  loading: false,
  failed: false,
  /** Order id → the full order, once read. */
  details: {} as Record<number, any>,
  /** Orders whose full read failed twice; pages show what the list knows. */
  missing: {} as Record<number, boolean>,
  addresses: null as any[] | null,
  wallets: null as any[] | null,
  giftcards: null as number | null,
});

let reading: Promise<void> | null = null;
let who: any = undefined;

function guestCodes(vm: any) {
  return !vm.USER() ? StorefrontLocalStorages.GetShopHistoryGuestCodes("PHYSICAL") : undefined;
}

/** Resolves once the app knows who is signed in: after a reload it asks
 *  (busy user) and USER() is empty until the answer, signed in or not. */
export function userKnown(vm: any): Promise<void> {
  const store = vm.$store;
  if (!store?.getters?.getBusyUser) return Promise.resolve();
  return new Promise((resolve) => {
    const stop = store.watch(
      (_state: any, getters: any) => getters.getBusyUser,
      (busy: boolean) => {
        if (busy) return;
        stop();
        resolve();
      },
    );
  });
}

/** Read the first orders (once per visit and shopper). */
export function loadOrders(vm: any, force = false): Promise<void> {
  // Not as a guest while the shopper is still being read.
  if (vm.$store?.getters?.getBusyUser) return userKnown(vm).then(() => loadOrders(vm, force));
  const user = vm.USER()?.id || null;
  if (who !== user) {
    // signed in or out since: start again
    who = user;
    reading = null;
    detailReads.clear();
    Object.assign(account, { orders: [], total: 0, loaded: false, failed: false, details: {}, missing: {}, addresses: null, wallets: null, giftcards: null });
  }
  if (reading && !force) return reading;
  account.loading = true;
  const asked = who;
  reading = window.axios
    .get(window.XAPI.GET_MY_ORDERS_HISTORY_PHYSICAL(vm.$shop.name, "PHYSICAL"), {
      params: { offset: 0, limit: PAGE, sortDesc: true, codes: guestCodes(vm) },
    })
    .then(({ data }: any) => {
      if (asked !== who) return; // a guest's list that arrived after signing in
      if (data?.error) throw new Error(data.error_msg);
      account.orders = sortOrders(data.orders || []);
      account.total = data.total || account.orders.length;
      account.loaded = true;
      account.failed = false;
    })
    .catch(() => {
      account.failed = true;
      reading = null;
    })
    .finally(() => (account.loading = false));
  return reading!;
}

/** The next orders, after the ones already read. */
export function loadOlder(vm: any): Promise<void> {
  if (account.loading || account.orders.length >= account.total) return Promise.resolve();
  account.loading = true;
  return window.axios
    .get(window.XAPI.GET_MY_ORDERS_HISTORY_PHYSICAL(vm.$shop.name, "PHYSICAL"), {
      params: { offset: account.orders.length, limit: PAGE, sortDesc: true, codes: guestCodes(vm) },
    })
    .then(({ data }: any) => {
      if (data?.error) return;
      const seen = new Set(account.orders.map((o) => o.id));
      account.orders = sortOrders([...account.orders, ...(data.orders || []).filter((o: any) => !seen.has(o.id))]);
      account.total = data.total || account.total;
    })
    .catch(() => null)
    .finally(() => (account.loading = false));
}

function sortOrders(list: any[]) {
  return [...list].sort((a, b) => new Date(b.reserved_at || 0).getTime() - new Date(a.reserved_at || 0).getTime() || b.id - a.id);
}

const detailReads = new Map<number, Promise<any>>();

/** The whole order (label, lines, sellers, payment), once per visit; one
 *  more try after a failed read, then the order is marked missing so pages
 *  stop waiting for it (a later visit asks again). */
export function loadDetail(vm: any, id: number): Promise<any> {
  if (!detailReads.has(id)) {
    const read = () =>
      window.axios
        .get(window.XAPI.GET_ORDER_BASKET_INFO(vm.$shop.name, id), {
          params: { code: !vm.USER() ? StorefrontLocalStorages.GetShopHistoryGuestCodeOfOrder(id) : undefined },
        })
        .then(({ data }: any) => {
          if (data?.error || !data?.basket) throw new Error("no order");
          return data.basket;
        });
    const reads = account.details; // this shopper's; a sign-out replaces it
    const asked = read()
      .catch(() => new Promise((resolve) => setTimeout(resolve, 1500)).then(read))
      .then((basket: any) => {
        reads[id] = basket;
        delete account.missing[id];
        return basket;
      })
      .catch(() => {
        if (detailReads.get(id) === asked) detailReads.delete(id);
        if (reads === account.details) account.missing[id] = true;
        return null;
      });
    detailReads.set(id, asked);
  }
  return detailReads.get(id)!;
}

/** Read the full orders for these, a few at a time. */
export function loadDetails(vm: any, orders: any[]) {
  orders.filter((o) => !account.details[o.id]).slice(0, 12).forEach((o) => loadDetail(vm, o.id));
}

/* ━━━━━━━━━━━━ Money and the rest ━━━━━━━━━━━━ */

export function loadAddresses(): Promise<any[]> {
  if (account.addresses) return Promise.resolve(account.addresses);
  return window.axios
    .get(window.ADDRESS_API.GET_MY_ADDRESSES())
    .then(({ data }: any) => (account.addresses = data?.error ? [] : data?.addresses || []))
    .catch(() => (account.addresses = []));
}

export function loadWallets(vm: any): Promise<any[]> {
  if (account.wallets) return Promise.resolve(account.wallets);
  return window.axios
    .get(window.XAPI.GET_MY_WALLETS(vm.$shop.name))
    .then(({ data }: any) => (account.wallets = data?.error ? [] : data?.wallets || []))
    .catch(() => (account.wallets = []));
}

export function loadGiftcards(vm: any): Promise<number> {
  if (account.giftcards !== null) return Promise.resolve(account.giftcards);
  return window.axios
    .get(window.XAPI.GET_MY_GIFT_CARDS(vm.$shop.name), { params: { offset: 0, limit: 1 } })
    .then(({ data }: any) => (account.giftcards = data?.total || (data?.giftcards || []).length || 0))
    .catch(() => (account.giftcards = 0));
}

/* ━━━━━━━━━━━━ Words ━━━━━━━━━━━━ */

export const STATES = Object.values(Basket.PhysicalOrderStates || {}) as any[];

/** The five steps as an order card names them, in STATES' order (the
 *  words are getters, so they follow the visitor's language). */
export const TRAIL = [
  { icon: "receipt_long", get word() { return t("orders.step.placed", "Placed"); } },
  { icon: "task_alt", get word() { return t("orders.step.accepted", "Accepted"); } },
  { icon: "inventory_2", get word() { return t("orders.step.packing", "Packing"); } },
  { icon: "local_shipping", get word() { return t("orders.step.onTheWay", "On the way"); } },
  { icon: "home", get word() { return t("orders.step.delivered", "Delivered"); } },
];

/** Where an order is, 0 (awaiting review) to 4 (delivered). */
export function stepOf(order: any): number {
  const at = STATES.findIndex((state) => state.code === order?.delivery_state);
  return at < 0 ? 0 : at;
}

/**
 * How an order stands, as a tag:
 *   pay  — waiting for payment     go   — on the way
 *   ok   — delivered               off  — cancelled or rejected
 *   prep — with the shop (reviewed, confirmed, being prepared)
 * `key` names the exact state: the word is in the visitor's language, so
 * code compares the key, never the word.
 */
export function standing(order: any): { tone: string; key: string; word: string; icon: string | null } {
  if (!order) return { tone: "prep", key: "none", word: "", icon: null };
  if (order.status === "Canceled" || order.reject)
    return order.reject
      ? { tone: "off", key: "rejected", word: t("orders.status.notAccepted", "Not accepted"), icon: "close" }
      : { tone: "off", key: "cancelled", word: t("orders.status.cancelled", "Cancelled"), icon: "close" };
  if (order.status === "Reserved") return { tone: "pay", key: "reserved", word: t("orders.status.waitingForPayment", "Waiting for payment"), icon: "schedule" };
  const state = order.delivery_state;
  if (state === Basket.PhysicalOrderStates.ToCustomer.code) return { tone: "ok", key: "delivered", word: t("orders.status.delivered", "Delivered"), icon: "check" };
  if (state === Basket.PhysicalOrderStates.SentOrder.code) return { tone: "go", key: "sent", word: t("orders.status.onTheWay", "On the way"), icon: null };
  if (state === Basket.PhysicalOrderStates.PreparingOrder.code) return { tone: "prep", key: "preparing", word: t("orders.status.beingPrepared", "Being prepared"), icon: "inventory_2" };
  if (state === Basket.PhysicalOrderStates.OrderConfirm.code) return { tone: "prep", key: "confirmed", word: t("orders.status.confirmed", "Confirmed"), icon: "thumb_up" };
  return { tone: "prep", key: "review", word: t("orders.status.withShop", "With the shop"), icon: "hourglass_top" };
}

/** The filters over the order list (the words are getters, in the visitor's language). */
export const FILTERS = [
  { key: "all", get word() { return t("orders.filter.all", "All"); }, test: () => true },
  { key: "go", get word() { return t("orders.filter.onTheWay", "On the way"); }, test: (o: any) => ["go", "prep"].includes(standing(o).tone) },
  { key: "pay", get word() { return t("orders.filter.toPay", "To pay"); }, test: (o: any) => standing(o).tone === "pay" },
  { key: "ok", get word() { return t("orders.filter.delivered", "Delivered"); }, test: (o: any) => standing(o).tone === "ok" },
  { key: "off", get word() { return t("orders.filter.cancelled", "Cancelled"); }, test: (o: any) => standing(o).tone === "off" },
];

/** "SM-1", from the full order once read; Selldone's own fallback before. */
export function orderCode(vm: any, order: any): string {
  const full = account.details[order?.id];
  return vm.getBasketOrderCode({ ...order, ...(full ? { label: full.label } : {}), type: order?.type || "PHYSICAL" });
}

/** How many things, counting each (2 breads are 2). */
export function unitsOf(order: any): number {
  return (order?.items || []).reduce((sum: number, item: any) => sum + (item.count || 0), 0);
}

/** The distinct products, in order. */
export function productIds(order: any): number[] {
  return [...new Set((order?.items || []).map((item: any) => item.product_id))] as number[];
}

/** How it is paid, in a few words, from what the list knows. */
export function paidWords(order: any): string {
  const full = account.details[order?.id];
  // Cash on delivery and cash by their kind, in the visitor's language (the gateway's name is English).
  const gateway = full?.payment?.gateway ? gatewayName(full.payment.gateway) : null;
  if (order.status === "Payed") return gateway ? t("orders.paid.with", "Paid · {gateway}", { gateway }) : t("orders.paid.paid", "Paid");
  if (order.status === "COD") return t("orders.paid.onDelivery", "Pay on delivery");
  if (order.status === "Reserved") return t("orders.paid.notYet", "Not paid yet");
  if (order.status === "Canceled") return t("orders.paid.cancelled", "Cancelled");
  return "";
}

/** A line about where it is going or when it arrived. */
export function placeOf(order: any): string {
  const r = order?.receiver_info;
  if (!r) return "";
  return [r.city, r.state].filter(Boolean).join(", ");
}

export function when(at: string, withTime = true): string {
  if (!at) return "";
  const locale = document.documentElement.lang || "en";
  return new Date(at).toLocaleString(locale, { weekday: "short", month: "short", day: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}) });
}

/** The sellers of an order, by name, once the full order is read. */
export function sellersOf(order: any, vendorsById: Map<number, any>): string[] {
  const full = account.details[order?.id];
  if (!full) return [];
  const names = [...new Set((full.items || []).map((item: any) => vendorsById.get(item.vendor_id)?.name).filter(Boolean))] as string[];
  return names;
}

/** "A, B and C", as the visitor's language writes a list. */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] || "";
  try {
    return new (Intl as any).ListFormat(locale(), { type: "conjunction" }).format(names);
  } catch {
    return t("orders.names.and", "{names} and {last}", { names: names.slice(0, -1).join(", "), last: names[names.length - 1] });
  }
}

/** "Good morning", by the shopper's clock. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return t("account.greeting.evening", "Good evening");
  if (h < 12) return t("account.greeting.morning", "Good morning");
  if (h < 18) return t("account.greeting.afternoon", "Good afternoon");
  return t("account.greeting.evening", "Good evening");
}

/** The account's sections, in the order both designs show them. */
export function sections(): { key: string; word: string; icon: string; route: any; group: string; user: boolean }[] {
  const r = window.$storefront.routes;
  const shopping = t("account.group.shopping", "Shopping");
  const money = t("account.group.money", "Money");
  const you = t("account.group.you", "You");
  return [
    { key: "orders", word: t("account.section.orders", "Orders"), icon: "receipt_long", route: { name: r.HISTORY_ORDERS_PHYSICAL }, group: shopping, user: false },
    { key: "returns", word: t("account.section.returns", "Returns"), icon: "assignment_return", route: { name: r.USER_RETURN_REQUESTS }, group: shopping, user: true },
    { key: "saved", word: t("account.section.saved", "Saved"), icon: "favorite_border", route: { name: r.USER_FAVORITES_PAGE }, group: shopping, user: true },
    { key: "wallet", word: t("account.section.wallet", "Wallet"), icon: "account_balance_wallet", route: { name: r.USER_WALLETS_PAGE }, group: money, user: true },
    { key: "gift", word: t("account.section.giftCards", "Gift cards"), icon: "card_giftcard", route: { name: r.USER_GIFTCARDS_PAGE }, group: money, user: true },
    { key: "addresses", word: t("account.section.addresses", "Addresses"), icon: "place", route: { name: r.USER_ADDRESSES_PAGE }, group: you, user: true },
    { key: "reviews", word: t("account.section.reviews", "Reviews"), icon: "rate_review", route: { name: r.USER_COMMENTS_PAGE }, group: you, user: true },
    { key: "profile", word: t("account.section.profile", "Profile"), icon: "person_outline", route: { name: r.USER_PROFILE_PAGE }, group: you, user: true },
  ];
}

/** The kinds of orders besides groceries, as Selldone keeps them. */
export function otherKinds(): { key: string; word: string; route: any }[] {
  const r = window.$storefront.routes;
  return [
    { key: "VIRTUAL", word: t("orders.kind.virtual", "Virtual items"), route: { name: r.HISTORY_ORDERS_VIRTUAL } },
    { key: "FILE", word: t("orders.kind.file", "Downloads"), route: { name: r.HISTORY_ORDERS_FILE } },
    { key: "SERVICE", word: t("orders.kind.service", "Services"), route: { name: r.HISTORY_ORDERS_SERVICE } },
    { key: "SUBSCRIPTION", word: t("orders.kind.subscription", "Subscriptions"), route: { name: r.HISTORY_ORDERS_SUBSCRIPTION } },
    { key: "POS", word: t("orders.kind.pos", "In store"), route: { name: r.HISTORY_ORDERS_POS } },
    { key: "AVO", word: t("orders.kind.avocado", "Custom orders"), route: { name: r.HISTORY_ORDERS_AVOCADO } },
  ];
}
