// cart-audit.cjs: the contrast audit for the parts the router cannot open: the cart drawer, the cart page
// and the address sheet, in one theme, at 1440 and 390. A guest on a shop that asks for sign-in cannot fill a
// cart, so this fills one locally (three of the shop's products, in the store only) and blocks every /buy/
// request, so nothing reaches the server and no order is made.
//
// Usage (Node, from any folder):
// <palette> is a palette id, or custom:#rrggbb for the custom colour.
//   SHOP=<xapi name> WAIT="<home selector>" CART="<header cart button>" STORAGE_KEY=<storageKey> \
//     node cart-audit.cjs <base-url> <palette> <light|dark> [shots-folder]
// - SHOP: the shop's xapi name (the storefront's @name). WAIT: something the home always shows.
// - CART: the header's cart button (opens the drawer). STORAGE_KEY: the theme switcher's storageKey.
// - ADDRESS: a regular expression for the button that opens the address sheet on the cart page.
// - SHOP_STUB: optional JSON { id, name } standing in for the shop (a shop that does not show the switcher).
// - PW: a Playwright install (default kalio-marketplace's).
// Prints each failure like contrast-audit.cjs and "TOTAL n"; saves a shot of each step when a folder is given.
/* "emerald" or "custom:#ffff00" (the custom colour). */
const themeChoice = (palette, mode) => {
  const m = String(palette).match(/^custom:(#?[0-9a-f]{3,6})$/i);
  return m ? { palette: "custom", custom: (m[1][0] === "#" ? "" : "#") + m[1].toLowerCase(), mode } : { palette, mode };
};
const PW = process.env.PW || "D:/Kalio Sample Shop Claude/kalio-marketplace/node_modules/playwright";
const { chromium } = require(PW);
const { probe } = require("./contrast-audit.cjs");
const [base, palette, mode = "light", outDir] = process.argv.slice(2);
const SHOP = process.env.SHOP;
const WAIT = process.env.WAIT || "main";
const CART = process.env.CART || "header [href*='basket'], header .cart";
const KEY = process.env.STORAGE_KEY;
const ADDRESS = process.env.ADDRESS || "(add|enter|set|choose).{0,12}(address|location)|shipping address|deliver to|Address";
if (!base || !palette || !SHOP || !KEY) {
  console.error("usage: SHOP=<xapi name> STORAGE_KEY=<key> node cart-audit.cjs <base-url> <palette> <light|dark> [shots]");
  process.exit(2);
}

const push = (pg, p) =>
  pg.evaluate((p) => {
    [...document.querySelectorAll("*")].find((e) => e.__vue_app__).__vue_app__.config.globalProperties.$router.push(p);
    return 1;
  }, p);
const clickText = (pg, sel, re) =>
  pg.evaluate(
    ([sel, re]) => {
      const el = [...document.querySelectorAll(sel)].find((e) => new RegExp(re, "i").test(e.textContent) && e.getBoundingClientRect().width > 0);
      if (el) el.click();
      return el ? el.textContent.trim().slice(0, 40) : null;
    },
    [sel, re]
  );

/* Three products in the local store only: one on sale with colours, one with sizes, one more. */
const fillCart = (pg) =>
  pg.evaluate(async (shop) => {
    const list = await fetch(`https://xapi.selldone.com/shops/@${shop}/products/list?limit=250`).then((r) => r.json());
    const ps = list.products || [];
    const now = Date.now();
    const live = (p) => p.discount > 0 && (!p.dis_end || Date.parse(p.dis_end) > now);
    const pick = [ps.find((p) => live(p)), ps.find((p) => (p.product_variants || []).some((v) => v.volume)), ps.find((p) => !live(p))].filter(Boolean);
    const items = pick.map((p, i) => {
      const v = (p.product_variants || [])[0] || null;
      const dis = live(p) ? p.discount : 0;
      const price = (v && v.pricing ? v.price : p.price) - dis;
      return { id: 900 + i, product_id: p.id, variant_id: v ? v.id : null, variant: v, count: i === 1 ? 2 : 1, price, dis, currency: p.currency || "USD", product: { id: p.id, title: p.title, icon: p.icon, type: "PHYSICAL", quantity: p.quantity, category_id: p.category_id } };
    });
    const total = items.reduce((s, it) => s + it.price * it.count, 0);
    const el = [...document.querySelectorAll("*")].find((e) => e.__vue_app__);
    el.__vue_app__.config.globalProperties.$store.commit("setBasketPhysical", { id: 1, type: "PHYSICAL", items, price: total, currency: items[0]?.currency || "USD", status: "Open", receiver_info: null, bill: null });
    return items.length;
  }, SHOP);

(async () => {
  const b = await chromium.launch();
  let total = 0;
  for (const w of [1440, 390]) {
    const mob = w < 768;
    const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
    await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [KEY, JSON.stringify(themeChoice(palette, mode))]);
    if (process.env.SHOP_STUB) await ctx.addInitScript((s) => { window.__THEME_SWITCHER_SHOP__ = JSON.parse(s); }, process.env.SHOP_STUB);
    await ctx.route((u) => u.href.includes("/buy/"), (r) => r.abort());
    const pg = await ctx.newPage();
    await pg.goto(base.replace(/\/$/, "") + "/", { waitUntil: "domcontentloaded", timeout: 120000 });
    await pg.waitForSelector(WAIT, { timeout: 120000 });
    await pg.waitForTimeout(3000);
    await fillCart(pg);
    await pg.waitForTimeout(1500);
    const report = async (name) => {
      const { fails } = await pg.evaluate(probe);
      total += fails.length;
      console.log(`${w} ${name}: ${fails.length ? "\n  " + fails.slice(0, 30).join("\n  ") : "ok"}`);
      if (outDir) await pg.screenshot({ path: `${outDir}/${String(palette).replace(/[^a-z0-9]+/gi, "-")}-${mode}-${w}-${name}.png` });
    };
    await pg.evaluate((sel) => { window.scrollTo(0, 0); document.querySelector(sel)?.click(); }, CART);
    await pg.waitForTimeout(3000);
    await report("drawer");
    await pg.keyboard.press("Escape");
    await pg.waitForTimeout(800);
    await push(pg, "/basket/PHYSICAL");
    await pg.waitForTimeout(6000);
    await report("cart");
    await clickText(pg, "button, a, .v-list-item, [role=button]", ADDRESS);
    await pg.waitForTimeout(3500);
    await report("address");
    await ctx.close();
  }
  console.log("TOTAL", total);
  await b.close();
  process.exit(total ? 1 : 0);
})();
