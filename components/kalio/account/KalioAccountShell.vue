<!--
  Kalio — the frame of the shopper's account (4 November 2026).

  Two designs, picked when the layout is built (kalio-account.ts):
    home (B): a greeting with what is happening to the orders, and the
              sections as tabs across the page (Overview first);
    desk (A): a rail at the side with the shopper and the sections in
              three groups (Shopping, Money, You), and sign out.
  Every section of Selldone's account stays: orders of every kind,
  returns, saved, wallet, gift cards, addresses, reviews, profile. A guest
  (orders kept on this device) sees only the orders and a way to sign in.
-->
<template>
  <div :class="`-${style}`" class="k-acct">
    <!-- ━━━━━━━━ B: greeting and tabs ━━━━━━━━ -->
    <template v-if="style === 'home'">
      <section class="k-acct__hero">
        <div class="k-wrap">
          <div class="k-acct__hi">
            <span aria-hidden="true" class="k-acct__ava -lg">
              <img v-if="avatar" :src="avatar" alt="" @error="avatar_failed = true" />
              <template v-else-if="initials">{{ initials }}</template>
              <v-icon v-else size="26">person_outline</v-icon>
            </span>
            <div class="k-acct__words">
              <h1>{{ user ? t("account.greeting.line", "{greeting}, {name}", { greeting: hello, name: firstName }) : t("account.yourOrders", "Your orders") }}</h1>
              <p>{{ summary }}</p>
            </div>
            <button v-if="user" :disabled="busy_out" class="k-acct__out" type="button" @click="signOut">
              <v-progress-circular v-if="busy_out" indeterminate size="16" width="2" />
              <v-icon v-else size="18">logout</v-icon>{{ t("account.signOut", "Sign out") }}
            </button>
            <button v-else-if="!pending" class="k-acct__in" type="button" @click="signIn"><v-icon size="18">person</v-icon>{{ t("common.signIn", "Sign in") }}</button>
          </div>

          <nav :aria-label="t('account.nav', 'Your account')" class="k-acct__tabs">
            <router-link v-if="user" :class="{ '-on': $route.name === ACCOUNT_HOME }" :to="{ name: ACCOUNT_HOME }">
              <v-icon size="19">grid_view</v-icon>{{ t("account.overview", "Overview") }}
            </router-link>
            <router-link v-for="item in shown" :key="item.key" :class="{ '-on': isOn(item) }" :to="item.route">
              <v-icon size="19">{{ item.icon }}</v-icon>{{ item.word }}<em v-if="countOf(item)">{{ countOf(item) }}</em>
            </router-link>
          </nav>
        </div>
      </section>
      <div class="k-wrap k-acct__body">
        <router-view />
      </div>
    </template>

    <!-- ━━━━━━━━ A: the desk ━━━━━━━━ -->
    <div v-else class="k-wrap k-acct__desk">
      <aside class="k-acct__rail">
        <div class="k-acct__me">
          <span aria-hidden="true" class="k-acct__ava">
            <img v-if="avatar" :src="avatar" alt="" @error="avatar_failed = true" />
            <template v-else-if="initials">{{ initials }}</template>
            <v-icon v-else size="22">person_outline</v-icon>
          </span>
          <div>
            <b>{{ user ? user.name : pending ? t("account.oneMoment", "One moment…") : t("account.guest", "Shopping as a guest") }}</b>
            <small>{{ user ? user.phone || user.email : t("account.guestNote", "Orders placed on this device") }}</small>
          </div>
        </div>
        <nav :aria-label="t('account.nav', 'Your account')" class="k-acct__nav">
          <template v-for="group in groups" :key="group.name">
            <p class="k-acct__grp">{{ group.name }}</p>
            <router-link v-for="item in group.items" :key="item.key" :class="{ '-on': isOn(item) }" :to="item.route">
              <v-icon size="20">{{ item.icon }}</v-icon>{{ item.word }}<em v-if="countOf(item)">{{ countOf(item) }}</em>
            </router-link>
          </template>
        </nav>
        <button v-if="user" :disabled="busy_out" class="k-acct__railout" type="button" @click="signOut">
          <v-progress-circular v-if="busy_out" indeterminate size="16" width="2" />
          <v-icon v-else size="20">logout</v-icon>{{ t("account.signOut", "Sign out") }}
        </button>
        <button v-else-if="!pending" class="k-acct__in -rail" type="button" @click="signIn"><v-icon size="18">person</v-icon>{{ t("account.signInForRest", "Sign in for the rest") }}</button>
      </aside>
      <div class="k-acct__main">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script>
import { EventBus } from "@selldone/components-vue/utils/events/EventBus.ts";
import { t } from "../i18n/kalio-i18n";
import { ACCOUNT_HOME, ACCOUNT_STYLE, account, greeting, loadAddresses, loadOrders, sections, standing } from "./kalio-account";

export default {
  name: "KalioAccountShell",
  inject: ["$shop"],

  data() {
    return {
      style: ACCOUNT_STYLE,
      ACCOUNT_HOME,
      account,
      avatar_failed: false,
      busy_out: false,
    };
  },

  computed: {
    user() {
      return this.USER();
    },
    /** Still asking who is signed in (just after a reload). */
    pending() {
      return !this.user && !!this.$store.getters.getBusyUser;
    },
    firstName() {
      return (this.user?.name || "").trim().split(/\s+/)[0] || t("account.greeting.there", "there");
    },
    initials() {
      const parts = (this.user?.name || "").trim().split(/\s+/).filter(Boolean);
      return parts.length ? (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() : "";
    },
    avatar() {
      return this.user && !this.avatar_failed ? this.getUserAvatar(this.user.id) : null;
    },
    hello() {
      return greeting();
    },
    shown() {
      return sections().filter((item) => this.user || !item.user);
    },
    groups() {
      const groups = [];
      for (const item of this.shown) {
        let group = groups.find((g) => g.name === item.group);
        if (!group) groups.push((group = { name: item.group, items: [] }));
        group.items.push(item);
      }
      return groups;
    },
    /** What is happening to the orders, in a sentence. */
    summary() {
      if (this.pending) return t("account.summary.opening", "One moment, opening your account…");
      if (!account.loaded) return this.user ? t("account.summary.default", "Your orders, money and addresses in one place.") : t("account.summary.guest", "The orders placed on this device.");
      const tones = account.orders.map((o) => standing(o).tone);
      const moving = tones.filter((tone) => tone === "go" || tone === "prep").length;
      const paying = tones.filter((tone) => tone === "pay").length;
      if (moving && paying)
        return t("account.summary.both", "{moving}, {paying}.", {
          moving: t("account.summary.movingLead", { one: "One order is on its way to you", other: "{n} orders are on their way to you" }, { n: moving }),
          paying: t("account.summary.payingToo", { one: "one is waiting for payment", other: "{n} are waiting for payment" }, { n: paying }),
        });
      if (moving) return t("account.summary.moving", { one: "One order is on its way to you.", other: "{n} orders are on their way to you." }, { n: moving });
      if (paying) return t("account.summary.paying", { one: "One order is waiting for payment.", other: "{n} orders are waiting for payment." }, { n: paying });
      if (!account.total) return t("account.summary.none", "No orders yet. Your first basket is a few taps away.");
      return tones[0] === "ok" ? t("account.summary.allDelivered", "Everything you ordered has reached you.") : t("account.summary.default", "Your orders, money and addresses in one place.");
    },
  },

  watch: {
    // Signed in (or out) here, or known only now after a reload.
    "user.id"() {
      loadOrders(this);
      if (this.user) loadAddresses();
    },
    "$route.fullPath"() {
      this.showActive();
    },
  },

  mounted() {
    this.showActive();
  },

  created() {
    loadOrders(this);
    if (this.user) loadAddresses();
  },

  methods: {
    /** On a phone the sections are one row that scrolls sideways: bring the
     *  open one into view (Wallet, Profile… were off the right edge). */
    showActive() {
      this.$nextTick(() => {
        for (const nav of this.$el?.querySelectorAll?.(".k-acct__nav, .k-acct__tabs") || []) {
          const on = nav.querySelector(".-on");
          if (!on || nav.scrollWidth <= nav.clientWidth + 1) continue;
          const delta = on.getBoundingClientRect().left - nav.getBoundingClientRect().left;
          nav.scrollLeft = Math.max(0, nav.scrollLeft + delta - (nav.clientWidth - on.offsetWidth) / 2);
        }
      });
    },
    isOn(item) {
      if (item.key === "orders") return this.$route.matched.some((m) => m.name === window.$storefront.routes.ORDERS_PAGE);
      return this.$route.name === item.route.name;
    },
    countOf(item) {
      if (item.key === "orders") return account.total || null;
      if (item.key === "addresses") return account.addresses?.length || null;
      return null;
    },
    signIn() {
      EventBus.$emit("need-login", true);
    },
    signOut() {
      this.busy_out = true;
      this.Logout(() => {
        this.busy_out = false;
        this.$router.push({ path: "/" });
      });
    },
  },
};
</script>
