<!--
  Kalio — Sign in.

  Replaces Selldone's need-login sheet (SStorefrontNeedLoginDialog), which
  opened on the shop's round icon and "Hi, Please login" over four buttons in
  four colours. Kalio's is a card in two halves: the shop's wordmark on deep
  green with what an account is for, and the ways to continue as one quiet
  stack. On a phone it rises from the bottom and the green half shrinks to
  a header.

  The sign-in itself is untouched: the methods, the redirects, the email
  code and the token are Selldone's SShopLogin, placed inside. The sheet
  opens on the same app event ("need-login") and hides the phone's bottom
  bar while it is open, as Selldone's did.
-->
<template>
  <v-dialog
    v-model="show"
    :fullscreen="true"
    :persistent="busyUser"
    :transition="compact ? 'dialog-bottom-transition' : 'dialog-transition'"
    aria-labelledby="k-signin-title"
    class="k-signin-overlay"
    content-class="k-signin"
    max-width="900"
    scrollable
  >
    <div class="k-signin__card">
      <!-- ▆▆▆▆▆▆▆▆ The shop ▆▆▆▆▆▆▆▆ -->
      <aside class="k-signin__brand">
        <p class="k-signin__mark">{{ shopTitle }}<i aria-hidden="true"></i></p>
        <p class="k-signin__pitch">{{ t("signin.pitch", "Your weekly shop, remembered.") }}</p>

        <ul class="k-signin__perks">
          <li><v-icon size="20">local_shipping</v-icon>{{ t("signin.perks.orders", "Follow every order to your door") }}</li>
          <li><v-icon size="20">favorite_border</v-icon>{{ t("signin.perks.saved", "Keep your favourites for next week") }}</li>
          <li v-if="sellerCount > 1">
            <v-icon size="20">storefront</v-icon>{{ t("signin.perks.sellers", { one: "One basket across {n} independent seller", other: "One basket across {n} independent sellers" }, { n: sellerCount }) }}
          </li>
        </ul>

        <div v-if="rings.length" aria-hidden="true" class="k-signin__rings">
          <span v-for="aisle in rings" :key="aisle.id" :style="{ '--k-tint': tint(aisle) }">
            <img :src="aisleImage(aisle, 128)" alt="" height="56" width="56" />
          </span>
        </div>
      </aside>

      <!-- ▆▆▆▆▆▆▆▆ The ways in ▆▆▆▆▆▆▆▆ -->
      <section class="k-signin__main">
        <button :aria-label="t('common.close', 'Close')" class="k-signin__close" type="button" @click="show = false">
          <v-icon>close</v-icon>
        </button>

        <p class="k-eyebrow">{{ t("signin.eyebrow", "Sign in or create an account") }}</p>
        <h2 id="k-signin-title" class="k-signin__title">{{ t("signin.title", "Welcome to {shop}", { shop: shopTitle }) }}</h2>
        <p class="k-signin__lede">{{ t("signin.lede", "New here? Your account is made as you sign in.") }}</p>

        <s-shop-login v-model:show="show" class="k-signin__methods" />

        <p class="k-signin__legal">
          {{ t("signin.legal.lead", "By continuing you agree to {shop}’s", { shop: shopTitle }) }}
          <router-link :to="{ name: window.$storefront.routes.SHOP_PROFILE_PAGE_TERMS }" @click="show = false">{{ t("signin.legal.terms", "Terms") }}</router-link>
          {{ t("signin.legal.and", "and") }}
          <router-link :to="{ name: window.$storefront.routes.SHOP_PROFILE_PAGE_PRIVACY }" @click="show = false">{{ t("signin.legal.privacy", "Privacy policy") }}</router-link>.
        </p>
      </section>

      <div v-if="busyUser" class="k-signin__busy">
        <v-progress-circular color="#fff" indeterminate size="36" width="3" />
      </div>
    </div>
  </v-dialog>
</template>

<script>
import { throttle } from "lodash-es";
import SShopLogin from "@selldone/components-vue/storefront/login/SShopLogin.vue";
import { EventBus } from "@selldone/components-vue/utils/events/EventBus.ts";
import { aisleImage, aisles, tintFor, vendors } from "../kalio-catalog";

/* Selldone's words for the ways in ("Login with Google", "Login by
   Email") and for the email steps, as a shop says them now. English only;
   other languages keep their own. */
const WORDS = {
  title: "Sign in",
  email_login_step_1: "Enter your email and we’ll send you a six-digit code. No password needed.",
  email_login_step_2: "We’ll send the code to this address. Is it right?",
  email_login_step_3: "Enter the six-digit code we sent you. It expires in 10 minutes.",
  login_google: "Continue with Google",
  login_apple: "Continue with Apple",
  login_facebook: "Continue with Facebook",
  login_email: "Continue with email",
  login_account: "Continue with Selldone",
  login_sms: "Continue with phone",
};

export default {
  name: "KalioSignIn",
  components: { SShopLogin },
  inject: ["$shop"],

  data() {
    return {
      window: window,
      show: false,
      aisleList: [],
      sellerCount: 0,
    };
  },

  computed: {
    shopTitle() {
      return this.$shop?.title || "Kalio";
    },
    busyUser() {
      return this.$store.getters.getBusyUser;
    },
    compact() {
      return this.$vuetify.display.xs;
    },
    rings() {
      return this.aisleList.filter((aisle) => aisle.icon).slice(0, 4);
    },
  },

  watch: {
    show(value) {
      this.$store.commit("setForceHideNavigation", value);
      if (value && !this.aisleList.length) this.read();
    },
  },

  created() {
    const i18n = window.$i18n_global;
    const locale = i18n?.locale?.value ?? i18n?.locale;
    if (i18n?.mergeLocaleMessage && String(locale).startsWith("en")) {
      i18n.mergeLocaleMessage(locale, { global: { need_login: WORDS } });
    }

    EventBus.$on(
      "need-login",
      throttle((show) => {
        this.show = show;
      }, 800),
    );
  },

  methods: {
    aisleImage,
    tint: tintFor,

    read() {
      aisles().then((list) => (this.aisleList = list));
      vendors().then((list) => (this.sellerCount = list.length));
    },
  },
};
</script>
