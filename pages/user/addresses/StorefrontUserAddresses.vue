<!--
  - Copyright (c) 2023. Selldone® Business OS™
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

<!--
  Kalio — the account's address book (5 November 2026).

  Each saved address is a card: a small map of the spot, the flag and the
  name, the address, who receives it and the note for the seller, with Edit
  and Delete (Delete asks once, in the card). "New address" and Edit open
  Kalio's address sheet (KalioAddressSheet, `titled`), the one the basket
  uses: the name of the address first, then the map with its pin and every
  field, saved in one step.

  Selldone's page asked for a name in a dialog of its own, then opened its
  full-screen map with the address book's chips across the top; deleting
  was only possible from those chips.
-->
<template xmlns:v-slot="http://www.w3.org/1999/XSL/Transform">
  <div class="py-10">
    <div class="widget-box -large mb-5">
      <u-widget-header
        :add-caption="$t('addresses_page.new_action')"
        :title="$t('addresses_page.title')"
        add-icon="add_location"
        icon="fmd_good"
        @click:add="showAdd"
      ></u-widget-header>

      <v-list-subheader>{{ $t("addresses_page.subtitle") }}</v-list-subheader>

      <u-loading-progress v-if="busy"></u-loading-progress>

      <ul v-if="addresses.length" class="k-book">
        <li v-for="address in addresses" :key="address.id" class="k-book__card">
          <span class="k-book__map">
            <img v-if="address.location?.lat" :src="mapOf(address)" alt="" loading="lazy" />
            <v-icon v-else size="26">map</v-icon>
          </span>

          <span class="k-book__words">
            <b>
              <flag v-if="address.country" :iso="address.country" :squared="false" class="k-book__flag" />
              {{ address.title || t("account.address.untitled", "Address") }}
            </b>
            <span class="k-book__line">{{ getFullAddress(address) }}</span>
            <small v-if="address.name || address.phone">
              <v-icon size="15">person_outline</v-icon>{{ [address.name, address.phone].filter(Boolean).join(" · ") }}
            </small>
            <small v-if="address.message"><v-icon size="15">chat_bubble_outline</v-icon>{{ address.message }}</small>
          </span>

          <span :class="{ '-asking': confirming === address.id }" class="k-book__acts">
            <template v-if="confirming === address.id">
              <span class="k-book__ask">{{ t("account.address.deleteAsk", "Delete this address?") }}</span>
              <button :disabled="busy_delete" class="k-book__btn -danger" type="button" @click="remove(address)">
                <v-progress-circular v-if="busy_delete" indeterminate size="14" width="2" />{{ t("account.address.delete", "Delete") }}
              </button>
              <button class="k-book__btn" type="button" @click="confirming = null">{{ t("account.address.keep", "Keep") }}</button>
            </template>
            <template v-else>
              <button class="k-book__btn" type="button" @click="showEdit(address)">
                <v-icon size="17">edit</v-icon>{{ t("common.edit", "Edit") }}
              </button>
              <button
                :aria-label="address.title ? t('account.address.deleteNamed', 'Delete {name}', { name: address.title }) : t('account.address.deleteThis', 'Delete this address')"
                class="k-book__btn -icon"
                type="button"
                @click="confirming = address.id"
              >
                <v-icon size="18">delete_outline</v-icon>
              </button>
            </template>
          </span>
        </li>
      </ul>

      <div v-else-if="!busy && loaded" class="k-board__empty k-book__empty">
        <v-icon size="28">add_location_alt</v-icon>
        <p>{{ t("account.address.empty", "No saved addresses yet. Save one here and pick it at checkout in a tap.") }}</p>
        <button class="k-btn k-btn--solid" type="button" @click="showAdd">
          <v-icon size="20">add_location</v-icon>{{ t("account.addAddress", "Add an address") }}
        </button>
      </div>
    </div>

    <kalio-address-sheet
      v-model="sheet"
      :busy="busy_save"
      :center="center"
      :countries="$shop?.countries?.length ? $shop.countries : null"
      :heading="editing ? t('account.address.editTitle', 'Edit address') : t('account.address.newTitle', 'New address')"
      :lede="editing ? t('account.address.editLede', 'Move the pin or change the details, then save.') : t('account.address.newLede', 'Name it, place the pin, and check the details.')"
      :no-map="noMap"
      :phone-required="false"
      :receiver-info="editing"
      :saved-list="false"
      :title="editing?.title || ''"
      titled
      @save="onSave"
    />
  </div>
</template>

<script lang="ts">
import NotificationService from "@selldone/components-vue/plugins/notification/NotificationService.ts";

import UWidgetHeader from "@selldone/components-vue/ui/widget/header/UWidgetHeader.vue";
import { MapHelper } from "@selldone/core-js/helper";
import { ShopOptionsHelper } from "@selldone/core-js/helper/shop/ShopOptionsHelper";
import KalioAddressSheet from "@app-storefront/components/kalio/checkout/KalioAddressSheet.vue";
import { t } from "../../../components/kalio/i18n/kalio-i18n";

/* The fields an address keeps (Selldone's address book). */
const FIELDS = ["country", "state", "state_code", "city", "address", "location", "no", "unit", "name", "phone", "message", "postal"];

export default {
  name: "StorefrontUserAddresses",
  components: { UWidgetHeader, KalioAddressSheet },
  inject: ["$shop"],

  data() {
    return {
      addresses: [],
      busy: false,
      loaded: false,

      sheet: false,
      editing: null,
      busy_save: false,

      confirming: null,
      busy_delete: false,
    };
  },

  computed: {
    noMap() {
      return !ShopOptionsHelper.HasMap(this.$shop);
    },
    /* Edit starts at the address; a new one at the last address saved. */
    center() {
      const at = (this.editing || this.addresses[0])?.location;
      return at?.lat ? { lat: at.lat, lng: at.lng } : null;
    },
  },

  created() {
    this.setPageTitle(t("account.pageTitle.addresses", "My address book")); // Set Page Title!
    this.fetchAddressBook();
  },

  methods: {
    getFullAddress(address) {
      return MapHelper.GenerateFullAddressFromMapInfo(address);
    },

    /* The spot on a small map, with Kalio's green pin (Mapbox's static
       image, the token Selldone's page used). */
    mapOf(address) {
      const { lng, lat } = address.location;
      return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+0e3f2e(${lng},${lat})/${lng},${lat},14,0,0/160x160@2x?access_token=pk.eyJ1IjoicGFqdWhhYW4iLCJhIjoiY2sxaHNtbnU3MDFjcjNta2V0OTZ0d2ExYiJ9.YKRh0EP7NnhbmuSil7AvSw`;
    },

    fetchAddressBook() {
      this.busy = true;
      window.axios
        .get(window.ADDRESS_API.GET_MY_ADDRESSES())
        .then(({ data }) => {
          if (data.error) return NotificationService.showErrorAlert(null, data.error_msg);
          this.addresses = data.addresses || [];
        })
        .catch((error) => NotificationService.showLaravelError(error))
        .finally(() => {
          this.busy = false;
          this.loaded = true;
        });
    },

    showAdd() {
      this.editing = null;
      this.confirming = null;
      this.sheet = true;
    },

    showEdit(address) {
      this.editing = address;
      this.confirming = null;
      this.sheet = true;
    },

    onSave(pack) {
      const body = { title: pack.title };
      for (const key of FIELDS) body[key] = pack[key] ?? null;
      const editing = this.editing;
      this.busy_save = true;
      (editing
        ? window.axios.put(window.ADDRESS_API.PUT_ADDRESS(editing.id), body)
        : window.axios.post(window.ADDRESS_API.POST_ADDRESS(), body)
      )
        .then(({ data }) => {
          if (data.error) return NotificationService.showErrorAlert(null, data.error_msg);
          NotificationService.showSuccessAlert(
            null,
            editing
              ? this.$t("global.map_view.notifications.edit_success", { title: data.address?.title || body.title })
              : this.$t("global.map_view.notifications.save_in_list"),
          );
          this.sheet = false;
          this.fetchAddressBook();
        })
        .catch((error) => NotificationService.showLaravelError(error))
        .finally(() => (this.busy_save = false));
    },

    remove(address) {
      this.busy_delete = true;
      window.axios
        .delete(window.ADDRESS_API.DELETE_MY_ADDRESSES(address.id))
        .then(({ data }) => {
          if (data.error) return NotificationService.showErrorAlert(null, data.error_msg);
          this.addresses = this.addresses.filter((it) => it.id !== address.id);
          this.confirming = null;
        })
        .catch((error) => NotificationService.showLaravelError(error))
        .finally(() => (this.busy_delete = false));
    },
  },
};
</script>
