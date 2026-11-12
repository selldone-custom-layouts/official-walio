/*
 * Copyright (c) 2023. Selldone® Business OS™
 *
 * Author: M.Pajuhaan
 * Web: https://selldone.com
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * All rights reserved. In the weave of time, where traditions and innovations intermingle, this content was crafted.
 * From the essence of thought, through the corridors of creativity, each word, and sentiment has been molded.
 * Not just to exist, but to inspire. Like an artist's stroke or a sculptor's chisel, every nuance is deliberate.
 * Our journey is not just about reaching a destination, but about creating a masterpiece.
 * Tread carefully, for you're treading on dreams.
 */

//█████████████████████████████████████████████████████████████
//―――――――――――――――― Imports ――――――――――――――――
//█████████████████████████████████████████████████████████████
import "@selldone/core-js/utils/service-worker/registerServiceWorker"; // Register service worker:
import {createApp} from "vue";
import StorefrontApp from "./StorefrontApp.vue";
import router from "./router/StorefrontRouter";
import store from "./store/StorefrontStore";
import {i18n} from "./lang/i18n_shop";
import {Language} from "@selldone/core-js/enums/language/Language";
import {
    ApplicationExecutorStorefront
} from "@selldone/core-js/models/application/executor/storefront/ApplicationExecutorStorefront.ts";
import {StorefrontSDK} from "@selldone/sdk-storefront";
import StorefrontMixin from "./mixin/StorefrontMixin";
import {CapiCommunity} from "@selldone/sdk-community"; // Register the service worker.
import {VuetifyInstance} from "@selldone/components-vue/plugins/vuetify/vuetify";
//█████████████████████████████████████████████████████████████
//―――――――――――― Selldone® Components ――――――――――――
//█████████████████████████████████████████████████████████████
import {createComponents} from "@selldone/components-vue/components";
// Load fonts:
import "@fortawesome/fontawesome-free/css/all.css"; // Ensure your project is capable of handling css files
import "@selldone/components-vue/style/fonts/material-design-fonts/material-design-icons.scss"; // Ensure your project is capable of handling css files
import "@selldone/components-vue/style/fonts/lang/fa/lang-fa-iransans.css";
import { bootThemeSwitcher } from "./components/theme-switcher/theme-switcher";
import { WALIO_THEME } from "./components/walio/walio-theme";
import { bootRegion, prepareLanguage } from "./components/region-switcher/region";
import { EN as KALIO_EN, LOADERS as KALIO_LANGUAGES } from "./components/kalio/i18n";
import { bootI18n, i18nGlobals, loadLanguage } from "./components/kalio/i18n/kalio-i18n";
import { installShopData, loadShopData } from "./components/kalio/i18n/shop-data";
import { priceText } from "./components/kalio/i18n/price-text";
import { bootLocale, bootLocaleGate, watchLocale } from "./components/kalio/i18n/locale-boot";
import "./components/kalio/kalio-fonts"; // Kalio typefaces, loaded by the app so they reach production
import { PageHyper } from "@selldone/page-builder/PageHyperService.ts";
import {SetupPageBuilder} from "@selldone/page-builder/page-builder.ts";
import {SetupService} from "@selldone/core-js/server";
import {Shop} from "@selldone/core-js/models";

const vuetify = VuetifyInstance(i18n);

// The Layout's own light error red: Vuetify's #ff5252 is 3.3:1 on white.
try {
  vuetify.theme.themes.value.light.colors.error = "#c4122f";
} catch (e) {
  /* keep Vuetify's */
}

// The shopper's palette and Light / Dark (the footer's Theme row), painted
// before the first paint so the default never flashes. Only on the showcase
// shop (molino): an imported copy never shows it.
bootThemeSwitcher(WALIO_THEME, vuetify);

//█████████████████████████████████████████████████████████████
//―――――――――――――― Global Types ―――――――――――――――
//█████████████████████████████████████████████████████████████

// ━━━ Global Language ━━━
// @ts-ignore
window.$language = Language[i18n.locale] ? Language[i18n.locale] : Language.en;

//━━━  Multi languages support ━━━
window.$i18n_global = i18n.global; // Important! used by styler!
//━━━  Globally keep store ━━━
window.$global_store = store; // Important! used in page builder!
//━━━  Globally keep route ━━━
window.$global_router = router; // Important! used by styler!
//━━━  Globally keep vuetify ━━━
window.$global_vuetify = vuetify; // Important! used by page build dynamic component generator!  USE THIS NOW: vuetify=Vue.prototype.$vuetify

// ━━━ App Interface ━━━
window.AppInterface = new ApplicationExecutorStorefront();
// ━━━ Override language packs ━━━
window.OverrideShopLanguagePacks = {};

//█████████████████████████████████████████████████████████████
//――――――――――――― Initialize Vue App ―――――――――――――
//█████████████████████████████████████████████████████████████
// @ts-ignore
const app = createApp(StorefrontApp);
Object.assign(app.config.globalProperties, i18nGlobals); // t(), formatNumber(), formatDate() in every template

const components = createComponents({});
app.use(components);

//█████████████████████████████████████████████████████████████
//――――――――――― Selldone® Storefront SDK ―――――――――――
//█████████████████████████████████████████████████████████████

// ━━━ Storefront SDK (xapi) ━━━
StorefrontSDK.Setup(); // Set up the Shop SDK.
// The visitor's saved language from the very first request, not only once the
// shop's info is back (ES-10, components/kalio/i18n/locale-boot.ts).
const VISITOR_LANGUAGE = bootLocale();

// The visitor's language and currency (the header pill and the phone menu's
// row), then the Layout's own words in that language (<html lang dir> too).
// language + currency. Money is written as Selldone's u-price writes it ("$26.42"),
// one way per page in every language (price-text.ts).
bootRegion(store, { format: (amount, code, decimals) => priceText(amount, code, store.getters.getShop, { decimals }) });
bootI18n(KALIO_EN, KALIO_LANGUAGES);
prepareLanguage((code) => Promise.all([loadLanguage(code), loadShopData(code)])); // a picked language arrives with its words, never English first
// The shop's data Selldone does not translate itself (spec tables, pros,
// rating names, sale units, cart and order lines' names) in the visitor's
// language (components/kalio/i18n/shop-data.ts).
installShopData(window.axios);
// A language pick: no cached answer from the old language, and the page held
// while the new one loads.
watchLocale(store);
// A visitor in another language than English: the app is drawn once that
// language's words and dictionaries are in, and shown once the shop is in it
// too (at most 3.5 s), never English first.
const LOCALE_READY = bootLocaleGate(VISITOR_LANGUAGE, store);

// ━━━ Community SDK (capi) ━━━
CapiCommunity.Setup(); // Setup community.

//█████████████████████████████████████████████████████████████
//―――――――――――――――― Cookie ―――――――――――――――――
//█████████████████████████████████████████████████████████████
/**
 * Sets a token in the cookies and the Authorization header. Also fetches user and shop info.
 *
 * @param token - The token to set.
 * @param expire_date - The expiration date for the token cookie.
 */
window.SetToken = function (
  token: string,
  expire_date: Date | null = null,
  cookie_key: string = "access_token",
): void {
  console.log("Set Customer Token!");

  window.$cookies.set(
    cookie_key,
    token,
    expire_date ? expire_date.toUTCString() : "",
    window.$storefront.prefix_url,
    undefined,
    false,
  );
  window.axios.defaults.headers.common["Authorization"] = "Bearer " + token;

  (storefrontVueApp as InstanceType<typeof StorefrontMixin>)?.UpdateUserInfo();
  (
    storefrontVueApp as InstanceType<typeof StorefrontMixin>
  )?.fetchBasketAndShop();
};

//█████████████████████████████████████████████████████████████
//―――――――――――――――――― Vue ―――――――――――――――――
//█████████████████████████████████████████████████████████████

// ━━━ Global Mixin ━━━
// @ts-ignore
app.mixin(StorefrontMixin); // Mixin with global helper methods.

// ━━━ Native App Interface ━━━
//require("@selldone/components-vue/plugins/native/NativeAppInterface");

// ━━━ Vue Instance ━━━

app.use(i18n);
app.use(router);
app.use(store);
app.use(vuetify);

//――――――――――――――――――――――――― Page Builder ―――――――――――――――――――――――――
const $PageHyper=PageHyper(app, { mode: "view" });

function isNumericNumber(value) {
  return typeof value === "string" && /^\d+$/.test(value.trim());
}

const CUSTOM_HOME = SetupService.GetMetaValue("custom-home") as Shop.Home;

if(CUSTOM_HOME && isNumericNumber(CUSTOM_HOME) && !window.location.pathname?.includes("/product/")/*Fast load product page!*/){
  SetupPageBuilder(app, { mode: "view" });
  $PageHyper.isInitialized.value = true;
  console.log("⚡ Turbo loading landing page.")
}


// Mount the application: English at once, as before; another language once
// its words are in (LOCALE_READY), so the first drawing is already in it.
let storefrontVueApp: any = null;
const mountApp = () => (storefrontVueApp = app.mount("#app"));
if (VISITOR_LANGUAGE === "en") mountApp();
else LOCALE_READY.then(mountApp);
