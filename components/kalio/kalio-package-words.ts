/*
 * Words that the shared packages (components/region-switcher) and the
 * Selldone components Kalio patches (modules/components) show with
 * their own t(). They are listed here, with their English, so the extractor
 * (new-shop-kits/i18n/tools/i18n-extract.cjs) puts them in base/en.ts and
 * every language file translates them; kalio-i18n hands every dictionary to
 * the region package. Nothing calls this function.
 */
import { t } from "./i18n/kalio-i18n";

export function packageWords(): string[] {
  return [
    t("region.title", "Language & currency"),
    t("region.language", "Language"),
    t("region.currency", "Currency"),
    t("region.done", "Done"),
    t("region.close", "Close"),
    t("region.note", "Prices everywhere change at once: shelves, filters, basket and checkout."),
    // Selldone components that Kalio patches (patches/modules-components.kalio.patch) and that call the global t()
    t("compare.fab.close", "Close the comparison"),
    t("compare.fab.open", { one: "Compare {n} product", other: "Compare {n} products" }, { n: 2 }),
    t("card.compare.remove", "Take it out of the comparison"),
    t("card.compare.add", "Compare up to 10 products side by side"),
    t("card.compare.on", "Comparing"),
    t("pdp.saved.remove", "Saved — remove from Saved"),
    t("pdp.save", "Save"),
    t("pdp.saved", "Saved"),
    t("listing.showMore", "Show {n} more", { n: 2 }),
    t("listing.empty.search.title", "Nothing matches “{search}”"),
    t("listing.empty.search.text", "Check the spelling, or try a shorter or more general word."),
    t("listing.empty.filters.title", "No products match these filters"),
    t("listing.empty.filters.text", "Take a filter or two off to see more of the aisle."),
    t("listing.empty.none.title", "Nothing here yet"),
    t("listing.empty.none.text", "The sellers have not stocked this shelf yet. The rest of the shop is a tap away."),
    t("update.ready", "A newer version of the shop is ready."),
    t("update.refresh", "Refresh"),
  ];
}
