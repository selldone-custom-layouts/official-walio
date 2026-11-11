/* Walio in this language: the shared Kalio base and Walio's own words, one chunk. */
import base from "./base/ar";
import own from "./walio.ar";

export default { ...base, ...own } as Record<string, string>;
