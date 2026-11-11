<!--
  Kalio — a journal note, design A "Article with a shopping list", chosen by
  the owner on 5 November 2026.

  One readable column: the topic, the title, a lede, who wrote it, when and
  how long it takes to read; the picture wide; the text; then a box of the
  shop's products the note names — "Add all" puts them in the basket in one
  go — or, when it names none, this week's deals. Share, the comments and
  three more notes follow. A note that came with Selldone's demo content
  says it is sample text (KalioSampleNote), as the owner asked.

  Selldone's page was its ArticleViewer in a floating card: an editor that
  shows a note, with its own toolbar. The note is read here directly
  (GET_SHOP_BLOG_DATA) and the comments are still Selldone's own.
-->
<template>
  <div class="k-post">
    <slot name="header"></slot>

    <div class="k-wrap">
      <nav :aria-label="t('pages.breadcrumb', 'Breadcrumb')" class="k-official__crumbs">
        <router-link :to="{ name: 'ShopPage' }">{{ shopTitle }}</router-link>
        <v-icon size="16">chevron_right</v-icon>
        <router-link :to="journalRoute()">{{ t("blog.journal", "Journal") }}</router-link>
        <template v-if="topic">
          <v-icon size="16">chevron_right</v-icon>
          <router-link :to="journalRoute({ category: category.id })">{{ topic }}</router-link>
        </template>
      </nav>
    </div>

    <div v-if="busy && !article" aria-hidden="true" class="k-post__col k-post__loading">
      <span></span><span></span><span></span>
    </div>

    <div v-else-if="failed" class="k-post__col">
      <div class="k-board__empty k-journal__empty">
        <v-icon size="30">menu_book</v-icon>
        <h2>{{ t("blog.post.notFoundTitle", "We can't find this note") }}</h2>
        <p>{{ t("blog.post.notFoundText", "It may have been moved or taken down. The rest of the journal is still here.") }}</p>
        <router-link :to="journalRoute()" class="k-btn k-btn--solid">{{ t("blog.post.backToJournal", "Back to the journal") }}</router-link>
      </div>
    </div>

    <article v-else-if="article" class="k-post__article">
      <header class="k-post__col k-post__head">
        <router-link v-if="topic" :to="journalRoute({ category: category.id })" class="k-topic">{{ topic }}</router-link>
        <h1>{{ article.title }}</h1>
        <p v-if="lede" class="k-post__lede">{{ lede }}</p>
        <p class="k-post__meta">
          <span v-if="article.user?.name" class="k-who"><i>{{ initials(article.user.name) }}</i>{{ article.user.name }}</span>
          <span v-if="date">{{ date }}</span>
          <span><v-icon size="17">schedule</v-icon>{{ t("blog.post.minRead", { one: "{n} min read", other: "{n} min read" }, { n: minutes }) }}</span>
        </p>
        <kalio-sample-note v-if="demo">
          {{ t("blog.post.demoNote", "This note came with the shop's demo content to show the page. It is not a real {shop} article.", { shop: shopTitle }) }}
        </kalio-sample-note>
      </header>

      <figure v-if="hero" class="k-post__hero">
        <img :src="hero" alt="" />
      </figure>

      <div class="k-post__col">
        <!-- The shop's own note, as written in its dashboard. -->
        <div class="k-post__body k-prose" v-html="body"></div>

        <section v-if="list.length" class="k-post__shop">
          <header>
            <h2>{{ named ? t("blog.post.shopList", "Shop this list") : t("blog.onOffer", "On offer this week") }}</h2>
            <button
              v-if="addable.length > 1"
              :disabled="adding || allIn"
              class="k-btn k-btn--solid k-post__addall"
              type="button"
              @click="addAll"
            >
              <v-icon size="20">{{ allIn ? "check" : "shopping_basket" }}</v-icon>
              <template v-if="allIn">{{ t("blog.post.allIn", "All in your basket") }}</template>
              <template v-else>{{ addall_words[0] }}<u-price :amount="addableTotal" :currency="currency" />{{ addall_words[1] }}</template>
            </button>
          </header>
          <div class="k-post__shoprow">
            <kalio-mini-product v-for="product in list" :key="product.id" :product="product" @sheet="openSheet" />
          </div>
        </section>

        <footer class="k-post__share">
          <span>{{ t("blog.post.share", "Share") }}</span>
          <button class="k-chip" type="button" @click="copyLink">
            <v-icon size="18">{{ copied ? "check" : "link" }}</v-icon>{{ copied ? t("blog.post.linkCopied", "Link copied") : t("blog.post.copyLink", "Copy link") }}
          </button>
          <a :href="mailto" class="k-chip"><v-icon size="18">mail_outline</v-icon>{{ t("blog.post.email", "Email") }}</a>
          <span class="k-post__spacer"></span>
          <router-link :to="journalRoute()" class="k-more">
            <v-icon class="k-flip" size="20">chevron_left</v-icon>{{ t("blog.allNotes", "All notes") }}
          </router-link>
        </footer>

        <section class="k-post__comments">
          <h2>{{ t("blog.post.comments", "Comments") }}</h2>
          <s-article-comments
            :article-id="article.id"
            :article-user-id="article.user_id"
            is-selldone
            is-shop
          >
            <template v-slot:login>
              <s-shop-login class="k-post__login mt-6 rounded-16px"></s-shop-login>
            </template>
          </s-article-comments>
        </section>
      </div>
    </article>

    <section v-if="more.length" class="k-wrap k-post__more">
      <h2>{{ t("blog.post.more", "More from the journal") }}</h2>
      <div class="k-post__morerow">
        <router-link v-for="note in more" :key="note.id" :to="postRoute(note)" class="k-post__card">
          <span class="k-post__cardpic">
            <img v-if="note.image" :src="note.image" alt="" loading="lazy" />
            <v-icon v-else size="32">article</v-icon>
          </span>
          <span class="k-post__cardtitle">{{ note.title }}</span>
          <span class="k-post__cardmeta">{{ dateParts(note.created_at).full }}</span>
        </router-link>
      </div>
    </section>

    <kalio-quick-buy v-model="sheet" :product="picked" />
  </div>
</template>

<script lang="ts">
import { currentCurrency } from "@app-storefront/components/region-switcher/region";
import CurrencyMixin from "@selldone/components-vue/mixin/currency/CurrencyMixin.ts";
import SArticleComments from "@selldone/components-vue/article/comment/SArticleComments.vue";
import SShopLogin from "@selldone/components-vue/storefront/login/SShopLogin.vue";
import { StorefrontSeo } from "../../../helpers/StorefrontSeo";
import KalioSampleNote from "@app-storefront/components/kalio/pages/KalioSampleNote.vue";
import KalioMiniProduct from "@app-storefront/components/kalio/pages/KalioMiniProduct.vue";
import KalioQuickBuy from "@app-storefront/components/kalio/KalioQuickBuy.vue";
import { basketLine, hasSizes, mayBuy, pendingLine, quickAdd, shownCount } from "@app-storefront/components/kalio/kalio-basket";
import { priceOf, productsById } from "@app-storefront/components/kalio/kalio-catalog";
import {
  dateParts,
  deals,
  initials,
  isDemoPost,
  journalPage,
  journalPost,
  journalRoute,
  postRoute,
  productsIn,
  readMinutes,
} from "@app-storefront/components/kalio/pages/kalio-journal";
import { plainText } from "@app-storefront/components/kalio/pages/kalio-sample-pages";
import { t } from "@app-storefront/components/kalio/i18n/kalio-i18n";

export default {
  name: "StorefrontPageBlogsView",
  components: { SArticleComments, SShopLogin, KalioSampleNote, KalioMiniProduct, KalioQuickBuy },
  mixins: [CurrencyMixin],
  inject: ["$shop"],

  data: () => ({
    article: null,
    category: null,
    busy: false,
    failed: false,
    list: [],
    named: false,
    more: [],
    adding: false,
    copied: false,
    sheet: false,
    picked: null,
    seoNavigation: StorefrontSeo.captureNavigation(),
  }),

  computed: {
    shopTitle() {
      return this.$shop?.title || t("pages.theShop", "The shop");
    },
    currency() {
      return currentCurrency();
    },
    blogId() {
      return this.$route.params.blog_id;
    },
    topic() {
      return this.category ? this.category.title || this.category.name : "";
    },
    /* The shop's text, with the editor's leftovers taken out. */
    body() {
      return String(this.article?.body || "")
        .replace(/\scontenteditable="[^"]*"/g, "")
        .replace(/src="http:/g, 'src="');
    },
    /* The note's picture, wide, unless the text opens with it anyway
       (Selldone's demo notes do: the same photo twice). */
    hero() {
      const image = this.article?.image;
      if (!image) return null;
      const file = image.split("/").pop().split("?")[0].slice(0, 40);
      const first = /<img[^>]+src="([^"]+)"/.exec(this.article.body || "");
      return first && file && first[1].includes(file) ? null : image;
    },
    /* The description, unless it is only the first lines of the text. */
    lede() {
      const description = plainText(this.article?.description);
      if (!description) return "";
      const start = plainText(this.article?.body).slice(0, 60);
      return start && description.startsWith(start.slice(0, 40)) ? "" : description;
    },
    date() {
      return dateParts(this.article?.created_at).full;
    },
    minutes() {
      return readMinutes(this.article?.body);
    },
    demo() {
      return isDemoPost(this.article, this.$shop);
    },
    mailto() {
      return `mailto:?subject=${encodeURIComponent(this.article?.title || "")}&body=${encodeURIComponent(location.href)}`;
    },
    /* Products "Add all" can put straight in the basket (no size to pick). */
    addable() {
      return this.list.filter((product) => !hasSizes(product));
    },
    addableTotal() {
      const shop = this.$store.getters.getShop;
      return this.addable.reduce((sum, product) => sum + (priceOf(shop, product, this.currency).now || 0), 0);
    },
    /* "Add all 3 · {amount}": the words around the price the template
       draws, so a language can put the amount where it reads. */
    addall_words() {
      const n = this.addable.length;
      const text = t("blog.post.addAll", { one: "Add all {n} · {amount}", other: "Add all {n} · {amount}" }, { n });
      const at = text.indexOf("{amount}");
      return at < 0 ? [text + " ", ""] : [text.slice(0, at), text.slice(at + "{amount}".length)];
    },
    allIn() {
      return this.addable.every(
        (product) => shownCount(product, basketLine(this, product) || pendingLine(product)) > 0,
      );
    },
  },

  watch: {
    blogId() {
      this.load();
    },
    "$route.fullPath"() {
      this.seoNavigation = StorefrontSeo.captureNavigation();
    },
  },

  created() {
    this.load();
  },

  methods: {
    dateParts,
    initials,
    postRoute,
    journalRoute,

    load() {
      const asked = this.blogId;
      this.busy = true;
      this.failed = false;
      this.article = null;
      this.list = [];
      this.more = [];
      journalPost(asked)
        .then((data) => {
          if (asked !== this.blogId) return;
          this.article = data.article;
          this.category = data.category || null;
          StorefrontSeo.updateArticle(data.article, this.$store.getters.getShop, this.seoNavigation);
          this.shopList(data.article);
          this.moreNotes(data.article);
        })
        .catch(() => {
          if (asked === this.blogId) this.failed = true;
        })
        .finally(() => {
          if (asked === this.blogId) this.busy = false;
        });
    },

    /* The products the note names; this week's deals when it names none. */
    shopList(article) {
      productsById()
        .then((catalogue) => productsIn(article.body, catalogue.values(), 4))
        .then((found) => {
          if (article.id !== this.article?.id) return;
          if (found.length) {
            this.named = true;
            this.list = found;
            return;
          }
          return deals(4).then((list) => {
            if (article.id !== this.article?.id) return;
            this.named = false;
            this.list = list;
          });
        });
    },

    moreNotes(article) {
      journalPage({ page: 1, limit: 4 })
        .then(({ articles }) => {
          if (article.id !== this.article?.id) return;
          this.more = articles.filter((note) => note.id !== article.id).slice(0, 3);
        })
        .catch(() => {});
    },

    /* One line at a time, as a shopper's taps would go. */
    async addAll() {
      if (!mayBuy(this)) return; // a guest is asked to sign in, once
      this.adding = true;
      try {
        for (const product of this.addable) {
          if (shownCount(product, basketLine(this, product) || pendingLine(product)) > 0) continue;
          await quickAdd(this, product, () => {});
        }
      } finally {
        this.adding = false;
      }
    },

    copyLink() {
      navigator.clipboard?.writeText(location.href).then(() => {
        this.copied = true;
        setTimeout(() => (this.copied = false), 2500);
      });
    },

    openSheet(product) {
      this.picked = product;
      this.sheet = true;
    },
  },
};
</script>
