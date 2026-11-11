<!--
  The compare page: "Add a product" (8 November 2026).

  A search field (the shop's own product search, as you type) and a few
  products from the same aisle to add with one tap. It sits in the empty
  column beside the picks on a computer, and as a card above them on a phone.
-->
<template>
  <div :class="{ '-wide': wide }" class="k-cmp-add">
    <div class="k-cmp-add__top">
      <span class="k-cmp-add__plus"><v-icon size="22">add</v-icon></span>
      {{ t("compare.add.title", "Add a product") }}
    </div>

    <label class="k-cmp-add__field">
      <v-icon size="18">search</v-icon>
      <input v-model="q" :aria-label="placeholder" :placeholder="placeholder" type="search" @keydown.esc="q = ''" />
    </label>

    <ul v-if="q.trim().length > 1" class="k-cmp-add__res">
      <li v-if="searching && !results.length" class="-note">{{ t("compare.add.looking", "Looking…") }}</li>
      <li v-else-if="!results.length" class="-note">{{ t("compare.add.noResults", "Nothing found for “{q}”", { q: q.trim() }) }}</li>
      <li v-for="p in results" :key="p.id">
        <button :disabled="exclude.includes(p.id)" type="button" @click="pick(p)">
          <span class="k-cmp-add__pic"><img v-if="p.icon" :src="thumb(p)" alt="" /></span>
          <span class="k-cmp-add__nm">{{ p.title }}</span>
          <small v-if="exclude.includes(p.id)" class="k-cmp-add__in">{{ t("compare.add.added", "Added") }}</small>
          <v-icon v-else size="22">add_circle</v-icon>
        </button>
      </li>
    </ul>

    <div v-if="suggestions.length" class="k-cmp-add__sug">
      <button v-for="p in suggestions" :key="p.id" :aria-label="t('compare.add.addItem', 'Add {name}', { name: p.title })" :title="t('compare.add.addItem', 'Add {name}', { name: p.title })" type="button" @click="pick(p)">
        <img v-if="p.icon" :src="thumb(p)" alt="" />
      </button>
    </div>
    <small>{{ t("compare.add.upTo", "Up to {max} side by side", { max: max }) }}</small>
  </div>
</template>

<script>
import { productImage } from "../kalio-catalog";
import { t } from "../i18n/kalio-i18n";

export default {
  name: "KalioCompareAdd",

  props: {
    /** Product ids already compared: left out of the results. */
    exclude: { type: Array, default: () => [] },
    /** A few products from the same aisle, to add with one tap. */
    suggestions: { type: Array, default: () => [] },
    /** The aisle's name, for the field's hint. */
    aisle: { type: String, default: null },
    max: { type: Number, default: 4 },
    /** The phone's card above the picks. */
    wide: Boolean,
  },

  emits: ["add"],

  data: () => ({ q: "", results: [], searching: false }),

  computed: {
    placeholder() {
      return this.aisle
        ? t("compare.add.searchAisle", "Search {aisle}…", { aisle: this.aisle.toLowerCase() })
        : t("compare.add.searchGroceries", "Search groceries…");
    },
  },

  watch: {
    q(text) {
      clearTimeout(this.timer);
      const query = text.trim();
      if (query.length < 2) {
        this.results = [];
        return;
      }
      this.searching = true;
      this.timer = setTimeout(() => this.search(query), 280);
    },
  },

  beforeUnmount() {
    clearTimeout(this.timer);
  },

  methods: {
    /** The header's own search (Selldone's suggestions): its product hits. */
    search(query) {
      const asked = query;
      const text = query.replace(/[/\\]/g, "");
      if (text.length < 2) return;
      window.axios
        .get(window.XAPI.GET_SEARCH_QUERY(window.$storefront.name, text))
        .then(({ data }) => {
          if (this.q.trim() !== asked) return;
          this.results = (data?.items || []).filter((p) => p && p.id && !p.cat).slice(0, 5);
        })
        .catch(() => (this.results = []))
        .finally(() => {
          if (this.q.trim() === asked) this.searching = false;
        });
    },
    pick(product) {
      this.$emit("add", product);
      this.q = "";
      this.results = [];
    },
    thumb(product) {
      return productImage(product, true);
    },
  },
};
</script>
