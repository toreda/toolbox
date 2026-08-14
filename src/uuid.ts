import {type UuidAlphabetId, uuidAlphabets} from './uuid/alphabets';
import {uuidDerivedLength} from './uuid/derived/length';
import {uuidRng} from './uuid/rng';

/**
 * Argument contract between the public helpers and the private factory.
 * Deliberately not exported — callers select id styles through the helpers,
 * which are the enforcement point for the uniqueness contract.
 */
interface UuidFactoryOptions {
	style?: 'guid' | 'short';
	/** Random portion length. Omitted → derived from the entropy floor. */
	length?: number;
	/** Resolved alphabet characters (not a preset id). Omitted → base62. */
	alphabet?: string;
	/** Prepended verbatim. Not counted toward `length`. */
	prefix?: string;
}

// Module-scope tables & scratch buffers shared by all instances so id
// generation allocates nothing but the returned string.
const HEX_LUT: string[] = new Array(256);
for (let i = 0; i < 256; i++) {
	HEX_LUT[i] = (i + 0x100).toString(16).substring(1);
}
const GUID_SCRATCH = new Uint8Array(16);
const SHORT_SCRATCH = new Uint8Array(64);

/**
 * Unique id generation with an uncoordinated uniqueness guarantee. Public
 * helpers are the entire external surface and satisfy the guarantee by
 * construction; the flexible factory is private. See `_specs/uuid-generation-main.md`.
 *
 * @category Uuid
 */
export class Uuid {
	/**
	 * Canonical RFC 4122 v4 GUID (36 chars, lowercase hex, dashed). The
	 * "normal" bucket — use when id size doesn't matter.
	 */
	public guid(): string {
		return this.make({style: 'guid'});
	}

	/**
	 * Minimum-length id satisfying the entropy floor for the selected
	 * alphabet (default base62 → 17 chars). The "short" bucket — use when
	 * conserving space in storage or transfer.
	 * @param alphabet		Preset id. Unknown values fall back to base62.
	 */
	public short(alphabet?: UuidAlphabetId): string {
		// `hasOwn` keeps inherited keys ('constructor', 'toString', '__proto__')
		// from resolving through the prototype chain to a non-alphabet value.
		const preset =
			typeof alphabet === 'string' && Object.hasOwn(uuidAlphabets, alphabet)
				? uuidAlphabets[alphabet]
				: undefined;

		return this.make({
			style: 'short',
			alphabet: typeof preset === 'string' ? preset : uuidAlphabets.base62
		});
	}

	/**
	 * Id factory. Flexible and non-opinionated — produces exactly what the
	 * arguments describe with no contract enforcement. Private so the only
	 * external paths are the contract-safe helpers above.
	 */
	private make(options?: UuidFactoryOptions): string {
		const prefix = typeof options?.prefix === 'string' ? options.prefix : '';

		if (options?.style === 'short') {
			const alphabet = options.alphabet ?? uuidAlphabets.base62;
			const length = options.length ?? uuidDerivedLength(alphabet.length);

			return prefix + this.makeShort(alphabet, length);
		}

		return prefix + this.makeGuid();
	}

	private makeGuid(): string {
		const bytes = uuidRng().getRandomValues(GUID_SCRATCH);
		// RFC 4122 v4: version nibble on byte 6, variant bits on byte 8.
		bytes[6] = (bytes[6] & 0x0f) | 0x40;
		bytes[8] = (bytes[8] & 0x3f) | 0x80;

		return (
			HEX_LUT[bytes[0]] +
			HEX_LUT[bytes[1]] +
			HEX_LUT[bytes[2]] +
			HEX_LUT[bytes[3]] +
			'-' +
			HEX_LUT[bytes[4]] +
			HEX_LUT[bytes[5]] +
			'-' +
			HEX_LUT[bytes[6]] +
			HEX_LUT[bytes[7]] +
			'-' +
			HEX_LUT[bytes[8]] +
			HEX_LUT[bytes[9]] +
			'-' +
			HEX_LUT[bytes[10]] +
			HEX_LUT[bytes[11]] +
			HEX_LUT[bytes[12]] +
			HEX_LUT[bytes[13]] +
			HEX_LUT[bytes[14]] +
			HEX_LUT[bytes[15]]
		);
	}

	private makeShort(alphabet: string, length: number): string {
		const rng = uuidRng();
		const size = alphabet.length;

		// Below 2 the mask math degenerates (`clz32(0)` → a negative shift) and
		// a 1-char alphabet carries no entropy, so the draw loop never ends.
		if (size < 2) {
			throw new Error('uuid_failure:alphabet:too_small');
		}

		// Smallest (power-of-two - 1) mask covering every alphabet index.
		// Masked draws >= size are rejected instead of wrapped (`byte % size`
		// would bias low-index characters).
		const mask = (2 << (31 - Math.clz32(size - 1))) - 1;
		let result = '';

		while (result.length < length) {
			const bytes = rng.getRandomValues(SHORT_SCRATCH);

			for (let i = 0; i < bytes.length && result.length < length; i++) {
				const index = bytes[i] & mask;

				if (index < size) {
					result += alphabet[index];
				}
			}
		}

		return result;
	}
}

/**
 * Shared instance — the normal way call sites consume `Uuid`. The class is
 * stateless, so a single shared instance serves every call site without
 * per-site construction.
 *
 * @category Uuid
 */
export const uuid = new Uuid();
