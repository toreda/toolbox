import {utf8Scan} from './scan';

/**
 * Check whether a byte buffer is well-formed UTF-8. Drop-in replacement for
 * the native `utf-8-validate` package's default export, minus the native
 * addon — pure JS, safe in Node, browsers, and WebWorkers.
 *
 * Well-formedness follows RFC 3629 / the Unicode standard: overlong
 * encodings, surrogate code points (U+D800–U+DFFF), code points above
 * U+10FFFF, stray continuation bytes, and truncated sequences all fail.
 * Use `utf8Scan` to also learn where validation failed.
 *
 * @param bytes		Buffer to check. Node `Buffer` is accepted since it is a
 * 					`Uint8Array` subclass.
 * @returns			`true` when the entire buffer is valid UTF-8. An empty
 * 					buffer is valid.
 * @throws			`TypeError` when `bytes` is not a `Uint8Array`.
 *
 * @category Utf8
 */
export function utf8Validate(bytes: Uint8Array): boolean {
	return utf8Scan(bytes).valid;
}
