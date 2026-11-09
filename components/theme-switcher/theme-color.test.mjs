// Tests for theme-color.ts (paletteFromColor): every role reads, for extreme and random picks.
// Run: node components/theme-switcher/theme-color.test.mjs   (Node 22.6+ strips the TypeScript types;
// on Node 22 add --experimental-strip-types). Prints a table of the colours used and exits 1 on a failure.
import { contrast, luminance, normalizeHex, paletteFromColor } from "./theme-color.ts";

const WHITE = "#ffffff";
const SURFACES = ["#0d1220", "#161d2e", "#1e2639"];
const LIGHT_SURFACES = ["#ffffff", "#f0f2f5"];
let failures = 0;
const check = (ok, msg) => {
  if (!ok) {
    failures++;
    console.log("FAIL " + msg);
  }
};

function verify(pick, opts) {
  const p = paletteFromColor(pick, opts);
  const need = Math.max(4.5, opts.headerContrast || 4.5);
  const L = p.light;
  const D = p.dark;
  // Words on the fill (white, or dark words on a light brand in "auto").
  check(contrast(L.onPrimary, L.primary) >= need, `${pick} light primary ${L.primary}: ${L.onPrimary} on it ${contrast(L.onPrimary, L.primary).toFixed(2)} < ${need}`);
  check(contrast(L.onPrimary, L.deep) >= 4.5, `${pick} light deep ${L.deep}: ${L.onPrimary} on it ${contrast(L.onPrimary, L.deep).toFixed(2)}`);
  if (opts.textOnBrand !== "auto") check(L.onPrimary === WHITE && D.onPrimary === WHITE, `${pick} white words expected`);
  for (const s of LIGHT_SURFACES) check(contrast(L.text, s) >= 4.5, `${pick} light text ${L.text} on ${s}: ${contrast(L.text, s).toFixed(2)}`);
  check(contrast(L.text, L.soft) >= 4.5, `${pick} light text on its soft tint ${L.soft}: ${contrast(L.text, L.soft).toFixed(2)}`);
  check(contrast(D.onPrimary, D.primary) >= 4.5, `${pick} dark primary ${D.primary}: ${D.onPrimary} on it ${contrast(D.onPrimary, D.primary).toFixed(2)}`);
  check(contrast(D.primary, SURFACES[1]) >= 3 - 1e-9, `${pick} dark primary ${D.primary} vs card: ${contrast(D.primary, SURFACES[1]).toFixed(2)} (vanishes)`);
  check(contrast(D.onPrimary, D.deep) >= 4.5, `${pick} dark deep ${D.deep}: ${D.onPrimary} on it ${contrast(D.onPrimary, D.deep).toFixed(2)}`);
  for (const s of SURFACES) check(contrast(D.text, s) >= 4.5, `${pick} dark text ${D.text} on ${s}: ${contrast(D.text, s).toFixed(2)}`);
  check(contrast(D.text, D.soft) >= 4.5, `${pick} dark text on its dark tint ${D.soft}: ${contrast(D.text, D.soft).toFixed(2)}`);
  if (L.pop) check(contrast(L.pop, L.primary) >= 4.5, `${pick} pop ${L.pop} on the header ${L.primary}: ${contrast(L.pop, L.primary).toFixed(2)}`);
  // Deterministic.
  check(JSON.stringify(paletteFromColor(pick, opts)) === JSON.stringify(p), `${pick} not deterministic`);
  return p;
}

// normalizeHex
check(normalizeHex("FFF") === "#ffffff", "normalizeHex short");
check(normalizeHex("#0A4BD8") === "#0a4bd8", "normalizeHex case");
check(normalizeHex("nope") === null, "normalizeHex rejects");

// A dark pick that already reads is kept exactly.
const navy = paletteFromColor("#0a4bd8", { headerContrast: 6.5 });
check(navy.light.primary === "#0a4bd8" && !navy.adjusted.light, "Digito blue kept in light");

const pop = (v) => ({ pop: v.onPrimary === WHITE ? "#ffd91a" : v.onPrimary });
const DIGITO = { headerContrast: 6.5, extras: pop };
const BRAND_AUTO = { headerContrast: 6.5, extras: pop, textOnBrand: "auto", darkText: "#0f1729" };
const PICKS = ["#ffff00", "#00ffff", "#ffffff", "#000000", "#808080", "#ff00ff", "#7fff00", "#ff0000", "#0000ff", "#ffa500"];
const rows = [];
for (const pick of PICKS) {
  for (const opts of [DIGITO, {}, BRAND_AUTO]) verify(pick, opts);
  const p = paletteFromColor(pick, DIGITO);
  rows.push([pick, p.light.primary, contrast(WHITE, p.light.primary).toFixed(2), p.dark.primary, contrast(WHITE, p.dark.primary).toFixed(2), contrast(p.dark.primary, SURFACES[1]).toFixed(2), p.dark.text, contrast(p.dark.text, SURFACES[2]).toFixed(2)]);
}

// 2000 more picks from a fixed seed (deterministic), plus every grey.
let seed = 20261109;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let i = 0; i < 2000; i++) {
  const hex = "#" + [0, 0, 0].map(() => Math.floor(rnd() * 256).toString(16).padStart(2, "0")).join("");
  verify(hex, [DIGITO, {}, BRAND_AUTO][i % 3]);
}
for (let v = 0; v < 256; v += 5) {
  const g = v.toString(16).padStart(2, "0");
  verify(`#${g}${g}${g}`, DIGITO);
}

// A merchant's yellow brand in "auto" keeps its colour with dark words.
const gold = paletteFromColor("#F5C400", BRAND_AUTO);
check(gold.light.primary === "#f5c400" && gold.light.onPrimary === "#0f1729", `#F5C400 auto: light ${gold.light.primary} / ${gold.light.onPrimary}`);
check(gold.dark.primary === "#f5c400" && gold.dark.onPrimary === "#0f1729", `#F5C400 auto: dark ${gold.dark.primary} / ${gold.dark.onPrimary}`);
console.log(`#F5C400 auto: light fill ${gold.light.primary} with ${gold.light.onPrimary} (${contrast(gold.light.primary, gold.light.onPrimary).toFixed(2)}), text on white ${gold.light.text} (${contrast(gold.light.text, WHITE).toFixed(2)}); dark fill ${gold.dark.primary}, link ${gold.dark.text}`);
const goldWhite = paletteFromColor("#F5C400", DIGITO);
console.log(`#F5C400 white (visitor picker): light ${goldWhite.light.primary}, dark ${goldWhite.dark.primary}`);

console.log("pick     light     white  dark      white  vs-card  dark-link  vs-raise");
for (const r of rows) console.log(r.map((x, i) => String(x).padEnd([9, 10, 7, 10, 7, 9, 11, 8][i])).join(""));
console.log(failures ? `FAILURES ${failures}` : "ALL PASS (10 test picks and 2000 seeded picks, each with white words, with a 6.5:1 header and with textOnBrand auto; 52 greys)");
process.exit(failures ? 1 : 0);
