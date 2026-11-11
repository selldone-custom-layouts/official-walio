/*
 * Kalio — deal timers, from Selldone's own dates (the same on every molino
 * Layout, after Digito's: the owner, 9 November 2026, "Selldone's real timer
 * is dynamic").
 *
 * A deal ends when Selldone says it does: the product's dis_end, the chosen
 * variant's when the variant has its own pricing, or the offer's (a molino
 * seller's vendor product) when the product page shows one — by PriceHelper's
 * HasDiscountCountDownMode / GetEndOfDiscountDate. A deal with no end date
 * shows no timer: no countdown to midnight, nothing invented. (On 9 November
 * 2026 none of molino's deals had an end date, so no timer shows; one that
 * gets a date in Selldone starts counting by itself.)
 *
 * One shared ticker drives every clock on the page: `clock.now` changes once
 * a second while at least one timer is on screen (useClock / releaseClock),
 * so a grid of fifty cards is one interval, not fifty.
 */
import { reactive } from "vue";
import { PriceHelper } from "@selldone/core-js";
import { t } from "./i18n/kalio-i18n";

export const clock = reactive({ now: Date.now() });

let users = 0;
let timer: ReturnType<typeof setInterval> | null = null;

export function useClock(): void {
  users++;
  if (!timer) {
    clock.now = Date.now();
    timer = setInterval(() => (clock.now = Date.now()), 1000);
  }
}

export function releaseClock(): void {
  users = Math.max(0, users - 1);
  if (!users && timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** When this deal ends (ms), by Selldone's rule; null when it has no end
 *  date, is not running now, or has no saving. */
export function dealEnd(product: any, variant: any = null): number | null {
  if (!product) return null;
  try {
    const v = variant && variant.pricing ? variant : null;
    const discount = Number((v || product).discount || 0);
    if (!(discount > 0)) return null;
    if (!PriceHelper.HasDiscountCountDownMode(product, v)) return null;
    const end = PriceHelper.GetEndOfDiscountDate(product, v) as any;
    const ms = end instanceof Date ? end.getTime() : end ? new Date(end).getTime() : NaN;
    return Number.isFinite(ms) && ms > Date.now() ? ms : null;
  } catch {
    return null;
  }
}

/** "364d 23:15:07", or "23:15:07" in the last day. */
export function leftText(end: number | null, now: number = clock.now): string {
  if (end == null) return "";
  let s = Math.max(0, Math.floor((end - now) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const pad = (n: number) => String(n).padStart(2, "0");
  const hms = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return d > 0 ? t("clock.daysLeft", { one: "{n}d {time}", other: "{n}d {time}" }, { n: d, time: hms }) : hms;
}

/** The soonest end among these deals (a row's or the deals page's head). */
export function soonestEnd(products: any[]): number | null {
  let best: number | null = null;
  for (const p of products || []) {
    const e = dealEnd(p);
    if (e != null && (best == null || e < best)) best = e;
  }
  return best;
}
