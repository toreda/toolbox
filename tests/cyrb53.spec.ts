import {cyrb53} from '../src/cyrb53';

describe('cyrb53', () => {
	describe('Known Vectors', () => {
		// These values lock the hash output. cyrb53 results are persisted as
		// identity signatures (content hashes, scene versions) — if any of
		// these assertions fail, the implementation changed and every stored
		// hash is silently invalidated. Do not update the expected values
		// without a migration plan for persisted hashes.
		it('should hash empty string with default seed', () => {
			expect(cyrb53('')).toBe(3338908027751811);
		});

		it('should hash single character strings with default seed', () => {
			expect(cyrb53('a')).toBe(7929297801672961);
			expect(cyrb53('b')).toBe(8684336938537663);
		});

		it('should hash multi-character strings with default seed', () => {
			expect(cyrb53('abc')).toBe(5059922895146125);
			expect(cyrb53('hello world')).toBe(3259054761512980);
			expect(cyrb53('revenge')).toBe(4051478007546757);
			expect(cyrb53('revenue')).toBe(8309097637345594);
		});

		it('should hash with explicit non-zero seeds', () => {
			expect(cyrb53('a', 1)).toBe(5368154436228575);
			expect(cyrb53('a', 2)).toBe(217965353842102);
			expect(cyrb53('abc', 42)).toBe(6035376845117563);
		});

		it('should hash non-latin content containing surrogate pairs', () => {
			expect(cyrb53('🙂')).toBe(5813621503378343);
		});

		it('should hash long strings', () => {
			expect(cyrb53('x'.repeat(1000))).toBe(7451676703532859);
		});
	});

	describe('Determinism', () => {
		it('should return identical hash for identical input and seed', () => {
			const first = cyrb53('stream_together', 7);
			const second = cyrb53('stream_together', 7);
			expect(first).toBe(second);
		});

		it('should treat default seed as seed 0', () => {
			expect(cyrb53('abc')).toBe(cyrb53('abc', 0));
		});
	});

	describe('Distribution', () => {
		it('should produce different hashes for similar strings', () => {
			expect(cyrb53('revenge')).not.toBe(cyrb53('revenue'));
		});

		it('should produce different hashes for the same string with different seeds', () => {
			expect(cyrb53('abc', 1)).not.toBe(cyrb53('abc', 2));
		});

		it('should produce different hashes for reordered content', () => {
			expect(cyrb53('ab')).not.toBe(cyrb53('ba'));
		});
	});

	describe('Seed Coercion', () => {
		it('should wrap seeds >= 2^32 to their 32-bit value', () => {
			expect(cyrb53('a', 2 ** 32 + 5)).toBe(cyrb53('a', 5));
		});

		it('should truncate fractional seeds', () => {
			expect(cyrb53('a', 1.7)).toBe(cyrb53('a', 1));
		});

		it('should accept negative seeds deterministically', () => {
			expect(cyrb53('a', -1)).toBe(73693522129417);
		});
	});

	describe('Output Range', () => {
		it('should return a non-negative safe integer below 2^53', () => {
			const samples = ['', 'a', 'abc', 'hello world', '🙂', 'x'.repeat(1000)];

			for (const sample of samples) {
				const result = cyrb53(sample);
				expect(Number.isSafeInteger(result)).toBe(true);
				expect(result).toBeGreaterThanOrEqual(0);
				expect(result).toBeLessThan(2 ** 53);
			}
		});
	});
});
