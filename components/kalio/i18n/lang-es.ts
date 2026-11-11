/* Walio in this language: the shared Kalio base and Walio's own words, one chunk. */
import base from "./base/es";
import own from "./walio.es";

export default { ...base, ...own } as Record<string, string>;
