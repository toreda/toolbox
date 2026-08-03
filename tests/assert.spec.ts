import {Assert} from 'src/assert';
import {AssertError} from 'src/assert/error';

/** Run `fn` and return the AssertError it throws. Fails the test when it doesn't throw one. */
function capture(fn: () => unknown): AssertError {
	try {
		fn();
	} catch (error) {
		if (error instanceof AssertError) {
			return error;
		}

		throw error;
	}

	throw new Error('Expected fn to throw an AssertError.');
}

/** Same as `capture` for async fns. */
async function captureAsync(fn: () => Promise<unknown>): Promise<AssertError> {
	try {
		await fn();
	} catch (error) {
		if (error instanceof AssertError) {
			return error;
		}

		throw error;
	}

	throw new Error('Expected fn to reject with an AssertError.');
}

describe('Assert', () => {
	describe('ok', () => {
		it('should pass for truthy values', () => {
			expect(() => Assert.ok(1)).not.toThrow();
			expect(() => Assert.ok('x')).not.toThrow();
			expect(() => Assert.ok([])).not.toThrow();
		});

		it('should throw for falsy values', () => {
			expect(() => Assert.ok(0)).toThrow(AssertError);
			expect(() => Assert.ok('')).toThrow(AssertError);
			expect(() => Assert.ok(null)).toThrow(AssertError);
			expect(() => Assert.ok(undefined)).toThrow(AssertError);
			expect(() => Assert.ok(NaN)).toThrow(AssertError);
		});

		it('should use the custom message and mark it non-generated', () => {
			const error = capture(() => Assert.ok(false, 'custom'));
			expect(error.message).toBe('custom');
			expect(error.generatedMessage).toBe(false);
		});

		it('should generate a message when none is provided', () => {
			const error = capture(() => Assert.ok(false));
			expect(error.generatedMessage).toBe(true);
			expect(error.operator).toBe('ok');
		});
	});

	describe('fail', () => {
		it('should always throw', () => {
			expect(() => Assert.fail()).toThrow(AssertError);
		});

		it('should carry the provided message', () => {
			const error = capture(() => Assert.fail('gave up'));
			expect(error.message).toBe('gave up');
			expect(error.operator).toBe('fail');
		});
	});

	describe('equal / notEqual', () => {
		it('should pass on identical values', () => {
			expect(() => Assert.equal(1, 1)).not.toThrow();
			expect(() => Assert.equal('a', 'a')).not.toThrow();
			expect(() => Assert.equal(NaN, NaN)).not.toThrow();
		});

		it('should throw on type-coerced matches', () => {
			expect(() => Assert.equal('1', 1)).toThrow(AssertError);
			expect(() => Assert.equal(true, 1)).toThrow(AssertError);
		});

		it('should throw on distinct object references with equal shape', () => {
			expect(() => Assert.equal({a: 1}, {a: 1})).toThrow(AssertError);
		});

		it('should record actual, expected, and operator on failure', () => {
			const error = capture(() => Assert.equal(1, 2));
			expect(error.actual).toBe(1);
			expect(error.expected).toBe(2);
			expect(error.operator).toBe('equal');
		});

		it('should invert with notEqual', () => {
			expect(() => Assert.notEqual(1, 2)).not.toThrow();
			expect(() => Assert.notEqual(1, 1)).toThrow(AssertError);
		});
	});

	describe('looseEqual / looseNotEqual', () => {
		it('should pass on coerced matches', () => {
			expect(() => Assert.looseEqual('1', 1)).not.toThrow();
			expect(() => Assert.looseEqual(null, undefined)).not.toThrow();
			expect(() => Assert.looseEqual(true, 1)).not.toThrow();
		});

		it('should treat NaN as equal to NaN', () => {
			expect(() => Assert.looseEqual(NaN, NaN)).not.toThrow();
		});

		it('should throw on non-coercible values', () => {
			expect(() => Assert.looseEqual('a', 1)).toThrow(AssertError);
		});

		it('should invert with looseNotEqual', () => {
			expect(() => Assert.looseNotEqual('a', 1)).not.toThrow();
			expect(() => Assert.looseNotEqual('1', 1)).toThrow(AssertError);
		});
	});

	describe('deepEqual', () => {
		it('should pass for equal nested structures', () => {
			expect(() => Assert.deepEqual({a: [1, {b: 2}]}, {a: [1, {b: 2}]})).not.toThrow();
		});

		it('should throw for differing nested values', () => {
			expect(() => Assert.deepEqual({a: [1, {b: 2}]}, {a: [1, {b: 3}]})).toThrow(AssertError);
		});

		it('should throw for missing or extra keys', () => {
			expect(() => Assert.deepEqual({a: 1}, {a: 1, b: undefined})).toThrow(AssertError);
			expect(() => Assert.deepEqual({a: 1, b: 2}, {a: 1})).toThrow(AssertError);
		});

		it('should use strict scalar comparison', () => {
			expect(() => Assert.deepEqual({a: '1'}, {a: 1})).toThrow(AssertError);
			expect(() => Assert.deepEqual([NaN], [NaN])).not.toThrow();
			expect(() => Assert.deepEqual([0], [-0])).toThrow(AssertError);
		});

		it('should compare array lengths including sparse tails', () => {
			expect(() => Assert.deepEqual([1], [1, undefined])).toThrow(AssertError);
		});

		it('should require matching prototypes', () => {
			class Point {
				public x = 1;
			}

			expect(() => Assert.deepEqual(new Point(), {x: 1})).toThrow(AssertError);
			expect(() => Assert.deepEqual(new Point(), new Point())).not.toThrow();
		});

		it('should compare Dates by timestamp', () => {
			expect(() => Assert.deepEqual(new Date(1000), new Date(1000))).not.toThrow();
			expect(() => Assert.deepEqual(new Date(1000), new Date(2000))).toThrow(AssertError);
			expect(() => Assert.deepEqual(new Date(NaN), new Date(NaN))).not.toThrow();
		});

		it('should compare RegExps by source and flags', () => {
			expect(() => Assert.deepEqual(/ab/gi, /ab/gi)).not.toThrow();
			expect(() => Assert.deepEqual(/ab/g, /ab/i)).toThrow(AssertError);
			expect(() => Assert.deepEqual(/ab/, /ac/)).toThrow(AssertError);
		});

		it('should compare Errors by name and message', () => {
			expect(() => Assert.deepEqual(new Error('x'), new Error('x'))).not.toThrow();
			expect(() => Assert.deepEqual(new Error('x'), new Error('y'))).toThrow(AssertError);
			expect(() => Assert.deepEqual(new TypeError('x'), new RangeError('x'))).toThrow(AssertError);
		});

		it('should compare Maps including object keys', () => {
			const actual = new Map<unknown, unknown>([
				['k', 1],
				[{id: 1}, 'a']
			]);
			const expected = new Map<unknown, unknown>([
				['k', 1],
				[{id: 1}, 'a']
			]);
			expect(() => Assert.deepEqual(actual, expected)).not.toThrow();

			expected.set('k', 2);
			expect(() => Assert.deepEqual(actual, expected)).toThrow(AssertError);
		});

		it('should throw for Maps with unmatched object keys', () => {
			const actual = new Map([[{id: 1}, 'a']]);
			const expected = new Map([[{id: 2}, 'a']]);
			expect(() => Assert.deepEqual(actual, expected)).toThrow(AssertError);
		});

		it('should compare Sets including object members', () => {
			expect(() => Assert.deepEqual(new Set([1, {a: 2}]), new Set([1, {a: 2}]))).not.toThrow();
			expect(() => Assert.deepEqual(new Set([1, {a: 2}]), new Set([1, {a: 3}]))).toThrow(AssertError);
			expect(() => Assert.deepEqual(new Set([1]), new Set([1, 2]))).toThrow(AssertError);
		});

		it('should compare typed arrays and buffers', () => {
			expect(() => Assert.deepEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).not.toThrow();
			expect(() => Assert.deepEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toThrow(
				AssertError
			);
			expect(() => Assert.deepEqual(new Uint8Array([1]), new Int8Array([1]))).toThrow(AssertError);
			expect(() =>
				Assert.deepEqual(new Uint8Array([1, 2]).buffer, new Uint8Array([1, 2]).buffer)
			).not.toThrow();
		});

		it('should support circular structures', () => {
			type Node = {value: number; self?: Node};
			const a: Node = {value: 1};
			a.self = a;
			const b: Node = {value: 1};
			b.self = b;

			expect(() => Assert.deepEqual(a, b)).not.toThrow();

			const c: Node = {value: 2};
			c.self = c;
			expect(() => Assert.deepEqual(a, c)).toThrow(AssertError);
		});

		it('should compare enumerable symbol keys', () => {
			const key = Symbol('k');
			expect(() => Assert.deepEqual({[key]: 1}, {[key]: 1})).not.toThrow();
			expect(() => Assert.deepEqual({[key]: 1}, {[key]: 2})).toThrow(AssertError);
		});

		it('should invert with notDeepEqual', () => {
			expect(() => Assert.notDeepEqual({a: 1}, {a: 2})).not.toThrow();
			expect(() => Assert.notDeepEqual({a: 1}, {a: 1})).toThrow(AssertError);
		});
	});

	describe('looseDeepEqual', () => {
		it('should coerce scalars', () => {
			expect(() => Assert.looseDeepEqual({a: '1'}, {a: 1})).not.toThrow();
			expect(() => Assert.looseDeepEqual([null], [undefined])).not.toThrow();
		});

		it('should ignore prototype differences', () => {
			class Point {
				public x = 1;
			}

			expect(() => Assert.looseDeepEqual(new Point(), {x: 1})).not.toThrow();
		});

		it('should still throw on structural differences', () => {
			expect(() => Assert.looseDeepEqual({a: 1}, {a: 1, b: 2})).toThrow(AssertError);
		});

		it('should invert with looseNotDeepEqual', () => {
			expect(() => Assert.looseNotDeepEqual({a: '1'}, {a: 2})).not.toThrow();
			expect(() => Assert.looseNotDeepEqual({a: '1'}, {a: 1})).toThrow(AssertError);
		});
	});

	describe('match / doesNotMatch', () => {
		it('should pass when the pattern matches', () => {
			expect(() => Assert.match('hello world', /world/)).not.toThrow();
		});

		it('should throw when the pattern does not match', () => {
			expect(() => Assert.match('hello', /world/)).toThrow(AssertError);
		});

		it('should throw for non-string input', () => {
			expect(() => Assert.match(1 as unknown as string, /1/)).toThrow(AssertError);
			expect(() => Assert.doesNotMatch(1 as unknown as string, /1/)).toThrow(AssertError);
		});

		it('should invert with doesNotMatch', () => {
			expect(() => Assert.doesNotMatch('hello', /world/)).not.toThrow();
			expect(() => Assert.doesNotMatch('hello world', /world/)).toThrow(AssertError);
		});
	});

	describe('throws', () => {
		it('should pass when fn throws', () => {
			expect(() =>
				Assert.throws(() => {
					throw new Error('boom');
				})
			).not.toThrow();
		});

		it('should throw when fn does not throw', () => {
			const error = capture(() => Assert.throws(() => 42));
			expect(error.operator).toBe('throws');
			expect(error.message).toBe('Missing expected exception.');
		});

		it('should match with a RegExp against the error message', () => {
			const boom = () => {
				throw new Error('boom town');
			};
			expect(() => Assert.throws(boom, /boom/)).not.toThrow();
			expect(() => Assert.throws(boom, /quiet/)).toThrow(AssertError);
		});

		it('should match a RegExp against stringified non-Error throws', () => {
			const boom = () => {
				throw 'plain text';
			};
			expect(() => Assert.throws(boom, /plain/)).not.toThrow();
		});

		it('should match with an Error class', () => {
			const boom = () => {
				throw new TypeError('bad type');
			};
			expect(() => Assert.throws(boom, TypeError)).not.toThrow();
			expect(() => Assert.throws(boom, Error)).not.toThrow();
			expect(() => Assert.throws(boom, RangeError)).toThrow(AssertError);
		});

		it('should match with a predicate function', () => {
			const boom = () => {
				throw new Error('boom');
			};
			expect(() =>
				Assert.throws(boom, (thrown) => thrown instanceof Error && thrown.message === 'boom')
			).not.toThrow();
			expect(() => Assert.throws(boom, () => false)).toThrow(AssertError);
		});

		it('should match with a property object', () => {
			const boom = () => {
				const error = new Error('boom') as Error & {code: string};
				error.code = 'E_BOOM';
				throw error;
			};
			expect(() => Assert.throws(boom, {message: 'boom', code: 'E_BOOM'})).not.toThrow();
			expect(() => Assert.throws(boom, {code: 'E_OTHER'})).toThrow(AssertError);
		});

		it('should treat a string second argument as the failure message', () => {
			const error = capture(() => Assert.throws(() => 42, 'should have exploded'));
			expect(error.message).toBe('should have exploded');
			expect(error.generatedMessage).toBe(false);
		});
	});

	describe('doesNotThrow', () => {
		it('should pass when fn returns normally', () => {
			expect(() => Assert.doesNotThrow(() => 42)).not.toThrow();
		});

		it('should throw an AssertError wrapping the exception', () => {
			const error = capture(() =>
				Assert.doesNotThrow(() => {
					throw new Error('boom');
				})
			);
			expect(error.operator).toBe('doesNotThrow');
			expect(error.actual).toBeInstanceOf(Error);
		});
	});

	describe('rejects', () => {
		it('should pass for a rejecting promise', async () => {
			await expect(Assert.rejects(Promise.reject(new Error('boom')))).resolves.toBeUndefined();
		});

		it('should pass for a rejecting async fn with a matcher', async () => {
			await expect(
				Assert.rejects(async () => {
					throw new TypeError('bad');
				}, TypeError)
			).resolves.toBeUndefined();
		});

		it('should throw when the promise resolves', async () => {
			const error = await captureAsync(() => Assert.rejects(Promise.resolve(42)));
			expect(error.operator).toBe('rejects');
			expect(error.message).toBe('Missing expected rejection.');
		});

		it('should throw when the reason does not match', async () => {
			await expect(Assert.rejects(Promise.reject(new Error('boom')), /quiet/)).rejects.toBeInstanceOf(
				AssertError
			);
		});
	});

	describe('doesNotReject', () => {
		it('should pass for a resolving promise', async () => {
			await expect(Assert.doesNotReject(Promise.resolve(42))).resolves.toBeUndefined();
		});

		it('should throw for a rejecting promise', async () => {
			const error = await captureAsync(() => Assert.doesNotReject(Promise.reject(new Error('boom'))));
			expect(error.operator).toBe('doesNotReject');
		});
	});

	describe('ifError', () => {
		it('should pass for null and undefined', () => {
			expect(() => Assert.ifError(null)).not.toThrow();
			expect(() => Assert.ifError(undefined)).not.toThrow();
		});

		it('should throw for any other value', () => {
			expect(() => Assert.ifError(new Error('boom'))).toThrow(AssertError);
			expect(() => Assert.ifError(0)).toThrow(AssertError);
			expect(() => Assert.ifError('')).toThrow(AssertError);
		});
	});
});
