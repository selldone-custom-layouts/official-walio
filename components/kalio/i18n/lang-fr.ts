/* Walio in this language: the shared Kalio base and Walio's own words, one chunk. */
import base from "./base/fr";
import own from "./walio.fr";

export default { ...base, ...own } as Record<string, string>;
