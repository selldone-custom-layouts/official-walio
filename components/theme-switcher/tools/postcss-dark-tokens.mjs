/*
 * postcss-dark-tokens: dark mode for the fixed colours in a Layout's styles
 * (the theme switcher's build step; see PORTING.md).
 *
 * A Kalio-based Layout and Selldone's own components were written for a
 * white page, with hundreds of literal colours (#fff surfaces, #e6e6e6
 * hairlines, #333 text). This plugin rewrites each light-mode literal into
 *     var(--tsd-<role>-<rrggbbaa>, <the literal>)
 * and appends one block
 *     html.<dark class> { --tsd-<role>-<rrggbbaa>: <its dark value>; ... }
 * In light mode no --tsd-* variable exists, so every rule computes exactly
 * what it did before (same value, same specificity, same order). In dark
 * mode the same rules pick the dark value. Because nothing is overridden
 * from outside, a chosen state (.-on) still beats its base rule in both
 * modes, and Selldone's storefront.scss (which loads after the Layout's
 * styles) is rewritten the same way when its files are included.
 *
 * Roles (by property) and their dark values:
 * - text (color, fill, stroke, caret): dark and mid greys -> the dark
 *   theme's ink / ink-2 / muted; a dark hue is lightened until it reads
 *   4.6:1 on the dark card; light text (white on a button) stays.
 * - surface (background*): white -> card, light greys -> raise / variant,
 *   pale tints -> a dark tint of the same hue, faint black washes -> the
 *   same faint white; strong colours (buttons, badges) stay. Selectors that
 *   hold photos (options.keepLight) keep their light surface, so a white
 *   packshot never shows its edge on a dark tile.
 * - line (border*, outline*): light greys -> line / line-strong, white
 *   separators -> card, a dark "chosen" border -> ink, faint black -> white.
 * - ring (box-shadow): like line; black shadows stay.
 * A rule that keeps a light surface (a yellow chip, a photo well) keeps its
 * dark text too.
 *
 * vite.config.ts:
 *   import darkTokens from "./components/theme-switcher/tools/postcss-dark-tokens.mjs";
 *   css: { postcss: { plugins: [darkTokens({ darkSelector: "html.<config.darkClass>", include: [...] })] } }
 */

const DEFAULTS = {
  darkSelector: "html.theme-dark",
  /** Files to rewrite (tested against the CSS file's path, / separators). */
  include: [/\/style\//, /\/components\//, /\/pages\//, /\/layouts\//],
  exclude: [/node_modules\/vuetify\//],
  /** Selectors whose light surfaces stay light (photos and packshots). */
  keepLight: /(^|[^a-z])(img|image|photo|picture|thumb|gallery|media|packshot|well|tint|qr|swatch|flag|logo)/i,
  /** More selectors that keep their light surface (a Layout's white arrows on photos). */
  keepLightExtra: null,
  /** Variables that are light surfaces in both modes (a rule painted with one keeps dark text). */
  lightVars: [],
  /** The dark theme's neutrals. */
  card: "#161d2e",
  raise: "#1e2639",
  variant: "#2a3347",
  line: "#2a3347",
  lineStrong: "#3a4459",
  ink: "#e8ecf3",
  ink2: "#d3d9e3",
  muted: "#a3adbd",
  /** Contrast a lightened hue must reach on the dark card. */
  textContrast: 4.6,
};

/* ── colour math ── */
const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1] };

function parse(str) {
  const s = str.trim().toLowerCase();
  if (NAMED[s]) return NAMED[s].slice();
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.replace(/./g, (c) => c + c);
    if (h.length !== 6 && h.length !== 8) return null;
    const n = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return [...n, h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3 || parts.some((p) => p.startsWith("var"))) return null;
    const ch = parts.slice(0, 3).map((p) => (p.endsWith("%") ? (parseFloat(p) * 255) / 100 : parseFloat(p)));
    const a = parts[3] === undefined ? 1 : parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    if (ch.some(Number.isNaN) || Number.isNaN(a)) return null;
    return [...ch.map((v) => Math.max(0, Math.min(255, v))), a];
  }
  m = s.match(/^hsla?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3 || parts.some((p) => p.startsWith("var"))) return null;
    const [r, g, b] = fromHsl(parseFloat(parts[0]), parseFloat(parts[1]) / 100, parseFloat(parts[2]) / 100);
    const a = parts[3] === undefined ? 1 : parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    return [r, g, b, a];
  }
  return null;
}

function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const t = (x) => {
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [t(h + 1 / 3) * 255, t(h) * 255, t(h - 1 / 3) * 255];
}

function lum([r, g, b]) {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const hex2 = (v) => Math.round(v).toString(16).padStart(2, "0");
const key = ([r, g, b, a]) => hex2(r) + hex2(g) + hex2(b) + (a < 1 ? hex2(a * 255) : "");
const out = ([r, g, b, a]) =>
  a < 1 ? `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${+a.toFixed(3)})` : `#${hex2(r)}${hex2(g)}${hex2(b)}`;
const withAlpha = (hex, a) => [...parse(hex).slice(0, 3), a];
/* Greys, including the cool slate greys of most designs (#0f1729, #5a6474). */
const neutral = (c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) < 40;

/* ── the dark value of one literal in one role (null: it stays) ── */
function darkOf(c, role, o) {
  const a = c[3];
  if (a === 0) return null;
  const [h, s, l] = toHsl(c);
  const n = neutral(c);
  if (role === "text") {
    if (lum(c) >= 0.4) return null; // light text (on a button, a badge) stays
    if (n) {
      if (a < 1 && l <= 0.2) return withAlpha(o.ink, a);
      return withAlpha(l <= 0.2 ? o.ink : l <= 0.36 ? o.ink2 : o.muted, a);
    }
    const card = parse(o.card);
    let L = Math.max(l, 0.5);
    let rgb = fromHsl(h, Math.min(s, 0.9), L);
    while (contrast(rgb, card) < o.textContrast && L < 0.92) rgb = fromHsl(h, Math.min(s, 0.9), (L += 0.02));
    return [...rgb, a];
  }
  if (role === "surface") {
    if (n) {
      if (l <= 0.2 && a <= 0.12) return [255, 255, 255, Math.min(1, a * 1.5)]; // faint washes
      if (l >= 0.8 && a < 0.5) return null; // white glass on a coloured band stays
      if (l >= 0.985) return withAlpha(o.card, a);
      if (l >= 0.9) return withAlpha(o.raise, a);
      if (l >= 0.8) return withAlpha(o.variant, a);
      return null;
    }
    if (l >= 0.88) return [...fromHsl(h, 0.4, 0.17), a];
    return null;
  }
  // line, and ring (a blurred box-shadow: dark ones are shadows and stay)
  if (n) {
    if (role === "ring" && l <= 0.3) return null;
    if (l <= 0.2 && a <= 0.3) return [255, 255, 255, Math.min(1, a * 1.3)];
    if (l >= 0.8 && a < 0.5) return null; // white hairlines on a coloured band stay
    if (l >= 0.97) return withAlpha(o.card, a);
    if (l >= 0.86) return withAlpha(o.line, a);
    if (l >= 0.7) return withAlpha(o.lineStrong, a);
    if (l <= 0.25) return withAlpha(o.ink, a);
    return null;
  }
  if (l >= 0.85) return [...fromHsl(h, 0.35, 0.32), a];
  return null;
}

/* A custom property takes its role from its name (--c-card, --k-line,
   --x-ink); photo wells (options.keepLight: --k-well, --k-tint) and colours
   meant for text on an accent (--c-on-accent) stay. */
const VAR_ROLE = (p, o) => {
  if (p.startsWith("--tsd-") || /(^|-)on-/.test(p) || o.keepLight.test(p)) return null;
  if (/(^|-)(ink(-d)?|text|muted|fg|copy)$/.test(p)) return "text";
  if (/(^|-)(card|paper|bg|background|surface|ground|wash|raise|page|panel|sheet|chip)$/.test(p)) return "surface";
  if (/(^|-)(line|border|rule|hairline|divider|edge)(-d|-soft|-strong)?$/.test(p)) return "line";
  return null;
};

const ROLE = (prop, o) => {
  const p = prop.toLowerCase();
  if (p.startsWith("--")) return VAR_ROLE(p, o);
  if (/^(color|fill|stroke|caret-color|-webkit-text-fill-color|text-decoration-color|-webkit-text-stroke-color)$/.test(p)) return "text";
  if (/^background(-color|-image)?$/.test(p)) return "surface";
  if (/^(border|outline|column-rule)(-(top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?(-color)?$/.test(p)) return "line";
  if (p === "box-shadow") return "ring";
  return null;
};

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^()]*\)|\bhsla?\([^()]*\)|(?<![\w-])(?:white|black)(?![\w-])/g;

/** Replace colour literals outside url(...) and outside existing var(--tsd-…). */
function rewrite(value, role, o, defs) {
  /* A box-shadow layer with no blur is an edge or a ring (a swatch's 1px
     edge, a chosen ring): it maps like a line. One with a blur is a shadow. */
  if (role === "ring") {
    const layers = value.split(/,(?![^(]*\))/);
    {
      let any = false;
      const next = layers.map((layer) => {
        const nums = layer.replace(/rgba?\([^)]*\)|hsla?\([^)]*\)|var\([^)]*\)/g, "").match(/-?\d*\.?\d+(px|rem|em)?/g) || [];
        const edge = nums.length >= 3 ? parseFloat(nums[2]) === 0 : true;
        const v = rewriteLayer(layer, edge ? "line" : "ring", o, defs);
        if (v !== null) any = true;
        return v ?? layer;
      });
      return any ? next.join(",") : null;
    }
  }
  return rewriteLayer(value, role, o, defs);
}

function rewriteLayer(value, role, o, defs) {
  let changed = false;
  const parts = value.split(/(url\([^)]*\))/i);
  const next = parts
    .map((seg, i) => {
      if (i % 2 === 1) return seg;
      return seg.replace(COLOR_RE, (lit, offset, whole) => {
        if (/var\(--tsd-[^,]*,\s*$/.test(whole.slice(0, offset))) return lit;
        const c = parse(lit);
        if (!c) return lit;
        const d = darkOf(c, role, o);
        if (!d) return lit;
        const name = `--tsd-${role}-${key(c)}`;
        defs.set(name, out(d));
        changed = true;
        return `var(${name}, ${lit})`;
      });
    })
    .join("");
  return changed ? next : null;
}

function surfaceStaysLight(rule, o) {
  const sel = rule.selector || "";
  let light = false;
  rule.each((d) => {
    if (d.type !== "decl" || ROLE(d.prop, o) !== "surface") return;
    if (o.lightVars.some((v) => d.value.includes(`var(${v}`))) light = true;
    for (const lit of d.value.replace(/url\([^)]*\)/gi, "").match(COLOR_RE) || []) {
      const c = parse(lit);
      if (!c || c[3] === 0) continue;
      const kept = o.keepLight.test(sel) || (o.keepLightExtra ? o.keepLightExtra.test(sel) : false) || !darkOf(c, "surface", o);
      if (kept && lum(c) >= 0.4) light = true;
    }
  });
  return light;
}

export default function darkTokens(options = {}) {
  const o = { ...DEFAULTS, ...options };
  return {
    postcssPlugin: "postcss-dark-tokens",
    Once(root, { result, Rule }) {
      const file = String(root.source?.input?.file || result.opts.from || "").replace(/\\/g, "/");
      if (!file || !o.include.some((re) => re.test(file)) || o.exclude.some((re) => re.test(file))) return;
      const defs = new Map();
      const keeps = (sel) => o.keepLight.test(sel) || (o.keepLightExtra ? o.keepLightExtra.test(sel) : false);
      root.walkRules((rule) => {
        if ((rule.selector || "").includes(o.darkSelector)) return;
        /* ".photo, .info { background: #fff }": the photo keeps white, the
           info darkens, so a mixed list is split in place (same order). */
        const sels = rule.selectors || [];
        if (sels.length > 1 && sels.some(keeps) && !sels.every(keeps)) {
          const dark = rule.clone({ selectors: sels.filter((x) => !keeps(x)) });
          rule.selectors = sels.filter(keeps);
          rule.after(dark);
        }
        const keepSurface = keeps(rule.selector || "");
        const keepText = surfaceStaysLight(rule, o);
        rule.each((d) => {
          if (d.type !== "decl") return;
          const role = ROLE(d.prop, o);
          if (!role) return;
          if (role === "surface" && keepSurface) return;
          if (role === "text" && keepText) return;
          const v = rewrite(d.value, role, o, defs);
          if (v) d.value = v;
        });
      });
      if (defs.size) {
        const block = new Rule({ selector: o.darkSelector });
        for (const [name, value] of defs) block.append({ prop: name, value });
        root.append(block);
      }
    },
  };
}
darkTokens.postcss = true;

export { parse, darkOf, contrast, lum };
