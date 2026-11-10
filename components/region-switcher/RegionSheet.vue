<!--
  Region switcher, phone: a row for the phone menu
  ("🌐 Language & currency   EN · DKK ›") that opens a bottom sheet with the
  same chips and a Done button.

    <region-sheet row-class="x-drawer__link" @open="menu = false" />

  The sheet is a plain panel teleported to <body> (not a Vuetify dialog: a
  backdrop-filter on Vuetify's overlay puts fixed panels off-screen on
  phones). It has a dim backdrop (a tap closes), closes on Done, Esc and a
  page change, keeps focus inside while open and gives it back to the row.
  `open` emits when the row is tapped (e.g. to close the drawer first);
  with `keep-menu` the drawer stays and the sheet opens over it.
-->
<template>
  <button
    v-if="visible"
    ref="row"
    :aria-expanded="open ? 'true' : 'false'"
    :class="rowClass"
    aria-haspopup="dialog"
    class="rs-row"
    type="button"
    @click="show"
  >
    <span class="rs-row__ic">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path
          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8 8 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.3 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8 8 0 0 1 0 4h-3.4z"
        />
      </svg>
    </span>
    <span class="rs-row__t">{{ t("region.title") }}</span>
    <span class="rs-row__v">{{ label }}<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6z" /></svg></span>
  </button>

  <teleport to="body">
    <div v-if="open" :dir="dir" :lang="lang" class="rs-sheet-wrap" @keydown="onKey">
      <div class="rs-sheet-dim" @click="close(true)"></div>
      <div ref="sheet" :aria-label="t('region.title')" aria-modal="true" class="rs-sheet" role="dialog" tabindex="-1">
        <div aria-hidden="true" class="rs-sheet__grab"></div>
        <p class="rs-sheet__h">{{ t("region.title") }}</p>
        <region-chips />
        <button ref="done" class="rs-sheet__done" type="button" @click="close(true)">{{ t("region.done") }}</button>
      </div>
    </div>
  </teleport>
</template>

<script>
import { currentLanguage, hasChoice, isRtl, regionLabel, regionState, syncFromSelldone, t } from "./region";
import RegionChips from "./RegionChips.vue";

export default {
  name: "RegionSheet",
  components: { RegionChips },
  inject: { $shop: { default: null } },

  props: {
    /** The phone menu's own row class(es), so the row lines up with the others. */
    rowClass: { type: [String, Array, Object], default: "" },
  },
  emits: ["open", "close"],

  data() {
    return { state: regionState, open: false };
  },

  computed: {
    visible() {
      void this.$shop;
      return hasChoice();
    },
    lang() {
      void this.state.language;
      return currentLanguage();
    },
    /* Selldone sets RTL only inside v-app; this sheet lives in <body>. */
    dir() {
      return isRtl(this.lang) ? "rtl" : "ltr";
    },
    label() {
      void this.state.currency;
      void this.state.language;
      void this.$shop;
      return regionLabel();
    },
  },

  watch: {
    "$route.fullPath"() {
      if (this.open) this.close(false);
    },
  },

  created() {
    syncFromSelldone();
  },

  beforeUnmount() {
    document.documentElement.classList.remove("rs-locked");
  },

  methods: {
    t,
    show() {
      this.$emit("open");
      this.open = true;
      document.documentElement.classList.add("rs-locked");
      this.$nextTick(() => {
        const on = this.$refs.sheet?.querySelector(".rs-chip.-on") || this.$refs.done;
        on?.focus();
      });
    },
    close(refocus) {
      this.open = false;
      document.documentElement.classList.remove("rs-locked");
      this.$emit("close");
      if (refocus) this.$nextTick(() => this.$refs.row?.focus());
    },
    /* Esc closes; Tab stays inside the sheet. */
    onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        this.close(true);
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...(this.$refs.sheet?.querySelectorAll('button:not([tabindex="-1"])') || [])];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    },
  },
};
</script>

<style lang="scss" src="./region-switcher.scss"></style>
