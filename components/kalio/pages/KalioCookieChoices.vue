<!--
  Kalio — cookie choices on the Privacy page (design A, 5 November 2026).

  The choices Selldone's own preferences card offers, as switches: the
  essential cookies (marked "Always on"), then each app the shop runs that a
  customer may turn off (Selldone's shop apps, kept per account, or on this
  device for a guest). "Save my choices" applies them and accepts the cookie
  notice on this device (localStorage "GDPR-Cookie", Selldone's key).
  molino runs no such app, so the page says there is nothing optional to
  switch rather than showing switches that do nothing.
-->
<template>
  <div class="k-cookies">
    <div class="k-cookies__row">
      <span>
        <b>{{ t("cookies.essential", "Essential") }}</b>
        <small>{{ t("cookies.essentialText", "Sign-in, basket and checkout. Always on.") }}</small>
      </span>
      <span class="k-cookies__fixed"><v-icon size="16">lock</v-icon>{{ t("cookies.alwaysOn", "Always on") }}</span>
    </div>

    <div v-for="app in apps" :key="app.code" class="k-cookies__row">
      <span>
        <b>{{ app.name }}</b>
        <small>{{ app.description || t("cookies.appDefault", "An app this shop runs.") }}</small>
      </span>
      <v-switch v-model="choices[app.code]" :aria-label="app.name" color="primary" hide-details inset />
    </div>

    <div v-if="!apps.length" class="k-cookies__row -none">
      <span>
        <b>{{ t("cookies.analytics", "Analytics and marketing") }}</b>
        <small>{{ t("cookies.noApps", "{shop} runs no tracking or marketing apps, so there is nothing optional to switch on or off.", { shop: shopTitle }) }}</small>
      </span>
      <span class="k-cookies__fixed -off">{{ t("cookies.notUsed", "Not used") }}</span>
    </div>

    <div class="k-cookies__acts">
      <button :disabled="saving" class="k-btn k-btn--solid" type="button" @click="save(false)">
        <v-icon v-if="saved" size="20">check</v-icon>{{ saved ? t("cookies.saved", "Saved on this device") : t("cookies.save", "Save my choices") }}
      </button>
      <button v-if="apps.length" :disabled="saving" class="k-btn k-btn--line" type="button" @click="save(true)">
        {{ t("cookies.allowAll", "Allow all") }}
      </button>
      <span v-if="accepted && !saved" class="k-cookies__state">{{ t("cookies.accepted", "You accepted the cookie notice on this device.") }}</span>
    </div>
  </div>
</template>

<script>
import NotificationService from "@selldone/components-vue/plugins/notification/NotificationService.ts";
import { t } from "../i18n/kalio-i18n";

const ACCEPT_KEY = "GDPR-Cookie"; // Selldone's own key (SCookiePreferences)

function readAccepted() {
  try {
    return localStorage.getItem(ACCEPT_KEY) === "true";
  } catch (e) {
    return false;
  }
}

export default {
  name: "KalioCookieChoices",
  inject: ["$shop"],

  data: () => ({
    choices: {},
    saving: false,
    saved: false,
    accepted: readAccepted(),
  }),

  computed: {
    shopTitle() {
      return this.$shop?.title || t("sample.thisShop", "This shop");
    },
    apps() {
      return (this.$shop?.apps || []).filter((app) => app && app.code);
    },
  },

  created() {
    const choices = {};
    for (const app of this.apps) {
      let blocked = !!app.blocked;
      if (!this.USER()) {
        try {
          blocked = localStorage.getItem(this.guestKey(app)) === "1";
        } catch (e) {
          blocked = false;
        }
      }
      choices[app.code] = !blocked;
    }
    this.choices = choices;
  },

  methods: {
    guestKey(app) {
      return `shop:${this.$shop.id}-app:${app.code}:blocked`;
    },

    async save(all) {
      this.saving = true;
      try {
        for (const app of this.apps) {
          const active = all ? true : !!this.choices[app.code];
          this.choices[app.code] = active;
          if (active === !app.blocked && this.USER()) continue;
          if (this.USER()) {
            const { data } = await window.axios.post(
              window.XAPI.POST_SET_SHOP_APP_STATUS_BY_CUSTOMER(this.$shop.name, app.code),
              { active },
            );
            if (data?.error) throw new Error(data.error_msg);
            app.blocked = !active;
          } else {
            try {
              if (active) localStorage.removeItem(this.guestKey(app));
              else localStorage.setItem(this.guestKey(app), "1");
            } catch (e) {
              /* storage blocked: the choice lasts this visit */
            }
          }
        }
        try {
          localStorage.setItem(ACCEPT_KEY, "true");
        } catch (e) {
          /* storage blocked */
        }
        this.accepted = true;
        this.saved = true;
        setTimeout(() => (this.saved = false), 3000);
      } catch (error) {
        NotificationService.showLaravelError(error);
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>
