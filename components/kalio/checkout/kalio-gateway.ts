/*
 * A way to pay, in the visitor's language (ES-02, 11 November 2026).
 *
 * Selldone's gateways are platform records (`gateways.name`, one per kind
 * and currency, e.g. code "cod_usd", name "Cash on delivery"), sent in
 * English whatever X-Localization says, and without translations. The
 * payment window wrote that name under its own translated kind ("Pago
 * contra reembolso" over "Cash on delivery"), and the order's receipt
 * wrote it as the way the order is paid.
 *
 * The kinds that are plain words, not brands, are named here by the
 * gateway's own flags (cod, cash), never by its English text; every other
 * gateway (Stripe, PayPal, a bank) keeps its name. Nothing here touches the
 * gateway's code or what picking it does.
 */
import { t } from "../i18n/kalio-i18n";

type GatewayLike = { cod?: boolean; cash?: boolean; type?: string; name?: string | null } | null | undefined;

/** "cod" | "cash" | null: a kind named by words rather than a brand. */
export function gatewayKind(gateway: GatewayLike): "cod" | "cash" | null {
  if (!gateway) return null;
  if (gateway.cod || gateway.type === "cod") return "cod";
  if (gateway.cash || gateway.type === "cash") return "cash";
  return null;
}

/** The gateway's name for the shopper: "Pago a la entrega" for cash on delivery, a brand as it is. */
export function gatewayName(gateway: GatewayLike): string {
  const kind = gatewayKind(gateway);
  if (kind === "cod") return t("order.pay.cod", "Cash on delivery");
  if (kind === "cash") return t("order.pay.cash", "Cash");
  return gateway?.name || "";
}

/**
 * The payment window's second line, under Selldone's kind ("Pago contra
 * reembolso", "Pago en línea"). For a brand, its name. For cash on
 * delivery or cash, the gateway's name would only repeat the kind, so the
 * line says how it works instead.
 */
export function gatewayLine(gateway: GatewayLike): string {
  const kind = gatewayKind(gateway);
  if (kind === "cod") return t("pay.way.codNote", "Pay the courier when your order arrives.");
  if (kind === "cash") return t("pay.way.cashNote", "Pay in cash when you collect it.");
  return gateway?.name || "";
}
