<!--
  Region switcher: the header pill ("🌐 EN · DKK", or "🌐 DKK" with one
  language) and its panel (the owner's choice B, 10 November 2026: "in the
  header, as Walmart and Amazon do").

    <region-switcher-button button-class="x-header__link" />

  A click opens a small panel under the pill: Language chips (only when the
  shop has two or more languages) and Currency chips (code and sign; the
  chosen chip is ringed inside its box). A pick applies at once.
  No scrim. It closes on a second click, on Esc (focus back to the pill), on
  a click outside and on a page change; Tab walks from the pill into it and
  arrow keys move along the chips. On a wide screen its right edge lines up
  with the pill's, never within 12px of either side; under `phoneBelow` it
  sits 12px from both sides. Hidden when the shop has one currency and one
  language.
-->
<template>
  <div v-if="visible" ref="root" class="rs-pick">
    <button
      ref="btn"
      :aria-controls="popId"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-label="`${t('region.title')}: ${label}`"
      :class="[buttonClass, { '-open': open }]"
      aria-haspopup="dialog"
      class="rs-pick__btn"
      type="button"
      @click="toggle"
    >
      <svg aria-hidden="true" class="rs-pick__globe" viewBox="0 0 24 24">
        <path
          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8 8 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.3 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8 8 0 0 1 0 4h-3.4z"
        />
      </svg>
      <span class="rs-pick__label">{{ label }}</span>
      <svg aria-hidden="true" :class="{ '-up': open }" class="rs-pick__chev" viewBox="0 0 24 24"><path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z" /></svg>
    </button>

    <div v-if="open" :id="popId" ref="pop" :aria-label="t('region.title')" :dir="dir" :style="pos" class="rs-pop" role="dialog">
      <region-chips :note="note" @picked="onPicked" />
    </div>
  </div>
</template>

<script>
import { hasChoice, isRtl, regionLabel, regionState, syncFromSelldone, t } from "./region";
import RegionChips from "./RegionChips.vue";

let uid = 0;

export default {
  name: "RegionSwitcherButton",
  components: { RegionChips },
  inject: { $shop: { default: null } },

  props: {
    /** The header's own link/pill class(es), so the pill sits in its row. */
    buttonClass: { type: [String, Array, Object], default: "" },
    /** Under this width the panel spans the screen with 12px on each side. */
    phoneBelow: { type: Number, default: 600 },
    /** The panel's width on a wider screen. */
    width: { type: Number, default: 340 },
    /** The one-line note under the chips. */
    note: { type: Boolean, default: true },
    /** Close the panel after a currency or language pick. */
    closeOnPick: { type: Boolean, default: false },
  },

  data() {
    return { state: regionState, open: false, pos: {}, popId: `rs-pop-${++uid}` };
  },

  computed: {
    visible() {
      void this.$shop;
      return hasChoice();
    },
    dir() {
      void this.state.language;
      return isRtl() ? "rtl" : "ltr";
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
    this.unbind();
  },

  methods: {
    t,
    toggle() {
      if (this.open) this.close(false);
      else this.show();
    },
    show() {
      this.open = true;
      this.$nextTick(this.place);
      this.onDown = (e) => {
        if (!this.$refs.root?.contains(e.target)) this.close(false);
      };
      this.onKey = (e) => {
        if (e.key === "Escape") this.close(true);
      };
      this.onResize = () => this.place();
      document.addEventListener("mousedown", this.onDown, true);
      document.addEventListener("touchstart", this.onDown, { capture: true, passive: true });
      document.addEventListener("keydown", this.onKey);
      window.addEventListener("resize", this.onResize, { passive: true });
    },
    close(refocus) {
      this.open = false;
      this.unbind();
      if (refocus) this.$refs.btn?.focus();
    },
    unbind() {
      if (this.onDown) {
        document.removeEventListener("mousedown", this.onDown, true);
        document.removeEventListener("touchstart", this.onDown, { capture: true });
      }
      if (this.onKey) document.removeEventListener("keydown", this.onKey);
      if (this.onResize) window.removeEventListener("resize", this.onResize);
      this.onDown = this.onKey = this.onResize = null;
    },
    onPicked() {
      if (this.closeOnPick) this.close(true);
    },
    /* Under the pill, in the panel's positioned ancestor (the header). */
    place() {
      const btn = this.$refs.btn;
      const pop = this.$refs.pop;
      if (!btn || !pop) return;
      const parent = pop.offsetParent || document.body;
      const o = parent.getBoundingClientRect();
      const b = btn.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const top = Math.round(b.bottom - o.top + 8);
      let left;
      let width;
      if (vw < this.phoneBelow) {
        width = vw - 24;
        left = 12;
      } else {
        width = Math.min(this.width, vw - 24);
        left = Math.min(Math.max(12, b.right - width), vw - 12 - width);
      }
      this.pos = { top: `${top}px`, left: `${Math.round(left - o.left)}px`, width: `${Math.round(width)}px` };
    },
  },
};
</script>

<style lang="scss" src="./region-switcher.scss"></style>
