<!--
  Theme switcher: the header's "Theme" action and its panel (the default
  placement; the owner, 9 November 2026: "put it at the top of the header").

  Put it in the header's actions, just before the cart, with the header's
  own action class so it looks like Account:
    <theme-switcher-button button-class="x-header__act">
      <template #default="{ modeLabel }"> …icon… <span>Theme</span> </template>
    </theme-switcher-button>
  Without a slot it draws a palette icon and the word "Theme".

  A click opens a small panel under the button: the palettes (swatch and
  name; the chosen swatch gets a ring drawn inside it), "Custom colour" (the
  native colour picker; any colour becomes a readable palette, with a note
  when it had to be adjusted; config.custom) and Light / Dark.
  No scrim. It closes on a second click, on Esc (focus goes back to the
  button), on a click outside and on a page change; Tab walks from the
  button into it. It is placed under the button inside its positioned
  ancestor (the header): right edges lined up on a wide screen, never past
  12px from either side; on a phone 12px from both sides.
-->
<template>
  <div v-if="state.enabled" ref="root" class="ts-pick">
    <button
      ref="btn"
      :aria-controls="popId"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-label="labels.theme"
      :class="[buttonClass, { '-open': open }]"
      :title="labels.theme"
      aria-haspopup="dialog"
      class="ts-pick__btn"
      type="button"
      @click="toggle"
    >
      <slot :labels="labels" :modeLabel="modeLabel" :open="open" :palette="current" :state="state">
        <svg aria-hidden="true" class="ts-pick__icon" viewBox="0 0 24 24">
          <path
            d="M12 2.5C6.8 2.5 2.5 6.6 2.5 11.8c0 5.1 4.2 9.7 9.3 9.7 1.6 0 2.4-1 2.4-2.2 0-.6-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3 0-1.1.9-1.9 2-1.9h2.3c2.8 0 4.5-1.9 4.5-4.5C22 6.1 17.6 2.5 12 2.5zM6.6 12.6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.8 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
          />
        </svg>
        <span class="ts-pick__label">{{ labels.theme }}</span>
      </slot>
    </button>

    <div v-if="open" :id="popId" ref="pop" :aria-label="labels.theme" :style="pos" class="ts-pop" role="dialog">
      <p class="ts-pop__t">{{ labels.palettes }}</p>
      <div :aria-label="labels.palettes" class="ts-pop__pals" role="group" @keydown="onArrows">
        <button
          v-for="p in palettes"
          :key="p.id"
          :aria-pressed="p.id === state.palette ? 'true' : 'false'"
          :class="{ '-on': p.id === state.palette }"
          :title="p.name"
          class="ts-pal"
          type="button"
          @click="setTheme({ palette: p.id })"
        >
          <span :style="{ '--sw': p[state.mode].primary }" aria-hidden="true" class="ts-pal__sw"></span>
          <span class="ts-pal__n">{{ p.name }}</span>
        </button>
        <!-- Any colour: the native picker, applied while dragging. The swatch
             shows the colour actually used (made readable by paletteFromColor). -->
        <label v-if="customEnabled" :class="{ '-on': customOn }" :title="labels.custom" class="ts-pal -custom">
          <span :class="{ '-rainbow': !customOn }" :style="customOn ? { '--sw': custom[state.mode].primary } : null" aria-hidden="true" class="ts-pal__sw"></span>
          <span class="ts-pal__n">
            {{ labels.custom }}
            <small v-if="customOn && custom.adjusted[state.mode]" class="ts-pal__note">{{ labels.adjusted }}</small>
          </span>
          <input
            :aria-label="labels.custom"
            :value="pickerValue"
            class="ts-pal__input"
            type="color"
            @change="onPick($event, true)"
            @input="onPick($event, false)"
          />
        </label>
      </div>
      <p class="ts-pop__t">{{ labels.modeTitle }}</p>
      <theme-mode-switch />
    </div>
  </div>
</template>

<script>
import { CUSTOM_ID, customPalette, setTheme, themeState, useThemeSwitcher } from "./theme-switcher";
import ThemeModeSwitch from "./ThemeModeSwitch.vue";

let uid = 0;

export default {
  name: "ThemeSwitcherButton",
  components: { ThemeModeSwitch },

  props: {
    /** The header's own action class(es), so the button looks like Account. */
    buttonClass: { type: [String, Array, Object], default: "" },
    /** Under this width the panel spans the screen with 12px on each side. */
    phoneBelow: { type: Number, default: 600 },
    /** The panel's width on a wider screen. */
    width: { type: Number, default: 352 },
  },

  data() {
    const { palettes, labels, customEnabled } = useThemeSwitcher();
    return { state: themeState, palettes, labels, customEnabled, open: false, pos: {}, popId: `ts-pop-${++uid}` };
  },

  computed: {
    customOn() {
      return this.state.palette === CUSTOM_ID;
    },
    /* Rebuilt when the pick changes (themeState.custom is reactive). */
    custom() {
      void this.state.custom;
      return customPalette();
    },
    /* The picker opens on the last pick, or on the colour in use. */
    pickerValue() {
      return this.state.custom || (this.palettes.find((p) => p.id === this.state.palette) || this.palettes[0])?.light.primary || "#000000";
    },
    current() {
      return this.palettes.find((p) => p.id === this.state.palette) || this.palettes[0];
    },
    modeLabel() {
      return this.state.mode === "dark" ? this.labels.dark : this.labels.light;
    },
  },

  watch: {
    "$route.fullPath"() {
      if (this.open) this.close(false);
    },
  },

  beforeUnmount() {
    this.unbind();
    clearTimeout(this.pickTimer);
  },

  methods: {
    setTheme,
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
    /* Under the button, in the panel's positioned ancestor (the header). */
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
    /* The picker: applied at most every 60ms while dragging, and at once on change. */
    onPick(e, final) {
      const value = e.target.value;
      this.pickNext = value;
      const now = Date.now();
      const apply = () => {
        this.pickAt = Date.now();
        this.pickTimer = null;
        setTheme({ custom: this.pickNext });
      };
      clearTimeout(this.pickTimer);
      if (final || !this.pickAt || now - this.pickAt >= 60) apply();
      else this.pickTimer = setTimeout(apply, 60 - (now - this.pickAt));
    },
    /* Arrow keys move the focus along the palettes (two columns). */
    onArrows(e) {
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 }[e.key];
      if (!step) return;
      const buttons = [...e.currentTarget.querySelectorAll("button, input")];
      const i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
      const s = rtl && Math.abs(step) === 1 ? -step : step;
      const next = buttons[i + s];
      if (next) next.focus();
      e.preventDefault();
    },
  },
};
</script>

<style lang="scss" src="./theme-switcher.scss"></style>
