<!--
  Kalio — "Where should it go?" (the basket page's address).

  A quiet map in the shop's colours with a pin that stays in the middle:
  the shopper moves the map, the address under the pin fills the form.
  A search box finds a street, "Use my location" asks the browser, and a
  signed-in shopper's saved addresses sit above the form. Beside the map
  every field Selldone keeps for an address: street, building, unit, name,
  phone, city, county, postcode, country and a note for the seller. On a
  phone the map sits on top and the form below it.

  It replaces Selldone's full-screen map (UMapView) on the basket page and
  uses the same pieces: the Mapbox wrapper, the address lookups
  (ADDRESS_API.GET_GEO_TO_ADDRESS, GET_AUTOCOMPLETE, GET_MY_ADDRESSES) and
  the same receiver_info fields, which the page saves as before
  (onClickSetLocation). When the shop has no map, the form stands alone.
  Design: ../kalio-design/basket-flow-options/ (4 November 2026).

  The account's address book opens it too (`titled`, 5 November 2026): the
  form then starts with "Name this address" (Home, Work, Other or the
  shopper's own word), the saved list is not offered, the phone may stay
  empty, and Save waits for the page (`busy`). Selldone's two steps — a
  "New Address Name" dialog, then its full-screen map — are gone there too.
-->
<template>
  <v-dialog
    :fullscreen="phone"
    :model-value="modelValue"
    :transition="phone ? 'dialog-bottom-transition' : 'dialog-transition'"
    content-class="k-sheet-host"
    max-width="980"
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="k-sheet k-addr">
      <div class="k-sheet__head">
        <div>
          <h2>{{ heading || t("address.title.go", "Where should it go?") }}</h2>
          <p>{{ lede || t("address.lede.default", "Your address, for the receipt and the seller.") }}</p>
        </div>
        <button :aria-label="t('common.close', 'Close')" class="k-sheet__x" type="button" @click="$emit('update:modelValue', false)">
          <v-icon>close</v-icon>
        </button>
      </div>

      <div
        ref="grid"
        :class="{ '-nomap': noMap, '-step-map': steps && step === 'map', '-step-details': steps && step === 'details' }"
        class="k-addr__grid"
      >
        <!-- The map, with the pin in the middle -->
        <div v-if="!noMap" class="k-addr__map">
          <div ref="canvas" class="k-addr__canvas"></div>
          <div class="k-addr__search">
            <v-icon size="20">search</v-icon>
            <input
              :value="query"
              :aria-label="t('address.searchStreet', 'Search a street and number')"
              autocomplete="off"
              enterkeyhint="search"
              :placeholder="t('address.searchStreet', 'Search a street and number')"
              type="search"
              @input="onQuery"
              @keydown.enter.prevent="pickFirst"
            />
            <v-progress-circular v-if="busy_search" indeterminate size="16" width="2" />
          </div>
          <p v-if="no_match" class="k-addr__results -none" role="status">
            {{ t("address.noMatch.map", "No street found for “{query}”. Try the street and number, or move the map to the spot.", { query: no_match }) }}
          </p>
          <ul v-if="results.length" class="k-addr__results" role="listbox">
            <li v-for="(item, i) in results" :key="i">
              <button type="button" @click="pickResult(item)">
                <v-icon size="18">place</v-icon>
                <span><b>{{ item.title || item.address }}</b><small>{{ resultLine(item) }}</small></span>
              </button>
            </li>
          </ul>
          <span aria-hidden="true" class="k-addr__shadow"></span>
          <div class="k-addr__pin">
            <span v-if="bubble" class="k-addr__bubble">{{ bubble }}</span>
            <svg
              :aria-label="t('address.pinHere', 'Use the address under the pin')"
              height="56"
              role="button"
              tabindex="0"
              viewBox="0 0 44 56"
              width="44"
              @click="pinHere"
              @keydown.enter="pinHere"
            >
              <path d="M22 55S3 34 3 21a19 19 0 0 1 38 0c0 13-19 34-19 34z" fill="#0e3f2e" />
              <circle cx="22" cy="21" fill="#fff" r="8" />
              <circle cx="22" cy="21" fill="#ffc220" r="3.6" />
            </svg>
          </div>
          <button :disabled="busy_locate" class="k-addr__locate" type="button" @click="locate">
            <v-progress-circular v-if="busy_locate" indeterminate size="16" width="2" />
            <v-icon v-else size="18">my_location</v-icon>
            {{ t("address.useMyLocation", "Use my location") }}
          </button>
          <span class="k-addr__zoom">
            <button :aria-label="t('address.zoomIn', 'Zoom in')" type="button" @click="map && map.zoomIn()"><v-icon size="20">add</v-icon></button>
            <button :aria-label="t('address.zoomOut', 'Zoom out')" type="button" @click="map && map.zoomOut()"><v-icon size="20">remove</v-icon></button>
          </span>
        </div>

        <!-- Phone, first step: the address under the pin, under the map.
             The details come next, on their own screen: below the map they
             sat under the Save button, out of sight (the owner, 6 November
             2026). -->
        <div v-if="steps && step === 'map'" class="k-addr__peek">
          <div v-if="book.length" class="k-addr__book">
            <span class="k-addr__label">{{ t("address.saved", "Saved") }}</span>
            <button
              v-for="saved in book"
              :key="saved.id"
              :class="{ '-on': saved.address === form.address }"
              class="k-addr__saved"
              type="button"
              @click="useSaved(saved)"
            >
              <v-icon size="16">bookmark_border</v-icon>{{ saved.title || saved.address }}
            </button>
          </div>
          <div :class="{ '-empty': !form.address }" class="k-addr__found">
            <span class="k-addr__found-ico">
              <v-progress-circular v-if="busy_geo" indeterminate size="18" width="2" />
              <v-icon v-else size="20">place</v-icon>
            </span>
            <span>
              <b>{{ form.address || t("address.noAddressYet", "No address yet") }}</b>
              <small>{{ form.address ? t("address.found.next", "Where the pin is. Next, the details.") : t("address.found.moveMap", "Move the map so the pin is on the door, or search above.") }}</small>
            </span>
          </div>
        </div>

        <!-- The form -->
        <div class="k-addr__form">
          <div v-if="noMap" class="k-addr__search -inline">
            <v-icon size="20">search</v-icon>
            <input
              :value="query"
              :aria-label="t('address.searchAddress', 'Search your address')"
              autocomplete="off"
              enterkeyhint="search"
              :placeholder="t('address.searchAddress', 'Search your address')"
              type="search"
              @input="onQuery"
              @keydown.enter.prevent="pickFirst"
            />
          </div>
          <p v-if="noMap && no_match" class="k-addr__results -inline -none" role="status">
            {{ t("address.noMatch.form", "No street found for “{query}”. Try the street and number.", { query: no_match }) }}
          </p>
          <ul v-if="noMap && results.length" class="k-addr__results -inline" role="listbox">
            <li v-for="(item, i) in results" :key="i">
              <button type="button" @click="pickResult(item)">
                <v-icon size="18">place</v-icon>
                <span><b>{{ item.title || item.address }}</b><small>{{ resultLine(item) }}</small></span>
              </button>
            </li>
          </ul>

          <div v-if="titled" class="k-addr__named">
            <label :class="{ '-error': tried && !form.title }" class="k-addr__field -wide">
              <span>{{ t("address.nameThis", "Name this address") }} <em>*</em></span>
              <input v-model.trim="form.title" maxlength="64" :placeholder="namePlaceholder" type="text" />
            </label>
            <div class="k-addr__book -names">
              <button
                v-for="word in names"
                :key="word.text"
                :class="{ '-on': form.title === word.text }"
                class="k-addr__saved"
                type="button"
                @click="form.title = word.text"
              >
                <v-icon size="16">{{ word.icon }}</v-icon>{{ word.text }}
              </button>
            </div>
          </div>

          <div v-if="book.length && !steps" class="k-addr__book">
            <span class="k-addr__label">{{ t("address.saved", "Saved") }}</span>
            <button
              v-for="saved in book"
              :key="saved.id"
              :class="{ '-on': saved.address === form.address }"
              class="k-addr__saved"
              type="button"
              @click="useSaved(saved)"
            >
              <v-icon size="16">bookmark_border</v-icon>{{ saved.title || saved.address }}
            </button>
          </div>

          <div v-if="!noMap" :class="{ '-empty': !form.address }" class="k-addr__found">
            <span class="k-addr__found-ico">
              <v-progress-circular v-if="busy_geo" indeterminate size="18" width="2" />
              <v-icon v-else size="20">place</v-icon>
            </span>
            <span>
              <b>{{ form.address || t("address.noAddressYet", "No address yet") }}</b>
              <small v-if="steps">{{ form.address ? t("address.found.rest", "Where the pin is. Fill in the rest below.") : t("address.found.pinFirst", "Place the pin on the map first.") }}</small>
              <small v-else>{{ form.address ? t("address.found.edit", "Where the pin is. You can edit the details below.") : t("address.found.tapMap", "Tap the map where it should go, or search above.") }}</small>
            </span>
            <button v-if="steps" class="k-addr__found-edit" type="button" @click="toMap">{{ t("address.change", "Change") }}</button>
          </div>

          <label :class="{ '-error': tried && !form.address }" class="k-addr__field -wide">
            <span>{{ t("address.field.street", "Street address") }} <em>*</em></span>
            <input v-model.trim="form.address" autocomplete="street-address" :placeholder="t('address.field.streetHint', 'Street and number')" type="text" />
          </label>
          <div class="k-addr__two">
            <label class="k-addr__field">
              <span>{{ t("address.field.building", "Building") }}</span>
              <input v-model.trim="form.no" :placeholder="t('address.field.buildingHint', 'No.')" type="text" />
            </label>
            <label class="k-addr__field">
              <span>{{ t("address.field.unit", "Unit") }}</span>
              <input v-model.trim="form.unit" :placeholder="t('address.field.unitHint', 'Apt, floor')" type="text" />
            </label>
          </div>
          <div class="k-addr__two">
            <label class="k-addr__field">
              <span>{{ t("address.field.name", "Full name") }}</span>
              <input v-model.trim="form.name" autocomplete="name" :placeholder="t('address.field.nameHint', 'Who receives it')" type="text" />
            </label>
            <label :class="{ '-error': tried && phoneRequired && !form.phone }" class="k-addr__field">
              <span>{{ t("address.field.phone", "Phone") }} <em v-if="phoneRequired">*</em></span>
              <input v-model.trim="form.phone" autocomplete="tel" inputmode="tel" :placeholder="t('address.field.phoneHint', 'For the courier')" type="tel" />
            </label>
          </div>
          <div class="k-addr__two">
            <label class="k-addr__field">
              <span>{{ t("address.field.city", "City") }}</span>
              <input v-model.trim="form.city" autocomplete="address-level2" :placeholder="t('address.field.city', 'City')" type="text" />
            </label>
            <label class="k-addr__field">
              <span>{{ t("address.field.state", "County or state") }}</span>
              <input v-model.trim="form.state" autocomplete="address-level1" :placeholder="t('address.field.stateHint', 'County')" type="text" />
            </label>
          </div>
          <div class="k-addr__two">
            <label class="k-addr__field">
              <span>{{ t("address.field.postcode", "Postcode") }}</span>
              <input v-model.trim="form.postal" autocomplete="postal-code" :placeholder="t('address.field.postcode', 'Postcode')" type="text" />
            </label>
            <label class="k-addr__field">
              <span>{{ t("address.field.country", "Country") }}</span>
              <select v-model="form.country" autocomplete="country">
                <option v-for="country in countryList" :key="country.code" :value="country.code">{{ country.name }}</option>
              </select>
            </label>
          </div>
          <label class="k-addr__field -wide">
            <span>{{ t("address.field.note", "Note for the seller") }}</span>
            <textarea v-model="form.message" :placeholder="t('address.field.noteHint', 'Gate code, landmark… (optional)')" rows="2"></textarea>
          </label>
        </div>
      </div>

      <div class="k-sheet__foot">
        <template v-if="steps && step === 'map'">
          <p v-if="pin_needed" class="k-addr__missing"><v-icon size="16">error_outline</v-icon>{{ pin_needed }}</p>
          <button class="k-sheet__ghost" type="button" @click="$emit('update:modelValue', false)">{{ t("common.cancel", "Cancel") }}</button>
          <button class="k-sheet__go" type="button" @click="next">
            {{ t("address.continue", "Continue") }}<v-icon size="20">arrow_forward</v-icon>
          </button>
        </template>
        <template v-else>
          <p v-if="tried && missing" class="k-addr__missing"><v-icon size="16">error_outline</v-icon>{{ missing }}</p>
          <button v-if="steps" class="k-sheet__ghost" type="button" @click="toMap">{{ t("common.back", "Back") }}</button>
          <button v-else class="k-sheet__ghost" type="button" @click="$emit('update:modelValue', false)">{{ t("common.cancel", "Cancel") }}</button>
          <button :disabled="busy" class="k-sheet__go" type="button" @click="save">
            <v-progress-circular v-if="busy" indeterminate size="18" width="2" />{{ saveText || t("address.save", "Save address") }}
          </button>
        </template>
      </div>
    </div>
  </v-dialog>
</template>

<script>
import Mapbox from "@selldone/components-vue/ui/map/providers/mapbox/MapBox";
import { Countries } from "@selldone/core-js/models/general/country/country.model";
import { t } from "../i18n/kalio-i18n";

/* Streets in colour: a shopper finds their door by the parks, the water
   and the road colours (the light style read as a grey, broken map). */
const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
/* Below this zoom the pin covers a whole district, not a door. */
const ZOOM_ADDRESS = 13;
const ZOOM_STREET = 16;

/* Quick names for an address in the address book (in the visitor's
   language, read at render time). */
function NAMES() {
  return [
    { text: t("address.name.home", "Home"), icon: "home" },
    { text: t("address.name.work", "Work"), icon: "work_outline" },
    { text: t("address.name.other", "Other"), icon: "place" },
  ];
}

function blank() {
  return { title: "", address: "", no: "", unit: "", name: "", phone: "", city: "", state: "", postal: "", country: null, message: "" };
}

export default {
  name: "KalioAddressSheet",

  props: {
    modelValue: Boolean,
    /** The basket's receiver_info. */
    receiverInfo: { type: Object, default: null },
    /** Where to start when the basket has no location yet. */
    center: { type: Object, default: null },
    noMap: Boolean,
    /** The shop's countries; all when empty. */
    countries: { type: Array, default: null },
    /* Empty: the sheet's own words, in the visitor's language. */
    heading: { type: String, default: "" },
    lede: { type: String, default: "" },
    /** The address book: the address has a name, asked first. */
    titled: Boolean,
    /** The address's name, when it has one. */
    title: { type: String, default: "" },
    /** The page is saving: Save waits. */
    busy: Boolean,
    /** A phone is needed (the basket's courier); optional in the book. */
    phoneRequired: { type: Boolean, default: true },
    /** Offer the shopper's saved addresses above the form. */
    savedList: { type: Boolean, default: true },
    saveText: { type: String, default: "" },
  },

  emits: ["update:modelValue", "save"],

  data() {
    return {
      form: blank(),
      location: null,
      moved: false,
      tried: false,
      query: "",
      results: [],
      book: [],
      busy_geo: false,
      zoomed_out: false,
      busy_search: false,
      busy_locate: false,
      /* The words that found nothing, said under the search box. */
      no_match: null,
      /* Phone: the map first, then the details (steps). */
      step: "map",
      pin_needed: null,
    };
  },

  computed: {
    phone() {
      return this.$vuetify.display.xs;
    },
    /* Up to 760px the map and the form stack (kalio-checkout.scss); there
       they come one after the other. */
    steps() {
      return !this.noMap && this.$vuetify.display.width <= 760;
    },
    countryList() {
      if (this.countries?.length) {
        const allowed = new Set(this.countries.map((c) => (typeof c === "string" ? c : c.code || c.alpha2)));
        return Countries.filter((c) => allowed.has(c.code));
      }
      return Countries;
    },
    names() {
      return NAMES();
    },
    namePlaceholder() {
      return t("address.namePlaceholder", "Home, Work, Mum's…");
    },
    bubble() {
      if (this.zoomed_out) return t("address.bubble.zoomIn", "Zoom in to place the pin");
      if (!this.form.address) return t("address.bubble.tapMap", "Tap the map where it should go");
      return null;
    },
    missing() {
      if (this.titled && !this.form.title) return t("address.missing.name", "Name this address.");
      if (!this.noMap && !this.location) return t("address.missing.pin", "Place the pin on the map.");
      if (!this.form.address) return t("address.missing.street", "Add the street address.");
      if (this.phoneRequired && !this.form.phone) return t("address.missing.phone", "Add a phone number.");
      return null;
    },
  },

  watch: {
    modelValue(open) {
      if (open) this.start();
    },
  },

  beforeUnmount() {
    clearTimeout(this.geoTimer);
    clearTimeout(this.searchTimer);
    this.sizeWatch?.disconnect();
    if (this.map) this.map.remove();
    this.map = null;
  },

  methods: {
    /* Each time the sheet opens: the form from the basket, the map where
       the basket's address is (or where the shopper is). */
    start() {
      const info = this.receiverInfo || {};
      this.form = Object.assign(blank(), {
        title: this.title || "",
        address: info.address || "",
        no: info.no || "",
        unit: info.unit || "",
        name: info.name || "",
        phone: info.phone || this.USER()?.phone || "",
        city: info.city || "",
        state: info.state || "",
        postal: info.postal || "",
        country: info.country || this.guessCountry(),
        message: info.message || "",
      });
      this.location = info.location?.lat ? { lat: info.location.lat, lng: info.location.lng } : null;
      this.moved = false;
      this.tried = false;
      this.query = "";
      this.results = [];
      this.no_match = null;
      this.pin_needed = null;
      /* An address already pinned opens on its details; a new one on the map. */
      this.step = this.location && this.form.address ? "details" : "map";
      this.book = [];
      if (this.USER() && this.savedList) this.loadBook();
      if (!this.noMap) this.$nextTick(() => setTimeout(this.mountMap, 60));
    },

    /* A first guess at the country, until the map or the search tells:
       the browser's region (en-US → US), if the shop ships there. */
    guessCountry() {
      let region = null;
      try {
        region = new Intl.Locale(navigator.language || "en-US").maximize().region;
      } catch (e) {
        region = null;
      }
      if (region && this.countryList.some((c) => c.code === region)) return region;
      return this.countryList.length === 1 ? this.countryList[0].code : null;
    },

    mountMap() {
      const el = this.$refs.canvas;
      if (!el) return;
      const at = this.location || (this.center?.lat ? this.center : null);
      if (this.map && this.map.getContainer() === el) {
        this.map.resize();
        if (at) this.map.jumpTo({ center: [at.lng, at.lat], zoom: ZOOM_STREET });
        return;
      }
      if (this.map) this.map.remove();
      this.map = new Mapbox.Map({
        container: el,
        style: MAP_STYLE,
        center: at ? [at.lng, at.lat] : [-40, 30],
        zoom: at ? ZOOM_STREET : 1.4,
        attributionControl: false,
      });
      this.map.addControl(new Mapbox.AttributionControl({ compact: true }), "bottom-right");
      this.map.on("dragstart", () => (this.moved = true));
      this.map.on("zoomstart", (e) => {
        if (e.originalEvent) this.moved = true;
      });
      /* A tap on the map takes the pin there. */
      this.map.on("click", (e) => {
        this.moved = true;
        this.map.flyTo(
          { center: e.lngLat, zoom: Math.max(this.map.getZoom(), ZOOM_STREET - 1), essential: true },
          { byKalio: true },
        );
      });
      this.map.on("moveend", (e) => {
        this.zoomed_out = this.map.getZoom() < ZOOM_ADDRESS;
        if (!this.moved && !e.byKalio) return;
        if (this.zoomed_out) return; // a whole district is not an address
        const c = this.map.getCenter();
        this.location = { lat: c.lat, lng: c.lng };
        if (!e.keepText) this.lookUp(c);
      });
      this.map.on("load", () => (this.zoomed_out = this.map.getZoom() < ZOOM_ADDRESS));
      /* The sheet grows into place (its opening animation, a phone turned
         sideways): the map follows its box, or it draws in a corner or not
         at all. */
      this.sizeWatch?.disconnect();
      if ("ResizeObserver" in window) {
        this.sizeWatch = new ResizeObserver(() => this.map?.resize());
        this.sizeWatch.observe(el);
      }
      if (!at && !this.location) this.locate(true);
    },

    /* The address under the pin (Selldone's reverse lookup). */
    lookUp(c) {
      clearTimeout(this.geoTimer);
      this.geoTimer = setTimeout(() => {
        this.busy_geo = true;
        window.axios
          .get(window.ADDRESS_API.GET_GEO_TO_ADDRESS(), {
            params: { lat: c.lat, lon: c.lng, local: this.getCurrentLanguage?.()?.locale },
          })
          .then(({ data }) => {
            if (!data || data.error || !data.address) return;
            // One place, all of it: no street from here with a postcode from there.
            this.form.address = data.address;
            this.form.city = data.city || "";
            this.form.state = data.state || "";
            this.form.postal = data.postal || "";
            if (data.no) this.form.no = data.no;
            if (data.country && this.countryList.some((x) => x.code === data.country)) this.form.country = data.country;
          })
          .catch(() => {})
          .finally(() => (this.busy_geo = false));
      }, 450);
    },

    /* Suggestions as the shopper types. The input's own value, not
       v-model: an Android keyboard holds the word being typed in
       composition, and v-model waits for it to end, so nothing was looked
       up until the keyboard's search key (the owner, 6 November 2026). */
    onQuery(event) {
      if (event?.target) this.query = event.target.value;
      clearTimeout(this.searchTimer);
      this.no_match = null;
      const text = (this.query || "").trim();
      if (text.length < 3) {
        this.results = [];
        return;
      }
      this.searchTimer = setTimeout(this.search, 350);
    },

    /* Streets and places as the shopper types (Selldone's autocomplete). */
    search() {
      const c = this.map?.getCenter?.();
      const asked = this.query;
      this.busy_search = true;
      window.axios
        .get(window.ADDRESS_API.GET_AUTOCOMPLETE(), {
          params: {
            text: this.query,
            lat: c?.lat,
            lon: c?.lng,
            local: this.getCurrentLanguage?.()?.locale,
            countries: this.countries?.length ? this.countryList.map((x) => x.code).join(",") : undefined,
          },
        })
        .then(({ data }) => {
          if (asked !== this.query) return; // a later search is on its way
          this.results = (data && !data.error && data.list) || [];
          this.no_match = this.results.length ? null : asked;
        })
        .catch(() => (this.results = []))
        .finally(() => (this.busy_search = false));
    },

    resultLine(item) {
      return [item.city, item.state, item.postal, item.country].filter(Boolean).join(", ");
    },

    /* The keyboard's search key: the first street listed, or the search
       now when none is listed yet. */
    pickFirst() {
      if (this.results.length) return this.pickResult(this.results[0]);
      clearTimeout(this.searchTimer);
      if ((this.query || "").trim().length >= 2) this.search();
    },

    pickResult(item) {
      Object.assign(this.form, {
        address: item.address || item.title || this.form.address,
        city: item.city || "",
        state: item.state || "",
        postal: item.postal || "",
      });
      if (item.country && this.countryList.some((x) => x.code === item.country)) this.form.country = item.country;
      const [lng, lat] = item.geometry?.coordinates || [];
      if (lat && lng) this.goTo({ lat, lng }, true);
      this.results = [];
      this.query = "";
      this.no_match = null;
    },

    /* The pin itself: the address under it, now (zooming in first when the
       map shows a whole district). */
    pinHere() {
      if (!this.map) return;
      this.moved = true;
      if (this.map.getZoom() < ZOOM_ADDRESS) {
        this.map.flyTo({ center: this.map.getCenter(), zoom: ZOOM_STREET, essential: true }, { byKalio: true });
        return;
      }
      const c = this.map.getCenter();
      this.location = { lat: c.lat, lng: c.lng };
      this.lookUp(c);
    },

    /* Move the map to a point; keepText leaves the form's address alone. */
    goTo(point, keepText = false) {
      this.location = { lat: point.lat, lng: point.lng };
      this.moved = true;
      if (this.map) this.map.flyTo({ center: [point.lng, point.lat], zoom: ZOOM_STREET, essential: true, maxDuration: 1600 }, { byKalio: true, keepText });
    },

    locate(quiet = false) {
      if (!navigator.geolocation) return;
      this.busy_locate = !quiet;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.busy_locate = false;
          this.goTo({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => (this.busy_locate = false),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    },

    loadBook() {
      window.axios
        .get(window.ADDRESS_API.GET_MY_ADDRESSES())
        .then(({ data }) => {
          this.book = (data && !data.error && data.addresses) || [];
        })
        .catch(() => (this.book = []));
    },

    useSaved(saved) {
      Object.assign(this.form, {
        address: saved.address || "",
        no: saved.no || "",
        unit: saved.unit || "",
        name: saved.name || this.form.name,
        phone: saved.phone || this.form.phone,
        city: saved.city || "",
        state: saved.state || "",
        postal: saved.postal || "",
        country: saved.country || this.form.country,
        message: saved.message || "",
      });
      if (saved.location?.lat) this.goTo(saved.location, true);
    },

    /* Phone, the map step's Continue: the spot under the pin, then the
       details. Zoomed out, the map comes in first (a district is not a
       door). */
    next() {
      this.pin_needed = null;
      if (this.map && this.zoomed_out) {
        this.pinHere();
        this.pin_needed = t("address.missing.zoomIn", "Zoom in so the pin is on the door.");
        return;
      }
      if (this.map) {
        const c = this.map.getCenter();
        const away = !this.location || Math.abs(c.lat - this.location.lat) > 1e-6 || Math.abs(c.lng - this.location.lng) > 1e-6;
        if (away) this.pinHere();
      }
      if (!this.location) {
        this.pin_needed = t("address.missing.pin", "Place the pin on the map.");
        return;
      }
      this.step = "details";
      this.$nextTick(() => {
        if (this.$refs.grid) this.$refs.grid.scrollTop = 0;
      });
    },

    toMap() {
      this.step = "map";
      this.pin_needed = null;
      this.$nextTick(() => this.map?.resize());
    },

    save() {
      this.tried = true;
      if (this.missing) {
        if (this.steps && !this.location) return this.toMap();
        /* The first field to fill, in view (on a phone it can be below). */
        this.$nextTick(() => {
          const field = this.$refs.grid?.querySelector(".k-addr__field.-error input");
          field?.scrollIntoView({ behavior: "smooth", block: "center" });
          field?.focus({ preventScroll: true });
        });
        return;
      }
      const before = this.receiverInfo || {};
      const { title, ...fields } = this.form; // a name only in the address book
      this.$emit("save", {
        ...before,
        ...fields,
        ...(this.titled ? { title } : {}),
        // Selldone's state code belongs to the state it came with.
        state_code: this.form.state === before.state && this.form.country === before.country ? before.state_code : null,
        location: this.location ? { lat: this.location.lat, lng: this.location.lng } : this.receiverInfo?.location,
      });
    },
  },
};
</script>
