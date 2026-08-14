// Sourced from public domain algorithm here:
// https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js

/**
 * Fast, deterministic 53-bit string hash using only `Math` calls — no key
 * import, crypto initialization, or SSL library required. Used for strictly
 * non-secure purposes like creating signatures for objects based on their
 * stringified properties.
 *
 * @invariant	NOT cryptographically secure. Must never be used for
 * 				cryptographic signatures such as key signing or verification.
 * @constraint	`seed` must be a 32-bit integer. Other values are coerced via
 * 				ToInt32 before mixing, so a fractional seed is truncated and a
 * 				seed >= 2^32 wraps (e.g. `2 ** 32 + 5` hashes identically to `5`).
 *
 * @param str	Value to hash, processed per UTF-16 code unit.
 * @param seed	Optional seed to namespace hashes; identical strings hashed
 * 				with different seeds produce different results.
 * @returns		Unsigned integer in the range `[0, 2^53)` — always a safe integer.
 *
 * @category Hash
 */
export function cyrb53(str: string, seed: number = 0): number {
	let h1 = 0xdeadbeef ^ seed,
		h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
