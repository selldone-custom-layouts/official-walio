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

<template>
  <div v-bind="$attrs" class="py-10">
    <div class="widget-box -large mb-5 min-height-50vh">
      <u-widget-header
        icon="wallet"
        :title="$t('user_wallets.title')"
      ></u-widget-header>
      <v-list-subheader>
        {{ $t("user_wallets.subtitle") }}
      </v-list-subheader>

      <u-loading-progress v-if="busy_fetch"></u-loading-progress>

      <!-- Kalio (5 November 2026): each wallet a card in the account's
           style, not Selldone's black tile; an empty wallet says so. -->
      <div v-if="wallets?.length" class="k-wallets">
        <div v-for="wallet in wallets" :key="wallet.id" class="k-wallet">
          <span class="k-wallet__ico"><v-icon size="22">account_balance_wallet</v-icon></span>
          <span class="k-wallet__words">
            <u-price :amount="wallet.balance" :currency="wallet.currency" class="k-wallet__sum"></u-price>
            <small>{{ $t("wallet_input.my_wallet_balance") }}</small>
          </span>
          <u-currency-icon :currency="wallet.currency" flag-only></u-currency-icon>
        </div>
      </div>
      <div v-else-if="!busy_fetch" class="k-board__empty k-wallets__empty">
        <v-icon size="28">account_balance_wallet</v-icon>
        <p>{{ t("account.wallet.empty", "Your wallet is empty. Cashback from your orders and refunds land here, ready for your next basket.") }}</p>
        <router-link :to="{ path: '/' }" class="k-btn -main">{{ t("account.startShopping", "Start shopping") }}</router-link>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import NotificationService from "@selldone/components-vue/plugins/notification/NotificationService.ts";

import ULoadingProgress from "@selldone/components-vue/ui/loading/progress/ULoadingProgress.vue";
import UCurrencyIcon from "@selldone/components-vue/ui/currency/icon/UCurrencyIcon.vue";
import UPrice from "@selldone/components-vue/ui/price/UPrice.vue";

export default {
  name: "StorefrontPageUserWallets",
  components: {
    UPrice,
    UCurrencyIcon,

    ULoadingProgress,
  },
  inject: ["$shop"],
  props: {},
  data: () => ({
    wallets: [],
    busy_fetch: false,
  }),
  computed: {
    headers() {
      return [
        {
          title: this.$t("global.commons.currency"),
          align: "start",
          value: "currency",
          sortable: true,
        },

        {
          title: this.$t("global.commons.balance"),
          align: "start",
          value: "balance",
          sortable: true,
        },
      ];
    },
  },

  watch: {},

  created() {
    this.fetchWallets();
  },

  methods: {
    fetchWallets() {
      this.busy_fetch = true;

      axios
        .get(window.XAPI.GET_MY_WALLETS(this.$shop.name))
        .then(({ data }) => {
          if (data.error) {
            return NotificationService.showErrorAlert(null, data.error_msg);
          }

          this.wallets = data.wallets;
        })
        .catch((e) => {
          NotificationService.showLaravelError(e);
        })
        .finally(() => {
          this.busy_fetch = false;
        });
    },
  },
};
</script>

<style lang="scss" scoped></style>
