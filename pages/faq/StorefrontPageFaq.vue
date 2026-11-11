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

<template xmlns:v-slot="http://www.w3.org/1999/XSL/Transform">
  <!-- Kalio (5 November 2026): the questions in the shop's own page frame
       (trail, title, the way to ask, topics as chips) and a word when there
       are none yet; Selldone showed a bar with a menu button, an all-caps
       grey button and two arrows over an empty page. -->
  <div class="k-official k-faq">
    <slot name="header"></slot>
    <div class="k-wrap">
      <nav :aria-label="t('pages.breadcrumb', 'Breadcrumb')" class="k-official__crumbs">
        <router-link :to="{ name: 'ShopPage' }">{{ shop?.title || t("pages.home", "Home") }}</router-link>
        <v-icon size="16">chevron_right</v-icon>
        <router-link v-if="current_tag" :to="{ name: 'ShopFAQ' }">{{ t("faq.title", "Questions and answers") }}</router-link>
        <span v-else>{{ t("faq.title", "Questions and answers") }}</span>
        <template v-if="current_tag">
          <v-icon size="16">chevron_right</v-icon>
          <span>{{ current_tag }}</span>
        </template>
      </nav>

      <div class="k-faq__head">
        <div>
          <h1 class="k-official__title">{{ t("faq.title", "Questions and answers") }}</h1>
          <p class="k-faq__lede">{{ t("faq.lede", "Answers to what shoppers ask most. Can’t find yours? Ask the shop.") }}</p>
        </div>
        <button v-if="USER()" class="k-btn k-btn--solid" type="button" @click="dialog_faq = true">
          <v-icon size="18">add</v-icon>{{ t("faq.ask", "Ask a question") }}
        </button>
        <button v-else class="k-btn k-btn--line" type="button" @click="signIn">
          <v-icon size="18">person_outline</v-icon>{{ t("faq.signInToAsk", "Sign in to ask") }}
        </button>
      </div>

      <nav v-if="tags?.length" :aria-label="t('faq.topics', 'Topics')" class="k-faq__tags">
        <router-link :class="{ '-on': !current_tag }" :to="{ name: 'ShopFAQ' }" exact>{{ t("faq.all", "All") }}</router-link>
        <router-link v-for="tag in tags" :key="tag" :class="{ '-on': current_tag === tag }" :to="{ name: 'ShopFAQ', params: { tag: tag } }">{{ tag }}</router-link>
      </nav>

      <u-loading-progress v-if="busy_fetch"></u-loading-progress>

      <div v-if="faqs?.length" class="k-faq__list">
        <div v-for="faq in faqs" :key="faq.id" class="k-faq__item">
          <p class="k-faq__q" v-html="faq.question"></p>
          <div class="k-faq__a" v-html="faq.answer"></div>
          <a v-if="faq.link" :href="faq.link" class="k-faq__more" target="_blank">{{ $t("global.faq.read_more") }}<v-icon size="16">open_in_new</v-icon></a>
        </div>
      </div>
      <div v-else-if="!busy_fetch" class="k-official__missing">
        <v-icon size="30">forum</v-icon>
        <h2>{{ t("faq.empty.title", "No questions here yet") }}</h2>
        <p>{{ t("faq.empty.text", "{shop} has not answered any questions here so far. Ask yours, or write to the shop directly.", { shop: shop?.title || t("pages.theShop", "The shop") }) }}</p>
        <div class="k-official__missingacts">
          <router-link :to="{ name: window.$storefront.routes.SHOP_CONTACT_US }" class="k-btn k-btn--solid">{{ t("contact.shop", "Contact the shop") }}</router-link>
        </div>
      </div>

      <v-pagination
        v-if="pageCount > 1"
        v-model="page"
        :length="pageCount"
        class="k-faq__pages"
        rounded
        @update:model-value="fetchFAQData()"
      />
    </div>

    <!-- =================== Dialog =================== -->
    <v-bottom-sheet
      v-model="dialog_faq"
      width="860"
      max-width="98vw"
      content-class="rounded-t-xl"
    >
      <v-card rounded="t-xl" class="text-start">
        <v-card-title>
          <v-icon class="me-2"> fa:fas fa-question</v-icon>
          {{ $t("global.faq.add_new") }}
        </v-card-title>
        <v-card-text>
          <v-textarea
            v-model="question"
            :label="$t('global.faq.question_input')"
            :placeholder="$t('global.faq.question_input_placeholder')"
            variant="underlined"
            auto-grow
          />
        </v-card-text>
        <v-card-actions>
          <div class="widget-buttons">
            <v-btn
              :class="{ disabled: !question }"
              :loading="busy"
              color="primary"
              size="x-large"
              variant="elevated"
              @click="sendFAQ"
              prepend-icon="check"
            >
              {{ $t("global.actions.confirm") }}
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-bottom-sheet>
  </div>
</template>

<script lang="ts">
import NotificationService from "@selldone/components-vue/plugins/notification/NotificationService.ts";

import { throttle } from "lodash-es";
import { EventBus } from "@selldone/components-vue/utils/events/EventBus.ts";
import ULoadingProgress from "@selldone/components-vue/ui/loading/progress/ULoadingProgress.vue";
import { t } from "@app-storefront/components/kalio/i18n/kalio-i18n";

export default {
  name: "StorefrontPageFaq",
  components: {ULoadingProgress},
  props: {
    shop: {
      require: true,
      type: Object,
    },
  },

  data() {
    return {
      drawer: false,

      dialog_faq: false,
      question: "",
      busy: false,
      busy_fetch: false,

      faqs: [],
      tags: [],

      total: true,

      search: null,
      //----------------------
      page: 1,
    };
  },
  computed: {
    current_tag() {
      return this.$route.params.tag;
    },
    pageCount() {
      return Math.ceil(this.total / 10);
    },
  },
  watch: {
    current_tag() {
      this.drawer = false;
      this.offset = 0;
      this.fetchFAQData();
    },
    search: throttle(function (newVal) {
      this.page = 1;
      this.fetchFAQData(newVal);
    }, window.SERACH_THROTTLE),
  },
  created() {
    this.setPageTitle(t("faq.pageTitle", "FAQ")); // Set Page Title!
    this.fetchFAQData();
    this.fetchFAQTags();
  },
  methods: {
    /** Kalio: sign in to ask a question. */
    signIn() {
      EventBus.$emit("need-login", true);
    },
    //――――――――――――――――――――――― FAQ Tags ―――――――――――――――――――――――

    fetchFAQTags() {
      axios.get(window.XAPI.GET_FAQ_TAGS(this.shop.name)).then(({ data }) => {
        this.tags = data.tags;
      });
    },

    //――――――――――――――――――――――― FAQs ―――――――――――――――――――――――

    fetchFAQData() {
      this.busy_fetch = true;
      axios
        .get(window.XAPI.GET_FAQ(this.shop.name), {
          params: {
            offset: (this.page - 1) * 10,
            limit: 10,
            tag: this.$route.params.tag,
            search: this.search,
          },
        })
        .then(({ data }) => {
          this.faqs = data.faqs;
          this.total = data.total;
        })
        .finally(() => {
          this.busy_fetch = false;
        });
    },

    sendFAQ() {
      this.busy = true;
      axios
        .post(window.XAPI.POST_SEND_QUESTION(this.shop.name), {
          question: this.question,
        })
        .then(({ data }) => {
          if (data.error) {
            NotificationService.showErrorAlert(null, data.error_msg);
          } else {
            this.question = null;
            NotificationService.showSuccessAlert(
              null,
              this.$t("global.faq.notifications.success_add"),
            );
            this.dialog_faq = false;
          }
        })
        .catch((error) => {
          NotificationService.showLaravelError(error);
        })
        .finally(() => {
          this.busy = false;
        });
    },
  },
};
</script>

<style lang="scss" scoped>
.faq-container {
  text-align: start;
  max-width: 1100px;

  .faq {
    margin: 8px 0;
    padding: 14px 8px;

    .question {
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .answer {
      font-size: 1rem;
      font-weight: 400;
      line-height: 1.7rem;
    }
  }

  margin: auto;
}
</style>
