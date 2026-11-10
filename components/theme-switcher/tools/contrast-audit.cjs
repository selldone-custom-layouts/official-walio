// contrast-audit.cjs: reads the computed colours of every piece of text and every icon on many pages, at
// desktop and phone width, in one theme, and lists each that falls under WCAG 2.1 AA (4.5:1, or 3:1 for
// large text and icons). Made for the theme switcher (a palette × Light / Dark must keep every word and icon
// readable): screenshots miss a grey word on a dark card; computed styles do not.
//
// Usage (Node, from any folder):
//   STORAGE='{"<storageKey>":"{\"palette\":\"blue\",\"mode\":\"dark\"}"}' \
//   PAGES="home=/,category=/laptop-category,product=/product/710083" \
//     node contrast-audit.cjs https://<shop>.selldone.shop "<a selector the home always shows>"
// - <base-url>: the live shop or a dev server; [wait-selector]: something the home always shows (default "main").
// - STORAGE: JSON of localStorage entries written before the first load (the theme switcher's choice).
// - PAGES: name=path pairs, opened in-app with the router (a headless direct load of /product/ gets
//   Selldone's SEO page). WIDTHS: default "1440,390". PW: a Playwright install (default kalio-marketplace's).
// - SHOP_STUB: optional JSON { id, name } standing in for the shop (window.__THEME_SWITCHER_SHOP__), to test a
//   shop that does not show the switcher.
// - OPEN: optional JS run on each page after it settles (e.g. open the cart drawer) before the probe. An
//   expression or statements (top-level await is fine). If it throws, or returns false or "FAIL…" (return
//   false when the button to open is missing), the page prints "OPEN FAILED" and counts as a failure.
// It prints "<element> "<text>" <ratio> (fg on bg)" per failure, the photos on dark tiles (dark mode: a white
// packshot must sit on a light tile), and "TOTAL n" (failures). Deliver only at 0.
// - As a module: require("./contrast-audit.cjs").probe is the in-page check (pass it to page.evaluate), for
//   flows the router cannot open (the cart drawer, the checkout sheets).
const PW = process.env.PW || "D:/Kalio Sample Shop Claude/kalio-marketplace/node_modules/playwright";
const [base, wait = "main"] = process.argv.slice(2);
const PAGES = (process.env.PAGES || "home=/")
  .split(",")
  .map((p) => p.split("="))
  .map(([name, ...rest]) => [name, rest.join("=")]);
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const STORAGE = process.env.STORAGE ? JSON.parse(process.env.STORAGE) : null;

const probe = () => {
  /* Any CSS colour to [r, g, b, a] (0–255, alpha 0–1). rgb()/rgba() is read
     directly; every other form a browser can compute (color(srgb …), oklab(),
     oklch(), lab(), lch(), hsl(), from color-mix()) is painted on a 1px
     canvas and read back. Before 10 Nov 2026 only rgb() was read, so a
     color-mix() background was skipped and the text was judged against the
     ancestor behind it: light words on a pale chip passed as "light on dark". */
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const seenColour = new Map();
  const parse = (s) => {
    s = String(s || "").trim();
    if (!s || s === "none") return null;
    const m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
      return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
    }
    if (seenColour.has(s)) return seenColour.get(s);
    let out = null;
    if (window.CSS && CSS.supports("color", s)) {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = s;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      out = [d[0], d[1], d[2], d[3] / 255];
    }
    seenColour.set(s, out);
    return out;
  };
  const COLOUR = /(rgba?|color|oklab|oklch|lab|lch|hsla?|hwb)\([^()]*\)/;
  const lum = ([r, g, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const over = (top, under) => {
    const a = top[3];
    return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)).concat(1);
  };
  const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const name = (e) => `${e.tagName.toLowerCase()}.${String(e.className?.baseVal ?? e.className).trim().split(/\s+/).slice(0, 2).join(".")}`;
  const pageBg = parse(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];

  /* A picture (img, video, canvas) under the text: text over a photo is judged by eye, not here. */
  const media = [...document.querySelectorAll("img,video,canvas")].map((m) => [m, m.getBoundingClientRect()]).filter(([, q]) => q.width > 8 && q.height > 8);
  const mediaUnder = (el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    return media.filter(([m, q]) => !m.contains(el) && !el.contains(m) && x >= q.left && x <= q.right && y >= q.top && y <= q.bottom).map(([m]) => m);
  };
  /* The colour under an element: its own and its ancestors' backgrounds, composed. null over a picture. */
  const bgOf = (el) => {
    const layers = [];
    const under = mediaUnder(el);
    for (let a = el; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.backgroundImage && cs.backgroundImage !== "none" && /url\(/.test(cs.backgroundImage)) return null;
      if (a !== el && under.some((m) => a.contains(m))) return null;
      const g = cs.backgroundImage && cs.backgroundImage !== "none" ? cs.backgroundImage.match(COLOUR) : null;
      const c = parse(cs.backgroundColor);
      if (c && c[3] > 0) layers.push(c);
      else if (g) layers.push(parse(g[0]));
      if (layers.length && layers[layers.length - 1][3] >= 1) break;
    }
    let out = layers.length && layers[layers.length - 1][3] >= 1 ? layers.pop() : over(layers.pop() || [0, 0, 0, 0], pageBg);
    while (layers.length) out = over(layers.pop(), out);
    return out;
  };
  const opacityOf = (el) => {
    let o = 1;
    for (let a = el; a; a = a.parentElement) o *= parseFloat(getComputedStyle(a).opacity);
    return o;
  };
  const disabled = (el) => !!el.closest(":disabled,[aria-disabled='true'],.v-btn--disabled,.v-field--disabled,[inert]");
  const ICON = /(^|\s)([a-z]+-ms|material-icons|material-symbols|v-icon|fa-|mdi)/; // icon fonts (a Layout's own too: x-ms)

  const fails = new Map();
  const seen = new Set();
  const all = document.querySelectorAll("body *");
  for (const el of all) {
    if (seen.size > 6000) break;
    const tag = el.tagName;
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "svg", "path", "IMG"].includes(tag)) continue;
    const isField = ["INPUT", "TEXTAREA", "SELECT"].includes(tag) && el.type !== "hidden" && el.value;
    // Text of its own, not only a separator ("•", "·", "/"): decoration needs no contrast.
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent));
    if (!ownText && !isField) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== "visible" || parseFloat(cs.opacity) === 0 || disabled(el)) continue;
    const op = opacityOf(el);
    if (op < 0.2) continue;
    seen.add(el);
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    if (!bg) continue;
    const fgEff = over([fg[0], fg[1], fg[2], fg[3] * op], bg);
    const k = ratio(fgEff, bg);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight) >= 700;
    const icon = ICON.test(String(el.className?.baseVal ?? el.className)) || ICON.test(String(el.parentElement?.className || ""));
    const need = icon || size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    if (k + 0.005 >= need) continue;
    const text = (isField ? el.value : el.textContent).trim().replace(/\s+/g, " ").slice(0, 28);
    const id = `${name(el)} ${hex(fgEff)} on ${hex(bg)}`;
    if (!fails.has(id)) fails.set(id, `${name(el)} "${text}" ${k.toFixed(2)} (${hex(fgEff)} on ${hex(bg)}, needs ${need})`);
  }

  /* Dark mode: a packshot (a photo shown whole: object-fit contain or none,
     usually on a white ground) must sit on a light tile. Cover photos (a
     hero, a journal picture) fill their box and are left alone. */
  const photos = [];
  if (document.documentElement.dataset.tsMode === "dark") {
    for (const img of document.querySelectorAll("img")) {
      const r = img.getBoundingClientRect();
      if (r.width < 24 || r.height < 24) continue;
      if (getComputedStyle(img).objectFit === "cover") continue;
      if (/\.svg(\?|$)/i.test(img.currentSrc || img.src)) continue;
      const bg = bgOf(img.parentElement || img);
      if (bg && lum(bg) < 0.6) photos.push(`${name(img.parentElement)} photo on ${hex(bg)}`);
    }
  }
  return { fails: [...fails.values()], photos: [...new Set(photos)] };
};

module.exports = { probe };

if (require.main === module) (async () => {
  if (!base) {
    console.error("usage: node contrast-audit.cjs <base-url> [wait-selector]");
    process.exit(2);
  }
  const { chromium } = require(PW);
  const b = await chromium.launch();
  let total = 0;
  for (const w of WIDTHS) {
    const mob = w < 768;
    const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
    if (STORAGE)
      await ctx.addInitScript((s) => {
        try {
          for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
        } catch (e) {}
      }, STORAGE);
    if (process.env.SHOP_STUB) await ctx.addInitScript((s) => { window.__THEME_SWITCHER_SHOP__ = JSON.parse(s); }, process.env.SHOP_STUB);
    const pg = await ctx.newPage();
    await pg.goto(base.replace(/\/$/, "") + "/", { waitUntil: "domcontentloaded", timeout: 120000 });
    await pg.waitForSelector(wait, { timeout: 120000 });
    for (const [name, path] of PAGES) {
      await pg.evaluate((p) => {
        [...document.querySelectorAll("*")].find((e) => e.__vue_app__).__vue_app__.config.globalProperties.$router.push(p);
        return 1;
      }, path);
      await pg.waitForTimeout(4000);
      for (let y = 0; y < 8; y++) {
        await pg.evaluate((k) => window.scrollTo(0, k * innerHeight), y);
        await pg.waitForTimeout(300);
      }
      await pg.evaluate(() => window.scrollTo(0, 0));
      /* OPEN may be an expression (an async IIFE) or plain statements with
         top-level await. Before 10 Nov 2026 its errors were swallowed, so a
         failed open (a typo, a missing button) audited the page with nothing
         open and passed. Now a throw, or a return of false / "FAIL…", is
         printed and counted as a failure. */
      let openFail = null;
      if (process.env.OPEN) {
        const src = process.env.OPEN;
        const run = (code) => pg.evaluate(code);
        let out;
        try {
          out = await run(`(async () => { return await (${src}); })()`);
        } catch (e) {
          if (/SyntaxError|Unexpected/.test(String(e.message))) {
            try {
              out = await run(`(async () => { ${src} })()`);
            } catch (e2) {
              openFail = e2.message.split("\n")[0];
            }
          } else openFail = e.message.split("\n")[0];
        }
        if (!openFail && (out === false || /^FAIL/i.test(String(out ?? "")))) openFail = `OPEN returned ${JSON.stringify(out)}`;
        await pg.waitForTimeout(1500);
      }
      await pg.waitForTimeout(400);
      const { fails, photos } = await pg.evaluate(probe);
      if (openFail) fails.unshift(`OPEN FAILED (nothing was opened, so this page is not audited as asked): ${openFail}`);
      total += fails.length;
      console.log(`${w} ${name}: ${fails.length ? "\n  " + fails.slice(0, 40).join("\n  ") : "ok"}${photos.length ? "\n  photos on dark tiles:\n    " + photos.slice(0, 10).join("\n    ") : ""}`);
    }
    await ctx.close();
  }
  console.log("TOTAL", total);
  await b.close();
  process.exit(total ? 1 : 0);
})();
