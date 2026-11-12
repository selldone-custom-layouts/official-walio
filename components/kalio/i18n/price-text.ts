/*
 * Money inside a sentence, written exactly as Selldone's u-price writes the
 * amounts beside it ("$26.42"). The order page said "$26.42" in the total and
 * "25,00 US$" / "Paga 26,42 US$ al repartidor" in its sentences (Intl in the
 * visitor's language): two ways to write one price on one page (the owner's
 * Spanish test order, 12 November 2026). Same steps as UPrice.vue: the
 * currency's own numeral format, the sign (u-price's unicode test), before
 * the number unless the currency or the shop puts it after.
 */
import numeral from "numeral";
import { Currency } from "@selldone/core-js/enums/payment/Currency";
import { CurrencyHelper } from "@selldone/core-js/helper/currency/CurrencyHelper";

export function priceText(
  amount: number | null | undefined,
  code?: string | null,
  shop?: any,
  options: { decimals?: number } = {},
): string {
  const key = (code || "USD") as keyof typeof Currency;
  const currency: any = (Currency as any)[key];
  const value = Number(amount) || 0;
  if (!currency) return `${value} ${key}`;
  try {
    const scaled = value * (currency.alt_factor || 1);
    // decimals: a shorter amount ("From $35") in the same style as the full one.
    const number =
      options.decimals != null
        ? new Intl.NumberFormat("en-US", { minimumFractionDigits: options.decimals, maximumFractionDigits: options.decimals }).format(scaled)
        : Math.abs(scaled) < Math.pow(10, -currency.floats)
          ? "0.00"
          : numeral(scaled).format(currency.format);
    const name = CurrencyHelper.GetUserSelectedCurrencyName(currency, key, true);
    const unicode = name === CurrencyHelper.GetUserSelectedCurrencyUnicode(currency, key);
    if (!unicode) {
      const t = (window as any).$i18n_global?.t;
      return `${number} ${typeof t === "function" ? t(name) : name}`;
    }
    const atEnd = !!shop?.theme?.reverse_currency || CurrencyHelper.GetUserSelectedCurrencySignAtEnd(currency, key);
    return atEnd ? `${number} ${name}` : `${name}${number}`;
  } catch {
    return `${value} ${key}`;
  }
}
