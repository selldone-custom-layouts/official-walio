/*
 * Theme switcher: the colour palettes and Light / Dark that a shopper picks
 * in the footer (the owner's rule, 9 November 2026: "put colour palettes and
 * light and dark themes in the footer; a click changes the site's theme").
 *
 * Layout-agnostic: nothing here knows a Layout's names. The Layout passes
 * one ThemeSwitcherConfig (storage key, palettes, the map from palette
 * values to its own CSS variables, its dark token set, Vuetify theme names)
 * to bootThemeSwitcher() before the app mounts, and puts
 * <theme-switcher-button /> in its header (the default: a "Theme" action
 * that opens a small panel) or <theme-switcher-row /> in its footer.
 * See PORTING.md in the kit.
 *
 * One call changes everything at once, with no reload:
 * - the Layout's tokens (inline on <html>, so they outrank its :root);
 * - Vuetify's theme (primary in both themes, and light <-> dark), so
 *   Selldone's own fields, menus, dialogs and sheets follow;
 * - a class on <html> while dark (config.darkClass) and data-ts-mode /
 *   data-ts-palette, for the Layout's own dark rules;
 * - <meta name="theme-color"> and color-scheme.
 * The choice is kept in localStorage (try/catch: private windows and blocked
 * storage keep it for the visit) and applied before the first paint.
 *
 * Besides the tested palettes, a shopper may pick any colour ("Custom
 * colour", config.custom): paletteFromColor() (theme-color.ts) builds a whole
 * palette from it that reads in both modes, and the pick is kept and painted
 * before the first paint like the others.
 */
import { reactive } from "vue";
import { normalizeHex, paletteFromColor, type CustomColorOptions } from "./theme-color";

export type ThemeMode = "light" | "dark";

/** The colours one palette needs in one mode. */
export interface PaletteValues {
  /** The action colour: buttons, the header, chosen states. */
  primary: string;
  /** Its hover / pressed shade. */
  deep: string;
  /** A soft tint of it (chips, hovers, selected rows) on this mode's ground. */
  soft: string;
  /** Text and icons on primary (4.5:1 or more, measured). */
  onPrimary: string;
  /** The colour of links and accent words on this mode's cards (4.5:1+). */
  text: string;
  /** Anything else the Layout maps (e.g. "lift"). */
  [key: string]: string;
}

export interface ThemePalette {
  id: string;
  /** Shown as the swatch's tooltip and aria-label. */
  name: string;
  light: PaletteValues;
  dark: PaletteValues;
}

/** Where the switcher shows: only on the Layout's own showcase shops (the
    default), always, or never. */
export type SwitcherMode = "showcase" | "on" | "off";

/**
 * The merchant's choice, in one file per Layout (e.g. digito-theme.settings.ts):
 * the Layout's designed default on any shop, painted before the first paint.
 * On a shop that does not show the switcher it is the only theme.
 */
export interface ThemeSettings {
  /** One of the tested palettes' ids. */
  palette?: string;
  /** Any colour (#RRGGBB) instead of a tested palette, made readable by paletteFromColor(). */
  brandColor?: string;
  mode?: ThemeMode;
  /** "showcase" (only on the Layout's showcase shops), "on" or "off". */
  themeSwitcher?: SwitcherMode;
  /** With brandColor: "auto" lets a light brand (yellow) keep its colour with dark words on it; "white" darkens it until white reads. */
  textOnBrand?: "auto" | "white";
}

export interface ThemeSwitcherConfig {
  /** The merchant's settings (palette or brandColor, mode, themeSwitcher, textOnBrand). */
  settings?: ThemeSettings;
  /**
   * "showcase" (default): only when the running shop is one of showcaseShops
   * (a merchant who imports the Layout into their own shop never sees it);
   * "on": always; "off": never. Hidden means no effect at all: no button, no
   * panel, a stored choice is ignored, Vuetify and the tokens stay at the
   * Layout's own default.
   */
  mode?: SwitcherMode;
  /** The shops that show it in "showcase" mode, by Selldone shop id and/or the
      shop's name (the storefront's @name). Add new showcase shops here. */
  showcaseShops?: { id?: number; name?: string }[];
  /** localStorage key, one per Layout, e.g. "<layout>-theme". */
  storageKey: string;
  /** The first is the default (the brand). */
  palettes: ThemePalette[];
  defaultMode?: ThemeMode;
  /**
   * CSS variable -> palette value, set on <html> for the current palette and
   * mode. "primary" takes palette[mode].primary; "primary:rgb" writes it as
   * "r, g, b" (for rgba(var(--x), .3) and Vuetify's --v-theme-*);
   * "light.primary" or "dark.text" pins a mode.
   */
  tokens: Record<string, string>;
  /** CSS variable -> value while dark (removed again on light). */
  dark: Record<string, string>;
  /** CSS variable -> value while light (removed on dark); usually empty. */
  light?: Record<string, string>;
  /** Class on <html> while dark (default "theme-dark"). */
  darkClass?: string;
  vuetify?: {
    /** Vuetify theme names (default "light" and "dark"). */
    light?: string;
    dark?: string;
    /** Vuetify colour -> palette value, per theme (default primary). */
    paletteColors?: Record<string, string>;
    /** Fixed Vuetify colours for each theme (the dark theme's surfaces). */
    lightColors?: Record<string, string>;
    darkColors?: Record<string, string>;
  };
  /** Palette value for <meta name="theme-color"> (default "light.primary"); false leaves it. */
  metaThemeColor?: string | false;
  /** Colours of the switcher itself (CSS values, usually the Layout's tokens):
      text, muted text, hairlines, the header panel's ground, the font. */
  ui?: { ink?: string; muted?: string; line?: string; surface?: string; font?: string };
  /** Words: the button and panel name, the palettes' and the mode's group
      names (aria-label), the panel's headings, and the two modes. */
  labels?: { theme?: string; palettes?: string; mode?: string; modeTitle?: string; light?: string; dark?: string; custom?: string; adjusted?: string; brand?: string };
  /**
   * The free colour picker in the header panel (a sixth swatch, "Custom
   * colour"). Its options go to paletteFromColor(): headerContrast when the
   * Layout's header is painted with the light primary (Digito: 6.5), the dark
   * surfaces, extras every palette must carry (Digito: pop). false hides it.
   */
  custom?: false | (CustomColorOptions & { start?: string });
}

/** The custom palette's id in the state and in storage. */
export const CUSTOM_ID = "custom";
/** The merchant's brand colour (settings.brandColor) as a palette id. */
export const BRAND_ID = "brand";

const DEFAULT_LABELS = {
  theme: "Theme",
  palettes: "Colour",
  mode: "Light or dark",
  modeTitle: "Mode",
  light: "Light",
  dark: "Dark",
  custom: "Custom colour",
  adjusted: "Adjusted for readability",
  brand: "Brand colour",
};

let cfg: ThemeSwitcherConfig | null = null;
let vuetify: any = null;

/** The current choice (reactive: the header panel and the footer row read it). custom: the last free pick;
    enabled: whether this shop shows the switcher at all (decided at boot). */
export const themeState = reactive<{ palette: string; mode: ThemeMode; custom: string; enabled: boolean }>({ palette: "", mode: "light", custom: "", enabled: false });

/**
 * The running shop, known at boot without waiting for /info: the shop object
 * Selldone's page writes inline (window.shop, with its id), else the
 * <meta name="shop-name"> every storefront page carries (the SDK reads the
 * same tag). window.__THEME_SWITCHER_SHOP__ = { id, name } overrides both, for
 * tests only.
 */
export function shopIdentity(): { id: number | null; name: string } {
  const w = window as any;
  const test = w.__THEME_SWITCHER_SHOP__;
  const id = Number(test?.id ?? w.shop?.id) || null;
  const meta = document.querySelector('meta[name="shop-name"]')?.getAttribute("content");
  const name = String(test?.name ?? w.shop?.name ?? meta ?? "").toLowerCase();
  return { id, name };
}

/** Whether the switcher shows on this shop (config.mode and showcaseShops). */
export function switcherAllowed(config: ThemeSwitcherConfig): boolean {
  const mode = config.settings?.themeSwitcher || config.mode || "showcase";
  if (mode === "on") return true;
  if (mode === "off") return false;
  const { id, name } = shopIdentity();
  return (config.showcaseShops || []).some((s) => (id != null && s.id != null ? s.id === id : !!s.name && !!name && s.name.toLowerCase() === name));
}

let customCache: { key: string; palette: ThemePalette & { picked: string; adjusted: { light: boolean; dark: boolean } } } | null = null;

/** The palette built from the custom pick (or from config.custom.start, or the brand colour). */
export function customPalette() {
  if (!cfg || cfg.custom === false || cfg.custom == null) return null;
  const opts = cfg.custom;
  const hex = normalizeHex(themeState.custom) || normalizeHex(opts.start || "") || cfg.palettes[0].light.primary;
  const key = hex + JSON.stringify(opts);
  if (customCache?.key === key) return customCache.palette;
  const built = paletteFromColor(hex, opts);
  const palette = {
    id: CUSTOM_ID,
    name: { ...DEFAULT_LABELS, ...(cfg.labels || {}) }.custom,
    light: built.light as PaletteValues,
    dark: built.dark as PaletteValues,
    picked: built.picked,
    adjusted: built.adjusted,
  };
  customCache = { key, palette };
  return palette;
}

const rgbOf = (hex: string): string => {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(", ");
};

let brandCache: ThemePalette | null = null;

/** The merchant's brand colour as a palette (settings.brandColor), or null. */
function brandPalette(): ThemePalette | null {
  const hex = normalizeHex(cfg?.settings?.brandColor || "");
  if (!cfg || !hex) return null;
  if (brandCache) return brandCache;
  const opts = { ...(cfg.custom || {}), textOnBrand: cfg.settings?.textOnBrand || "white" };
  const built = paletteFromColor(hex, opts);
  brandCache = { id: BRAND_ID, name: { ...DEFAULT_LABELS, ...(cfg.labels || {}) }.brand, light: built.light as PaletteValues, dark: built.dark as PaletteValues };
  return brandCache;
}

/** The tested palettes as shown: a brand colour from the settings takes the first (brand) place. */
export function paletteList(): ThemePalette[] {
  if (!cfg) return [];
  const brand = brandPalette();
  return brand ? [brand, ...cfg.palettes.slice(1)] : cfg.palettes;
}

/** The merchant's default choice (settings), and whether it is the Layout's own stock default. */
function defaults(): { palette: string; mode: ThemeMode; stock: boolean } {
  const st = cfg!.settings || {};
  const list = paletteList();
  const palette = brandPalette() ? BRAND_ID : list.some((p) => p.id === st.palette) ? st.palette! : list[0].id;
  const mode: ThemeMode = st.mode === "dark" ? "dark" : st.mode === "light" ? "light" : cfg!.defaultMode || "light";
  return { palette, mode, stock: palette === cfg!.palettes[0].id && mode === "light" };
}

/* A merchant's settings on a shop that does not show the switcher: painted, never stored or changed. */
let fixedTheme = false;

function palette(): ThemePalette {
  const list = paletteList();
  if (themeState.palette === CUSTOM_ID) {
    const custom = customPalette();
    if (custom) return custom;
  }
  return list.find((p) => p.id === themeState.palette) || list[0];
}

/** "primary", "primary:rgb", "dark.text" -> the colour for the current choice. */
function valueOf(p: ThemePalette, ref: string): string {
  const [path, format] = ref.split(":");
  const [a, b] = path.split(".");
  const values = b ? p[a as ThemeMode] : p[themeState.mode];
  const key = b || a;
  const v = values?.[key] ?? p.light[key] ?? "";
  return format === "rgb" && v ? rgbOf(v) : v;
}

function read(): { palette: string; mode: ThemeMode; custom: string } {
  const d = defaults();
  const fallback = { palette: d.palette, mode: d.mode, custom: "" };
  try {
    const raw = window.localStorage.getItem(cfg!.storageKey);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    const custom = normalizeHex(v?.custom || "") || "";
    const customOk = cfg!.custom != null && cfg!.custom !== false && !!custom;
    return {
      palette: paletteList().some((p) => p.id === v?.palette) ? v.palette : v?.palette === CUSTOM_ID && customOk ? CUSTOM_ID : fallback.palette,
      mode: v?.mode === "dark" ? "dark" : v?.mode === "light" ? "light" : fallback.mode,
      custom,
    };
  } catch {
    return fallback;
  }
}

function save(): void {
  try {
    const v: Record<string, string> = { palette: themeState.palette, mode: themeState.mode };
    if (themeState.custom) v.custom = themeState.custom;
    window.localStorage.setItem(cfg!.storageKey, JSON.stringify(v));
  } catch {
    /* private window or blocked storage: the choice lasts for this visit */
  }
}

/** Paint the current choice on the whole page, now. */
export function applyTheme(): void {
  if (!cfg || (!themeState.enabled && !fixedTheme)) return;
  const p = palette();
  const dark = themeState.mode === "dark";
  const root = document.documentElement;
  const style = root.style;

  for (const [name, ref] of Object.entries(cfg.tokens)) style.setProperty(name, valueOf(p, ref));

  const on = (dark ? cfg.dark : cfg.light) || {};
  const off = (dark ? cfg.light : cfg.dark) || {};
  for (const name of Object.keys(off)) if (!(name in on) && !(name in cfg.tokens)) style.removeProperty(name);
  for (const [name, v] of Object.entries(on)) style.setProperty(name, v);

  // The row's own colours.
  const v = p[themeState.mode];
  style.setProperty("--ts-accent", v.primary);
  style.setProperty("--ts-on-accent", v.onPrimary);
  style.setProperty("--ts-ring", v.text);
  if (cfg.ui?.ink) style.setProperty("--ts-ink", cfg.ui.ink);
  if (cfg.ui?.muted) style.setProperty("--ts-muted", cfg.ui.muted);
  if (cfg.ui?.line) style.setProperty("--ts-line", cfg.ui.line);
  if (cfg.ui?.surface) style.setProperty("--ts-surface", cfg.ui.surface);
  if (cfg.ui?.font) style.setProperty("--ts-font", cfg.ui.font);

  root.classList.toggle(cfg.darkClass || "theme-dark", dark);
  root.dataset.tsMode = themeState.mode;
  root.dataset.tsPalette = p.id;
  style.colorScheme = dark ? "dark" : "light";

  if (cfg.metaThemeColor !== false) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", valueOf(p, cfg.metaThemeColor || "light.primary"));
  }

  if (vuetify?.theme) {
    try {
      const names = { light: cfg.vuetify?.light || "light", dark: cfg.vuetify?.dark || "dark" };
      const themes = vuetify.theme.themes.value;
      const map = cfg.vuetify?.paletteColors || { primary: "primary" };
      for (const mode of ["light", "dark"] as ThemeMode[]) {
        const t = themes[names[mode]];
        if (!t) continue;
        for (const [color, ref] of Object.entries(map)) {
          const [path, format] = ref.split(":");
          t.colors[color] = valueOf(p, `${mode}.${path.split(".").pop()}${format ? ":" + format : ""}`);
        }
      }
      vuetify.theme.global.name.value = names[themeState.mode];
    } catch {
      /* Vuetify not ready: the class and tokens are already set */
    }
  }
}

/** Change the palette, the mode and/or the custom colour (saved, applied at once).
    A custom colour selects the custom palette; a tested palette leaves it. */
export function setTheme(next: { palette?: string; mode?: ThemeMode; custom?: string }): void {
  if (!cfg || !themeState.enabled) return;
  const custom = next.custom != null ? normalizeHex(next.custom) : null;
  if (custom && cfg.custom != null && cfg.custom !== false) {
    themeState.custom = custom;
    themeState.palette = CUSTOM_ID;
  } else if (next.palette === CUSTOM_ID && customPalette()) themeState.palette = CUSTOM_ID;
  else if (next.palette && paletteList().some((p) => p.id === next.palette)) themeState.palette = next.palette;
  if (next.mode === "light" || next.mode === "dark") themeState.mode = next.mode;
  applyTheme();
  save();
}

/** For the footer row. */
export function useThemeSwitcher() {
  return {
    state: themeState,
    palettes: paletteList(),
    labels: { ...DEFAULT_LABELS, ...(cfg?.labels || {}) },
    customEnabled: !!cfg && cfg.custom != null && cfg.custom !== false,
    customPalette,
    setTheme,
  };
}

/**
 * Call once, after creating Vuetify and before app.mount(): reads the saved
 * choice and paints it, so the default never flashes.
 */
export function bootThemeSwitcher(config: ThemeSwitcherConfig, vuetifyInstance?: any): void {
  cfg = config;
  vuetify = vuetifyInstance || null;
  brandCache = null;
  themeState.enabled = switcherAllowed(config);
  if (!themeState.enabled) {
    /* No switcher here. The Layout's stock default: nothing at all happens.
       A merchant's own settings (another palette, a brand colour, dark):
       painted as the only theme; nothing is read from or written to storage. */
    const d = defaults();
    if (d.stock) return;
    fixedTheme = true;
    setVuetifyColors(config);
    Object.assign(themeState, { palette: d.palette, mode: d.mode, custom: "" });
    applyTheme();
    return;
  }
  setVuetifyColors(config);
  Object.assign(themeState, read());
  applyTheme();
  // Another tab changed it: follow.
  try {
    window.addEventListener("storage", (e) => {
      if (e.key !== config.storageKey) return;
      Object.assign(themeState, read());
      applyTheme();
    });
  } catch {
    /* no window events (prerender) */
  }
}

/* The dark theme's surfaces (and any fixed light colours) into Vuetify. */
function setVuetifyColors(config: ThemeSwitcherConfig): void {
  try {
    const themes = vuetify?.theme?.themes?.value;
    const names = { light: config.vuetify?.light || "light", dark: config.vuetify?.dark || "dark" };
    if (themes?.[names.dark] && config.vuetify?.darkColors) Object.assign(themes[names.dark].colors, config.vuetify.darkColors);
    if (themes?.[names.light] && config.vuetify?.lightColors) Object.assign(themes[names.light].colors, config.vuetify.lightColors);
  } catch {
    /* keep Vuetify's own colours */
  }
}
