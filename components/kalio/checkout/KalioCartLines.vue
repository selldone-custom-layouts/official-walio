<!--
  Kalio — the basket's lines on the basket page, by seller.

  A card per seller (their mark, how many items, their subtotal), then the
  lines: packshot, name and size, a quantity stepper, the price with the
  price before the discount struck. Lines without a seller (the shop's own
  stock) share a card under the shop's name. The stepper changes the count
  as it is tapped and the basket follows (stepTo in kalio-basket.ts); a
  line taken to zero leaves at once.

  What Selldone's line also said is kept where it applies: an offer on the
  line (buy n, get a discount), and a warning when the basket asks for more
  than is left.
-->
<template>
  <div class="k-lines">
    <section v-for="group in groups" :key="group.key" class="k-lines__seller">
      <header class="k-lines__head">
        <img v-if="group.logo" :src="group.logo" alt="" class="k-lines__logo" height="36" width="36" />
        <span v-else aria-hidden="true" class="k-lines__logo -shop"><v-icon size="18">storefront</v-icon></span>
        <span class="k-lines__who">
          <router-link v-if="group.route" :to="group.route" class="k-lines__name">{{ group.name }}</router-link>
          <b v-else class="k-lines__name">{{ group.name }}</b>
          <small>{{ t("checkout.lines.items", { one: "{n} item", other: "{n} items" }, { n: group.units }) }}</small>
        </span>
        <u-price :amount="group.subtotal" :currency="currency" class="k-lines__subtotal" />
      </header>

      <div v-for="item in group.items" :key="item.id" class="k-lines__line">
        <router-link :to="productRoute(item.product_id)" class="k-lines__pic">
          <img v-if="image(item)" :src="image(item)" alt="" height="44" loading="lazy" width="44" />
        </router-link>
        <div class="k-lines__text">
          <router-link :to="productRoute(item.product_id)" class="k-lines__title">{{ item.product?.title }}</router-link>
          <small v-if="size(item)">{{ size(item) }}</small>
          <small v-if="item.offer && item.offer_count" class="k-lines__offer">
            <v-icon size="14">redeem</v-icon>
            {{
              item.offer.percent === 100
                ? $t("basket_items.offer_free", { count: item.offer_count })
                : $t("basket_items.offer", { count: item.offer_count, percent: item.offer.percent })
            }}
          </small>
          <small v-if="shown(item) > available(item)" class="k-lines__short">
            <v-icon size="14">error_outline</v-icon>{{ t("checkout.lines.onlyLeft", { one: "Only {n} left", other: "Only {n} left" }, { n: available(item) }) }}
          </small>
        </div>
        <div
          :aria-label="item.product?.title ? t('checkout.lines.quantityOf', 'Quantity of {name}', { name: item.product.title }) : t('checkout.lines.quantityOfThis', 'Quantity of this item')"
          :class="{ '-busy': settling(lineProduct(item), item) }"
          class="k-lines__qty"
          role="group"
        >
          <button :aria-label="shown(item) > 1 ? t('checkout.lines.oneFewer', 'One fewer') : t('checkout.lines.removeFromBasket', 'Remove from basket')" type="button" @click="step(item, -1)">
            <v-icon size="18">{{ shown(item) > 1 ? "remove" : "delete_outline" }}</v-icon>
          </button>
          <output aria-live="polite">{{ shown(item) }}</output>
          <button :disabled="shown(item) >= available(item)" :aria-label="t('checkout.lines.oneMore', 'One more')" type="button" @click="step(item, 1)">
            <v-icon size="18">add</v-icon>
          </button>
        </div>
        <p class="k-lines__price">
          <u-price :amount="lineTotal(item)" :currency="item.currency" />
          <s v-if="item.dis > 0"><u-price :amount="(item.price + item.dis) * shown(item)" :currency="item.currency" /></s>
        </p>
      </div>
    </section>
  </div>
</template>

<script>
import { settling, shownCount, stepTo } from "../kalio-basket";
import { productImage, sellerRoute, vendorImage, vendors } from "../kalio-catalog";

/* The size of a variant in words: its volume, weight, pack, colour or style. */
function sizeOf(variant) {
  if (!variant) return null;
  return variant.volume || variant.weight || variant.pack || variant.type || variant.style || null;
}

export default {
  name: "KalioCartLines",
  inject: ["$shop"],

  props: {
    basket: { type: Object, required: true },
  },

  data() {
    return {
      sellers: new Map(),
    };
  },

  computed: {
    currency() {
      return this.basket.bill?.currency || this.basket.currency;
    },

    /* Lines by seller, in the order they were first added; lines taken to
       zero are left out at once. */
    groups() {
      const groups = new Map();
      for (const item of this.basket.items || []) {
        if (this.shown(item) <= 0) continue;
        const key = item.vendor_id || 0;
        if (!groups.has(key)) {
          const vendor = this.sellers.get(item.vendor_id);
          groups.set(key, {
            key,
            name: vendor?.name || this.$shop?.title || "",
            logo: vendor ? vendorImage(vendor, true) : null,
            route: vendor ? sellerRoute(vendor) : null,
            items: [],
            units: 0,
            subtotal: 0,
          });
        }
        const group = groups.get(key);
        group.items.push(item);
        group.units += this.shown(item);
        group.subtotal += this.lineTotal(item);
      }
      return [...groups.values()];
    },
  },

  created() {
    vendors().then((list) => {
      this.sellers = new Map(list.map((vendor) => [vendor.id, vendor]));
    });
  },

  methods: {
    settling,

    lineProduct(item) {
      return { id: item.product_id, type: item.product?.type || this.basket.type };
    },

    shown(item) {
      return shownCount(this.lineProduct(item), item);
    },

    step(item, delta) {
      stepTo(this, this.lineProduct(item), item, this.shown(item) + delta);
    },

    lineTotal(item) {
      return item.price * this.shown(item) - (this.shown(item) === item.count ? item.offer_amount || 0 : 0);
    },

    available(item) {
      return item.vendor_product?.quantity ?? item.variant?.quantity ?? item.product?.quantity ?? 99;
    },

    size(item) {
      return sizeOf(item.variant);
    },

    image(item) {
      if (item.variant?.image) return window.CDN.GET_SHOP_IMAGE_PATH(item.variant.image, 128);
      return productImage(item.product, true);
    },

    productRoute(id) {
      return { name: window.$storefront.routes.PRODUCT_PAGE, params: { product_id: id } };
    },
  },
};
</script>
