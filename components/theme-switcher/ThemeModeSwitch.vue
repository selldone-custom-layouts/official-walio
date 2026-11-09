<!--
  Theme switcher: the Light / Dark switch (two buttons with aria-pressed),
  used by the header panel (ThemeSwitcherButton) and the footer row
  (ThemeSwitcherRow).
-->
<template>
  <div :aria-label="labels.mode" class="ts-mode" role="group">
    <button
      :aria-pressed="state.mode === 'light' ? 'true' : 'false'"
      :class="{ '-on': state.mode === 'light' }"
      class="ts-mode__btn"
      type="button"
      @click="setTheme({ mode: 'light' })"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4.2" />
        <path
          d="M12 1.8v2.6M12 19.6v2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M1.8 12h2.6M19.6 12h2.6M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="2"
        />
      </svg>
      {{ labels.light }}
    </button>
    <button
      :aria-pressed="state.mode === 'dark' ? 'true' : 'false'"
      :class="{ '-on': state.mode === 'dark' }"
      class="ts-mode__btn"
      type="button"
      @click="setTheme({ mode: 'dark' })"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M20.6 14.6A8.6 8.6 0 0 1 9.4 3.4a8.6 8.6 0 1 0 11.2 11.2z" />
      </svg>
      {{ labels.dark }}
    </button>
  </div>
</template>

<script>
import { setTheme, themeState, useThemeSwitcher } from "./theme-switcher";

export default {
  name: "ThemeModeSwitch",

  data() {
    return { state: themeState, labels: useThemeSwitcher().labels };
  },

  methods: { setTheme },
};
</script>
