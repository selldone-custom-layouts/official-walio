/*
 * Kalio — the sample texts of the shop's own pages (5 November 2026).
 *
 * About us, Terms of use and Privacy come from the shop's profiles in the
 * Selldone dashboard. molino has written none of them yet, and the owner
 * asked for full pages in the meantime, filled with general text that says
 * it is a test and not real. These are those texts; each page shows them,
 * under KalioSampleNote, only while the shop's own profile is missing.
 *
 * Nothing here is a promise: the terms do not form an agreement and the
 * policy is not the shop's policy. Dates, numbers and names in the letter
 * are marked as examples.
 *
 * Each sentence or paragraph is its own key, in the visitor's language; the
 * pages call these functions at render time, so a language change follows.
 */

import { t } from "../i18n/kalio-i18n";

export interface Section {
  title: string;
  text: string[];
}

export function termsSample(shop: string): { short: string[]; sections: Section[] } {
  return {
    short: [
      t("sample.terms.short.sellers", "Products are sold by independent sellers; {shop} runs the shop.", { shop }),
      t("sample.terms.short.pay", "You pay at checkout, or on delivery where a seller offers it."),
      t("sample.terms.short.report", "Report a damaged or wrong item within 7 days."),
      t("sample.terms.short.thread", "Each order has a message thread with its seller."),
    ],
    sections: [
      {
        title: t("sample.terms.who.title", "Who we are"),
        text: [
          t("sample.terms.who.p1", "{shop} is an online marketplace. The products are sold by independent sellers; {shop} runs the shop where you find them and place your order.", { shop }),
        ],
      },
      {
        title: t("sample.terms.account.title", "Your account"),
        text: [
          t("sample.terms.account.p1", "You need an account, or a guest checkout where the shop offers one, to order. Keep your sign-in details to yourself and tell us if you think someone else has used them."),
          t("sample.terms.account.p2", "Sample paragraph: a fuller explanation would go here, written in plain words, with examples of what this means for an order."),
        ],
      },
      {
        title: t("sample.terms.orders.title", "Orders and prices"),
        text: [
          t("sample.terms.orders.p1", "Prices are set by each seller and shown with taxes as stated at checkout. An order is placed when you confirm it; the seller confirms it when they accept it."),
        ],
      },
      {
        title: t("sample.terms.payment.title", "Payment"),
        text: [
          t("sample.terms.payment.p1", "You pay at checkout, or on delivery where the seller offers cash on delivery. Card payments are handled by the payment provider and are not stored by {shop}.", { shop }),
        ],
      },
      {
        title: t("sample.terms.delivery.title", "Delivery"),
        text: [
          t("sample.terms.delivery.p1", "Delivery times and costs are shown before you pay. The seller sends the items; you can follow the order and message the seller from your account."),
        ],
      },
      {
        title: t("sample.terms.returns.title", "Returns and refunds"),
        text: [
          t("sample.terms.returns.p1", "If something arrives damaged or wrong, tell the seller from the order page within 7 days. Fresh food can be refunded but not returned."),
        ],
      },
      {
        title: t("sample.terms.changes.title", "Changes to these terms"),
        text: [t("sample.terms.changes.p1", "We may update these terms. The date at the top shows the latest version.")],
      },
    ],
  };
}

export function privacySample(shop: string): { short: string[]; sections: Section[] } {
  return {
    short: [
      t("sample.privacy.short.use", "We use your details to take and deliver orders."),
      t("sample.privacy.short.sellers", "Sellers see only what they need to send your order."),
      t("sample.privacy.short.sell", "We do not sell your data."),
      t("sample.privacy.short.cookies", "You choose which optional cookies to allow."),
    ],
    sections: [
      {
        title: t("sample.privacy.collect.title", "What we collect"),
        text: [
          t("sample.privacy.collect.p1", "Your name, contact details and delivery address; what you order; and how you use the shop (pages viewed, searches)."),
        ],
      },
      {
        title: t("sample.privacy.why.title", "Why we use it"),
        text: [
          t("sample.privacy.why.p1", "To take and deliver your orders, to let sellers and you talk about an order, to keep the shop secure and to improve it."),
          t("sample.privacy.why.p2", "Sample paragraph: a fuller explanation would go here, written in plain words, with an example for each use."),
        ],
      },
      {
        title: t("sample.privacy.who.title", "Who sees it"),
        text: [
          t("sample.privacy.who.p1", "The seller who fills your order sees what they need to send it. Payment providers handle card details. We do not sell your data."),
        ],
      },
      {
        title: t("sample.privacy.keep.title", "How long we keep it"),
        text: [t("sample.privacy.keep.p1", "Order records for as long as the law requires; your account until you close it.")],
      },
      {
        title: t("sample.privacy.rights.title", "Your rights"),
        text: [t("sample.privacy.rights.p1", "You can see, correct, download or delete your data, and say no to marketing at any time.")],
      },
      {
        title: t("sample.privacy.cookies.title", "Cookies"),
        text: [
          t("sample.privacy.cookies.p1", "Essential cookies keep you signed in and your basket full. Anything optional is your choice, below."),
        ],
      },
    ],
  };
}

export function aboutSample(shop: string) {
  return {
    title: t("sample.about.title", "Why we built one basket"),
    lead: t("sample.about.lead", "Good grocers are often small, and shopping several of them used to mean several trips, several baskets and several deliveries. We wanted their shelves side by side, in one place, with one checkout."),
    text: [
      t("sample.about.p1", "So {shop} is a marketplace: each product comes from an independent seller, prices are theirs, and they pack and send what you order from them. We look after the shop itself — the aisles, the basket and the account where you follow your orders.", { shop }),
    ],
    values: [
      {
        title: t("sample.about.values.prices.title", "Clear prices"),
        text: t("sample.about.values.prices.text", "The price you see is the one you pay, with the unit price under it and savings marked plainly."),
      },
      {
        title: t("sample.about.values.choice.title", "Your choice of seller"),
        text: t("sample.about.values.choice.text", "When two shops stock the same item, both are shown and you pick."),
      },
      {
        title: t("sample.about.values.waste.title", "Less waste"),
        text: t("sample.about.values.waste.text", "Sizes that fit a week, and seasonal picks in the journal."),
      },
      {
        title: t("sample.about.values.people.title", "People you can reach"),
        text: t("sample.about.values.people.text", "Every order has a message thread with the shop that sent it."),
      },
    ],
    timeline: [
      {
        when: t("sample.about.timeline.spring.when", "Spring"),
        text: t("sample.about.timeline.spring.text", "The first seller joins and the first aisles open. (Example.)"),
      },
      {
        when: t("sample.about.timeline.summer.when", "Summer"),
        text: t("sample.about.timeline.summer.text", "A second seller joins; both sell from one basket. (Example.)"),
      },
      {
        when: t("sample.about.timeline.today.when", "Today"),
        text: t("sample.about.timeline.today.text", "Every aisle, every seller, one checkout. (Example.)"),
      },
    ],
    sign: t("sample.about.sign", "— the {shop} team", { shop }),
  };
}

/** A shop page's text with its markup taken out, for "is it empty?". */
export function plainText(html: string | null | undefined): string {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
