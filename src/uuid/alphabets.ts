/**
 * Named alphabet presets for short id generation. Each preset is an ordered
 * string of unique single-code-unit characters. Short id lengths are derived
 * from alphabet size and the entropy floor — see `_specs/uuid-generation-main.md`.
 *
 * @category Uuid
 */
export const uuidAlphabets = {
	/** URL-safe, no separators — safe inside dash/underscore-delimited composite ids. */
	base62: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
	/** base62 minus `0 O I l` — human-transcribable codes. */
	base58: '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ',
	/** base62 plus `-` `_` — densest URL-safe form; matches legacy shortid output range. */
	base64url: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_'
} as const;

/**
 * Preset id accepted by the public short id helper.
 *
 * @category Uuid
 */
export type UuidAlphabetId = keyof typeof uuidAlphabets;
