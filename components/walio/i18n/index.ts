/*
 * Walio's messages, one file per language. English is the source; add a
 * language here when the owner enables it in the shop (Selldone: Shop >
 * Settings > Languages), e.g.  import { da } from "./da";  …  { en, da }.
 */
import { en } from "./en";

export const WALIO_MESSAGES: Record<string, Record<string, string>> = { en };
