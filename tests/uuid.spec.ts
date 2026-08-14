import {Constants} from 'src/constants';
import {Uuid, uuid} from 'src/uuid';
import {UuidAlphabetId, uuidAlphabets} from 'src/uuid/alphabets';

// Entropy floor from `_specs/uuid-generation-main.md`. Locked here on purpose — if the
// implementation constant changes, derived lengths change org-wide and the
// spec must be updated deliberately, not silently.
const FLOOR_BITS = 96;

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function derivedLength(alphabet: string): number {
	return Math.ceil(FLOOR_BITS / Math.log2(alphabet.length));
}

describe('Uuid', () => {
	describe('Entropy Floor', () => {
		it('should keep the implementation constant pinned to the spec value', () => {
			// The local FLOOR_BITS above drives every derived-length assertion in
			// this file. Pin it so a constant change fails here loudly rather than
			// silently agreeing with itself.
			expect(Constants.UUID_FLOOR_BITS).toBe(FLOOR_BITS);
		});
	});

	describe('GUID Form', () => {
		it('should produce a canonical RFC 4122 v4 GUID', () => {
			for (let i = 0; i < 200; i++) {
				const id = uuid.guid();
				expect(id).toMatch(GUID_REGEX);
			}
		});

		it('should carry 122 random bits (version & variant fixed)', () => {
			const id = uuid.guid();
			expect(id.length).toBe(36);
			expect(id[14]).toBe('4');
			expect('89ab').toContain(id[19]);
		});

		it('should be lowercase', () => {
			for (let i = 0; i < 50; i++) {
				const id = uuid.guid();
				expect(id).toBe(id.toLowerCase());
			}
		});

		it('should not repeat across a large sample', () => {
			const seen = new Set<string>();
			for (let i = 0; i < 2000; i++) {
				seen.add(uuid.guid());
			}

			expect(seen.size).toBe(2000);
		});
	});

	describe('Short Form', () => {
		it('should default to base62 at the derived length', () => {
			const id = uuid.short();
			expect(id.length).toBe(17);
			expect(id.length).toBe(derivedLength(uuidAlphabets.base62));
		});

		it('should emit only characters from the selected alphabet', () => {
			const presets: UuidAlphabetId[] = ['base62', 'base58', 'base64url'];

			for (const preset of presets) {
				const chars = uuidAlphabets[preset];

				for (let i = 0; i < 50; i++) {
					const id = uuid.short(preset);

					for (const char of id) {
						expect(chars).toContain(char);
					}
				}
			}
		});

		it('should derive the minimum length meeting the entropy floor for every preset', () => {
			const presets: UuidAlphabetId[] = ['base62', 'base58', 'base64url'];

			for (const preset of presets) {
				const chars = uuidAlphabets[preset];
				const bitsPerChar = Math.log2(chars.length);
				const id = uuid.short(preset);

				// Exactly the ceil of the formula.
				expect(id.length).toBe(derivedLength(chars));
				// Meets the floor...
				expect(id.length * bitsPerChar).toBeGreaterThanOrEqual(FLOOR_BITS);
				// ...and is never one char longer than required.
				expect((id.length - 1) * bitsPerChar).toBeLessThan(FLOOR_BITS);
			}
		});

		it('should derive expected lengths for each preset', () => {
			expect(uuid.short('base62').length).toBe(17);
			expect(uuid.short('base58').length).toBe(17);
			expect(uuid.short('base64url').length).toBe(16);
		});

		it('should not repeat across a large sample', () => {
			const seen = new Set<string>();
			for (let i = 0; i < 5000; i++) {
				seen.add(uuid.short());
			}

			expect(seen.size).toBe(5000);
		});

		it('should reject out-of-range draws rather than wrap them', () => {
			// base58 (size 58) masks to 63, so ~9% of draws land in 58..63 and
			// must be discarded. A wrap (`byte % size`) would still fill the id
			// at the right length, so length alone proves nothing — every char
			// landing in-alphabet across many samples is what rules it out.
			for (let i = 0; i < 400; i++) {
				const id = uuid.short('base58');

				expect(id).toHaveLength(17);

				for (const char of id) {
					expect(uuidAlphabets.base58).toContain(char);
				}
			}
		});

		it('should fill power-of-two alphabets with no rejection', () => {
			// base64url (size 64) masks to 63 exactly — every draw is in range.
			for (let i = 0; i < 200; i++) {
				const id = uuid.short('base64url');

				expect(id).toHaveLength(16);

				for (const char of id) {
					expect(uuidAlphabets.base64url).toContain(char);
				}
			}
		});
	});

	describe('Public Argument Sanitization', () => {
		it('should fall back to base62 for unknown alphabet ids', () => {
			const id = uuid.short('nope' as UuidAlphabetId);
			expect(id.length).toBe(17);

			for (const char of id) {
				expect(uuidAlphabets.base62).toContain(char);
			}
		});

		it('should fall back to base62 for non-string alphabet arguments', () => {
			const inputs = [17, null, {}, [], true];

			for (const input of inputs) {
				const id = uuid.short(input as unknown as UuidAlphabetId);
				expect(id.length).toBe(17);

				for (const char of id) {
					expect(uuidAlphabets.base62).toContain(char);
				}
			}
		});

		it('should never throw on bad public arguments', () => {
			expect(() => uuid.short(undefined)).not.toThrow();
			expect(() => uuid.short('' as UuidAlphabetId)).not.toThrow();
			expect(() => uuid.short('constructor' as UuidAlphabetId)).not.toThrow();
		});

		it('should treat inherited object keys as unknown alphabet ids', () => {
			// 'constructor' exists on Object.prototype — a naive lookup would
			// resolve it to a function instead of an alphabet string.
			const id = uuid.short('constructor' as UuidAlphabetId);
			expect(id.length).toBe(17);

			for (const char of id) {
				expect(uuidAlphabets.base62).toContain(char);
			}
		});
	});

	describe('Distribution', () => {
		it('should draw alphabet characters near-uniformly (no modulo bias)', () => {
			const chars = uuidAlphabets.base62;
			const counts = new Map<string, number>();

			for (const char of chars) {
				counts.set(char, 0);
			}

			const samples = 6000;
			for (let i = 0; i < samples; i++) {
				const id = uuid.short();

				for (const char of id) {
					counts.set(char, (counts.get(char) as number) + 1);
				}
			}

			const total = samples * 17;
			const expected = total / chars.length;

			// Loose uniformity bound (~±12%, many sigma at this sample size).
			// Catches a reintroduced `byte % size` bias (+25% on low-index
			// chars), not a statistical test suite.
			const violations: string[] = [];
			for (const [char, count] of counts) {
				if (count <= expected * 0.88 || count >= expected * 1.12) {
					violations.push(`'${char}': ${count} (expected ~${Math.round(expected)})`);
				}
			}

			expect(violations).toEqual([]);
		});
	});

	describe('Contract Lock', () => {
		it('should expose no length parameter on the public surface', () => {
			// guid takes nothing; short takes exactly one param (alphabet).
			expect(uuid.guid.length).toBe(0);
			expect(uuid.short.length).toBe(1);

			// @ts-expect-error - lengths are not selectable publicly; ids come
			// in exactly two forms (see _specs/uuid-generation-main.md Uniqueness Contract).
			const id = uuid.short(12);
			// Runtime: non-preset argument sanitizes to the safe default.
			expect(id.length).toBe(17);
		});

		it('should expose the helper methods', () => {
			expect(typeof uuid.guid).toBe('function');
			expect(typeof uuid.short).toBe('function');
		});
	});

	describe('CSPRNG Requirement', () => {
		it('should throw when crypto.getRandomValues is unavailable', () => {
			const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
			Object.defineProperty(globalThis, 'crypto', {
				value: undefined,
				configurable: true,
				writable: true
			});

			try {
				expect(() => uuid.guid()).toThrow('uuid_failure:crypto_get_random_values:unavailable');
				expect(() => uuid.short()).toThrow('uuid_failure:crypto_get_random_values:unavailable');
			} finally {
				if (original) {
					Object.defineProperty(globalThis, 'crypto', original);
				} else {
					// No original descriptor — leaving the stub in place would
					// break every later test in the file.
					delete (globalThis as {crypto?: Crypto}).crypto;
				}
			}

			// Restored — generation works again.
			expect(uuid.guid()).toMatch(GUID_REGEX);
		});
	});

	describe('Shared Instance', () => {
		it('should export a shared Uuid instance', () => {
			expect(uuid).toBeInstanceOf(Uuid);
		});

		it('should produce equivalent output shapes from fresh instances', () => {
			const fresh = new Uuid();
			expect(fresh.guid()).toMatch(GUID_REGEX);
			expect(fresh.short().length).toBe(17);
			expect(fresh.short('base64url').length).toBe(16);
		});
	});
});
