# AI Agent Entry Point

Detailed AI instructions and reusable custom Storefront Layout material live
in the dedicated [`.ai-agent/`](.ai-agent/) directory so they stay separate
from application source.

For tasks that customize, redesign, audit, package, or publish this Storefront
as a custom Selldone Layout, read these files completely:

1. [`.ai-agent/AGENTS.md`](.ai-agent/AGENTS.md)
2. [`.ai-agent/SKILL.md`](.ai-agent/SKILL.md)
3. [`.ai-agent/AI_WORKFLOW.md`](.ai-agent/AI_WORKFLOW.md) when GitHub setup,
   dependency synchronization, packaging, authentication, or deployment is in
   scope

The official Vue 3/Vite Storefront is the implementation baseline. This kit
does not authorize a framework replacement or a parallel storefront app; the
visual design may change completely while the platform and commerce contracts
remain intact. Do not change the official repository's Git remote model or run
release commands merely because this shim exists. Apply publication rules in
the owner's controlled clone, fork, or release branch.

<!-- THEME:START -->
## Theme (palette, brand colour, light or dark, the visitor switcher)

When a merchant asks for a theme ("use the yellow theme", "my brand colour is #F5C400", "make it dark"), edit **one file only**: `components/walio/walio-theme.settings.ts`. Nothing else needs to change, and the colours are made readable automatically (buttons, links, header, dark mode).

| Setting | Allowed values |
| --- | --- |
| `palette` | `"blue"` (Walio blue, the default), `"green"`, `"violet"`, `"teal"`, `"orange"` |
| `brandColor` | any `"#RRGGBB"`; when set it replaces `palette` |
| `mode` | `"light"` or `"dark"` |
| `themeSwitcher` | `"showcase"` (the visitor switcher shows only on Walio's own showcase shop, molino, Selldone shop 15645; the default), `"on"` (the merchant's visitors get a Theme button in the header), `"off"` |
| `textOnBrand` | only with `brandColor`: `"auto"` (a light brand such as yellow keeps its colour, with dark words on it) or `"white"` (white words; a light colour is darkened) |

Worked examples (change only these lines; leave the rest of the file as it is):

- **"Use the yellow theme"**: there is no tested yellow palette, so use a brand colour: `brandColor: "#F5C400", textOnBrand: "auto"`.
- **"My brand colour is #F5C400"**: `brandColor: "#F5C400", textOnBrand: "auto"`. Use `textOnBrand: "white"` instead if they want white words; the colour is then darkened.
- **"Make it dark"**: `mode: "dark"`.
- **"Let visitors switch themes"**: `themeSwitcher: "on"`.
- **"Remove the switcher"**: `themeSwitcher: "off"`. On a merchant's own shop it is already hidden with `"showcase"`.
- **"Go back to the original colours"**: remove `brandColor` and set `palette: "blue", mode: "light"`.

Then release and check:

1. Build and upload: `LAYOUT_ID=<your Layout id> SELLDONE_CLI_SRC=<cli clone> bash scripts/release.sh <new version> home`; see the wiki page Build and Upload. Put the version live as in Go Live.
2. Check the contrast on the live shop. It must print `TOTAL 0`:
   ```sh
   PAGES="home=/,category=/<a category>,product=/product/<id>" node components/theme-switcher/tools/contrast-audit.cjs https://<your shop> ".k-header"
   ```
   For a theme chosen in the settings, no `STORAGE` is needed: the settings are the default.
3. If the visitor switcher is on, also run `components/theme-switcher/tools/header-check.cjs` with the selectors listed in its header comment, and `ring-sweep.cjs` from the kit for rings.

More: the wiki page **Theme and colours** (`docs/wiki/Theme-and-colours.md`).
<!-- THEME:END -->
