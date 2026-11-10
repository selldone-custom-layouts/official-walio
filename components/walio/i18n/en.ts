/*
 * Walio's own words, in English (the first language). Another language is
 * a file beside this one with the same keys (da.ts, ar.ts…), added to
 * index.ts when the owner enables that language in the shop; a missing key
 * falls back to English. Use them through t() from the region switcher:
 *   import { t } from "../../region-switcher/region";
 *   {{ t("menu.showMore", { n: 10 }) }}
 */
export const en: Record<string, string> = {
  // The region switcher (pill, panel, phone row and sheet)
  "region.title": "Language & currency",
  "region.language": "Language",
  "region.currency": "Currency",
  "region.done": "Done",
  "region.close": "Close",
  "region.note": "Prices everywhere change at once: cards, filters, cart and checkout.",

  // Phone menu
  "menu.showMore": "Show {n} more",
  "menu.showFewer": "Show fewer",
};
