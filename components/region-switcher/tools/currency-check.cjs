// currency-check.cjs: picks each of the shop's currencies through the region switcher (the header pill at
// desktop width, the phone menu's row and sheet at phone width) and walks the pages, failing on any visible
// amount that is still in another currency. The owner's rule (10 November 2026): when the shopper picks a
// currency, EVERY amount on EVERY page changes to it at once.
//
// Usage (Node, from any folder):
//   SHOP=<xapi name> MENU="<phone menu button>" MEGA="<desktop menu button>" CART="<header cart button>" \
//   CATEGORY=/laptop-category DEALS='/?filter={"only_has_discount":true}' FILTER_SIGN="<price filter sign selector>" \
//     node currency-check.cjs <base-url> [wait-selector] [shots-folder]
// - <base-url>: the live shop or a dev server. wait-selector: something every page shows (default "footer").
// - SHOP: the shop's xapi name, to put one product in the cart (in the store only; /buy/ requests are blocked).
// - CURRENCIES: optional "USD,DKK,…" (default: every currency the shop offers, read from the page).
// - WIDTHS: default "1440,390". PW: a Playwright install (default kalio-marketplace's).
// - MENU / MEGA / CART: buttons that open the phone menu, the desktop menu and the cart drawer.
// - CATEGORY, DEALS: in-app paths. CATEGORY may be "@<selector>": the first such link on the home page
//   (e.g. CATEGORY="@a.x-cat"). The product page is the first product link on the category page.
// - FILTER_SIGN: the element(s) that show the price filter's currency sign ("$", "kr"…); each must be the
//   picked currency's sign or code.
// It prints each stray amount as "<width> <currency> <page>: "<text>" looks <other>" and "TOTAL n". Deliver at 0.
// AUD (and any currency whose Selldone sign is "$") cannot be told from USD by a bare "$": with such a pick a
// bare "$" is not counted (A$, US$ and codes still are).
const PW = process.env.PW || "D:/Kalio Sample Shop Claude/kalio-marketplace/node_modules/playwright";
const { chromium } = require(PW);
const [base0, WAIT = "footer", SHOTS = ""] = process.argv.slice(2);
if (!base0) {
  console.error("usage: node currency-check.cjs <base-url> [wait-selector] [shots-folder]");
  process.exit(2);
}
const base = base0.replace(/\/$/, "");
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const SHOP = process.env.SHOP || "";
const MENU = process.env.MENU || "";
const MEGA = process.env.MEGA || "";
const CART = process.env.CART || "";
const CATEGORY = process.env.CATEGORY || "";
const DEALS = process.env.DEALS || "";
const FILTER_SIGN = process.env.FILTER_SIGN || "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* In the page: every visible amount and the currency it reads as. */
const scan = (picked) => {
  const SIGNS = [
    ["US$", "USD"], ["A$", "AUD"], ["AU$", "AUD"], ["HK$", "HKD"], ["C$", "CAD"], ["CA$", "CAD"], ["NZ$", "NZD"],
    ["€", "EUR"], ["₹", "INR"], ["£", "GBP"], ["﷼", "SAR"], ["ر.س", "SAR"], ["د.إ", "AED"], ["kr.", "DKK"], ["kr", "DKK"], ["Kr", "DKK"], ["$", "USD"],
  ];
  const CODES = ["USD", "DKK", "EUR", "AED", "SAR", "AUD", "HKD", "INR", "GBP", "CAD", "SEK", "NOK", "CHF", "JPY", "IRR", "TRY"];
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tokens = [...CODES.map((c) => [c, c]), ...SIGNS].sort((a, b) => b[0].length - a[0].length);
  const alt = tokens.map(([t]) => esc(t)).join("|");
  const num = "\\d[\\d,.\\u00a0\\u202f ]*";
  const re = new RegExp(`(?:(${alt})\\s?[−-]?\\s?${num})|(?:${num}\\s?(${alt})(?![A-Za-z]))`, "g");
  const map = new Map(tokens);
  const dollarIsAmbiguous = ["AUD", "HKD", "CAD", "NZD", "SGD"].includes(picked);
  const out = [];
  const seen = new Set();
  // The rendered text: only what is displayed (not display:none or
  // visibility:hidden), and a price split over spans reads as one.
  const hide = [...document.querySelectorAll(".rs-chips, .rs-pop, .rs-sheet-wrap")];
  hide.forEach((e) => (e.dataset.rsScan = e.style.display, (e.style.display = "none")));
  const text = document.body.innerText;
  hide.forEach((e) => (e.style.display = e.dataset.rsScan || ""));
  for (const raw of text.split(/\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line || !/\d/.test(line) || seen.has(line)) continue;
    seen.add(line);
    for (const m of line.matchAll(re)) {
      const tok = m[1] || m[2];
      const cur = map.get(tok);
      if (!cur) continue;
      if (tok === "$" && dollarIsAmbiguous) continue;
      if (cur !== picked) out.push({ text: line.slice(0, 90), looks: cur });
    }
  }
  return out;
};

const push = (pg, path) =>
  pg.evaluate((p) => {
    [...document.querySelectorAll("*")].find((e) => e.__vue_app__).__vue_app__.config.globalProperties.$router.push(p);
    return 1;
  }, path);

async function settle(pg, ms = 3500) {
  await pg.waitForTimeout(ms);
  for (let y = 0; y < 6; y++) {
    await pg.evaluate((k) => window.scrollTo(0, k * innerHeight), y);
    await pg.waitForTimeout(250);
  }
  await pg.evaluate(() => window.scrollTo(0, 0));
  await pg.waitForTimeout(300);
}

async function waitCurrency(pg, code) {
  await pg.waitForFunction((c) => window.$storefront?.currency?.code === c, code, { timeout: 30000 });
}

/* Selldone refetches the cart and the shop, then redraws the app (its :key holds the currency). */
async function waitRedraw(pg) {
  await pg.waitForTimeout(4500);
  await pg.waitForSelector(WAIT, { timeout: 60000 });
}

async function pick(pg, code, phone) {
  if (!phone) {
    await pg.evaluate(() => window.scrollTo(0, 0));
    await pg.click(".rs-pick__btn");
    await pg.waitForSelector(".rs-pop .rs-chip", { timeout: 10000 });
    await pg.locator(".rs-pop .rs-chip", { hasText: new RegExp(`^\\s*${code}`) }).first().click();
  } else {
    if (MENU) await pg.click(MENU);
    await pg.waitForSelector(".rs-row", { state: "visible", timeout: 15000 });
    await pg.click(".rs-row");
    await pg.waitForSelector(".rs-sheet .rs-chip", { timeout: 10000 });
    await pg.locator(".rs-sheet .rs-chip", { hasText: new RegExp(`^\\s*${code}`) }).first().click();
    await pg.waitForTimeout(400);
    const done = await pg.$(".rs-sheet__done");
    if (done) await done.click().catch(() => {});
  }
  await waitCurrency(pg, code);
}

const fillCart = (pg, shop) =>
  pg.evaluate(async (shop) => {
    // Selldone answers 429 (an HTML page) when hammered: retry, then give up quietly.
    let list = null;
    for (let t = 0; t < 4 && !list; t++) {
      try {
        list = await fetch(`https://xapi.selldone.com/shops/@${shop}/products/list?limit=40`).then((r) => r.json());
      } catch {
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
    if (!list) return 0;
    const p = (list.products || []).find((x) => x.price > 0 && x.icon);
    if (!p) return 0;
    const v = (p.product_variants || [])[0] || null;
    const items = [{ id: 901, product_id: p.id, variant_id: v ? v.id : null, variant: v, count: 1, price: p.price, dis: 0, currency: p.currency || "USD", product: { id: p.id, title: p.title, icon: p.icon, type: "PHYSICAL", quantity: p.quantity, category_id: p.category_id } }];
    const el = [...document.querySelectorAll("*")].find((e) => e.__vue_app__);
    el.__vue_app__.config.globalProperties.$store.commit("setBasketPhysical", { id: 1, type: "PHYSICAL", items, price: p.price, currency: p.currency || "USD", status: "Open", receiver_info: null, bill: null });
    return 1;
  }, shop);

(async () => {
  const b = await chromium.launch();
  let total = 0;
  for (const w of WIDTHS) {
    const phone = w < 768;
    const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, isMobile: phone, hasTouch: phone });
    await ctx.route((u) => u.href.includes("/buy/"), (r) => r.abort());
    const pg = await ctx.newPage();
    await pg.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 120000 });
    await pg.waitForSelector(WAIT, { timeout: 120000 });
    await pg.waitForTimeout(2500);
    const list = process.env.CURRENCIES
      ? process.env.CURRENCIES.split(",")
      : await pg.evaluate(() => {
          const el = [...document.querySelectorAll("*")].find((e) => e.__vue_app__);
          return el.__vue_app__.config.globalProperties.$store.getters.getShop?.currencies || [];
        });
    // Start from the last one so the first pick is a real change.
    for (const code of list) {
      let picked = false;
      for (let t = 0; t < 2 && !picked; t++) {
        try {
          await push(pg, "/");
          await pg.waitForTimeout(1500);
          await pick(pg, code, phone);
          picked = true;
        } catch (e) {
          console.log(`  retry pick ${code}: ${e.message.split("\n")[0]}`);
          await pg.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 120000 });
          await pg.waitForSelector(WAIT, { timeout: 120000 });
          await pg.waitForTimeout(2500);
        }
      }
      if (!picked) {
        console.log(`${w} ${code}: COULD NOT PICK`);
        total++;
        continue;
      }
      // "At once": the page the pick was made on, before Selldone's redraw. An
      // amount that waits for the redraw (a string made at mount) shows here.
      await pg.waitForTimeout(700);
      const early = await pg.evaluate(scan, code);
      total += early.length;
      const NL = "\n    ";
      console.log(`${w} ${code} at once (before the redraw): ${early.length ? NL + early.slice(0, 12).map((x) => `"${x.text}" looks ${x.looks}`).join(NL) : "ok"}`);
      await waitRedraw(pg);
      const report = async (name) => {
        const bad = await pg.evaluate(scan, code);
        total += bad.length;
        console.log(`${w} ${code} ${name}: ${bad.length ? "\n    " + bad.slice(0, 12).map((x) => `"${x.text}" looks ${x.looks}`).join("\n    ") : "ok"}`);
        if (SHOTS) await pg.screenshot({ path: `${SHOTS}/${code}-${w}-${name}.png` }).catch(() => {});
      };
      await push(pg, "/");
      await settle(pg);
      await report("home");
      if (CATEGORY) {
        let path = CATEGORY;
        if (CATEGORY.startsWith("@")) {
          path = await pg.evaluate((sel) => document.querySelector(sel)?.getAttribute("href") || null, CATEGORY.slice(1));
          path = path ? path.replace(/^https?:\/\/[^/]+/, "") : "/";
        }
        await push(pg, path);
        await settle(pg, 5000);
        if (FILTER_SIGN) {
          if (phone) {
            const btn = await pg.$("button:has-text('Filter')");
            if (btn) {
              await btn.click().catch(() => {});
              await pg.waitForTimeout(1500);
            }
          }
          const signs = await pg.$$eval(FILTER_SIGN, (els) => els.filter((e) => e.getClientRects().length).map((e) => e.textContent.trim()));
          const want = await pg.evaluate((c) => {
            const f = (d) => {
              try {
                return new Intl.NumberFormat("en-US", { style: "currency", currency: c, currencyDisplay: d }).formatToParts(0).find((p) => p.type === "currency")?.value;
              } catch {
                return null;
              }
            };
            return [c, f("symbol"), f("narrowSymbol")].filter(Boolean);
          }, code);
          const wrong = signs.filter((s) => !want.includes(s) && !(code === "SAR" && s === "﷼") && !(code === "AED" && s === "د.إ") && !(code === "DKK" && /^kr\.?$/i.test(s)));
          if (!signs.length) {
            console.log(`${w} ${code} price filter: NOT FOUND (the category did not draw its filter; a 429?)`);
          } else if (wrong.length) {
            total += wrong.length;
            console.log(`${w} ${code} price filter: sign ${JSON.stringify(wrong)} (want one of ${JSON.stringify(want)})`);
          } else console.log(`${w} ${code} price filter: sign ${JSON.stringify([...new Set(signs)])} ok`);
          if (phone) await pg.keyboard.press("Escape").catch(() => {});
        }
        await report("category");
        const href = await pg.evaluate(() => [...document.querySelectorAll("a[href*='/product/']")].map((a) => a.getAttribute("href"))[0] || null);
        if (href) {
          await push(pg, href.replace(/^https?:\/\/[^/]+/, ""));
          await settle(pg, 5000);
          await report("product");
        }
      }
      if (DEALS) {
        await push(pg, DEALS);
        await settle(pg, 5000);
        await report("deals");
      }
      if (CART && SHOP) {
        await push(pg, "/");
        await pg.waitForTimeout(2500);
        const filled = await fillCart(pg, SHOP).catch(() => 0);
        if (!filled) console.log(`${w} ${code} cart-drawer: not checked (Selldone did not answer the product list)`);
        await pg.waitForTimeout(800);
        await pg.evaluate(() => window.scrollTo(0, 0));
        await pg.click(CART).catch(() => {});
        await pg.waitForTimeout(2500);
        await report("cart-drawer");
        // A fresh page, so the drawer is closed before the menus are opened.
        await pg.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 120000 });
        await pg.waitForSelector(WAIT, { timeout: 120000 });
        await pg.waitForTimeout(2500);
      }
      if (phone && MENU) {
        await push(pg, "/");
        await pg.waitForTimeout(2000);
        await pg.click(MENU).catch(() => {});
        await pg.waitForTimeout(2000);
        await report("phone-menu");
        await pg.keyboard.press("Escape").catch(() => {});
      }
      if (!phone && MEGA) {
        await push(pg, "/");
        await pg.waitForTimeout(2000);
        await pg.click(MEGA).catch(() => {});
        await pg.waitForTimeout(2000);
        await report("mega-menu");
        await pg.keyboard.press("Escape").catch(() => {});
      }
    }
    await ctx.close();
  }
  await b.close();
  console.log("TOTAL", total);
  process.exit(total ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
