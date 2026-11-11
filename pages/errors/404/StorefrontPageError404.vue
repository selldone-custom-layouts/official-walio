<!--
  - Copyright (c) 2024. Selldone® Business OS™
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
<template>
  <!-- Walio 1.1.0 (404 design B): the home's split panel — a blue side with
       a large 404 and the way back, a photo beside it — then today's deals. -->
  <div class="w-404">
    <section class="w-404__panel k-wrap">
      <div class="w-404__l">
        <span class="w-404__big">404</span>
        <h1>{{ t("walio.404.title", "We couldn't find that page") }}</h1>
        <p>{{ t("walio.404.text", "It may have moved. Everything else is right where you left it — your cart included.") }}</p>
        <div class="w-404__acts">
          <router-link :to="{ path: '/' }" class="w-404__btn -solid">{{ t("walio.404.home", "Back to the home page") }}</router-link>
          <router-link :to="catalogue" class="w-404__btn -ghost">{{ t("home.browseAll", "Browse every product") }}</router-link>
        </div>
      </div>
      <div :style="pic ? { backgroundImage: `url(${pic})` } : null" aria-hidden="true" class="w-404__r"></div>
    </section>
    <walio-row :filter="{ only_has_discount: true }" :limit="12" :more-to="deals" :title="t('walio.404.deals', 'Today\'s top deals')" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import WalioRow from "../../../components/walio/WalioRow.vue";
import { photo } from "../../../components/walio/walio-home";
import { catalogueRoute, dealsRoute } from "../../../components/kalio/kalio-catalog";

export default defineComponent({
  name: "StorefrontPageError404",
  components: { WalioRow },
  computed: {
    shop() {
      return this.getShop();
    },
    pic() {
      return photo("walio-hero-2-new");
    },
    deals() {
      return dealsRoute();
    },
    catalogue() {
      return catalogueRoute();
    },
  },
});
</script>
<style scoped lang="scss"></style>
