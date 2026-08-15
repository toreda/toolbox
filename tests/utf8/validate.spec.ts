import {utf8Validate} from '../../src/utf8/validate';

describe('utf8Validate', () => {
	describe('Valid Input', () => {
		it('should accept an empty buffer', () => {
			expect(utf8Validate(new Uint8Array(0))).toBe(true);
		});

		it('should accept encoded text of every sequence width', () => {
			expect(utf8Validate(new TextEncoder().encode('aé€😀'))).toBe(true);
		});

		it('should accept a Node Buffer', () => {
			expect(utf8Validate(Buffer.from('héllo 😀', 'utf8'))).toBe(true);
		});
	});

	describe('Invalid Input', () => {
		it('should reject a lone continuation byte', () => {
			expect(utf8Validate(new Uint8Array([0x80]))).toBe(false);
		});

		it('should reject an overlong encoding', () => {
			expect(utf8Validate(new Uint8Array([0xc0, 0xaf]))).toBe(false);
		});

		it('should reject an encoded surrogate', () => {
			expect(utf8Validate(new Uint8Array([0xed, 0xa0, 0x80]))).toBe(false);
		});

		it('should reject a truncated trailing sequence', () => {
			expect(utf8Validate(new Uint8Array([0x61, 0xe2, 0x82]))).toBe(false);
		});
	});

	describe('Input Validation', () => {
		it('should throw TypeError for non-Uint8Array input', () => {
			expect(() => utf8Validate('abc' as never)).toThrow(TypeError);
			expect(() => utf8Validate(null as never)).toThrow(TypeError);
		});
	});
});
