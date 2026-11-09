/*
 * Copyright (c) 2024. Selldone® Business OS™
 *
 * Author: M.Pajuhaan
 * Web: https://selldone.com
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * All rights reserved. In the weave of time, where traditions and innovations intermingle, this content was crafted.
 * From the essence of thought, through the corridors of creativity, each word, and sentiment has been molded.
 * Not just to exist, but to inspire. Like an artist's stroke or a sculptor's chisel, every nuance is deliberate.
 * Our journey is not just about reaching a destination, but about creating a masterpiece.
 * Tread carefully, for you're treading on dreams.
 */

import {defineConfig, loadEnv} from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import fs from "fs";
import vitePluginRequire from "vite-plugin-require";
import basicSsl from "@vitejs/plugin-basic-ssl";
// The theme switcher's dark mode for fixed colours (components/theme-switcher).
import darkTokens from "./components/theme-switcher/tools/postcss-dark-tokens.mjs";

const manifest = require("./manifest.json");

//import vuetify from 'vite-plugin-vuetify'
/**
 * Directory of the runtime entries inside dist/.
 *
 * The Selldone Layout extractor requires the ZIP members app/ and app/shop.js,
 * and the storefront runtime loads <package>/<version>/app/shop.js and
 * app/shop.css. The upstream value, manifest.version, produced 0.1.0/shop.js,
 * which the current artifact contract (selldone/cli, package-selldone-
 * storefront-layout/references/artifact-contract.md) names as invalid. The
 * version still lives in the URL, through the base below.
 * @type {string}
 */
const VERSION_DIR = "app";

let IS_PRODUCTION: boolean;
let DEV_HOST: string;
let DEV_PORT: number;
let IS_HTTPS: boolean;

const MODULES_ROOT = path.resolve(__dirname, "modules");

function resolveSelldoneModule(packageName: string, gitFolderName: string) {
  const gitModulePath = path.resolve(MODULES_ROOT, gitFolderName);
  if (fs.existsSync(gitModulePath)) {
    return gitModulePath;
  }

  return path.resolve(__dirname, `node_modules/${packageName}`);
}

// ▃▃▃▃▃▃▃▃▃▃▃▃ Storefront Web App ▃▃▃▃▃▃▃▃▃▃▃▃
export default ({mode}: any) => {
  const env = loadEnv(mode, process.cwd());

  IS_PRODUCTION = mode === "production";
  DEV_HOST = env.VITE_APP_DEV_SERVER_HOST || "localhost";
  DEV_PORT = env.VITE_APP_DEV_SERVER_PORT
      ? parseInt(env.VITE_APP_DEV_SERVER_PORT)
      : 8080;
  IS_HTTPS =
      !!env.VITE_APP_DEV_SERVER_HTTPS && env.VITE_APP_DEV_SERVER_HTTPS === "TRUE";

  // Calculate base URL
  /* Production references are relative: every lazy chunk and asset resolves
     against the URL shop.js and shop.css are actually served from. The
     upstream absolute base (deploy_server/package/version) assumed the CDN
     layout <package>/<version>/app/, but the Layout service now stores each
     upload as layouts/<id>/releases/<ULID>/app and serves it from wherever
     the storefront host decides — an absolute base would send all 223 lazy
     chunks to an address that never existed. The artifact contract prefers
     relative references for exactly this reason. */
  const baseURL = IS_PRODUCTION
      ? "./"
      : `${IS_HTTPS ? "https" : "http"}://${DEV_HOST}:${DEV_PORT}/`;

  console.log("Build base URL:", baseURL);

  printDevServerConfig();

  return defineConfig({
    base: baseURL,

    plugins: [
      vue(),
   //   vuetify({ autoImport: true }), tree shaking problem in dynamic components in page builder (vSheet works but v-sheet not!)

      //@ts-ignore
      vitePluginRequire.default(),
      flagIconsFromCdn(),
      woff2Only(),
      sniffAsJavaScript(),
      ...(IS_HTTPS
          ? [
            basicSsl({name: "selldone-test-cert"}), // Enable if you want to use https
          ]
          : []),
    ],
    /* Dark mode for every fixed colour in the Layout's styles and Selldone's
       components: each light literal becomes var(--tsd-…, literal), with the
       dark values under html.wl-dark (the header's Theme button sets the
       class). Light mode computes exactly as before. Vuetify follows its own
       theme. */
    css: {
      postcss: {
        plugins: [
          darkTokens({
            darkSelector: "html.wl-dark",
            include: [/\/style\//, /\/StorefrontApp\.vue/, /\/components\//, /\/pages\//, /\/layouts\//],
            exclude: [/\/node_modules\//, /\/modules\/pagebuilder\//, /\/theme-switcher\//],
            lightVars: ["--k-well", "--k-tint", "--k-leaf"],
            keepLightExtra: /t-arrow|k-rail__arrow/, // the row and hero arrows: white discs with a dark arrow in both modes (the owner's rule)
          }),
        ],
      },
    },
    resolve: {
      alias: {
        // ━━━━━━━━━━━━ Define fix path for modules ━━━━━━━━━━━━
        "@app-storefront": path.resolve(__dirname, ""),
        "@app-vendor": path.resolve(__dirname, "src/Applications/Vendor/"),

        '@selldone/core-js': resolveSelldoneModule('@selldone/core-js', 'core'),
        '@selldone/components-vue': resolveSelldoneModule('@selldone/components-vue', 'components'),
        '@selldone/page-builder': resolveSelldoneModule('@selldone/page-builder', 'pagebuilder'),
        '@selldone/translate': resolveSelldoneModule('@selldone/translate', 'translate'),
        '@selldone/sdk-storefront': resolveSelldoneModule('@selldone/sdk-storefront', 'storefront-sdk'),
        '@selldone/sdk-community': resolveSelldoneModule('@selldone/sdk-community', 'community-sdk'),

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      },
    },
    server: {
      // open: `${root}/index.html`,
      origin: `http://${DEV_HOST}:${DEV_PORT}`, // Ensure this matches your Vite server
      // Additional Vite server configuration...
      host: "localhost",
      port: DEV_PORT as number,
      cors: true, // Enable CORS
      fs: {
        strict: false, // Load files from nested packages inside node-modules

        // Allow all folders under the project root
        allow: [
          // Use path.resolve with an empty string to resolve to the project root directory
          path.resolve(""),
          MODULES_ROOT,
        ],
      },
    },

    build: {
      outDir: "dist/",
      /* Fewer, larger files. The Layout endpoint processes the archive while
         the upload request is open, behind Cloudflare's ~100 s read limit;
         at 714 files the connection was cut mid-extraction, which registered
         the version but never put its files on the CDN. SVGs up to 16 KB
         ride inside the CSS/JS that use them (scripts/kalio-svg-flatten.mjs
         makes those passive too), and fonts ship as WOFF2 only.

         Small chunks are no longer merged into a neighbour
         (experimentalMinChunkSize): Rollup merged them into the entry, so
         chunks imported code from shop.js, which Selldone's redirected
         address loads twice — see coreChunk below. */
      assetsInlineLimit: (file: string, content: Buffer) =>
          file.toLowerCase().endsWith(".svg") ? content.length <= 16384 : undefined,
      /* One stylesheet. The 95 per-chunk CSS files total 689 KB; as files
         they were a sixth of the archive, as part of shop.css they are a
         ~100 KB gzip addition to the first load. */
      cssCodeSplit: false,
      rollupOptions: {
        input: {
          shop: "index.html",
        },
        output: {
          manualChunks: coreChunk,
          // Entry and chunk naming patterns
          entryFileNames: `${VERSION_DIR}/[name].js`,
          chunkFileNames: (chunk) => `${VERSION_DIR}/js/${safeName(chunk.name)}.[hash].js`,
          // For assets
          assetFileNames: (assetInfo) => {
            if (assetInfo!.name!.endsWith(".css")) {
              /* With cssCodeSplit off, Vite names the one stylesheet
                 "style.css"; the Layout runtime loads app/shop.css. */
              return ["shop.css", "style.css"].includes(assetInfo.name!)
                  ? `${VERSION_DIR}/shop.css`
                  : `${VERSION_DIR}/css/${safeName(baseName(assetInfo.name!))}.[hash].[ext]`;
            }
            return `${VERSION_DIR}/assets/${safeName(baseName(assetInfo.name!))}.[hash].[ext]`;
          },
        },
      },
    },
    assetsInclude: ["**/*.m4v"],
  });
};

/**
 * Country flags from jsDelivr instead of from the Layout archive.
 *
 * vue-flag-icon imports flag-icons.min.css, whose ~540 url(../flags/…) rules
 * made country flags the largest group of files in the build. The Layout
 * endpoint processes the archive inside one request behind Cloudflare's
 * ~100 s read limit, and at that file count the connection was cut before
 * extraction finished. The same stylesheet is kept — same classes, same
 * flags — with each URL pointed at the identical flag-icons version on
 * jsDelivr, which Vite leaves untouched because it is absolute. A flag that
 * fails to load costs a flag image in a country or phone picker, nothing more.
 */
function flagIconsFromCdn() {
  const version = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "node_modules/flag-icons/package.json"), "utf8"),
  ).version;
  const cdn = `https://cdn.jsdelivr.net/npm/flag-icons@${version}/flags/`;
  return {
    name: "kalio-flag-icons-from-cdn",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (!/[\\/]flag-icons[\\/]css[\\/]flag-icons(\.min)?\.css$/.test(id.split("?")[0])) return null;
      return { code: code.replace(/url\((["']?)\.\.\/flags\//g, `url($1${cdn}`), map: null };
    },
  };
}

/**
 * Everything the entry imports goes into one "core" chunk; shop.js keeps
 * only the entry itself.
 *
 * Selldone loads the Layout through a redirect: the shop page asks for
 * selldone.com/cdn-storage-public/…/app/shop.js, which answers 302 to
 * cdn.selldone.com/public/…/app/shop.js. A browser keys a module by the
 * address it asked for but resolves the module's imports against the address
 * it landed on — so every lazy chunk's `import … from "../shop.js"` named a
 * second, different module and loaded shop.js again: two apps on one page,
 * and a blank storefront (3 November 2026, Layout 0.2.0).
 *
 * With the shared code in core, a chunk imports "./core.[hash].js" and the
 * entry imports "./js/core.[hash].js"; both resolve against the landing
 * address, so there is exactly one core. Nothing imports shop.js, so it does
 * not matter which address it was keyed by. Code that only lazy routes use
 * keeps its own chunks.
 */
let entryStaticGraph: Set<string> | null = null;

function coreChunk(id: string, { getModuleInfo, getModuleIds }: any) {
  if (!entryStaticGraph) {
    /* Everything statically reachable from the entry, walked once. */
    entryStaticGraph = new Set();
    const queue: string[] = [...getModuleIds()].filter((moduleId: string) => getModuleInfo(moduleId)?.isEntry);
    while (queue.length) {
      const next = queue.pop()!;
      for (const imported of getModuleInfo(next)?.importedIds || []) {
        if (!entryStaticGraph.has(imported)) {
          entryStaticGraph.add(imported);
          queue.push(imported);
        }
      }
    }
  }
  const info = getModuleInfo(id);
  if (info?.isEntry) return undefined;
  return entryStaticGraph.has(id) ? "core" : undefined;
}

/**
 * Every emitted JS file opens with a "use strict" directive.
 *
 * The Layout service stores each release file with the MIME type libmagic
 * reads from its content, and only falls back to the extension when that read
 * is inconclusive. A chunk that opens with `import{…}from"../shop.js";const`
 * reads as Java source: 40 of 0.1.4's 223 chunks — the variant selector, the
 * header's account menu, the compare button among them — were served as
 * text/x-java, and browsers refuse to run a module script of that type. The
 * directive makes libmagic read the file as JavaScript and changes nothing
 * at run time, since module code is strict already. Applied in
 * generateBundle, after minification, so nothing strips it. Vite later puts
 * its preload map in front of it in the few files that preload others
 * (shop.js among them); there it is an inert string, and those files read
 * as JavaScript without it. Check with `file --mime-type dist/app/js/*.js`.
 */
function sniffAsJavaScript() {
  return {
    name: "kalio-sniff-as-javascript",
    apply: "build" as const,
    generateBundle(_options: any, bundle: Record<string, any>) {
      for (const file of Object.values(bundle)) {
        if (file.type === "chunk" && !file.code.startsWith('"use strict";')) {
          file.code = `"use strict";\n${file.code}`;
        }
      }
    },
  };
}

/**
 * Web fonts as WOFF2 only.
 *
 * Selldone's Persian face and Material Icons declare each weight in four
 * formats (EOT, WOFF2, WOFF, TTF), which put 21 font files in the archive
 * that no current browser downloads — every one picks WOFF2. Each
 * @font-face that has a WOFF2 source keeps that source alone; one without
 * WOFF2 is left as it was.
 */
function woff2Only() {
  const FONT_FACE = /@font-face\s*\{[^}]*\}/g;
  /* Quoted URLs may contain parentheses ("IRANSansWeb(FaNum)_Black.woff2"). */
  const WOFF2_URL = /url\(\s*(?:'([^']+\.woff2[^']*)'|"([^"]+\.woff2[^"]*)"|([^'"()\s]+\.woff2[^'"()\s]*))\s*\)/;
  const SRC = /\bsrc\s*:[^;}]*;?/g;
  return {
    name: "kalio-woff2-only",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (!/\.(s?css)$/.test(id.split("?")[0]) || !code.includes("@font-face") || !code.includes(".woff2")) return null;
      const next = code.replace(FONT_FACE, (block) => {
        const woff2 = block.match(WOFF2_URL);
        if (!woff2) return block;
        const url = woff2[1] || woff2[2] || woff2[3];
        const body = block.replace(SRC, "").replace(/\}\s*$/, "");
        return `${body}src: url("${url}") format("woff2");}`;
      });
      return next === code ? null : { code: next, map: null };
    },
  };
}

/**
 * Emitted file names limited to [A-Za-z0-9._-].
 *
 * The Layout upload rejects the whole archive ("Archive paths must be safe
 * relative app/ paths.") if any member name holds a space or a bracket, and
 * the platform's own assets include "011-pine tree.svg" and
 * "IRANSansWeb(FaNum).woff". Renaming here, at emit time, lets Vite rewrite
 * every reference to the new name; renaming inside the ZIP would not.
 */
function safeName(name: string) {
  return String(name || "asset").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

/** The asset's file name without directory or extension, for [hash].[ext] to follow. */
function baseName(name: string) {
  return path.basename(name).replace(/\.[^.]+$/, "");
}


function printDevServerConfig() {
  console.log("");
  console.log(
      "███████╗███████╗██╗     ██╗     ██████╗  ██████╗ ███╗   ██╗███████╗",
  );
  console.log(
      "██╔════╝██╔════╝██║     ██║     ██╔══██╗██╔═══██╗████╗  ██║██╔════╝",
  );
  console.log(
      "███████╗█████╗  ██║     ██║     ██║  ██║██║   ██║██╔██╗ ██║█████╗  ",
  );
  console.log(
      "╚════██║██╔══╝  ██║     ██║     ██║  ██║██║   ██║██║╚██╗██║██╔══╝  ",
  );
  console.log(
      "███████║███████╗███████╗███████╗██████╔╝╚██████╔╝██║ ╚████║███████╗",
  );
  console.log(
      "╚══════╝╚══════╝╚══════╝╚══════╝╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚══════╝",
  );
  console.log("");

  console.log("▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆");
  console.log("⬤ Vue Build Selldone® Business OS™ Storefront Project ⬤ ");
  console.log("The #1 operating system for fast-growing companies.");
  console.log("▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆");
  console.log("");

  const tableRow = (key: string, value: any) =>
      `┃ ${key.padEnd(20)} ┃ ${value.toString().padEnd(20)} ┃`;

  console.log("┏━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━┓");
  console.log("┃    Configuration     ┃       Value          ┃");
  console.log("┣━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━┫");

  console.log(tableRow("ENVIRONMENT", process.env.NODE_ENV));

  if (IS_PRODUCTION) {
  } else {
    console.log(tableRow("DEV_HOST", DEV_HOST));
    console.log(tableRow("DEV_PORT", DEV_PORT));
    console.log(tableRow("IS_HTTPS", IS_HTTPS));
  }
  console.log("┗━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━┛");

  console.log("");
}
