/*
 * Walio's theme: the one file to edit (for a merchant, or the merchant's AI).
 *
 * These settings are the Layout's designed default on any shop, painted
 * before the first paint. On a shop that does not show the visitor switcher
 * (see themeSwitcher) they are the only theme. After a change: build and
 * upload (bash scripts/release.sh <new-version> home), see AGENTS.md "Theme".
 *
 * palette        one of: "blue" (Walio blue, the default), "green",
 *                "violet", "teal", "orange"
 * brandColor     any colour, "#RRGGBB"; when set it replaces `palette` (the
 *                colour is made readable automatically: buttons, links, dark mode)
 * mode           "light" | "dark"
 * themeSwitcher  "showcase" (the visitor switcher only on Walio's own showcase
 *                shop, the default) | "on" (your visitors get it) | "off"
 * textOnBrand    with brandColor: "auto" (a light brand such as yellow keeps
 *                its colour, with dark words on its buttons) |
 *                "white" (white words; a light colour is darkened until they read)
 */
import type { ThemeSettings } from "../theme-switcher/theme-switcher";

export const THEME_SETTINGS: ThemeSettings = {
  palette: "blue",
  // brandColor: "#F5C400",
  mode: "light",
  themeSwitcher: "showcase",
  textOnBrand: "auto",
};
