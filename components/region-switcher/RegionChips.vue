<!--
  Region switcher: the Language and Currency chips, shared by the header
  panel (RegionSwitcherButton) and the phone sheet (RegionSheet).
  Each group is a radio group: the chosen chip has aria-checked and a ring
  drawn inside its box; Left / Right (and Home / End) move along a group,
  Tab moves to the next group. Language chips show only when the shop has
  two or more languages.
-->
<template>
  <div class="rs-chips">
    <template v-if="langOn">
      <p :id="ids.lang" class="rs-chips__t">{{ t("region.language") }}</p>
      <div :aria-labelledby="ids.lang" class="rs-chips__row" role="radiogroup" @keydown="onArrows">
        <button
          v-for="l in langs"
          :key="l.code"
          :aria-checked="l.code === lang ? 'true' : 'false'"
          :class="{ '-on': l.code === lang }"
          :dir="l.rtl ? 'rtl' : 'ltr'"
          :lang="l.code"
          :tabindex="l.code === lang ? 0 : -1"
          class="rs-chip"
          role="radio"
          type="button"
          @click="pickLang(l.code)"
        >
          {{ l.title }}
        </button>
      </div>
    </template>

    <template v-if="curs.length > 1">
      <p :id="ids.cur" class="rs-chips__t">{{ t("region.currency") }}</p>
      <div :aria-labelledby="ids.cur" class="rs-chips__row" role="radiogroup" @keydown="onArrows">
        <button
          v-for="c in curs"
          :key="c.code"
          :aria-checked="c.code === cur ? 'true' : 'false'"
          :class="{ '-on': c.code === cur }"
          :tabindex="c.code === cur ? 0 : -1"
          class="rs-chip"
          role="radio"
          type="button"
          @click="pickCur(c.code)"
        >
          {{ c.code }}<small v-if="c.sign && c.sign !== c.code" aria-hidden="true">{{ c.sign }}</small>
        </button>
      </div>
    </template>

    <p v-if="note" class="rs-chips__note">{{ t("region.note") }}</p>
  </div>
</template>

<script>
import { currencies, currentCurrency, currentLanguage, languages, regionState, setCurrency, setLanguage, showLanguages, t } from "./region";

let uid = 0;

export default {
  name: "RegionChips",
  props: {
    /** Show the one-line note under the chips. */
    note: { type: Boolean, default: false },
  },
  emits: ["picked"],

  data() {
    const n = ++uid;
    return { state: regionState, ids: { lang: `rs-l-${n}`, cur: `rs-c-${n}` } };
  },

  computed: {
    langs() {
      void this.$shop;
      return languages();
    },
    langOn() {
      void this.$shop;
      return showLanguages();
    },
    curs() {
      void this.$shop;
      return currencies();
    },
    cur() {
      void this.state.currency;
      return currentCurrency();
    },
    lang() {
      void this.state.language;
      return currentLanguage();
    },
  },

  inject: { $shop: { default: null } },

  methods: {
    t,
    pickCur(code) {
      if (code !== this.cur) setCurrency(code, this);
      this.$emit("picked", { currency: code });
    },
    async pickLang(code) {
      if (code !== this.lang) await setLanguage(code, this);
      this.$emit("picked", { language: code });
    },
    /* Arrow keys move along one group (radio group pattern); a move picks
       nothing until Enter or Space, so the page does not redraw per key. */
    onArrows(e) {
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
      if (!keys.includes(e.key)) return;
      const chips = [...e.currentTarget.querySelectorAll(".rs-chip")];
      const i = chips.indexOf(document.activeElement);
      if (i < 0) return;
      const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
      const fwd = e.key === "ArrowDown" || (e.key === "ArrowRight") !== rtl;
      const next = e.key === "Home" ? 0 : e.key === "End" ? chips.length - 1 : (i + (fwd ? 1 : -1) + chips.length) % chips.length;
      chips.forEach((c, k) => c.setAttribute("tabindex", k === next ? "0" : "-1"));
      chips[next].focus();
      e.preventDefault();
    },
  },
};
</script>
