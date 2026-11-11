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
  Kalio — About us, design B "A letter", chosen by the owner on 5 November
  2026.

  Beside the letter: three of the shop's best sellers on a warm ground and
  the facts read from the shop itself — its sellers, its aisles, how many
  products it stocks — with the way to reach it. The letter is the shop's
  own About profile (Selldone dashboard › Shop › Profile) when it has one;
  until then a sample letter, marked as a test, with its values, a
  timeline (marked as examples) and a signature.
-->
<template>
  <!-- Walio 1.1.0 (About design B, "the magazine"): the story beside three
       photos, how an order works in four steps, what the shop stands for,
       and how to reach it. The text is the shop's own About profile
       (Selldone dashboard › Shop › Profile) when it has one; until then a
       sample, marked as such. The steps are read from the shop: its
       sellers and its delivery methods. -->
  <div class="w-mag k-wrap">
    <section class="w-mag__ed">
      <div>
        <p class="w-mag__eyebrow">{{ t("about.title", "About {shop}", { shop: shopTitle }) }}</p>
        <h1>{{ missing || busy ? (sellers.length > 1 ? t("walio.about.titleMany", "Small grocers, one cart.") : t("walio.about.titleOne", "One shop, one cart.")) : t("about.title", "About {shop}", { shop: shopTitle }) }}</h1>
        <div v-if="busy" aria-hidden="true" class="k-legal__loading"><span></span><span></span><span></span></div>
        <template v-else-if="missing">
          <kalio-sample-note>{{ t("walio.about.sampleNote", "This text is general copy written to show the page. It is not {shop}'s real story.", { shop: shopTitle }) }}</kalio-sample-note>
          <p class="w-mag__lead">{{ sample.lead }}</p>
          <p>{{ sample.text[0] }}</p>
          <p class="w-mag__sign">{{ sample.sign }}</p>
        </template>
        <div v-else class="k-prose" v-html="profile.body"></div>
      </div>
      <div aria-hidden="true" class="w-mag__photos">
        <span v-for="ph in photos" :key="ph" :style="{ backgroundImage: `url(${ph})` }"></span>
      </div>
    </section>

    <section class="t-sec">
      <header class="t-sec__head"><h2 class="t-sec__title">{{ t("walio.about.how", "How an order works") }}</h2></header>
      <ol class="w-mag__how">
        <li v-for="(st, i) in how" :key="st.t">
          <i>{{ i + 1 }}</i>
          <b>{{ st.t }}</b>
          <p>{{ st.p }}</p>
        </li>
      </ol>
    </section>

    <section v-if="missing" class="t-sec">
      <div class="w-mag__vals">
        <div v-for="(value, i) in sample.values" :key="value.title">
          <v-icon size="26">{{ ICONS[i] || "check_circle" }}</v-icon>
          <b>{{ value.title }}</b>
          <p>{{ value.text }}</p>
        </div>
      </div>
    </section>

    <section id="contact" class="t-sec w-mag__contact">
      <div>
        <p class="w-mag__eyebrow">{{ t("contact.pageTitle", "Contact us") }}</p>
        <h2>{{ t("walio.about.stillNeed", "Still need us?") }}</h2>
        <p>
          {{ t("walio.about.contactText", "For an order, the fastest way is the message thread on the order page: it goes straight to the seller who packed it. For anything else, write to us.") }}
        </p>
      </div>
      <div class="w-mag__acts">
        <router-link :to="{ name: window.$storefront.routes.SHOP_CONTACT_US }" class="t-btn -main">{{ t("walio.about.write", "Write to us") }}</router-link>
        <router-link :to="catalogueRoute" class="t-btn -line">{{ t("pages.startShopping", "Start shopping") }}</router-link>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import KalioSampleNote from "@app-storefront/components/kalio/pages/KalioSampleNote.vue";
import { aboutSample, plainText } from "@app-storefront/components/kalio/pages/kalio-sample-pages";
import { aisles, catalogueRoute, countProducts, productImage, vendors } from "@app-storefront/components/kalio/kalio-catalog";
import { photo, waysOf } from "@app-storefront/components/walio/walio-home";
import { locale, t } from "@app-storefront/components/kalio/i18n/kalio-i18n";

export default {
  name: "StorefrontPageOfficialAboutUs",
  components: { KalioSampleNote },
  inject: ["$shop"],

  data: () => ({
    profile: null,
    missing: false,
    busy: true,
    packs: [],
    sellers: [],
    aisleList: [],
    productCount: null,
    ICONS: ["sell", "storefront", "eco", "chat_bubble_outline"],
  }),

  computed: {
    shopTitle() {
      return this.$shop?.title || t("sample.thisShop", "This shop");
    },
    photos() {
      return ["walio-finds-produce", "walio-tile-bakery", "walio-finds-coffee"].map(photo).filter(Boolean);
    },
    /* The four steps, in the shop's own terms. */
    how() {
      const ways = waysOf(this.$shop).map((w) => w.word);
      const many = this.sellers.length > 1;
      let list = "";
      try {
        list = ways.length ? new Intl.ListFormat(locale(), { type: "disjunction" }).format(ways) : "";
      } catch {
        list = ways.join(", ");
      }
      return [
        {
          t: many ? t("walio.about.how1Many", "Pick from any seller") : t("walio.about.how1One", "Pick from every aisle"),
          p: many ? t("walio.about.how1ManyText", "Every aisle shows each seller's own products and prices.") : t("walio.about.how1OneText", "Every aisle, every price, in one place."),
        },
        {
          t: t("walio.about.how2", "One checkout"),
          p: many ? t("walio.about.how2ManyText", "One cart, one payment, however many sellers you shop.") : t("walio.about.how2OneText", "One cart and one payment."),
        },
        {
          t: many ? t("walio.about.how3Many", "Each seller packs") : t("walio.about.how3One", "We pack it"),
          p: many ? t("walio.about.how3ManyText", "Your order is split into a package per seller.") : t("walio.about.how3OneText", "Your order is packed as soon as it is placed."),
        },
        {
          t: t("walio.about.how4", "Delivered your way"),
          p: list ? t("walio.about.how4Ways", "{ways}, as you choose at checkout.", { ways: list }) : t("walio.about.how4Text", "As you choose at checkout."),
        },
      ];
    },
    sample() {
      return aboutSample(this.shopTitle);
    },
    catalogueRoute() {
      return catalogueRoute();
    },
    aisleLine() {
      const names = this.aisleList.map((it) => it.title || it.name);
      if (names.length <= 3) return names.join(", ");
      const shown = names.slice(0, 3).join(", ");
      return t("about.facts.aisleLine", { one: "{count}: {names} and {n} more", other: "{count}: {names} and {n} more" }, { count: names.length, names: shown, n: names.length - 3 });
    },
  },

  created() {
    this.setPageTitle?.(t("about.pageTitle", "About us"));

    window.axios
      .get(window.XAPI.GET_SHOP_PROFILE(this.$shop.name, "about-us"))
      .then(({ data }) => {
        this.profile = data?.error ? null : data?.profile || null;
        this.missing = !plainText(this.profile?.body);
      })
      .catch(() => (this.missing = true))
      .finally(() => (this.busy = false));

    window.$storefront.products
      .list(null, 0, 8, { products_only: true, available: true, sort: "bestselling" })
      .then(({ products }) => (this.packs = (products || []).filter((it) => it.icon).slice(0, 3)))
      .catch(() => {});
    vendors().then((list) => (this.sellers = list.filter((it) => it && it.name)));
    aisles().then((list) => (this.aisleList = list));
    countProducts(null).then((count) => (this.productCount = count));
  },

  methods: {
    picture(product) {
      return productImage(product);
    },
  },
};
</script>
