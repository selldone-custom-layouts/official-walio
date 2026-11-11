<!--
  Kalio — the product page's Reviews (design A of the reviews options,
  7 November 2026, kalio-design/reviews-options).

  A summary column beside the reviews:
    - the score, the stars and how many rated it ($product.rate, rate_count);
    - "How it rates": the shop's rating criteria, each with its average
      ($product.ratings: value is the sum of the scores, count how many);
    - a guest's sign-in prompt, or, for a shopper who bought it, Selldone's
      own rating input (SShopProductRatingView; only buyers can rate);
  and the reviews themselves: Selldone's comments (SArticleComments: the
  writing box, each comment with its name, date, the buyer badge, the
  writer's own ratings and the shop's reply), restyled in kalio-product.scss.

  Selldone has no 5-to-1 breakdown, no "helpful" votes, no review photos and
  no sort by rating, so none is drawn. It replaces SProductComments, whose
  "/ 5" number, blue criteria bars and purple "People love it!" card were
  Selldone's default look.
-->
<template>
  <div :class="{ '-rated': rated }" class="k-rv">
    <aside class="k-rv__sum">
      <template v-if="rated">
        <div class="k-rv__big">
          <b>{{ score }}</b>
          <span>{{ t("reviews.outOf", "out of {max}", { max: 5 }) }}</span>
        </div>
        <span :style="{ '--k-rate': rate }" class="k-stars"></span>
        <p class="k-rv__count">{{ countText }}</p>
      </template>
      <p v-else class="k-rv__none">{{ t("reviews.noRatings", "No ratings yet.") }}</p>

      <template v-if="criteria.length">
        <h3 class="k-rv__h">{{ t("reviews.howItRates", "How it rates") }}</h3>
        <div class="k-rv__crit">
          <div v-for="c in criteria" :key="c.id">
            <span :title="c.name">{{ c.name }}</span>
            <span class="k-rv__track"><i :style="{ width: c.avg * 20 + '%' }"></i></span>
            <b>{{ c.avg.toFixed(1) }}</b>
          </div>
        </div>
      </template>

      <div v-if="!user" class="k-rv__guest">
        <p>{{ t("reviews.guestPrompt", "Bought this? Sign in to rate it and share what you think.") }}</p>
        <button class="k-btn k-btn--solid" type="button" @click="signIn">{{ t("reviews.signInToReview", "Sign in to review") }}</button>
      </div>
      <div v-else-if="$product.bought && $product.ratings?.length" class="k-rv__rate">
        <h3 class="k-rv__h">{{ t("reviews.yourRating", "Your rating") }}</h3>
        <s-shop-product-rating-view :product="$product" dense />
      </div>
      <p v-else-if="$product.ratings?.length" class="k-rv__note">{{ t("reviews.buyToRate", "Once you've bought it, you can rate it here.") }}</p>
    </aside>

    <div class="k-rv__list">
      <s-article-comments
        v-if="$product.article_pack"
        :article-id="$product.article_pack.article.id"
        :article-user-id="$product.user_id"
        for-product
        is-shop
      >
        <!-- A guest's prompt is in the summary column. -->
        <template v-slot:login><span></span></template>
      </s-article-comments>
    </div>
  </div>
</template>

<script>
import SArticleComments from "@selldone/components-vue/article/comment/SArticleComments.vue";
import SShopProductRatingView from "@selldone/components-vue/storefront/product/rating/SShopProductRatingView.vue";
import { EventBus } from "@selldone/components-vue/utils/events/EventBus.ts";
import { t } from "../i18n/kalio-i18n";

export default {
  name: "KalioReviews",
  components: { SArticleComments, SShopProductRatingView },
  inject: ["$shop", "$product"],

  computed: {
    user() {
      return this.$store.getters.getUser;
    },
    rate() {
      return Math.min(5, Math.max(0, Number(this.$product?.rate) || 0));
    },
    count() {
      return Number(this.$product?.rate_count) || 0;
    },
    rated() {
      return this.count > 0 && this.rate > 0;
    },
    score() {
      return this.rate.toFixed(1);
    },
    countText() {
      return t("reviews.ratingCount", { one: "{n} rating", other: "{n} ratings" }, { n: this.count });
    },
    /** The shop's criteria with an average; ones nobody has rated are left out. */
    criteria() {
      return (this.$product?.ratings || [])
        .filter((r) => Number(r.count) > 0)
        .map((r) => ({ id: r.id, name: r.name, avg: Math.min(5, Math.max(0, Number(r.value) / Number(r.count))) }));
    },
  },

  methods: {
    signIn() {
      EventBus.$emit("need-login", true);
    },
  },
};
</script>
