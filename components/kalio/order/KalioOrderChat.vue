<!--
  Kalio — talking to the shop about an order (4 November 2026).

  The conversation sits on the order page itself instead of Selldone's
  full-screen window (SOrderChatWidget and SOrderChatBox): the messages as
  bubbles, the shopper's on the right in green and the shop's on the left,
  grouped by day, and a message box under them that grows as you type
  (Enter sends on a computer, Shift+Enter starts a new line). With no
  messages yet it offers a few common questions to start from. Your own
  messages can be taken back: tap the bin, then "Delete?". Same Selldone
  calls as before (POST_CUSTOMER_BASKET_CHAT_ADD_MESSAGE and
  DELETE_CUSTOMER_BASKET_CHAT_MESSAGE), with the signed link's signature.
-->
<template>
  <section class="k-ocard k-chat">
    <header class="k-ocard__head">
      <span aria-hidden="true" class="k-ocard__ico -shop">
        <!-- The Layout's mark, as in the header: the shop record's own icon
             is still the old "KA" (the owner's buyer test, 8 November 2026). -->
        <img :src="brandMark" alt="" height="40" width="40" />
      </span>
      <div class="k-ocard__titles">
        <h2>{{ t("order.chat.title", "Messages") }}</h2>
        <p>{{ t("order.chat.lede", "Questions about this order go straight to {shop}.", { shop: $shop.title || t("order.chat.theShop", "the shop") }) }}</p>
      </div>
    </header>

    <div v-if="messages.length" ref="thread" aria-live="polite" class="k-chat__thread" role="log">
      <template v-for="group in days" :key="group.key">
        <p class="k-chat__day"><span>{{ group.label }}</span></p>
        <div
          v-for="m in group.items"
          :key="m.index"
          :class="{ '-mine': m.mine, '-busy': deleting === m.index }"
          class="k-chat__msg"
        >
          <img v-if="!m.mine" :src="avatar(m.message)" alt="" class="k-chat__face" height="30" width="30" />
          <div class="k-chat__col">
            <span v-if="!m.mine" class="k-chat__who">{{ m.message.user_name || $shop.title }}<i>{{ t("order.chat.shopBadge", "Shop") }}</i></span>
            <div class="k-chat__bubble">{{ m.message.body }}</div>
            <span class="k-chat__meta">
              <time :datetime="m.message.date" :title="full(m.message.date)">{{ time(m.message.date) }}</time>
              <button
                v-if="m.mine"
                :aria-label="confirming === m.index ? t('order.chat.deleteThis', 'Delete this message') : t('order.chat.delete', 'Delete')"
                :class="{ '-ask': confirming === m.index }"
                :disabled="deleting !== null"
                class="k-chat__bin"
                type="button"
                @blur="confirming = null"
                @click="askDelete(m)"
              >
                <v-progress-circular v-if="deleting === m.index" indeterminate size="12" width="2" />
                <template v-else-if="confirming === m.index">{{ t("order.chat.deleteAsk", "Delete?") }}</template>
                <v-icon v-else size="15">delete_outline</v-icon>
              </button>
            </span>
          </div>
        </div>
      </template>
    </div>

    <div v-else class="k-chat__empty">
      <p>{{ t("order.chat.empty", "No messages yet. Ask about the delivery, a swap, or anything else in this order.") }}</p>
      <div class="k-chat__starts">
        <button v-for="start in starters" :key="start" class="k-chat__start" type="button" @click="useStarter(start)">{{ start }}</button>
      </div>
    </div>

    <form class="k-chat__box" @submit.prevent="send">
      <label class="k-chat__field">
        <textarea
          ref="input"
          v-model="draft"
          :disabled="busy"
          :aria-label="t('order.chat.yourMessage', 'Your message')"
          :placeholder="t('order.chat.placeholder', 'Write a message…')"
          maxlength="1024"
          rows="1"
          @input="grow"
          @keydown.enter="onEnter"
        ></textarea>
      </label>
      <button :disabled="!ready" :aria-label="t('order.chat.send', 'Send')" class="k-chat__send" type="submit">
        <v-progress-circular v-if="busy" indeterminate size="18" width="2" />
        <v-icon v-else class="flip-rtl" size="20">send</v-icon>
      </button>
    </form>
    <p v-if="draft.length > 900" class="k-chat__left">{{ t("order.chat.left", { one: "{n} character left", other: "{n} characters left" }, { n: 1024 - draft.length }) }}</p>
  </section>
</template>

<script lang="ts">
import NotificationService from "@selldone/components-vue/plugins/notification/NotificationService.ts";
import { BRAND } from "../kalio-brand";
import { t } from "../i18n/kalio-i18n";

/* A few common questions to start from, in the visitor's language. */
function starters() {
  return [
    t("order.chat.starter.when", "When will it arrive?"),
    t("order.chat.starter.change", "Can I change something?"),
    t("order.chat.starter.door", "Please leave it at the door"),
  ];
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default {
  name: "KalioOrderChat",
  inject: ["$shop"],

  props: {
    basket: { type: Object, required: true },
  },

  data() {
    return {
      brandMark: BRAND.mark,
      draft: "",
      busy: false,
      confirming: null,
      deleting: null,
    };
  },

  computed: {
    starters() {
      return starters();
    },
    messages() {
      return (this.basket?.chat || []).map((message, index) => ({
        index,
        message,
        // Selldone marks the shop's replies; everything else is the shopper's.
        mine: !message.officer,
      }));
    },
    days() {
      const groups = [];
      const today = new Date();
      const yesterday = new Date(Date.now() - 864e5);
      for (const m of this.messages) {
        const at = new Date(m.message.date);
        const key = dayKey(at);
        let group = groups[groups.length - 1];
        if (!group || group.key !== key) {
          const label =
            key === dayKey(today)
              ? t("order.chat.today", "Today")
              : key === dayKey(yesterday)
                ? t("order.chat.yesterday", "Yesterday")
                : at.toLocaleDateString(this.$i18n?.locale || "en", { weekday: "long", month: "short", day: "numeric" });
          group = { key, label, items: [] };
          groups.push(group);
        }
        group.items.push(m);
      }
      return groups;
    },
    ready() {
      return !this.busy && this.draft.trim().length > 0;
    },
  },

  watch: {
    "basket.chat.length"() {
      this.$nextTick(this.toBottom);
    },
  },

  mounted() {
    this.toBottom();
  },

  methods: {
    avatar(message) {
      if (message.user_id) return this.getUserAvatar(message.user_id);
      return this.brandMark;
    },
    time(at) {
      return new Date(at).toLocaleTimeString(this.$i18n?.locale || "en", { hour: "numeric", minute: "2-digit" });
    },
    full(at) {
      return new Date(at).toLocaleString(this.$i18n?.locale || "en", { dateStyle: "full", timeStyle: "short" });
    },
    toBottom() {
      const thread = this.$refs.thread;
      if (thread) thread.scrollTop = thread.scrollHeight;
    },
    grow() {
      const input = this.$refs.input;
      if (!input) return;
      input.style.height = "auto";
      input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
    },
    onEnter(event) {
      // Enter sends on a computer; on a phone it starts a new line.
      if (event.shiftKey || event.isComposing || window.matchMedia?.("(pointer: coarse)").matches) return;
      event.preventDefault();
      this.send();
    },
    useStarter(text) {
      this.draft = text;
      this.$nextTick(() => {
        this.grow();
        this.$refs.input?.focus();
      });
    },
    signed() {
      return { signature: this.$route.query.signature, timestamp: this.$route.query.timestamp };
    },

    send() {
      if (!this.ready) return;
      this.busy = true;
      axios
        .post(window.XAPI.POST_CUSTOMER_BASKET_CHAT_ADD_MESSAGE(this.$shop.name, this.basket.id), {
          body: this.draft.trim(),
          ...this.signed(),
        })
        .then(({ data }) => {
          if (data.error) return NotificationService.showErrorAlert(null, data.error_msg);
          this.draft = "";
          this.basket.chat = data.chat;
          this.$nextTick(() => {
            this.grow();
            this.toBottom();
          });
        })
        .catch((error) => NotificationService.showLaravelError(error))
        .finally(() => {
          this.busy = false;
          this.$nextTick(() => this.$refs.input?.focus());
        });
    },

    askDelete(m) {
      if (this.confirming !== m.index) {
        this.confirming = m.index;
        return;
      }
      this.confirming = null;
      this.deleting = m.index;
      const basketId = this.basket.id;
      axios
        .delete(window.XAPI.DELETE_CUSTOMER_BASKET_CHAT_MESSAGE(this.$shop.name, basketId, m.index), { params: this.signed() })
        .then(({ data }) => {
          if (data.error) return NotificationService.showErrorAlert(null, data.error_msg);
          if (this.basket.id === basketId) this.basket.chat = data.chat;
        })
        .catch((error) => NotificationService.showLaravelError(error))
        .finally(() => (this.deleting = null));
    },
  },
};
</script>
