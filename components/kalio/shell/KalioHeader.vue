<!--
  Kalio — Header.

  One sticky white bar — the shop's name as a wordmark, an "Aisles" menu,
  the search, then the shopper's own things: orders, saved, account and the
  basket — and under it a strip of every aisle with the deals first. On a
  phone the bar keeps the wordmark and the basket, the search drops under it
  and everything else moves into a menu drawer.

  Every working part is the platform's: the search box and its events (the
  layout's onSearch/onClear), the signed-in account menu
  (SHeaderSectionUser), the basket (the storefront's, shown by Kalio's
  own drawer, KalioBasketDrawer), the language and currency pickers, sign-in
  through the app's need-login event, and the basket count from the
  storefront mixin. A shop with custom header code keeps Selldone's header
  (the layout decides), and a native app shell shows none.
-->
<template>
  <header v-if="!$store.getters.getIsNative" class="k-header">
    <div class="k-header__bar">
      <div class="k-header__row k-wrap">
        <button
          v-if="compact"
          aria-label="Menu"
          class="k-header__icon"
          type="button"
          @click="menu = true"
        >
          <v-icon size="24">menu</v-icon>
        </button>

        <router-link :to="homeRoute" class="k-header__brand -logo" :aria-label="`${shopTitle} home`">
          <img :src="BRAND.mark" alt="" class="k-brand-mark" height="34" width="34" />{{ shopTitle }}
        </router-link>

        <v-menu
          v-if="!compact && aisleList.length"
          v-model="aisles_open"
          :close-on-content-click="true"
          location="bottom start"
          offset="12"
        >
          <template v-slot:activator="{ props }">
            <button class="k-header__aisles" type="button" v-bind="props">
              <v-icon size="20">grid_view</v-icon>
              Aisles
              <v-icon :class="{ 'rotate-180': aisles_open }" class="t-all-400" size="18">expand_more</v-icon>
            </button>
          </template>
          <div class="k-mega">
            <p class="k-eyebrow">Shop by aisle</p>
            <div class="k-mega__grid">
              <router-link
                v-for="aisle in aisleList"
                :key="aisle.id"
                :to="aisleRoute(aisle)"
                class="k-mega__item"
              >
                <span :style="{ '--k-tint': tint(aisle) }" class="k-mega__ring">
                  <img v-if="aisle.icon" :src="aisleImage(aisle, 64)" alt="" height="40" width="40" loading="lazy" />
                </span>
                {{ aisle.title || aisle.name }}
              </router-link>
            </div>
            <div class="k-mega__foot">
              <router-link :to="dealsRoute" class="k-more">Today’s deals <v-icon class="k-flip" size="18">chevron_right</v-icon></router-link>
              <router-link :to="catalogueRoute" class="k-more">Every product <v-icon class="k-flip" size="18">chevron_right</v-icon></router-link>
            </div>
          </div>
        </v-menu>

        <div v-if="showSearch && !compact" class="k-header__search">
          <s-storefront-search-box
            v-model:expand-input="globalStyle.search_mode"
            :dark="false"
            :negative-qr-margin="false"
            :title="$t('layout_shop.search_title', { shop_name: shopTitle })"
            color="#1f1f1f"
            flat
            no-qr
            persistent-placeholder
            rounded="lg"
            variant="outlined"
            @onClear="$emit('clear')"
            @onSearch="(event) => $emit('search', event)"
          />
        </div>
        <v-spacer v-else></v-spacer>

        <nav aria-label="Your account" class="k-header__acts">
          <!-- Language and currency (the owner's choice B, 10 November 2026,
               as Walmart and Amazon do): a small pill before the account,
               "EN · DKK", its panel under it. Hidden while the shop has one
               currency and one language; the phone has the menu's row. -->
          <region-switcher-button v-if="!compact" button-class="k-header__region" />

          <template v-if="!compact">
            <router-link v-if="user" :to="ordersRoute" class="k-header__link">
              <v-icon size="20">receipt_long</v-icon>
              Orders
            </router-link>
            <component
              :is="user ? 'router-link' : 'button'"
              :to="user ? savedRoute : undefined"
              class="k-header__link"
              :type="user ? undefined : 'button'"
              @click="!user && signIn()"
            >
              <v-icon size="20">favorite_border</v-icon>
              Saved
            </component>
          </template>

          <s-header-section-user v-if="user && !compact"></s-header-section-user>
          <button v-else-if="!user && !busyUser && !compact" class="k-header__link -signin" type="button" @click="signIn">
            <v-icon size="20">person_outline</v-icon>
            Sign in
          </button>

          <!-- Phone: the account beside the basket. The bottom bar that
               held it is gone (6 November 2026); orders and the rest are
               in the menu. -->
          <template v-if="compact">
            <router-link v-if="user" :to="profileRoute" aria-label="My account" class="k-header__icon -me">
              <img v-if="user.id && !avatar_failed" :src="getUserAvatar(user.id)" alt="" height="30" width="30" @error="avatar_failed = true" />
              <v-icon v-else size="24">person_outline</v-icon>
            </router-link>
            <button v-else-if="!busyUser" aria-label="Sign in" class="k-header__icon -me" type="button" @click="signIn">
              <v-icon size="24">person_outline</v-icon>
            </button>
          </template>

          <!-- Walio 1.1.0 (drawer design B): on a computer the cart opens as a
               small window under the button; a phone keeps the side drawer. -->
          <v-menu v-if="!compact" v-model="mini" :close-on-content-click="false" location="bottom end" offset="10">
            <template v-slot:activator="{ props }">
              <button :aria-label="`Cart, ${itemsCount} items`" class="k-header__basket" type="button" v-bind="props">
                <v-icon size="20">shopping_cart</v-icon>
                <span>Cart</span>
                <em v-if="itemsCount">{{ itemsCount }}</em>
              </button>
            </template>
            <walio-mini-cart @close="mini = false" />
          </v-menu>
          <button
            v-else
            :aria-label="`Cart, ${itemsCount} items`"
            class="k-header__basket"
            type="button"
            @click="basket = true"
          >
            <v-icon size="20">shopping_cart</v-icon>
            <em v-if="itemsCount">{{ itemsCount }}</em>
          </button>
        </nav>
      </div>

      <!-- Phone: a search pill under the bar. Selldone's search box
           autofocuses on a phone (the keyboard would open on every page),
           so it is mounted only once the pill is tapped, already open. -->
      <div v-if="showSearch && compact" class="k-header__search -below k-wrap">
        <s-storefront-search-box
          v-if="phone_search"
          :dark="false"
          :expand-input="true"
          :negative-qr-margin="false"
          :title="$t('layout_shop.search_title', { shop_name: shopTitle })"
          color="#1f1f1f"
          flat
          no-qr
          persistent-placeholder
          rounded="lg"
          variant="outlined"
          @onClear="$emit('clear')"
          @onSearch="(event) => { phone_search = false; $emit('search', event); }"
        />
        <button v-else class="k-header__search-pill" type="button" @click="phone_search = true">
          <v-icon size="20">search</v-icon>
          Search milk, bread, berries…
        </button>
      </div>
    </div>

    <!-- ▆▆▆▆▆▆▆▆ Aisle strip ▆▆▆▆▆▆▆▆ -->
    <nav v-if="!compact && aisleList.length" aria-label="Aisles" class="k-strip">
      <!-- (5 November 2026) A row longer than the window shows a "›" at
           its end and turns the mouse wheel sideways: at 1024 px seven
           aisles sat past the edge with only a fade to hint at them. -->
      <div :class="{ '-more': strip_more, '-back': strip_back }" class="k-strip__frame k-wrap">
      <button v-if="strip_back" aria-label="Earlier aisles" class="k-strip__nudge -back" tabindex="-1" type="button" @click="stripNudge(-1)">
        <v-icon class="k-flip" size="20">chevron_left</v-icon>
      </button>
      <div ref="strip" class="k-strip__row" @scroll.passive="stripMeasure" @wheel="stripWheel">
        <router-link :to="dealsRoute" class="k-strip__link -deals">
          <v-icon size="18">local_offer</v-icon>
          Deals
        </router-link>
        <router-link
          v-for="aisle in aisleList"
          :key="aisle.id"
          :class="{ '-on': $route.params.category_name === aisle.name }"
          :to="aisleRoute(aisle)"
          class="k-strip__link"
        >
          {{ aisle.title || aisle.name }}
        </router-link>
      </div>
      <button v-if="strip_more" aria-label="More aisles" class="k-strip__nudge -on" tabindex="-1" type="button" @click="stripNudge(1)">
        <v-icon class="k-flip" size="20">chevron_right</v-icon>
      </button>
      </div>
    </nav>

    <!-- ▆▆▆▆▆▆▆▆ Basket drawer ▆▆▆▆▆▆▆▆ -->
    <teleport to="body">
      <v-navigation-drawer
        v-model="basket"
        :location="$vuetify.locale.isRtl ? 'left' : 'right'"
        :width="windowWidth < 520 ? windowWidth : 460"
        class="k-drawer -basket"
        temporary
      >
        <div class="k-drawer__head">
          <p class="k-drawer__title">
            Your cart<small v-if="basketUnits">{{ basketUnits }} {{ basketUnits === 1 ? "item" : "items" }}</small>
          </p>
          <button aria-label="Close" class="k-header__icon" type="button" @click="basket = false">
            <v-icon>close</v-icon>
          </button>
        </div>
        <!-- Empty: Selldone's line "Your cart is empty." left the shopper
             nowhere to go; Kalio's offers the way back to the shelves. -->
        <div v-if="!itemsCount" class="k-drawer__empty">
          <span aria-hidden="true" class="k-drawer__empty-mark"><v-icon size="30">shopping_bag</v-icon></span>
          <p class="k-drawer__empty-title">Your cart is empty</p>
          <p class="k-drawer__empty-text">Pick something from the aisles and it will wait for you here.</p>
          <div class="k-drawer__empty-ctas">
            <router-link :to="dealsRoute" class="k-btn k-btn--solid" @click="basket = false">Shop today’s deals</router-link>
            <router-link :to="catalogueRoute" class="k-btn k-btn--line" @click="basket = false">Browse every product</router-link>
          </div>
          <template v-if="aisleList.length">
            <p class="k-eyebrow k-drawer__empty-label">Or start with an aisle</p>
            <nav aria-label="Aisles" class="k-drawer__empty-aisles">
              <router-link
                v-for="aisle in aisleList.slice(0, 8)"
                :key="aisle.id"
                :style="{ '--k-tint': tint(aisle) }"
                :to="aisleRoute(aisle)"
                class="k-aisle-chip"
                @click="basket = false"
              >
                <img v-if="aisle.icon" :src="aisleImage(aisle, 64)" alt="" height="32" width="32" loading="lazy" />
                {{ aisle.title || aisle.name }}
              </router-link>
            </nav>
          </template>
        </div>
        <kalio-basket-drawer v-else @close="basket = false" />
      </v-navigation-drawer>

      <!-- ▆▆▆▆▆▆▆▆ Phone menu ▆▆▆▆▆▆▆▆ -->
      <v-navigation-drawer
        v-model="menu"
        :location="$vuetify.locale.isRtl ? 'right' : 'left'"
        :width="Math.min(360, windowWidth * 0.88)"
        class="k-drawer -menu"
        temporary
      >
        <div class="k-drawer__head">
          <router-link :to="homeRoute" class="k-header__brand -logo" @click="menu = false"><img :src="BRAND.mark" alt="" class="k-brand-mark" height="30" width="30" />{{ shopTitle }}</router-link>
          <button aria-label="Close" class="k-header__icon" type="button" @click="menu = false">
            <v-icon>close</v-icon>
          </button>
        </div>

        <div class="k-drawer__account">
          <template v-if="user">
            <router-link :to="profileRoute" class="k-drawer__link" @click="menu = false"><v-icon size="20">person_outline</v-icon>My account</router-link>
            <router-link :to="ordersRoute" class="k-drawer__link" @click="menu = false"><v-icon size="20">receipt_long</v-icon>Orders</router-link>
            <router-link :to="savedRoute" class="k-drawer__link" @click="menu = false"><v-icon size="20">favorite_border</v-icon>Saved</router-link>
          </template>
          <button v-else class="k-btn k-btn--solid" type="button" @click="menu = false; signIn()">Sign in</button>
        </div>

        <p class="k-eyebrow k-drawer__label">Aisles</p>
        <router-link :to="dealsRoute" class="k-drawer__link -deals" @click="menu = false"><v-icon size="20">local_offer</v-icon>Deals</router-link>
        <!-- The first six aisles in the shop's order, then "Show N more"
             (the owner's choice A, 10 November 2026, like the filter
             panel's "Show 2 more"): the rest open inline under them and the
             button, now at the end, reads "Show fewer". Eight aisles or
             fewer: all of them, no button. Each opening starts collapsed. -->
        <router-link
          v-for="aisle in menuAisles"
          :key="aisle.id"
          :to="aisleRoute(aisle)"
          class="k-drawer__link"
          @click="menu = false"
        >
          <span :style="{ '--k-tint': tint(aisle) }" class="k-drawer__ring">
            <img v-if="aisle.icon" :src="aisleImage(aisle, 64)" alt="" height="26" width="26" loading="lazy" />
          </span>
          {{ aisle.title || aisle.name }}
        </router-link>
        <template v-if="menuExtra.length">
          <div id="k-menu-more" :class="{ '-open': menu_more }" :inert="!menu_more" class="k-drawer__extra">
            <div>
              <router-link
                v-for="(aisle, i) in menuExtra"
                :key="aisle.id"
                :style="{ transitionDelay: menu_more ? `${i * 20}ms` : '0ms' }"
                :to="aisleRoute(aisle)"
                class="k-drawer__link"
                @click="menu = false"
              >
                <span :style="{ '--k-tint': tint(aisle) }" class="k-drawer__ring">
                  <img v-if="aisle.icon" :src="aisleImage(aisle, 64)" alt="" height="26" width="26" loading="lazy" />
                </span>
                {{ aisle.title || aisle.name }}
              </router-link>
            </div>
          </div>
          <button
            :aria-expanded="menu_more ? 'true' : 'false'"
            aria-controls="k-menu-more"
            class="k-drawer__link -more"
            type="button"
            @click="menu_more = !menu_more"
          >
            <span aria-hidden="true" class="k-drawer__ring -more"><v-icon size="22">expand_more</v-icon></span>
            {{ menu_more ? t("menu.showFewer") : t("menu.showMore", { n: menuExtra.length }) }}
          </button>
        </template>

        <!-- Language and currency: a row that opens a bottom sheet. -->
        <div class="k-drawer__region">
          <region-sheet row-class="k-drawer__link k-drawer__regionrow" />
        </div>
      </v-navigation-drawer>
    </teleport>
  </header>
</template>

<script>
import { BRAND } from "../kalio-brand";
import { defineAsyncComponent } from "vue";
import SStorefrontSearchBox from "@selldone/components-vue/storefront/search/SStorefrontSearchBox.vue";
import RegionSwitcherButton from "../../region-switcher/RegionSwitcherButton.vue";
import RegionSheet from "../../region-switcher/RegionSheet.vue";
import { t } from "../../region-switcher/region";
import KalioBasketDrawer from "./KalioBasketDrawer.vue";
import { EventBus } from "@selldone/components-vue/utils/events/EventBus.ts";
import { aisleImage, aisleRoute, aisles, catalogueRoute, dealsRoute, tintFor } from "../kalio-catalog";
import { basketView } from "../kalio-basket";
import WalioMiniCart from "../../walio/WalioMiniCart.vue";

export default {
  name: "KalioHeader",
  components: {
    WalioMiniCart,
    SStorefrontSearchBox,
    RegionSwitcherButton,
    RegionSheet,
    KalioBasketDrawer,
    SHeaderSectionUser: defineAsyncComponent(
      () => import("@selldone/components-vue/storefront/header/section/user/SHeaderSectionUser.vue"),
    ),
  },
  inject: ["$shop"],

  props: {
    /** The current route asks for the search box (route meta "search"). */
    showSearch: { type: Boolean, default: true },
  },

  emits: ["search", "clear"],

  data() {
    return {
      BRAND,
      aisleList: [],
      aisles_open: false,
      basket: false,
      mini: false,
      menu: false,
      menu_more: false,
      phone_search: false,
      windowWidth: window.innerWidth,
      strip_more: false,
      strip_back: false,
      avatar_failed: false,
    };
  },

  computed: {
    shopTitle() {
      return this.$shop?.title || "Kalio";
    },
    /* The phone menu: six aisles, the rest behind "Show N more" (only when
       that hides three or more: eight or fewer are all shown). */
    menuAisles() {
      return this.aisleList.length > 8 ? this.aisleList.slice(0, 6) : this.aisleList;
    },
    menuExtra() {
      return this.aisleList.length > 8 ? this.aisleList.slice(6) : [];
    },
    user() {
      return this.$store.getters.getUser;
    },
    busyUser() {
      return this.$store.getters.getBusyUser;
    },
    compact() {
      return this.$vuetify.display.smAndDown;
    },
    globalStyle() {
      return this.$store.getters.getGlobalStyle;
    },
    itemsCount() {
      return this.getTotalItemInBaskets() || 0;
    },
    /** How many things are in the basket, counting each one (2 breads are 2). */
    basketUnits() {
      return this.getBaskets().reduce(
        (sum, basket) => sum + (basket?.items || []).reduce((n, item) => n + (item.count || 0), 0),
        0,
      );
    },
    homeRoute() {
      return { path: "/" };
    },
    dealsRoute() {
      return dealsRoute();
    },
    catalogueRoute() {
      return catalogueRoute();
    },
    ordersRoute() {
      return { name: window.$storefront.routes.HISTORY_ORDERS_PHYSICAL };
    },
    savedRoute() {
      return { name: window.$storefront.routes.USER_FAVORITES_PAGE };
    },
    /** "My account": the Overview (design B) or the orders (design A). */
    profileRoute() {
      return { name: "KalioAccountHome" };
    },
    drawerOpen() {
      return this.basket || this.menu;
    },
  },

  watch: {
    drawerOpen(open) {
      /* The phone bottom bar would sit over either drawer. */
      this.$store.commit("setForceHideNavigation", open);
    },
    basket(open) {
      basketView.drawerOpen = open;
    },
    menu(open) {
      if (open) this.menu_more = false;
    },
    $route() {
      this.menu = false;
      this.basket = false;
      this.mini = false;
      this.phone_search = false;
    },
  },

  mounted() {
    aisles().then((list) => {
      this.aisleList = list;
      this.$nextTick(this.stripMeasure);
    });
    this.onResize = () => {
      this.windowWidth = window.innerWidth;
      this.stripMeasure();
    };
    window.addEventListener("resize", this.onResize, { passive: true });
  },

  beforeUnmount() {
    window.removeEventListener("resize", this.onResize);
  },

  methods: {
    t,
    aisleRoute,
    aisleImage,
    tint: tintFor,
    signIn() {
      EventBus.$emit("need-login", true);
    },
    /** Whether the aisle row runs past either edge. */
    stripMeasure() {
      const row = this.$refs.strip;
      if (!row) return;
      const left = Math.abs(row.scrollLeft);
      this.strip_back = left > 4;
      this.strip_more = left + row.clientWidth < row.scrollWidth - 4;
    },
    stripNudge(step) {
      const row = this.$refs.strip;
      if (!row) return;
      const rtl = getComputedStyle(row).direction === "rtl";
      row.scrollBy({ left: (rtl ? -step : step) * Math.round(row.clientWidth * 0.6), behavior: "smooth" });
    },
    /** A mouse wheel over the row moves it sideways. */
    stripWheel(e) {
      const row = this.$refs.strip;
      if (!row || row.scrollWidth <= row.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      row.scrollLeft += e.deltaY;
    },
  },
};
</script>
