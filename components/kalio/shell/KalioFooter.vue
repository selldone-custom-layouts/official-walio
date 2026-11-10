<!--
  Kalio — Footer.

  Two parts. A light green band that sends a shopper back into the aisles
  (every aisle as a round picture). Then the footer proper on deep green:
  the shop's name and its own description, social links and language; the
  aisles; the sellers with their marks; the shop's own footer menu exactly
  as the merchant set it in Selldone (falling back to the standard pages
  when there is none); and the shopper's account links. The bottom row
  keeps the copyright, Selldone's cookie settings and the powered-by mark,
  which follows the shop's own copyright-mark setting.

  Everything is read live. A shop with custom footer code keeps Selldone's
  footer (the layout decides).
-->
<template>
  <footer class="k-footer">
    <!-- ▆▆▆▆▆▆▆▆ Back to the aisles ▆▆▆▆▆▆▆▆ -->
    <!-- What the shop is, in three counts read live, and the way back in. -->
    <section v-if="aisleList.length" aria-labelledby="k-footer-aisles" class="k-footer__band">
      <div class="k-wrap k-footer__band-row">
        <div class="k-footer__band-copy">
          <p class="k-eyebrow">{{ shopTitle }}</p>
          <h2 id="k-footer-aisles" class="k-footer__band-title">Everything for the weekly shop</h2>
        </div>
        <dl class="k-footer__facts">
          <div>
            <dt>{{ aisleList.length }}</dt>
            <dd>{{ aisleList.length === 1 ? "aisle" : "aisles" }}</dd>
          </div>
          <div v-if="sellerList.length > 1">
            <dt>{{ sellerList.length }}</dt>
            <dd>independent sellers</dd>
          </div>
          <div>
            <dt>1</dt>
            <dd>{{ sellerList.length > 1 ? "basket for all of them" : "basket, one checkout" }}</dd>
          </div>
        </dl>
        <router-link :to="catalogueRoute" class="k-btn k-btn--solid">
          Browse every aisle
          <v-icon class="k-flip" size="20">chevron_right</v-icon>
        </router-link>
      </div>
    </section>

    <!-- ▆▆▆▆▆▆▆▆ Footer ▆▆▆▆▆▆▆▆ -->
    <div class="k-footer__main">
      <div class="k-wrap k-footer__grid">
        <div class="k-footer__brand">
          <router-link :to="{ path: '/' }" class="k-footer__mark -logo"><img :src="BRAND.mark" alt="" class="k-brand-mark" height="30" width="30" />{{ shopTitle }}</router-link>
          <p v-if="lede" class="k-footer__lede">{{ lede }}</p>
          <s-storefront-social-buttons class="k-footer__social"></s-storefront-social-buttons>
          <div class="k-footer__pickers">
            <s-language-selector hide-details variant="outlined"></s-language-selector>
            <u-currency-selector
              v-if="$shop.currencies && $shop.currencies.length > 1"
              :shop="$shop"
              hide-details
              @change="onChangeUserSelectedCurrency"
            />
          </div>
        </div>

        <nav aria-labelledby="k-footer-shop" class="k-footer__col">
          <h3 id="k-footer-shop" class="k-footer__head">Aisles</h3>
          <router-link :to="dealsRoute">Deals</router-link>
          <router-link v-for="aisle in aisleList.slice(0, 8)" :key="aisle.id" :to="aisleRoute(aisle)">
            {{ aisle.title || aisle.name }}
          </router-link>
          <router-link v-if="aisleList.length > 8" :to="catalogueRoute" class="-more">All aisles</router-link>
        </nav>

        <nav v-if="sellerList.length" aria-labelledby="k-footer-sellers" class="k-footer__col">
          <h3 id="k-footer-sellers" class="k-footer__head">Sellers</h3>
          <router-link v-for="seller in sellerList" :key="seller.id" :to="sellerRoute(seller)" class="k-footer__seller">
            <img v-if="seller.icon" :src="vendorImage(seller, true)" alt="" height="28" width="28" loading="lazy" />
            {{ seller.name }}
          </router-link>
        </nav>

        <nav aria-labelledby="k-footer-help" class="k-footer__col">
          <h3 id="k-footer-help" class="k-footer__head">{{ shopTitle }}</h3>
          <router-link v-for="(item, i) in shopLinks" :key="'l' + i" :to="item.to">{{ item.name }}</router-link>
        </nav>

        <nav aria-labelledby="k-footer-account" class="k-footer__col">
          <h3 id="k-footer-account" class="k-footer__head">Your account</h3>
          <template v-if="user">
            <router-link :to="{ name: 'KalioAccountHome' }">My account</router-link>
            <router-link :to="{ name: window.$storefront.routes.HISTORY_ORDERS_PHYSICAL }">Orders</router-link>
            <router-link :to="{ name: window.$storefront.routes.USER_FAVORITES_PAGE }">Saved</router-link>
          </template>
          <button v-else class="k-footer__textbtn" type="button" @click="signIn">Sign in</button>
          <router-link :to="{ name: window.$storefront.routes.BASKET_PAGE, params: { type: 'PHYSICAL' } }">Basket</router-link>
        </nav>
      </div>

      <!-- The visitor's theme: palettes, a free Custom colour and Light /
           Dark, in a strip of its own above the legal row (the owner, 10
           November 2026: the theme setting belongs in the footer, not the
           header). Only on molino, the showcase shop; the row renders
           nothing elsewhere. -->
      <div class="k-wrap k-footer__theme"><theme-switcher-row /></div>

      <div class="k-wrap k-footer__base">
        <span>© {{ year }} {{ shopTitle }}</span>
        <span class="k-footer__base-links">
          <router-link :to="{ name: window.$storefront.routes.SHOP_PROFILE_PAGE_PRIVACY }">Privacy</router-link>
          <router-link :to="{ name: window.$storefront.routes.SHOP_PROFILE_PAGE_TERMS }">Terms</router-link>
          <s-footer-section-gdpr></s-footer-section-gdpr>
          <s-footer-section-selldone></s-footer-section-selldone>
        </span>
      </div>
    </div>
  </footer>
</template>

<script>
import { BRAND } from "../kalio-brand";
import SStorefrontSocialButtons from "@selldone/components-vue/storefront/social/SStorefrontSocialButtons.vue";
import SLanguageSelector from "@selldone/components-vue/storefront/language/selector/SLanguageSelector.vue";
import UCurrencySelector from "@selldone/components-vue/ui/currency/selector/UCurrencySelector.vue";
import SFooterSectionGdpr from "@selldone/components-vue/storefront/footer/section/gdpr/SFooterSectionGdpr.vue";
import SFooterSectionSelldone from "@selldone/components-vue/storefront/footer/section/selldone/SFooterSectionSelldone.vue";
import ThemeSwitcherRow from "../../theme-switcher/ThemeSwitcherRow.vue";
import { EventBus } from "@selldone/components-vue/utils/events/EventBus.ts";
import { aisleRoute, aisles, catalogueRoute, dealsRoute, sellerRoute, vendorImage, vendors } from "../kalio-catalog";

export default {
  name: "KalioFooter",
  components: {
    SStorefrontSocialButtons,
    SLanguageSelector,
    UCurrencySelector,
    SFooterSectionGdpr,
    SFooterSectionSelldone,
    ThemeSwitcherRow,
  },
  inject: ["$shop"],

  data() {
    return {
      BRAND,
      window: window,
      aisleList: [],
      sellerList: [],
      year: new Date().getFullYear(),
    };
  },

  computed: {
    shopTitle() {
      return this.$shop?.title || "Kalio";
    },
    user() {
      return this.$store.getters.getUser;
    },
    catalogueRoute() {
      return catalogueRoute();
    },
    dealsRoute() {
      return dealsRoute();
    },
    /* The shop's own description. A new Selldone shop is given "It's my
       awesome <name> website." until the merchant writes one; that line is
       not shown, and the footer describes the shop from what it stocks. */
    lede() {
      const description = (this.$shop?.description || "").trim();
      if (description && !/^it['’]s my awesome .* website\.?$/i.test(description)) return description;
      if (!this.aisleList.length) return null;
      const sellers = this.sellerList.length;
      return sellers > 1
        ? `${this.aisleList.length} aisles of groceries from ${sellers} independent sellers, in one basket.`
        : `${this.aisleList.length} aisles of groceries, in one basket.`;
    },
    /* The merchant's footer menu (Selldone menus, type FOOTER), flattened,
       or the standard pages when the shop has none. */
    shopLinks() {
      const menu = this.$shop?.menus?.find((it) => it.type === "FOOTER" && it.enable !== false);
      const shopPage = window.$storefront.routes.SHOP_PAGE;
      /* A link to a route this storefront does not have (a blog the shop
         never enabled) would throw while rendering, so it is left out. Here
         the shop page is the home, so a menu's "Shop" link opened the same
         page as "Home"; it opens the catalogue instead. */
      const items = (menu?.menu || [])
        .flat()
        .filter((item) => item && item.name && item.to)
        .filter((item) => !item.to.name || this.$router.hasRoute(item.to.name))
        .map((item) =>
          item.to.name === shopPage && !item.to.query ? { ...item, to: this.catalogueRoute } : item,
        );
      if (items.length) return items;
      const r = window.$storefront.routes;
      return [
        { name: "About us", to: { name: r.SHOP_PROFILE_PAGE_ABOUT_US } },
        { name: "Contact us", to: { name: r.SHOP_CONTACT_US } },
        { name: "Terms of use", to: { name: r.SHOP_PROFILE_PAGE_TERMS } },
        { name: "Privacy", to: { name: r.SHOP_PROFILE_PAGE_PRIVACY } },
      ];
    },
  },

  mounted() {
    aisles().then((list) => (this.aisleList = list));
    vendors().then((list) => (this.sellerList = list));
  },

  methods: {
    aisleRoute,
    sellerRoute,
    vendorImage,
    signIn() {
      EventBus.$emit("need-login", true);
    },
  },
};
</script>
