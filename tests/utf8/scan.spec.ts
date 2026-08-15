import {utf8Scan} from '../../src/utf8/scan';

/** Encode a string to UTF-8 bytes for building valid test vectors. */
function enc(str: string): Uint8Array {
	return new TextEncoder().encode(str);
}

describe('utf8Scan', () => {
	describe('Valid Input', () => {
		it('should accept an empty buffer with zero code points', () => {
			expect(utf8Scan(new Uint8Array(0))).toEqual({valid: true, invalidAt: -1, codePoints: 0});
		});

		it('should accept pure ASCII', () => {
			expect(utf8Scan(enc('hello world'))).toEqual({valid: true, invalidAt: -1, codePoints: 11});
		});

		it('should accept 2-byte sequences at both range boundaries', () => {
			// U+0080 (first 2-byte) and U+07FF (last 2-byte).
			expect(utf8Scan(new Uint8Array([0xc2, 0x80]))).toEqual({valid: true, invalidAt: -1, codePoints: 1});
			expect(utf8Scan(new Uint8Array([0xdf, 0xbf]))).toEqual({valid: true, invalidAt: -1, codePoints: 1});
		});

		it('should accept 3-byte sequences at both range boundaries', () => {
			// U+0800 (first 3-byte) and U+FFFF (last 3-byte).
			expect(utf8Scan(new Uint8Array([0xe0, 0xa0, 0x80]))).toEqual({
				valid: true,
				invalidAt: -1,
				codePoints: 1
			});
			expect(utf8Scan(new Uint8Array([0xef, 0xbf, 0xbf]))).toEqual({
				valid: true,
				invalidAt: -1,
				codePoints: 1
			});
		});

		it('should accept 4-byte sequences at both range boundaries', () => {
			// U+10000 (first 4-byte) and U+10FFFF (last valid code point).
			expect(utf8Scan(new Uint8Array([0xf0, 0x90, 0x80, 0x80]))).toEqual({
				valid: true,
				invalidAt: -1,
				codePoints: 1
			});
			expect(utf8Scan(new Uint8Array([0xf4, 0x8f, 0xbf, 0xbf]))).toEqual({
				valid: true,
				invalidAt: -1,
				codePoints: 1
			});
		});

		it('should accept U+D7FF and U+E000 surrounding the surrogate gap', () => {
			expect(utf8Scan(new Uint8Array([0xed, 0x9f, 0xbf])).valid).toBe(true);
			expect(utf8Scan(new Uint8Array([0xee, 0x80, 0x80])).valid).toBe(true);
		});

		it('should accept mixed-width text and count code points, not bytes', () => {
			// 5 code points: a, é (2 bytes), € (3 bytes), 😀 (4 bytes), z.
			const bytes = enc('aé€😀z');
			expect(bytes.length).toBe(11);
			expect(utf8Scan(bytes)).toEqual({valid: true, invalidAt: -1, codePoints: 5});
		});

		it('should accept a Node Buffer', () => {
			expect(utf8Scan(Buffer.from('héllo', 'utf8')).valid).toBe(true);
		});
	});

	describe('Stray & Overlong Lead Bytes', () => {
		it('should reject a lone continuation byte', () => {
			expect(utf8Scan(new Uint8Array([0x80]))).toEqual({valid: false, invalidAt: 0, codePoints: 0});
			expect(utf8Scan(new Uint8Array([0xbf]))).toEqual({valid: false, invalidAt: 0, codePoints: 0});
		});

		it('should reject overlong 2-byte lead bytes 0xC0 and 0xC1', () => {
			expect(utf8Scan(new Uint8Array([0xc0, 0xaf])).valid).toBe(false);
			expect(utf8Scan(new Uint8Array([0xc1, 0xbf])).valid).toBe(false);
		});

		it('should reject lead bytes 0xF5 through 0xFF', () => {
			for (const lead of [0xf5, 0xf8, 0xfe, 0xff]) {
				expect(utf8Scan(new Uint8Array([lead, 0x80, 0x80, 0x80])).valid).toBe(false);
			}
		});
	});

	describe('Overlong Encodings', () => {
		it('should reject overlong 3-byte encodings', () => {
			// U+007F and U+07FF encoded in 3 bytes.
			expect(utf8Scan(new Uint8Array([0xe0, 0x81, 0xbf])).valid).toBe(false);
			expect(utf8Scan(new Uint8Array([0xe0, 0x9f, 0xbf])).valid).toBe(false);
		});

		it('should reject overlong 4-byte encodings', () => {
			// U+FFFF encoded in 4 bytes.
			expect(utf8Scan(new Uint8Array([0xf0, 0x8f, 0xbf, 0xbf])).valid).toBe(false);
		});
	});

	describe('Surrogates & Out-of-Range', () => {
		it('should reject encoded surrogate code points', () => {
			// U+D800 and U+DFFF.
			expect(utf8Scan(new Uint8Array([0xed, 0xa0, 0x80])).valid).toBe(false);
			expect(utf8Scan(new Uint8Array([0xed, 0xbf, 0xbf])).valid).toBe(false);
		});

		it('should reject a CESU-8 style surrogate pair', () => {
			const bytes = new Uint8Array([0xed, 0xa0, 0xbd, 0xed, 0xb8, 0x80]);
			expect(utf8Scan(bytes)).toEqual({valid: false, invalidAt: 0, codePoints: 0});
		});

		it('should reject code points above U+10FFFF', () => {
			// U+110000.
			expect(utf8Scan(new Uint8Array([0xf4, 0x90, 0x80, 0x80])).valid).toBe(false);
		});
	});

	describe('Truncated & Broken Sequences', () => {
		it('should reject sequences truncated by the end of the buffer', () => {
			expect(utf8Scan(new Uint8Array([0xc2])).valid).toBe(false);
			expect(utf8Scan(new Uint8Array([0xe0, 0xa0])).valid).toBe(false);
			expect(utf8Scan(new Uint8Array([0xf0, 0x90, 0x80])).valid).toBe(false);
		});

		it('should reject a sequence interrupted by an ASCII byte', () => {
			// 'a', then € missing its final continuation byte, then 'b'.
			const bytes = new Uint8Array([0x61, 0xe2, 0x82, 0x62]);
			expect(utf8Scan(bytes)).toEqual({valid: false, invalidAt: 1, codePoints: 1});
		});

		it('should reject a sequence interrupted by a new lead byte', () => {
			const bytes = new Uint8Array([0xe2, 0x82, 0xc2, 0x80]);
			expect(utf8Scan(bytes)).toEqual({valid: false, invalidAt: 0, codePoints: 0});
		});
	});

	describe('Failure Reporting', () => {
		it('should report the lead byte offset of the invalid sequence', () => {
			// 'ab' + é + lone continuation byte at offset 4.
			const bytes = new Uint8Array([0x61, 0x62, 0xc3, 0xa9, 0x80]);
			expect(utf8Scan(bytes)).toEqual({valid: false, invalidAt: 4, codePoints: 3});
		});

		it('should report the lead byte offset for a truncated trailing sequence', () => {
			const bytes = new Uint8Array([...enc('abc'), 0xf0, 0x90]);
			expect(utf8Scan(bytes)).toEqual({valid: false, invalidAt: 3, codePoints: 3});
		});
	});

	describe('TextDecoder Agreement', () => {
		function decoderAccepts(bytes: Uint8Array): boolean {
			try {
				new TextDecoder('utf-8', {fatal: true}).decode(bytes);
				return true;
			} catch {
				return false;
			}
		}

		it('should agree with TextDecoder(fatal) on deterministic pseudo-random buffers', () => {
			// Deterministic LCG so failures are reproducible.
			let state = 0x2f6e2b1;
			const nextByte = (): number => {
				state = (Math.imul(state, 48271) >>> 0) % 0x7fffffff;
				return state & 0xff;
			};

			for (let round = 0; round < 200; round++) {
				const bytes = new Uint8Array(32);
				for (let i = 0; i < bytes.length; i++) {
					bytes[i] = nextByte();
				}

				expect(utf8Scan(bytes).valid).toBe(decoderAccepts(bytes));
			}
		});

		it('should agree with TextDecoder(fatal) on every 2-byte buffer starting 0xC0-0xFF', () => {
			for (let lead = 0xc0; lead <= 0xff; lead++) {
				for (let second = 0x00; second <= 0xff; second++) {
					const bytes = new Uint8Array([lead, second]);
					expect(utf8Scan(bytes).valid).toBe(decoderAccepts(bytes));
				}
			}
		});
	});

	describe('Input Validation', () => {
		it('should throw TypeError for non-Uint8Array input', () => {
			for (const input of [undefined, null, 'abc', [0x61], new ArrayBuffer(4), new Uint16Array(2)]) {
				expect(() => utf8Scan(input as never)).toThrow(TypeError);
			}
		});
	});
});
