/* Walio in this language: the shared Kalio base and Walio's own words, one chunk. */
import base from "./base/pa";
import own from "./walio.pa";

export default { ...base, ...own } as Record<string, string>;
