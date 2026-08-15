import type {Utf8ScanResult} from './scan/result';

/**
 * Scan a byte buffer for UTF-8 validity, reporting where the first invalid
 * sequence starts and how many code points precede it. Well-formedness
 * follows RFC 3629 / the Unicode standard — the same acceptance rules as
 * `TextDecoder('utf-8', {fatal: true})` and Node's `Buffer.isUtf8` — so
 * overlong encodings, surrogate code points (U+D800–U+DFFF), code points
 * above U+10FFFF, stray continuation bytes, and truncated sequences are all
 * rejected.
 *
 * Use `utf8Validate` instead when only a boolean verdict is needed.
 *
 * @param bytes		Buffer to scan. Node `Buffer` is accepted since it is a
 * 					`Uint8Array` subclass.
 * @returns			Validity, offset of the first invalid sequence (`-1` when
 * 					valid), and the count of complete code points decoded.
 * @throws			`TypeError` when `bytes` is not a `Uint8Array`.
 *
 * @category Utf8
 */
export function utf8Scan(bytes: Uint8Array): Utf8ScanResult {
	if (!(bytes instanceof Uint8Array)) {
		throw new TypeError('utf8_scan_failure:bytes:not_a_uint8array');
	}

	const len = bytes.length;
	let codePoints = 0;
	let i = 0;

	while (i < len) {
		const lead = bytes[i];

		if (lead < 0x80) {
			i++;
			codePoints++;
			continue;
		}

		// Bounds for the first continuation byte. The default 0x80–0xBF range
		// tightens on lead bytes whose full range would admit overlong forms
		// (0xE0, 0xF0), surrogates (0xED), or code points past U+10FFFF (0xF4).
		let size: number;
		let lower = 0x80;
		let upper = 0xbf;

		if (lead >= 0xc2 && lead <= 0xdf) {
			size = 2;
		} else if (lead >= 0xe0 && lead <= 0xef) {
			size = 3;

			if (lead === 0xe0) {
				lower = 0xa0;
			} else if (lead === 0xed) {
				upper = 0x9f;
			}
		} else if (lead >= 0xf0 && lead <= 0xf4) {
			size = 4;

			if (lead === 0xf0) {
				lower = 0x90;
			} else if (lead === 0xf4) {
				upper = 0x8f;
			}
		} else {
			// Stray continuation byte (0x80–0xBF), overlong 2-byte lead
			// (0xC0–0xC1), or lead beyond U+10FFFF (0xF5–0xFF).
			return {valid: false, invalidAt: i, codePoints: codePoints};
		}

		if (i + size > len) {
			return {valid: false, invalidAt: i, codePoints: codePoints};
		}

		const first = bytes[i + 1];
		if (first < lower || first > upper) {
			return {valid: false, invalidAt: i, codePoints: codePoints};
		}

		for (let j = 2; j < size; j++) {
			const next = bytes[i + j];

			if (next < 0x80 || next > 0xbf) {
				return {valid: false, invalidAt: i, codePoints: codePoints};
			}
		}

		i += size;
		codePoints++;
	}

	return {valid: true, invalidAt: -1, codePoints: codePoints};
}
