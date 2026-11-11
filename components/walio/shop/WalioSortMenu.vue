<!--
  Walio — "Sort by: Best selling" over the grid (shop page design B). The
  listing sorts; this only says which order is on and offers the others.
-->
<template>
  <v-menu location="bottom end" offset="6">
    <template v-slot:activator="{ props }">
      <button class="w-sort" type="button" v-bind="props">
        {{ t("walio.sort.by", "Sort by:") }} <b>{{ sortName(modelValue, fallback) }}</b><v-icon size="20">expand_more</v-icon>
      </button>
    </template>
    <div class="t-dd -sort">
      <button
        v-for="s in SORTS"
        :key="s.val"
        :class="{ '-on': s.val === modelValue }"
        class="t-dd__opt"
        type="button"
        @click="$emit('update:modelValue', s.val)"
      >
        {{ s.name }}<v-icon v-if="s.val === modelValue" size="18">check</v-icon>
      </button>
    </div>
  </v-menu>
</template>

<script>
import { SORTS, sortName } from "./walio-filters";

export default {
  name: "WalioSortMenu",
  emits: ["update:modelValue"],
  props: {
    modelValue: { type: String, default: null },
    fallback: { type: String, default: null },
  },
  data: () => ({ SORTS }),
  methods: { sortName },
};
</script>
