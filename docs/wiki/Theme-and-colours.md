# Theme and colours

Walio's colours are chosen in **one file**: `components/walio/walio-theme.settings.ts`. You can edit it by hand, or ask your AI agent: "use the yellow theme", "my brand colour is #F5C400", "make it dark". The agent instructions are in `AGENTS.md`, section "Theme".

```ts
export const THEME_SETTINGS: ThemeSettings = {
  palette: "blue",        // "blue" | "green" | "violet" | "teal" | "orange"
  // brandColor: "#F5C400", // any colour; replaces palette
  mode: "light",          // "light" | "dark"
  themeSwitcher: "showcase",// "showcase" | "on" | "off"
  textOnBrand: "auto",      // with brandColor: "auto" | "white"
};
```

## What each setting does

- **`palette`**: one of the tested palettes (Walio blue, Green, Violet, Teal, Sunset orange). Each keeps white words on its buttons and header at 6.3:1 or more, in light and dark.
- **`brandColor`**: any colour. Walio makes a whole palette from it: buttons, hover, tints, links, the header, and the dark mode. It keeps the colour's hue and changes only its lightness until every word reads, at 4.5:1 or more (6.5:1 on the header).
  - With **`textOnBrand: "auto"`**, a light brand such as yellow keeps its colour, and its buttons and header get dark words. Links on white use a darker shade of it.
  - With **`textOnBrand: "white"`**, the colour is darkened until white words read.
- **`mode`**: light or dark. Product photos stay on light tiles in dark mode.
- **`themeSwitcher`**: the Theme row in the footer (just above the legal row) that lets **visitors** pick a palette, a custom colour and Light / Dark.
  - `"showcase"` (default): only on Walio's own showcase shop (molino, Selldone shop 15645), so your shop shows your settings and no Theme row.
  - `"on"`: your visitors get the row; your settings are its default.
  - `"off"`: never shown.

The settings are applied before the page first paints, so there is no flash of the default colours. On a shop that does not show the switcher, a visitor's stored choice from another shop is never applied.

## After a change

1. Build and upload a new version (see [Build and Upload](Build-and-Upload)), then put it live ([Go Live](Go-Live)).
2. Check the contrast on your live shop. It must print `TOTAL 0`:
   ```sh
   PAGES="home=/,category=/<a category>,product=/product/<id>" \
     node components/theme-switcher/tools/contrast-audit.cjs https://<your shop> ".k-header"
   ```
3. With the switcher on, also run `ring-sweep.cjs` from the kit (rings inside their box) and the contrast audit with a stored dark choice; the Theme row is in the footer of every page.
