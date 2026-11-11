<!--
  Kalio — Terms of use and Privacy, design A "Contents and sections", chosen
  by the owner on 5 November 2026.

  The title with the date it was last updated; while the shop has not written
  the page, the sample note and "The short version" in four lines; then a
  contents list that stays beside the text on a computer (and follows the
  section being read) and the numbered sections. Terms end with where to
  ask; Privacy ends with the cookie choices, in place of Selldone's card
  with its purple "I Agree".

  The text is the shop's own profile (Selldone dashboard › Shop › Profile)
  when it has one — its headings become the contents — and otherwise the
  sample in kalio-sample-pages.ts, marked as a test.
-->
<template>
  <div class="k-legal">
    <header class="k-legal__head">
      <h1 class="k-official__title">{{ title }}</h1>
      <p v-if="!busy" class="k-legal__date">
        {{ t("legal.lastUpdated", "Last updated") }}
        <b>{{ updated || t("legal.samplePublished", "Sample — not published") }}</b>
      </p>
    </header>

    <div v-if="busy" aria-hidden="true" class="k-legal__loading"><span></span><span></span><span></span></div>

    <template v-else>
      <kalio-sample-note v-if="missing" class="k-legal__note">
        {{
          kind === "terms"
            ? t("legal.note.terms", "These terms are general text written to show the page. They are not {shop}'s real terms and do not form an agreement.", { shop: shopTitle })
            : t("legal.note.privacy", "This policy is general text written to show the page. It is not {shop}'s real privacy policy.", { shop: shopTitle })
        }}
      </kalio-sample-note>

      <!-- Walio 1.1.0 (Terms and Privacy design B): the short version as four
           cards, and the sections as folding rows. -->
      <section v-if="missing" :aria-label="t('legal.short', 'The short version')" class="w-cards4">
        <div v-for="(line, i) in sample.short.slice(0, 4)" :key="line">
          <v-icon size="26">{{ ["storefront", "payments", "assignment_return", "chat_bubble_outline"][i] }}</v-icon>
          <p>{{ line }}</p>
        </div>
      </section>

      <div :class="{ '-solo': !toc.length || missing }" class="k-legal__cols">
        <nav v-if="toc.length && !missing" :aria-label="t('legal.onThisPage', 'On this page')" class="k-legal__toc">
          <p>{{ t("legal.onThisPage", "On this page") }}</p>
          <a
            v-for="entry in toc"
            :key="entry.id"
            :aria-current="entry.id === active ? 'true' : undefined"
            :class="{ '-on': entry.id === active }"
            :href="`#${entry.id}`"
            @click.prevent="go(entry.id)"
          >
            <span>{{ entry.mark }}</span>{{ entry.title }}
          </a>
        </nav>

        <div ref="text" class="k-legal__text k-prose">
          <template v-if="missing">
            <details
              v-for="(section, i) in sample.sections"
              :id="`k-legal-${i + 1}`"
              :key="section.title"
              :open="i === 0"
              class="w-acc"
            >
              <summary><span class="w-acc__n">{{ i + 1 }}</span>{{ section.title }}<v-icon aria-hidden="true">expand_more</v-icon></summary>
              <div class="w-acc__in">
                <p v-for="text in section.text" :key="text">{{ text }}</p>
              </div>
            </details>
          </template>

          <!-- The shop's own page, as written in its dashboard. -->
          <div v-else ref="real" class="k-legal__real" v-html="profile.body"></div>

          <section v-if="kind === 'terms'" id="k-legal-ask" class="k-legal__sec -last">
            <h2><span>?</span>{{ t("legal.questions", "Questions") }}</h2>
            <p>{{ t("legal.questionsText", "Write to the shop from the Contact page. For an order, use the message thread on the order page.") }}</p>
            <div class="k-legal__acts">
              <router-link :to="{ name: window.$storefront.routes.SHOP_CONTACT_US }" class="k-btn k-btn--solid">{{ t("contact.shop", "Contact the shop") }}</router-link>
              <router-link :to="{ name: 'ShopFAQ' }" class="k-btn k-btn--line">{{ t("faq.title", "Questions and answers") }}</router-link>
            </div>
          </section>

          <section v-else id="k-legal-cookies" class="k-legal__sec -last">
            <h2><span>★</span>{{ t("legal.cookies", "Your cookie choices") }}</h2>
            <p>{{ t("legal.cookiesText", "Change these at any time on this page.") }}</p>
            <kalio-cookie-choices />
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import KalioSampleNote from "./KalioSampleNote.vue";
import KalioCookieChoices from "./KalioCookieChoices.vue";
import { plainText, privacySample, termsSample } from "./kalio-sample-pages";
import { dateParts } from "./kalio-journal";
import { t } from "../i18n/kalio-i18n";

export default {
  name: "KalioLegalPage",
  components: { KalioSampleNote, KalioCookieChoices },
  inject: ["$shop"],

  props: {
    /** terms | privacy */
    kind: { type: String, required: true },
  },

  data: () => ({
    profile: null,
    missing: false,
    busy: true,
    realToc: [],
    active: null,
  }),

  computed: {
    shopTitle() {
      return this.$shop?.title || t("sample.thisShop", "This shop");
    },
    title() {
      return this.kind === "terms" ? t("legal.title.terms", "Terms of use") : t("legal.title.privacy", "Privacy");
    },
    sample() {
      return this.kind === "terms" ? termsSample(this.shopTitle) : privacySample(this.shopTitle);
    },
    updated() {
      return this.missing ? "" : dateParts(this.profile?.updated_at || this.profile?.created_at).full;
    },
    toc() {
      const head = this.missing
        ? this.sample.sections.map((section, i) => ({ id: `k-legal-${i + 1}`, mark: String(i + 1), title: section.title }))
        : this.realToc;
      if (!head.length) return [];
      const tail =
        this.kind === "terms"
          ? { id: "k-legal-ask", mark: "?", title: t("legal.questions", "Questions") }
          : { id: "k-legal-cookies", mark: "★", title: t("legal.cookies", "Your cookie choices") };
      return [...head, tail];
    },
  },

  created() {
    this.setPageTitle?.(this.title);
    window.axios
      .get(window.XAPI.GET_SHOP_PROFILE(this.$shop.name, this.kind))
      .then(({ data }) => {
        this.profile = data?.error ? null : data?.profile || null;
        this.missing = !plainText(this.profile?.body);
      })
      .catch(() => {
        this.missing = true;
      })
      .finally(() => {
        this.busy = false;
        this.$nextTick(this.afterRender);
      });
  },

  beforeUnmount() {
    window.removeEventListener("scroll", this.onScroll);
  },

  methods: {
    /* The shop's own headings become the contents; then the contents
       follow the section being read. */
    afterRender() {
      if (!this.missing && this.$refs.real) {
        const heads = [...this.$refs.real.querySelectorAll("h2")];
        const list = heads.length > 1 ? heads : [...this.$refs.real.querySelectorAll("h3")];
        this.realToc =
          list.length > 1
            ? list.map((el, i) => {
                el.id = `k-legal-${i + 1}`;
                el.classList.add("k-legal__anchor");
                return { id: el.id, mark: String(i + 1), title: el.textContent.trim() };
              })
            : [];
      }
      this.$nextTick(this.follow);
    },

    /* The section being read: the last whose heading has passed a line a
       quarter of the way down the window (the first until one has). */
    follow() {
      window.removeEventListener("scroll", this.onScroll);
      if (!this.toc.length) return;
      window.addEventListener("scroll", this.onScroll, { passive: true });
      this.measure();
    },

    onScroll() {
      if (this.ticking) return;
      this.ticking = true;
      requestAnimationFrame(() => {
        this.ticking = false;
        this.measure();
      });
    },

    measure() {
      const line = innerHeight * 0.25;
      let current = this.toc[0]?.id || null;
      for (const entry of this.toc) {
        const el = document.getElementById(entry.id);
        if (el && el.getBoundingClientRect().top <= line) current = entry.id;
      }
      /* At the very end the last short section never reaches the line. */
      if (scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 4)
        current = this.toc[this.toc.length - 1].id;
      this.active = current;
    },

    go(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(history.state, "", `#${id}`);
    },
  },
};
</script>
