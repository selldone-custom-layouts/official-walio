<!--
  - Copyright (c) 2024. Selldone® Business OS™
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
  Kalio — one package's way to the shopper, in the basket page's When
  sheet (design C, 4 November 2026). How it gets there as cards (the
  shop's shipping methods, then its pickup points), and when: any time,
  or the days and parts of the day that suit the shopper, or a date when
  the method asks for one. Selldone's dropdowns and blue chips are gone;
  the data and every rule below are Selldone's (days and time spans the
  method offers, lead time, the date's earliest day).
-->
<template>
  <section class="k-ship">
    <header class="k-ship__head">
      <products-dense-images-circles
        :ids="
          basket.items
            .filter((i) => itemIds?.includes(i.id))
            .map((i) => getShopImagePath(i.variant?.image ? i.variant.image : i.product.icon, 128))
        "
        border
        inline
        raw-images-path
      ></products-dense-images-circles>
      <span class="k-ship__from">
        <template v-if="warehouse?.title">{{ t("shipping.from", "From {place}", { place: warehouse.title }) }}</template>
      </span>
      <span v-if="cost !== null && cost !== undefined" :class="{ '-free': cost === 0 }" class="k-ship__cost">
        <u-price v-if="cost > 0" :amount="cost"></u-price>
        <template v-else-if="cost === 0">{{ t("shipping.free", "Free") }}</template>
        <template v-else>{{ t("shipping.paidOnDelivery", "Paid on delivery") }}</template>
      </span>
    </header>

    <!-- How it gets there -->
    <template v-if="transportation_exclude_pickup?.length || pickups?.length">
      <p class="k-ship__label">{{ t("shipping.howLabel", "How you get it") }}</p>
      <div class="k-ship__ways">
        <button
          v-for="item in transportation_exclude_pickup"
          :key="item.type"
          :class="{ '-on': transportation?.type === item.type && !selectedPickup }"
          class="k-ship__way"
          type="button"
          @click="pickWay(item)"
        >
          <span aria-hidden="true" class="k-ship__radio"></span>
          <img v-if="item.logo || getShopTransportationObject(item.type)?.icon" :src="item.logo ? getShopImagePath(item.logo) : getShopTransportationObject(item.type).icon" alt="" class="k-ship__ico" height="40" width="40" />
          <span v-else aria-hidden="true" class="k-ship__ico -pickup"><v-icon size="20">local_shipping</v-icon></span>
          <span class="k-ship__name">
            <b>{{ item.title ? item.title : getShopTransportationObject(item.type) ? $t(getShopTransportationObject(item.type).name) : item.type }}</b>
            <!-- The parts joined with " · ", so no line starts with a dot. -->
            <small>{{ [item.message, item.cod && cod_payment_exists ? t("shipping.payOnDelivery", "Pay on delivery") : "", item.sod ? t("shipping.payAtDoor", "Pay at the door") : ""].filter(Boolean).join(" · ") }}</small>
          </span>
          <span v-if="item.free_shipping" class="k-ship__free">
            {{ item.free_shipping_limit ? t("shipping.freeOver", "Free over {amount}", { amount: money(item.free_shipping_limit, item.currency, { short: "auto" }) }) : t("shipping.free", "Free") }}
          </span>
        </button>

        <button
          v-for="(pickup, i) in pickups || []"
          :key="'p' + i"
          :class="{ '-on': selectedPickup?.address && selectedPickup.address === pickup.address }"
          class="k-ship__way"
          type="button"
          @click="$emit('pickupSelected', { pickup, transportation: pickup_transportation })"
        >
          <span aria-hidden="true" class="k-ship__radio"></span>
          <span aria-hidden="true" class="k-ship__ico -pickup"><v-icon size="20">storefront</v-icon></span>
          <span class="k-ship__name">
            <b>{{ t("shipping.pickupAt", "Pickup · {place}", { place: pickup.title || pickup.name || pickup.address }) }}</b>
            <small>{{ MapHelper.GenerateFullAddressFromMapInfo(pickup) }}<template v-if="pickup.phone"> · {{ pickup.phone }}</template></small>
          </span>
          <span class="k-ship__free">{{ t("shipping.free", "Free") }}</span>
        </button>
      </div>
    </template>

    <!-- When -->
    <template v-if="transportation">
      <template v-if="!showCustomDeliveryTimeButton">
        <p class="k-ship__label">{{ t("shipping.when", "When") }}</p>
        <p class="k-ship__hint"><v-icon size="16">place</v-icon>{{ t("shipping.addressFirst", "Add your address first; the times depend on where it goes.") }}</p>
      </template>
      <template v-else>
        <p class="k-ship__label">{{ t("shipping.when", "When") }}</p>
        <div v-if="!need_ask_shipping_date" class="k-ship__modes">
          <button :class="{ '-on': !customDeliveryTimes }" class="k-ship__mode" type="button" @click="customDeliveryTimes = false">
            <b>{{ t("shipping.anyTime", "Any time") }}</b><small>{{ t("shipping.anyTimeHint", "As soon as it is ready") }}</small>
          </button>
          <button :class="{ '-on': customDeliveryTimes }" class="k-ship__mode" type="button" @click="customDeliveryTimes = true">
            <b>{{ t("shipping.chooseTime", "Choose a time") }}</b><small>{{ t("shipping.chooseTimeHint", "Days and hours that suit you") }}</small>
          </button>
        </div>

        <div v-if="customDeliveryTimes" class="k-ship__times">
          <template v-if="[ETA.weekday_timeframe.code, ETA.weekday.code].includes(transportation?.eta)">
            <p class="k-ship__sub">{{ t("shipping.days", "Days that suit you") }}</p>
            <div class="k-ship__days">
              <button
                v-for="day in dayItems"
                :key="day.value"
                :class="{ '-on': deliveryInfo.days?.includes(day.value) }"
                :disabled="day.props?.disabled"
                class="k-ship__day"
                type="button"
                @click="toggle('days', day.value)"
              >
                {{ $t(day.name) }}
              </button>
            </div>
          </template>

          <template v-if="[ETA.weekday_timeframe.code, ETA.timeframe.code].includes(transportation?.eta)">
            <p class="k-ship__sub">{{ t("shipping.parts", "Parts of the day") }}</p>
            <div class="k-ship__spans">
              <button
                v-for="span in timeItems"
                :key="span.value"
                :class="{ '-on': deliveryInfo.time_spans?.includes(span.value) }"
                :disabled="span.props?.disabled"
                class="k-ship__span"
                type="button"
                @click="toggle('time_spans', span.value)"
              >
                <img v-if="span.icon" :src="span.icon" alt="" height="28" width="28" />
                <span>
                  <b>{{ $t(span.name) }}</b>
                </span>
                <v-icon v-if="deliveryInfo.time_spans?.includes(span.value)" class="k-ship__tick" size="18">check_circle</v-icon>
              </button>
            </div>
          </template>

          <template v-if="need_ask_shipping_date">
            <p class="k-ship__sub">{{ t("shipping.date", "Date") }}</p>
            <input
              :min="minDate"
              :type="transportation.eta === ETA.date.code ? 'date' : 'datetime-local'"
              :value="dateValue"
              class="k-ship__date"
              @change="setDate($event.target.value)"
            />
          </template>
        </div>

        <p v-if="max_lead_time > 0 || transportation?.etd" class="k-ship__hint">
          <v-icon size="16">schedule</v-icon>
          {{ t("shipping.readyIn", { one: "Ready in about {n} hour.", other: "Ready in about {n} hours." }, { n: max_lead_time + (transportation?.etd ? transportation.etd : 0) }) }}
        </p>
      </template>
    </template>
  </section>
</template>

<script lang="ts">
import { money } from "../../../components/region-switcher/region";
import { defineComponent } from "vue";
import { t } from "../../../components/kalio/i18n/kalio-i18n";
import ProductsDenseImagesCircles from "@selldone/components-vue/storefront/product/products-dense-images-circles/ProductsDenseImagesCircles.vue";
import { ShopTransportations } from "@selldone/core-js/enums/logistic/ShopTransportations.ts";
import { ETA } from "@selldone/core-js/enums/logistic/ETA.ts";
import { MapHelper, ShopOptionsHelper } from "@selldone/core-js/helper";
import { ProductType } from "@selldone/core-js/enums/product/ProductType.ts";
import { WeekDays } from "@selldone/core-js/enums/logistic/WeekDays.ts";
import { TimeSpans } from "@selldone/core-js/enums/logistic/TimeSpans.ts";
import TemplateMixin from "@selldone/components-vue/mixin/template/TemplateMixin.ts";
import ProductMixin from "@selldone/components-vue/mixin/product/ProductMixin.ts";
import MapMixin from "@selldone/components-vue/mixin/map/MapMixin.ts";

export default defineComponent({
  name: "SCartShippingOptions",
  mixins: [TemplateMixin, ProductMixin, MapMixin],

  components: {
    ProductsDenseImagesCircles,
  },
  inject: ["$shop"],
  emits: ["update:transportation", "set-basket-config", "pickupSelected"],
  props: {
    basket: {
      require: true,
    },

    transportations: {},
    transportation: {},

    deliveryInfo: {},
    /**
     * Included item ids in this shipping option
     */
    itemIds: { type: Array },
    weight: {},
    volume: {},
    distance: {},
    cost: {},
    warehouse: {
      type: Object,
    },

    selectedPickup: {},

    pickupItemBgColor: {},
  },
  data: () => ({
    ETA: ETA,

    show_package_info: false,

    customDeliveryTimes: false,
  }),

  computed: {
    MapHelper() {
      return MapHelper;
    },
    /** The shop's pickup points for this package. */
    pickups() {
      return this.isPhysicalBasket ? this.pickup_transportation?.pickups || [] : [];
    },
    isPhysicalBasket() {
      return this.basket?.type === ProductType.PHYSICAL.code;
    },
    /** The earliest the shopper may ask for (now + the method's dispatch
     *  time + the slowest product's lead time), as the date input wants it. */
    minDate() {
      if (!this.transportation) return null;
      const hours = (this.transportation.etd || 0) + (this.max_lead_time > 0 ? this.max_lead_time : 0);
      return this.inputDate(new Date(Date.now() + hours * 3600e3));
    },
    dateValue() {
      return this.deliveryInfo?.date ? this.inputDate(new Date(this.deliveryInfo.date)) : "";
    },
    cod_payment_exists() {
      return this.$shop.gateways?.some(
        (gateway) => gateway.currency === this.basket.currency && gateway.cod,
      );
    },
    warehouse_address() {
      return MapHelper.GenerateFullAddressFromMapInfo(this.warehouse);
    },
    // transport_types -> transportations
    //delivery_info->deliveryInfo

    no_map() {
      return !ShopOptionsHelper.HasMap(this.$shop);
    },

    size_unit() {
      return ShopOptionsHelper.GetSizeUnit(this.$shop);
    },

    mass_unit() {
      return ShopOptionsHelper.GetMassUnit(this.$shop);
    },
    distance_unit() {
      return ShopOptionsHelper.GetDistanceUnit(this.$shop);
    },

    isService() {
      return this.type === ProductType.SERVICE.code;
    },

    max_lead_time() {
      if (!this.basket) return 0;
      let max_lead = 0;
      this.basket.items.forEach((item) => {
        let lead = this.leadProduct(
          item.product,
          item.variant,
          item.vendor_product,
        );
        if (lead) max_lead = Math.max(max_lead, lead);
      });

      return max_lead;
    },

    light_checkout() {
      return this.$shop.theme && this.$shop.theme.light_checkout;
    },

    receiver_info() {
      return this.basket?.receiver_info || null;
    },

    has_delivery() {
      return ShopOptionsHelper.AskShippingAddress(this.$shop, this.basket.type);
      /*
      if (this.isPhysical || this.isService) {
        return true;
      }
      return false;*/
    },

    showCustomDeliveryTimeButton() {
      return (
        this.has_delivery &&
        this.receiver_info &&
        this.receiver_info.address &&
        this.is_valid_location
      );
    },

    is_valid_location() {
      if (this.no_map) return !!this.receiver_info.address; // Only enter address!
      return (
        this.receiver_info.location &&
        !!this.receiver_info.location.lat &&
        !!this.receiver_info.location.lng
      );
    },

    // ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅ Pickup ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅

    pickup_transportation() {
      return (
        this.transportations &&
        this.transportations.find(
          (t) => t.type === ShopTransportations.Pickup.code,
        )
      );
    },
    transportation_exclude_pickup() {
      return (
        this.transportations &&
        this.transportations.filter(
          (t) => t.type !== ShopTransportations.Pickup.code,
        )
      );
    },

    need_ask_shipping_date() {
      return (
        this.transportation &&
        [ETA.date.code, ETA.date_time.code].includes(this.transportation.eta)
      );
    },

    /**
     * Generates a list of day items based on the transportation days.
     * Each day item corresponds to a day in the WeekDays object.
     *
     * @returns {Array} - An array of day items.
     */
    dayItems() {
      const out = [];

      // If transportation is not defined, return an empty array
      if (!this.transportation) return out;

      // Iterate over each item in transportation.days
      this.transportation.days.forEach((item) => {
        // Check if the day exists in WeekDays
        if (WeekDays[item]) {
          out.push(Object.assign({}, WeekDays[item]));
        } else {
          out.push({
            value: item,
            name: t("shipping.invalid", "Invalid {value}", { value: String(item) }),
            icon: null,
            props: { disabled: true },
          });
        }
      });

      return out;
    },

    /**
     * Generates a list of time items with their properties.
     * Time items are marked as disabled if they are not included in the transportation time spans.
     * Additionally, invalid time spans (not in TimeSpans) are marked as disabled.
     *
     * @returns {{name,value,icon,props}[]} - An array of time items with properties.
     */
    timeItems() {
      let out = [];

      // If transportation is not defined, return an empty array
      if (!this.transportation) return out;

      // Iterate over each item in transportation.time_spans
      this.transportation.time_spans.forEach((item) => {
        // Check if the time_span exists in TimeSpans
        if (TimeSpans[item]) {
          out.push(Object.assign({}, TimeSpans[item]));
        } else {
          out.push({
            value: item,
            name: t("shipping.invalid", "Invalid {value}", { value: String(item) }),
            icon: null,
            props: { disabled: true },
          });
        }
      });

      return out;
    },
  },

  watch: {
    timeItems(timeItems) {
      // FIX MISS MATCH ISSUES:  Filter time_spans based on the values in the out array
      this.deliveryInfo.time_spans = this.deliveryInfo.time_spans?.filter(
        (timeSpan) => timeItems.some((it) => it.value === timeSpan),
      );
    },
    dayItems(dayItems) {
      // FIX MISS MATCH ISSUES:  Filter days based on the values in the out array
      this.deliveryInfo.days = this.deliveryInfo.days?.filter((day) =>
        dayItems.some((it) => it.value === day),
      );
    },

    transportation(transportation) {
      if (!this.has_delivery) return;

      this.deliveryInfo.type = transportation ? transportation.type : null;
    },

    transportations() {
      this.autoSelectTransportationType();
    },

    customDeliveryTimes(custom) {
      // this.deliveryInfo.days = [];
      //  this.deliveryInfo.time_spans = [];

      if (custom && this.transportation) {
        // Set all times for default custom delivery time!
        this.deliveryInfo.days = this.transportation.days.slice(0);
        this.deliveryInfo.time_spans = this.transportation.time_spans.slice(0);
      }

      this.deliveryInfo.custom = custom;

      if (this.deliveryInfo.custom !== this.deliveryInfo?.custom) {
        //console.log("🧨 watch ===> customDeliveryTimes : setBasketConfig (customDeliveryTimes)");
        this.setBasketConfig();
      }
    },

    //------------- Force Show Date & Time inputs -----------
    need_ask_shipping_date(value) {
      if (value) {
        // We should ask user to select a date!
        this.customDeliveryTimes = true;
      }
    },
  },
  mounted() {
    this.customDeliveryTimes =
      this.need_ask_shipping_date || this.deliveryInfo.custom;
    this.autoSelectTransportationType();
  },

  methods: {
    money,
    getShopTransportationObject(type) {
      return ShopTransportations[type];
    },

    autoSelectTransportationType() {
      if (!this.has_delivery || this.isService || !this.deliveryInfo) return; // Service has address (destination) but not need transportation type and delivery!
      /*  console.log(
        "%cautoSelectTransportationType: START",
        "background: #0097A7; color: #fff"
      );*/

      // Return if delivery type selected and valid (exist in acceptable transportations)
      console.log(
        "autoSelectTransportationType | autoSelectTransportationType > type: ",
        this.deliveryInfo.type,
      );
      if (this.deliveryInfo.type) {
        const found = this.transportations?.find(
          (it) => it.type === this.deliveryInfo.type,
        );
        if (found) {
          this.$emit("update:transportation", found);
          /* console.log(
            "autoSelectTransportationType",
            "Found transportation : ",
            found
          );*/
          return;
        }
      }

      if (!this.transportations?.length) {
        //console.log("autoSelectTransportationType", "transportations is null!");

        this.$emit("update:transportation", null);
        return null;
      }

      // Do not auto select pickup!
      const eligible_transportations = this.transportations?.filter(
        (x) => x.type !== "Pickup",
      );

      if (eligible_transportations.length) {
        this.$emit("update:transportation", eligible_transportations[0]);

        console.log(
          "%cautoSelectTransportationType: SELECT :::" +
            this.transportation?.type,
          "background: #0097A7; color: #fff",
        );
      }
    },

    setBasketConfig() {
      this.$emit("set-basket-config");
    },

    // ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅ Kalio ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅
    pickWay(item) {
      this.$emit("update:transportation", item);
      this.$nextTick(() => this.setBasketConfig());
    },
    /* A day or a part of the day on or off; one always stays on. */
    toggle(field, value) {
      const list = [...(this.deliveryInfo[field] || [])];
      const at = list.indexOf(value);
      if (at >= 0) {
        if (list.length === 1) return;
        list.splice(at, 1);
      } else list.push(value);
      this.deliveryInfo[field] = list;
      this.setBasketConfig();
    },
    setDate(value) {
      this.deliveryInfo.date = value ? new Date(value).toISOString() : null;
      this.setBasketConfig();
    },
    /* yyyy-mm-dd (a date) or yyyy-mm-ddThh:mm (a date and time), local. */
    inputDate(date) {
      const pad = (n) => String(n).padStart(2, "0");
      const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      return this.transportation?.eta === ETA.date.code ? day : `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    },
  },
});
</script>

<style scoped lang="scss"></style>
