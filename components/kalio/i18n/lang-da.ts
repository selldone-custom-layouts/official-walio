/* Walio in this language: the shared Kalio base and Walio's own words, one chunk. */
import base from "./base/da";
import own from "./walio.da";

export default { ...base, ...own } as Record<string, string>;
