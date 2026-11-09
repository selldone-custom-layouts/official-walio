// find-white-on-brand.cjs: lists the SCSS blocks that paint the brand colour and write white words in the same
// block (the words a light brand, with textOnBrand "auto", needs to turn dark). Replace each listed `color: #fff`
// with the Layout's on-brand token (e.g. var(--x-on-brand)); blocks on an ink fill get an on-ink token instead.
//
// Usage: node find-white-on-brand.cjs style/*.scss   (a white word counts when its block, or the nearest
// ancestor block that sets any background, paints the brand colour)
//   FILL_VARS: the brand fill variables, a regex alternation (default Kalio's and Digito's names).
//   --fix=<token>: rewrite the listed lines to `color: var(<token>)` in place.
const fs = require("fs");
const args = process.argv.slice(2);
const fix = (args.find((a) => a.startsWith("--fix=")) || "").slice(6);
const files = args.filter((a) => !a.startsWith("--"));
const vars = process.env.FILL_VARS || "dg-blue|dg-head|dg-blue-d|k-green|k-green-deep|k-green-hover|k-green-lift|k-leaf|c-accent|c-accent-deep|c-share-bg|ts-accent";
const BG = new RegExp(`^\\s*background(-color)?\\s*:\\s*var\\(--(${vars})\\)`);
const WHITE = /^\s*color\s*:\s*(#fff(fff)?|white)\b/i;
let total = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const eol = src.includes("\r\n") ? "\r\n" : "\n";
  const lines = src.split(/\r?\n/);
  /* A block's white words count when the block, or the nearest ancestor block
     that sets a background at all, paints the brand colour (an icon inside a
     brand button inherits the button's ground). */
  const ANY_BG = /^\s*background(-color)?\s*:/;
  const stack = [{ bg: "none", whites: [] }];
  const hits = [];
  lines.forEach((line, i) => {
    const code = line.replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "");
    const top = stack[stack.length - 1];
    if (BG.test(code)) top.bg = "brand";
    else if (ANY_BG.test(code) && top.bg !== "brand") top.bg = "other";
    if (WHITE.test(code)) top.whites.push(i);
    for (const ch of code) {
      if (ch === "{") stack.push({ bg: "none", whites: [] });
      else if (ch === "}") {
        const b = stack.pop();
        if (!b || !b.whites.length) continue;
        if (b.bg === "brand") hits.push(...b.whites);
        else if (b.bg === "none" && stack.length) stack[stack.length - 1].whites.push(...b.whites);
      }
    }
  });
  for (const i of hits) {
    console.log(`${f}:${i + 1}: ${lines[i].trim()}`);
    if (fix) lines[i] = lines[i].replace(/color\s*:\s*(#fff(fff)?|white)\b/i, `color: var(${fix})`);
  }
  total += hits.length;
  if (fix && hits.length) fs.writeFileSync(f, lines.join(eol));
}
console.log(fix ? `rewrote ${total}` : `total ${total}`);
