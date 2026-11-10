<!--
  Theme switcher: the footer's "Theme" row, THE DEFAULT placement since
  10 November 2026 (the owner, after talking with the Selldone team: the
  header button takes room and is not good for every shop; put it in the
  footer). ThemeSwitcherButton (header) is kept only as an option. A colour swatch per palette
  (a 32px button; the colour is a disc drawn inside it, the chosen one gets
  a ring drawn inside the button too, never outside), the chosen palette's
  name, and a Light / Dark switch. Buttons with aria-pressed, a name on each
  (aria-label and tooltip), arrow keys move along the swatches.
  Layout-agnostic: its words and colours come from the config passed to
  bootThemeSwitcher(); see theme-switcher.ts.
-->
<template>
  <div v-if="state.enabled" :aria-label="labels.theme" class="ts-row" role="group">
    <span aria-hidden="true" class="ts-row__label">{{ labels.theme }}</span>

    <div :aria-label="labels.palettes" class="ts-row__palettes" role="group" @keydown="onArrows">
      <button
        v-for="p in palettes"
        :key="p.id"
        :aria-label="p.name"
        :aria-pressed="p.id === state.palette ? 'true' : 'false'"
        :class="{ '-on': p.id === state.palette }"
        :style="{ '--sw': p[state.mode].primary }"
        :title="p.name"
        class="ts-swatch"
        type="button"
        @click="setTheme({ palette: p.id })"
      ></button>
      <!-- Any colour: the native picker over the swatch, applied while
           dragging. A colour wheel until picked, then the colour in use. -->
      <label
        v-if="customEnabled"
        :class="{ '-on': customOn, '-rainbow': !customOn }"
        :style="customOn ? { '--sw': custom[state.mode].primary } : null"
        :title="labels.custom"
        class="ts-swatch -custom"
      >
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
    <span aria-live="polite" class="ts-row__name">
      {{ currentName }}
      <small v-if="customOn && custom.adjusted[state.mode]" class="ts-pal__note">{{ labels.adjusted }}</small>
    </span>

    <theme-mode-switch />
  </div>
</template>

<script>
import { CUSTOM_ID, customPalette, setTheme, themeState, useThemeSwitcher } from "./theme-switcher";
import ThemeModeSwitch from "./ThemeModeSwitch.vue";

export default {
  name: "ThemeSwitcherRow",
  components: { ThemeModeSwitch },

  data() {
    const { palettes, labels, customEnabled } = useThemeSwitcher();
    return { state: themeState, palettes, labels, customEnabled };
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
    pickerValue() {
      return this.state.custom || (this.palettes.find((p) => p.id === this.state.palette) || this.palettes[0])?.light.primary || "#000000";
    },
    currentName() {
      if (this.customOn) return this.labels.custom;
      return (this.palettes.find((p) => p.id === this.state.palette) || this.palettes[0])?.name || "";
    },
  },

  beforeUnmount() {
    clearTimeout(this.pickTimer);
  },

  methods: {
    setTheme,
    /* The picker: applied at most every 60ms while dragging, and at once on change. */
    onPick(e, final) {
      this.pickNext = e.target.value;
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
    /* Left / Right (and Home / End) move the focus along the swatches. */
    onArrows(e) {
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(e.key)) return;
      const buttons = [...e.currentTarget.querySelectorAll("button, input")];
      const i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
      const step = (e.key === "ArrowRight") !== rtl ? 1 : -1;
      const next = e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : (i + step + buttons.length) % buttons.length;
      buttons[next].focus();
      e.preventDefault();
    },
  },
};
</script>

<style lang="scss" src="./theme-switcher.scss"></style>
