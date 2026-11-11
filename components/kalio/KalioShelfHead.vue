<!--
  Kalio — Shelf head.

  The top of every shop page that lists products: an aisle, the whole
  catalogue (or a search, or the deals), a seller. Design A of the three
  drawn on 3 November 2026 (../kalio-design/aisle-options/): the page is
  named in type, not painted. A breadcrumb; a small round picture on the
  stone ground; the title, its line of description and how many products
  it holds; then a row of words to step sideways (aisles, or a seller's
  aisles), the current one underlined.

  It only lays things out. The pages pass in what to show: crumbs, picture,
  title, description, meta line and tabs. A tab is a route (`to`) or an
  anchor on the page (`href` with `click`).
-->
<template>
  <div class="k-shelf-head k-wrap">
    <nav v-if="crumbs.length" :aria-label="t('listing.breadcrumb', 'Breadcrumb')" class="k-shelf-head__crumbs">
      <template v-for="(crumb, i) in crumbs" :key="i">
        <v-icon v-if="i" aria-hidden="true" class="k-flip" size="16">chevron_right</v-icon>
        <router-link v-if="crumb.to" :to="crumb.to">{{ crumb.label }}</router-link>
        <span v-else aria-current="page">{{ crumb.label }}</span>
      </template>
    </nav>

    <header :class="{ '-loading': loading }" class="k-shelf-head__main">
      <div class="k-shelf-head__titlebox">
        <span v-if="image || loading" :class="{ '-cover': cover }" aria-hidden="true" class="k-shelf-head__mark">
          <img v-if="image" :src="image" alt="" height="56" width="56" />
        </span>
        <div class="k-shelf-head__copy">
          <p v-if="eyebrow" class="k-eyebrow">{{ eyebrow }}</p>
          <h1 class="k-shelf-head__title">{{ title || " " }}</h1>
          <p v-if="lede" class="k-shelf-head__lede">{{ lede }}</p>
        </div>
      </div>
      <p v-if="meta" class="k-shelf-head__meta">{{ meta }}</p>
    </header>

    <div v-if="tabs.length" :class="{ '-at-start': at_start, '-at-end': at_end }" class="k-shelf-head__tabs-wrap">
      <nav ref="tabs" :aria-label="tabsLabel || t('aisle.aisles', 'Aisles')" class="k-shelf-head__tabs" @scroll.passive="measure">
        <template v-for="tab in tabs" :key="tab.key">
          <router-link
            v-if="tab.to"
            :aria-current="tab.on ? 'page' : undefined"
            :class="{ '-on': tab.on }"
            :to="tab.to"
            class="k-shelf-head__tab"
          >
            {{ tab.label }}
          </router-link>
          <a v-else :class="{ '-on': tab.on }" :href="tab.href" class="k-shelf-head__tab" @click.prevent="tab.click && tab.click()">
            {{ tab.label }}
          </a>
        </template>
      </nav>
      <button v-if="!at_start" :aria-label="t('rail.scrollBack', 'Scroll back')" class="k-shelf-head__nudge -back" tabindex="-1" type="button" @click="nudge(-1)">
        <v-icon class="k-flip" size="20">chevron_left</v-icon>
      </button>
      <button v-if="!at_end" :aria-label="t('listing.tabs.scrollOn', 'Scroll on')" class="k-shelf-head__nudge -on" tabindex="-1" type="button" @click="nudge(1)">
        <v-icon class="k-flip" size="20">chevron_right</v-icon>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "KalioShelfHead",

  props: {
    /** [{ label, to? }]; the last one is the page itself. */
    crumbs: { type: Array, default: () => [] },
    image: { type: String, default: null },
    /** A seller's mark fills its circle; an aisle's cut-out sits inside it. */
    cover: Boolean,
    eyebrow: { type: String, default: null },
    title: { type: String, default: null },
    lede: { type: String, default: null },
    meta: { type: String, default: null },
    /** [{ key, label, to? , href?, click?, on? }] */
    tabs: { type: Array, default: () => [] },
    /** The row's name for screen readers; "Aisles" in the visitor's language when not given. */
    tabsLabel: { type: String, default: null },
    loading: Boolean,
  },

  data() {
    return {
      at_start: true,
      at_end: true,
    };
  },

  watch: {
    tabs() {
      this.$nextTick(this.reveal);
    },
  },

  mounted() {
    this.$nextTick(this.reveal);
    window.addEventListener("resize", this.measure, { passive: true });
  },

  beforeUnmount() {
    window.removeEventListener("resize", this.measure);
  },

  methods: {
    /* The current tab may sit past the edge (Snacks, Kitchen): it is
       scrolled into view, not left to be found. */
    /* (5 November 2026) Measured against where the row is scrolled now, and
       centred clear of the arrows: the row kept the last aisle's scroll
       (Baby Care opened on "Pantry… Snacks") and a tab put 24 px from the
       edge sat under the back arrow ("eli & Prepared"). */
    reveal() {
      const row = this.$refs.tabs;
      if (!row) return;
      const on = row.querySelector(".-on");
      if (on) {
        const r = row.getBoundingClientRect();
        const o = on.getBoundingClientRect();
        const room = 52; // an arrow's width and a little air
        if (o.left < r.left + room || o.right > r.right - room) row.scrollLeft += o.left - r.left - (r.width - o.width) / 2;
      } else {
        row.scrollLeft = 0;
      }
      this.$nextTick(this.measure);
    },

    measure() {
      const row = this.$refs.tabs;
      if (!row) return;
      const left = Math.abs(row.scrollLeft);
      this.at_start = left < 4;
      this.at_end = left + row.clientWidth >= row.scrollWidth - 4;
    },

    nudge(step) {
      const row = this.$refs.tabs;
      if (!row) return;
      const rtl = getComputedStyle(row).direction === "rtl";
      row.scrollBy({ left: (rtl ? -step : step) * Math.round(row.clientWidth * 0.7), behavior: "smooth" });
    },
  },
};
</script>
