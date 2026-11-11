/*
 * Walio — the theme switcher's config (the footer's "Theme" row, above the
 * legal row: the owner, 10 November 2026, the same on every molino Layout as
 * on Digito and Besti).
 *
 * The switcher itself is Layout-agnostic (components/theme-switcher/); this
 * file is everything Walio-specific: the palettes, which Kalio variables
 * each palette value feeds, the dark token set, and Vuetify's dark surfaces.
 * storefront.ts calls bootThemeSwitcher(WALIO_THEME, vuetify) before
 * mounting, so the chosen theme paints first, with no flash.
 *
 * Walio's dress: a solid header in the action colour (blue) with white
 * words, a white search and a yellow cart ("spark", the same in every
 * palette, with navy words), savings in green, a deep navy footer. The
 * header band is painted with the palette's light primary in both modes.
 *
 * Contrast (WCAG 2.1, measured): white on each light primary — blue 6.50,
 * green 6.99, violet 7.10, teal 6.51, orange 6.37 (6.3 or more: the header
 * band carries 14% white hover pills). White on each dark primary — 5.16,
 * 5.48, 5.21, 5.36, 5.18, each 3:1 or more against the dark card #161d2e;
 * each dark "text" colour on that card — 9.32, 11.03, 9.11, 11.60, 9.97.
 */
import type { ThemeSwitcherConfig } from "../theme-switcher/theme-switcher";
import { THEME_SETTINGS } from "./walio-theme.settings";
import { t } from "../kalio/i18n/kalio-i18n";

/* Plain hex mixes (not color-mix), so the audits can measure them. */
const mix = (c: string, pct: number, base: string): string => {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [rgb(c), rgb(base)];
  return "#" + a.map((v, i) => Math.round((v * pct + b[i] * (100 - pct)) / 100).toString(16).padStart(2, "0")).join("");
};

export const WALIO_THEME: ThemeSwitcherConfig = {
  settings: THEME_SETTINGS,

  /* The owner (9 November 2026): a merchant who imports Walio into their
     own shop must not see the switcher. With themeSwitcher "showcase" it
     shows only on these shops (window.shop.id, else <meta name="shop-name">). */
  showcaseShops: [
    { id: 15549, name: "digini-hzgablru" }, // Digini: Digito, Besti
    { id: 15645, name: "molino" }, // Molino: Molino, Tario, Walio, Dino, Valero
  ],

  storageKey: "walio-theme",
  darkClass: "wl-dark",

  palettes: [
    {
      id: "blue",
      get name() {
        return t("walio.palette.blue", "Walio blue");
      },
      light: { primary: "#005cb9", deep: "#004f9a", lift: "#1a83e8", soft: "#e6f1fc", onPrimary: "#ffffff", text: "#005cb9" },
      dark: { primary: "#1f6ad4", deep: "#1d4ed8", lift: "#3b82f6", soft: "#16264d", onPrimary: "#ffffff", text: "#93c5fd" },
    },
    {
      id: "green",
      get name() {
        return t("walio.palette.green", "Green");
      },
      light: { primary: "#05664a", deep: "#064e3b", lift: "#047857", soft: "#e3f6ee", onPrimary: "#ffffff", text: "#05664a" },
      dark: { primary: "#047857", deep: "#065f46", lift: "#059669", soft: "#123a30", onPrimary: "#ffffff", text: "#6ee7b7" },
    },
    {
      id: "violet",
      get name() {
        return t("walio.palette.violet", "Violet");
      },
      light: { primary: "#6d28d9", deep: "#5b21b6", lift: "#7c3aed", soft: "#efe8fd", onPrimary: "#ffffff", text: "#6d28d9" },
      dark: { primary: "#8046ee", deep: "#6d28d9", lift: "#8b5cf6", soft: "#2a1d4d", onPrimary: "#ffffff", text: "#c4b5fd" },
    },
    {
      id: "teal",
      get name() {
        return t("walio.palette.teal", "Teal");
      },
      light: { primary: "#0c6680", deep: "#164e63", lift: "#0e7490", soft: "#e0f4f8", onPrimary: "#ffffff", text: "#0c6680" },
      dark: { primary: "#0e7490", deep: "#155e75", lift: "#0891b2", soft: "#123540", onPrimary: "#ffffff", text: "#67e8f9" },
    },
    {
      id: "orange",
      get name() {
        return t("walio.palette.orange", "Sunset orange");
      },
      light: { primary: "#a93a0b", deep: "#7c2d12", lift: "#c2410c", soft: "#fdeee6", onPrimary: "#ffffff", text: "#a93a0b" },
      dark: { primary: "#c2410c", deep: "#9a3412", lift: "#ea580c", soft: "#3d2215", onPrimary: "#ffffff", text: "#fdba74" },
    },
  ],

  /* Palette value -> the Kalio variables that carry it (--k-green* is
     Kalio's name for the action colour, whatever its hue). */
  tokens: {
    "--k-green": "primary",
    "--k-green-deep": "deep",
    "--k-green-lift": "lift",
    "--k-green-soft": "soft",
    "--k-on-green": "onPrimary",
    "--w-blue": "primary",
    "--w-blue-deep": "deep",
    "--w-head": "light.primary",
    "--w-band": "light.deep",
    "--w-link": "text",
    "--w-primary-rgb": "primary:rgb",
    "--w-on-brand": "onPrimary",
    "--w-on-brand-rgb": "onPrimary:rgb",
  },

  /* While dark (Digito's neutrals, the same on every molino Layout but
     Valero). The packshot wells and the yellow cart stay light; the saving
     green lightens as words (--w-sale-solid keeps it for badges). */
  dark: {
    "--w-ink-bg": "var(--k-green)",
    "--k-ink": "#e8ecf3",
    "--k-ink-2": "#d3d9e3",
    "--k-muted": "#a3adbd",
    "--k-paper": "#0d1220",
    "--k-wash": "#1e2639",
    "--k-card": "#161d2e",
    "--k-plain": "#1e2639",
    "--k-line": "#2a3347",
    "--k-line-strong": "#6b7690",
    "--k-line-soft": "#232b3d",
    "--k-coral": "#6fdc8c",
    "--k-coral-soft": "#173a22",
    "--k-amber": "#fbbf24",
    "--k-star-off": "#6b7690",
    "--k-shadow": "0 10px 28px -14px rgba(0, 0, 0, 0.7)",
  },

  vuetify: {
    light: "light",
    dark: "dark",
    paletteColors: { primary: "primary", "on-primary": "onPrimary" },
    darkColors: {
      background: "#0d1220",
      surface: "#161d2e",
      "surface-bright": "#1e2639",
      "surface-variant": "#2a3347",
      "on-background": "#e8ecf3",
      "on-surface": "#e8ecf3",
      "on-surface-variant": "#c3cbd8",
      "on-primary": "#ffffff",
      secondary: "#e8ecf3",
      "on-secondary": "#0d1220",
      error: "#ff6b7d",
      info: "#7aa2ff",
      success: "#4ade80",
      warning: "#fbbf24",
    },
  },

  metaThemeColor: "light.primary",
  ui: { ink: "var(--k-ink)", muted: "var(--k-muted)", line: "var(--k-line)", surface: "var(--k-card)", font: "var(--k-body)" },
  /* Read when drawn, so they follow the visitor's language (theme.* are the
     shared Kalio words; the palette names above are Walio's own). */
  labels: {
    get theme() {
      return t("theme.title", "Theme");
    },
    get palettes() {
      return t("theme.palettes", "Colour");
    },
    get mode() {
      return t("theme.mode", "Light or dark");
    },
    get modeTitle() {
      return t("theme.modeTitle", "Mode");
    },
    get light() {
      return t("theme.light", "Light");
    },
    get dark() {
      return t("theme.dark", "Dark");
    },
    get custom() {
      return t("theme.custom", "Custom colour");
    },
    get adjusted() {
      return t("theme.adjusted", "Adjusted for readability");
    },
    get brand() {
      return t("theme.brand", "Brand colour");
    },
  },

  /* "Custom colour" (the owner, 9 November 2026): any colour, made readable
     by paletteFromColor(). Walio's header is painted with the light primary
     and carries 14% white hover pills, so white on it must reach 6.5:1. */
  custom: {
    headerContrast: 6.5,
    darkSurfaces: ["#0d1220", "#161d2e", "#1e2639"],
    darkText: "#041e42",
    extras: (v, mode) => (mode === "light" ? { lift: mix(v.primary, 82, "#ffffff") } : { lift: mix(v.primary, 85, "#ffffff") }),
  },
};
