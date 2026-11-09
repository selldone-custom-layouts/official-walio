// header-check.cjs: the header's Theme button and its panel, in one theme, at many widths. Checks:
// - the button sits on the logo's line, after Account and before the cart, with white words, and the header
//   row does not wrap or scroll sideways;
// - a click opens the panel under it, inside 12px of both edges (exactly 12px on a phone), with no scrim;
// - the contrast of the header and the panel (WCAG AA, computed styles);
// - Esc closes and gives the focus back; Enter opens and Tab walks in; a second click and a click
//   outside close it;
// - a palette picked in the panel is still there after a reload, before the app has mounted.
//
// Usage (Node, from any folder):
// <palette> is a palette id, or custom:#rrggbb for the custom colour.
//   STORAGE_KEY=<storageKey> WAIT="<home selector>" BRAND="<logo link>" CART="<cart button>" ACCOUNT="<account action>" \
//     node header-check.cjs <base-url> <palette> <light|dark> [shots-folder] [widths]
// widths default "360,390,768,1024,1440". SHOP_STUB='{"id":99999,"name":"x"}' checks a shop that does not show the switcher
// instead (no switcher element, no sideways scroll). PW: a Playwright install (default kalio-marketplace's).
// Prints a block per width and "PROBLEMS n". Deliver only at 0.
/* "emerald" or "custom:#ffff00" (the custom colour). */
const themeChoice = (palette, mode) => {
  const m = String(palette).match(/^custom:(#?[0-9a-f]{3,6})$/i);
  return m ? { palette: "custom", custom: (m[1][0] === "#" ? "" : "#") + m[1].toLowerCase(), mode } : { palette, mode };
};
const PW = process.env.PW || "D:/Kalio Sample Shop Claude/kalio-marketplace/node_modules/playwright";
const { chromium } = require(PW);
const { probe } = require("./contrast-audit.cjs");
const [base, palette = "blue", mode = "light", out, widthsArg = "360,390,768,1024,1440"] = process.argv.slice(2);
const KEY = process.env.STORAGE_KEY;
const WAIT = process.env.WAIT || "header";
const BRAND = process.env.BRAND || "header a[href='/']";
const CART = process.env.CART || "header [aria-label^='Cart']";
const ACCOUNT = process.env.ACCOUNT || "";
if (!base || !KEY) {
  console.error("usage: STORAGE_KEY=<key> node header-check.cjs <base-url> <palette> <light|dark> [shots] [widths]");
  process.exit(2);
}
const widths = widthsArg.split(",").map(Number);

(async () => {
  const b = await chromium.launch();
  let problems = 0;
  for (const w of widths) {
    const mob = w < 768;
    const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 });
    // The starting theme is written once, so a reload shows what the page saved.
    await ctx.addInitScript(([k, v]) => {
      try {
        if (!sessionStorage.getItem("ts-init")) {
          localStorage.setItem(k, v);
          sessionStorage.setItem("ts-init", "1");
        }
      } catch (e) {}
    }, [KEY, JSON.stringify(themeChoice(palette, mode))]);
    if (process.env.SHOP_STUB) await ctx.addInitScript((s) => { window.__THEME_SWITCHER_SHOP__ = JSON.parse(s); }, process.env.SHOP_STUB);
    const pg = await ctx.newPage();
    await pg.goto(base.replace(/\/$/, "") + "/", { waitUntil: "domcontentloaded", timeout: 120000 });
    await pg.waitForSelector(WAIT, { timeout: 120000 });
    if (process.env.SHOP_STUB) {
      // A shop that does not show the switcher: no switcher element and no sideways scroll.
      await pg.waitForTimeout(2500);
      const h = await pg.evaluate(() => ({
        any: !!document.querySelector(".ts-pick, .ts-pick__btn, .ts-row, .ts-pop"),
        sw: document.documentElement.scrollWidth,
        vw: innerWidth,
        tsMode: document.documentElement.dataset.tsMode || null,
        tsPalette: document.documentElement.dataset.tsPalette || null,
      }));
      const bad = [];
      if (h.any) bad.push("a switcher element is in the page");
      if (h.sw > h.vw) bad.push("the page scrolls sideways");
      problems += bad.length;
      console.log(`${w} (no switcher on this shop): ${bad.length ? "PROBLEM " + bad.join("; ") : "hidden, no sideways scroll"}; theme ${h.tsPalette ? h.tsPalette + "/" + h.tsMode : "not written"}`);
      if (out) await pg.screenshot({ path: `${out}/header-hidden-${mode}-${w}.png`, clip: { x: 0, y: 0, width: w, height: mob ? 300 : 140 } });
      await ctx.close();
      continue;
    }
    await pg.waitForSelector(".ts-pick__btn", { timeout: 60000 });
    await pg.waitForTimeout(2500);
    const say = [];
    const bad = (m) => {
      problems++;
      say.push("PROBLEM " + m);
    };

    const lay = await pg.evaluate(([BRAND, CART, ACCOUNT]) => {
      const r = (s) => {
        const e = s && document.querySelector(s);
        if (!e) return null;
        const q = e.getBoundingClientRect();
        return { l: q.left, r: q.right, t: q.top, b: q.bottom };
      };
      return { brand: r(BRAND), theme: r(".ts-pick__btn"), cart: r(CART), acct: r(ACCOUNT), sw: document.documentElement.scrollWidth, vw: innerWidth };
    }, [BRAND, CART, ACCOUNT]);
    const mid = (x) => (x.t + x.b) / 2;
    if (!lay.theme) bad("no theme button");
    else {
      if (lay.brand && Math.abs(mid(lay.theme) - mid(lay.brand)) > 12) bad("the button is not on the logo's line");
      if (lay.cart && Math.abs(mid(lay.theme) - mid(lay.cart)) > 4) bad("the button and the cart are not level");
      if (lay.cart && lay.theme.r > lay.cart.l + 1) bad("the button is not before the cart");
      if (lay.acct && lay.theme.l < lay.acct.r - 1) bad("the button is not after the account");
      if (lay.theme.r > lay.vw) bad("the button runs past the right edge");
    }
    if (lay.sw > lay.vw) bad(`the page scrolls sideways (${lay.sw} > ${lay.vw})`);
    const btn = await pg.$eval(".ts-pick__btn", (e) => ({ color: getComputedStyle(e).color, text: e.innerText.replace(/\s+/g, " ").trim() }));
    say.push(`button ${btn.color}, "${btn.text}"`);
    if (out) await pg.screenshot({ path: `${out}/header-${String(palette).replace(/[^a-z0-9]+/gi, "-")}-${mode}-${w}-closed.png`, clip: { x: 0, y: 0, width: w, height: mob ? 300 : 140 } });

    await pg.click(".ts-pick__btn");
    await pg.waitForTimeout(500);
    const pop = await pg.evaluate(() => {
      const p = document.querySelector(".ts-pop");
      if (!p) return null;
      const q = p.getBoundingClientRect();
      const scrim = [...document.querySelectorAll(".v-overlay__scrim")].some((s) => s.getBoundingClientRect().width > 0 && getComputedStyle(s).display !== "none");
      return { l: q.left, r: q.right, t: q.top, vw: document.documentElement.clientWidth, expanded: document.querySelector(".ts-pick__btn").getAttribute("aria-expanded"), scrim, sw: document.documentElement.scrollWidth };
    });
    if (!pop) bad("the panel did not open");
    else {
      say.push(`panel ${Math.round(pop.l)}..${Math.round(pop.r)} of ${pop.vw}`);
      if (pop.l < 11.5 || pop.r > pop.vw - 11.5) bad("the panel runs within 12px of an edge");
      if (w < 600 && (Math.abs(pop.l - 12) > 1 || Math.abs(pop.r - (pop.vw - 12)) > 1)) bad("the phone panel is not 12px from each side");
      if (pop.expanded !== "true") bad("aria-expanded is not true");
      if (pop.scrim) bad("a scrim shows");
      if (pop.sw > pop.vw) bad("the page scrolls sideways with the panel open");
      if (lay.theme && pop.t < lay.theme.b) bad("the panel is not under the button");
    }
    const { fails } = await pg.evaluate(probe);
    const inHeader = await pg.evaluate((fails) => {
      const header = document.querySelector(".ts-pick__btn")?.closest("header") || document.querySelector("header");
      const txt = (header?.innerText || "") + " " + (document.querySelector(".ts-pop")?.innerText || "");
      return fails.filter((f) => {
        const m = f.match(/"([^"]*)"/);
        return m && m[1] && txt.includes(m[1].slice(0, 12));
      });
    }, fails);
    if (inHeader.length) {
      problems += inHeader.length;
      say.push("contrast:\n    " + inHeader.join("\n    "));
    }
    if (out) await pg.screenshot({ path: `${out}/header-${String(palette).replace(/[^a-z0-9]+/gi, "-")}-${mode}-${w}-open.png`, clip: { x: 0, y: 0, width: w, height: mob ? 700 : 520 } });

    await pg.keyboard.press("Escape");
    await pg.waitForTimeout(300);
    const esc = await pg.evaluate(() => ({ open: !!document.querySelector(".ts-pop"), focus: !!document.activeElement?.classList.contains("ts-pick__btn") }));
    if (esc.open || !esc.focus) bad(`Esc: still open ${esc.open}, focus on the button ${esc.focus}`);
    await pg.keyboard.press("Enter");
    await pg.waitForTimeout(300);
    await pg.keyboard.press("Tab");
    if (!(await pg.evaluate(() => !!document.activeElement?.closest(".ts-pop")))) bad("Tab does not reach the panel");
    await pg.click(".ts-pick__btn");
    await pg.waitForTimeout(300);
    if (await pg.$(".ts-pop")) bad("a second click did not close it");
    await pg.click(".ts-pick__btn");
    await pg.waitForTimeout(300);
    await pg.mouse.click(3, 3);
    await pg.waitForTimeout(300);
    if (await pg.$(".ts-pop")) bad("a click outside did not close it");

    await pg.click(".ts-pick__btn");
    await pg.waitForTimeout(300);
    const other = await pg.$$eval(".ts-pal", (els) => els.find((e) => e.getAttribute("aria-pressed") !== "true")?.title);
    await pg.click(`.ts-pal[title="${other}"]`);
    await pg.waitForTimeout(300);
    const picked = await pg.evaluate(() => document.documentElement.dataset.tsPalette);
    // On a live shop the Layout's script loads after Selldone's own page (its loading screen), so wait
    // for the switcher's boot, and note whether the app had mounted by then (it must not have).
    await ctx.addInitScript(() => {
      // When the theme lands on <html> and when the switcher's own button first appears.
      window.__ts = {};
      const t = () => performance.now();
      new MutationObserver(() => {
        if (window.__ts.theme == null && document.documentElement.dataset.tsPalette) window.__ts.theme = t();
        if (window.__ts.button == null && document.querySelector(".ts-pick__btn")) window.__ts.button = t();
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-ts-palette"] });
    });
    await pg.reload({ waitUntil: "domcontentloaded" });
    await pg.waitForFunction(() => window.__ts && window.__ts.theme != null && window.__ts.button != null, null, { timeout: 120000 });
    const after = await pg.evaluate(() => `${document.documentElement.dataset.tsPalette}/${document.documentElement.dataset.tsMode}`);
    const ts = await pg.evaluate(() => window.__ts);
    if (after !== `${picked}/${mode}`) bad(`after a reload: ${after}, expected ${picked}/${mode}`);
    if (ts.theme > ts.button) bad("the theme was applied only after the header had drawn (a flash)");
    say.push(`picked ${other}; after a reload ${after}, applied ${Math.round(ts.button - ts.theme)}ms before the header drew`);
    console.log(`${w} ${palette} ${mode}:\n  ${say.join("\n  ")}`);
    await ctx.close();
  }
  console.log("PROBLEMS", problems);
  await b.close();
  process.exit(problems ? 1 : 0);
})();
