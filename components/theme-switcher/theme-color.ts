/*
 * Theme switcher: a whole palette from one colour (the panel's "Custom
 * colour"; the owner, 9 November 2026, chose a free colour picker over a
 * longer list of tested colours).
 *
 * paletteFromColor(hex, options) is a pure, deterministic function: the same
 * colour and options always give the same palette, so a reload paints exactly
 * what was shown. It keeps the picked hue and chroma (OKLCH) and moves only
 * the lightness, until every role reads:
 *
 * - light primary (buttons, and the header when the Layout paints it with the
 *   primary): white text on it at options.headerContrast (default 4.5; Digito
 *   6.5, so its 80-88% white header words and 15% white pills still read). A
 *   light pick (yellow, cyan, white) is darkened; a dark one is kept as it is;
 * - light deep (hover) and a soft tint; text on white = the light primary;
 * - dark primary (buttons on dark cards): white text at 4.6:1 or more and 3:1
 *   or more against the dark card, so black or navy never vanishes and white
 *   never glows;
 * - dark text (links, accent words): options.darkLinkContrast (default 7,
 *   never under 4.5) against the lightest dark surface;
 * - dark deep and a dark tint.
 * A grey or black pick works the same way (zero chroma).
 *
 * With textOnBrand "auto" (a merchant's brand colour, not the visitor's
 * picker), a light brand such as yellow keeps its colour as the fill, with
 * dark words on it (darkText, at headerContrast), and the darkened colour is
 * used only as text on white.
 */

export interface CustomColorOptions {
  /** White on the light primary (4.5 for buttons; more when a header band with translucent words uses it). */
  headerContrast?: number;
  /** The light theme's surfaces the primary is read on as text (default white and #f0f2f5). */
  lightSurfaces?: string[];
  /** The dark theme's surfaces: page, card, raised well (the lightest decides link contrast). */
  darkSurfaces?: string[];
  /** Links and accent words on the dark surfaces (default 7, floor 4.5). */
  darkLinkContrast?: number;
  /** The dark button against the dark card (default 3). */
  darkCardContrast?: number;
  /**
   * Words on the brand colour: "white" (default; a light colour is darkened
   * until white reads) or "auto" (a light brand such as yellow keeps its
   * colour and gets darkText on it, when that reads; the visitor's custom
   * picker always uses "white").
   */
  textOnBrand?: "auto" | "white";
  /** The dark words used on a light brand in "auto" (default #111111). */
  darkText?: string;
  /** Extra values every palette carries, per mode (e.g. { pop: "#ffd91a" }); a function gets the
      mode's values (primary, onPrimary…) and returns the extras. */
  extras?: Record<string, string> | ((values: Record<string, string>, mode: "light" | "dark") => Record<string, string>);
}

export interface CustomPalette {
  light: Record<string, string>;
  dark: Record<string, string>;
  /** The colour picked, normalised (#rrggbb). */
  picked: string;
  /** Whether the colour used differs from the pick, per mode. */
  adjusted: { light: boolean; dark: boolean };
}

const DEFAULTS: Required<Omit<CustomColorOptions, "extras">> = {
  textOnBrand: "white",
  darkText: "#111111",
  headerContrast: 4.5,
  lightSurfaces: ["#ffffff", "#f0f2f5"],
  darkSurfaces: ["#0d1220", "#161d2e", "#1e2639"],
  darkLinkContrast: 7,
  darkCardContrast: 3,
};

/* ── sRGB, WCAG ── */
type RGB = [number, number, number];

export function normalizeHex(value: string): string | null {
  const m = String(value || "")
    .trim()
    .match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return "#" + h.toLowerCase();
}

const toRgb = (hex: string): RGB => {
  const h = hex.slice(1);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
};

const toHex = (rgb: RGB): string => "#" + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

const lin = (v: number) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/* ── OKLab / OKLCH (Björn Ottosson) ── */
type LCH = [number, number, number];

function hexToOklch(hex: string): LCH {
  const [r, g, b] = toRgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

/** Linear sRGB of an OKLCH colour (may be out of gamut). */
function oklchToLinear([L, C, h]: LCH): RGB {
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: RGB) => rgb.every((v) => v >= -1e-5 && v <= 1 + 1e-5);

const encode = (v: number) => {
  v = Math.min(1, Math.max(0, v));
  return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
};

/** The colour at lightness L with the hue kept and the chroma cut to fit sRGB. */
function at(L: number, C: number, h: number): string {
  L = Math.min(1, Math.max(0, L));
  let c = C;
  if (!inGamut(oklchToLinear([L, c, h]))) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear([L, mid, h]))) lo = mid;
      else hi = mid;
    }
    c = lo;
  }
  return toHex(oklchToLinear([L, c, h]).map(encode) as RGB);
}

/** The lightness at which the colour reaches a WCAG luminance (hue kept, chroma cut to fit). */
function lightnessFor(target: number, C: number, h: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (luminance(at(mid, C, h)) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Step the lightness until test(hex) holds (after rounding to 8 bits). */
function nudge(L: number, C: number, h: number, step: number, test: (hex: string) => boolean): string {
  let hex = at(L, C, h);
  for (let i = 0; i < 400 && !test(hex); i++) hex = at((L += step), C, h);
  return hex;
}

const WHITE = "#ffffff";

/** A whole palette (light and dark values) from one colour. */
export function paletteFromColor(input: string, options: CustomColorOptions = {}): CustomPalette {
  const o = { ...DEFAULTS, ...options };
  const picked = normalizeHex(input) || "#000000";
  const [L0, C0, h] = hexToOklch(picked);
  const C = C0 < 0.002 ? 0 : C0;
  const extrasFor = (values: Record<string, string>, mode: "light" | "dark") =>
    typeof options.extras === "function" ? options.extras(values, mode) : options.extras || {};
  const ink = normalizeHex(o.darkText) || "#111111";
  const auto = o.textOnBrand === "auto";

  /* Light primary: white on it at headerContrast (4.5 at least), and the
     primary as text on every light surface and on its own soft tint at 4.5. */
  const lightNeed = Math.max(4.5, o.headerContrast);
  const soft = at(0.955, Math.min(C, 0.035), h);
  const readsLight = (x: string) => contrast(WHITE, x) >= lightNeed && [...o.lightSurfaces, soft].every((s) => contrast(x, s) >= 4.5);
  let primary = picked;
  if (!readsLight(picked)) {
    const target = 1.05 / (lightNeed + 0.15) - 0.05; // a little margin
    primary = nudge(Math.min(L0, lightnessFor(target, C, h)), C, h, -0.002, readsLight);
  }
  const [Lp] = hexToOklch(primary);
  /* Hover: darker; on a near-black primary, a step lighter (still white text at 4.5). */
  const deep = Lp > 0.2 ? nudge(Lp - 0.07, C, h, -0.002, (x) => contrast(WHITE, x) >= lightNeed) : nudge(Lp + 0.06, C, h, -0.002, (x) => contrast(WHITE, x) >= lightNeed);

  /* "auto": a light brand keeps its colour with dark words on it, when they
     read (at headerContrast, since the header carries them too); the darkened
     colour above stays the text colour on white. */
  let lightFill = primary;
  let lightDeep = deep;
  let lightOn = WHITE;
  if (auto && contrast(WHITE, picked) < lightNeed && contrast(ink, picked) >= lightNeed) {
    lightFill = picked;
    lightOn = ink;
    lightDeep = nudge(L0 - 0.05, C, h, -0.002, (x) => contrast(ink, x) >= 4.5);
    if (contrast(ink, lightDeep) < 4.5) lightDeep = picked;
  }

  /* Dark primary: white at 4.6:1 or more, and 3:1 or more against the dark card. */
  const card = o.darkSurfaces[1] || o.darkSurfaces[0];
  const maxLum = 1.05 / 4.6 - 0.05;
  const minLum = o.darkCardContrast * (luminance(card) + 0.05) - 0.05;
  let darkPrimary = picked;
  const lp = luminance(picked);
  if (lp > maxLum || lp < minLum) {
    const target = Math.min(maxLum, Math.max(minLum, (minLum + maxLum) / 2));
    const L = lightnessFor(target, C, h);
    const ok = (x: string) => contrast(WHITE, x) >= 4.6 && contrast(x, card) >= o.darkCardContrast;
    darkPrimary = at(L, C, h);
    if (!ok(darkPrimary)) {
      const down = nudge(L, C, h, -0.001, ok);
      darkPrimary = ok(down) ? down : nudge(L, C, h, 0.001, ok);
    }
  }
  let darkOn = WHITE;
  /* Dark words in dark mode only when the light palette has them too, so a
     header painted with the light primary keeps one word colour in both modes. */
  if (auto && lightOn === ink && contrast(ink, picked) >= 4.5 && contrast(picked, card) >= o.darkCardContrast) {
    darkPrimary = picked;
    darkOn = ink;
  }
  const [Ld] = hexToOklch(darkPrimary);
  const darkDeep =
    darkOn === WHITE
      ? nudge(Ld - 0.05, C, h, -0.002, (x) => contrast(WHITE, x) >= 4.6)
      : nudge(Ld + 0.04, C, h, 0.002, (x) => contrast(ink, x) >= 4.5 && contrast(x, card) >= o.darkCardContrast); // dark words: a lighter hover
  const darkSoft = at(0.3, Math.min(C, 0.07), h);

  /* Dark text: the lightest dark surface decides. */
  const lightest = o.darkSurfaces.reduce((a, b) => (luminance(b) > luminance(a) ? b : a));
  const linkNeed = Math.max(4.5, o.darkLinkContrast);
  let link = picked;
  if (contrast(picked, lightest) < linkNeed) {
    const target = linkNeed * (luminance(lightest) + 0.05) - 0.05;
    link = nudge(Math.max(L0, lightnessFor(target * 1.03, C, h)), C, h, 0.002, (x) => contrast(x, lightest) >= linkNeed);
  }

  const light: Record<string, string> = { primary: lightFill, deep: lightDeep, soft, onPrimary: lightOn, text: primary };
  const dark: Record<string, string> = { primary: darkPrimary, deep: darkDeep, soft: darkSoft, onPrimary: darkOn, text: link };
  return {
    picked,
    adjusted: { light: lightFill !== picked, dark: darkPrimary !== picked },
    light: { ...extrasFor(light, "light"), ...light },
    dark: { ...extrasFor(dark, "dark"), ...dark },
  };
}
