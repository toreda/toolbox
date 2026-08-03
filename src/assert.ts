import {AssertError} from './assert/error';
import type {AssertMatcher} from './assert/matcher';

/** Longest inspected-value string included in generated messages. */
const MAX_INSPECT_LENGTH = 128;

/** Compact single-line rendering of a value for generated failure messages. */
function inspect(value: unknown): string {
	if (typeof value === 'string') {
		return truncate(JSON.stringify(value));
	}

	if (typeof value === 'bigint') {
		return `${value}n`;
	}

	if (typeof value === 'function') {
		return `[Function ${value.name || 'anonymous'}]`;
	}

	if (typeof value === 'symbol') {
		return value.toString();
	}

	if (value instanceof Error) {
		return truncate(`${value.name}: ${value.message}`);
	}

	if (typeof value === 'object' && value !== null) {
		try {
			const json = JSON.stringify(value);
			if (typeof json === 'string') {
				return truncate(json);
			}
		} catch {
			// Circular or otherwise unserializable — fall through to String.
		}
	}

	return truncate(String(value));
}

function truncate(text: string): string {
	if (text.length <= MAX_INSPECT_LENGTH) {
		return text;
	}

	return `${text.slice(0, MAX_INSPECT_LENGTH - 3)}...`;
}

/** Throw the `AssertError` for a failed assertion. */
function raise(
	operator: string,
	message: string | undefined,
	generated: string,
	actual?: unknown,
	expected?: unknown
): never {
	throw new AssertError({
		message: typeof message === 'string' ? message : generated,
		operator: operator,
		actual: actual,
		expected: expected,
		generatedMessage: typeof message !== 'string'
	});
}

/** Scalar comparison: `Object.is` (strict) or `==` with NaN-equal (loose). */
function scalarEqual(actual: unknown, expected: unknown, loose: boolean): boolean {
	if (Object.is(actual, expected)) {
		return true;
	}

	if (!loose) {
		return false;
	}

	if (typeof actual === 'number' && typeof expected === 'number') {
		// Object.is already handled NaN === NaN and exact matches; the only
		// loose-mode extra for two numbers is +0 vs -0.
		return actual === expected;
	}

	// eslint-disable-next-line eqeqeq
	return actual == expected;
}

/** Own enumerable string keys plus own enumerable symbol keys. */
function ownKeys(value: object): Array<string | symbol> {
	const keys: Array<string | symbol> = Object.keys(value);

	for (const sym of Object.getOwnPropertySymbols(value)) {
		if (Object.prototype.propertyIsEnumerable.call(value, sym)) {
			keys.push(sym);
		}
	}

	return keys;
}

/**
 * Deep structural comparison. `seen` maps each object on the active
 * recursion stack to the object it is being compared against, so circular
 * structures terminate: re-entering the same pairing is treated as equal,
 * re-entering a conflicting pairing as unequal.
 */
function deepCompare(actual: unknown, expected: unknown, loose: boolean, seen: Map<object, object>): boolean {
	if (Object.is(actual, expected)) {
		return true;
	}

	const actualIsObj = typeof actual === 'object' && actual !== null;
	const expectedIsObj = typeof expected === 'object' && expected !== null;

	if (!actualIsObj || !expectedIsObj) {
		return scalarEqual(actual, expected, loose);
	}

	const prior = seen.get(actual);
	if (prior !== undefined) {
		return prior === expected;
	}

	const tag = Object.prototype.toString.call(actual);
	if (tag !== Object.prototype.toString.call(expected)) {
		return false;
	}

	if (!loose && Object.getPrototypeOf(actual) !== Object.getPrototypeOf(expected)) {
		return false;
	}

	seen.set(actual, expected);
	const result = deepCompareObjects(actual, expected, tag, loose, seen);
	seen.delete(actual);

	return result;
}

/** Tag-dispatched object comparison. Both values share `tag` and are non-null objects. */
function deepCompareObjects(
	actual: object,
	expected: object,
	tag: string,
	loose: boolean,
	seen: Map<object, object>
): boolean {
	switch (tag) {
		case '[object Date]':
			return Object.is((actual as Date).getTime(), (expected as Date).getTime());
		case '[object RegExp]': {
			const actualRe = actual as RegExp;
			const expectedRe = expected as RegExp;
			return actualRe.source === expectedRe.source && actualRe.flags === expectedRe.flags;
		}
		case '[object Number]':
		case '[object String]':
		case '[object Boolean]':
		case '[object BigInt]':
		case '[object Symbol]':
			return scalarEqual(
				(actual as {valueOf(): unknown}).valueOf(),
				(expected as {valueOf(): unknown}).valueOf(),
				loose
			);
		case '[object Map]':
			return mapsEqual(actual as Map<unknown, unknown>, expected as Map<unknown, unknown>, loose, seen);
		case '[object Set]':
			return setsEqual(actual as Set<unknown>, expected as Set<unknown>, loose, seen);
		case '[object ArrayBuffer]':
		case '[object SharedArrayBuffer]':
			return bytesEqual(new Uint8Array(actual as ArrayBuffer), new Uint8Array(expected as ArrayBuffer));
		case '[object DataView]': {
			const actualView = actual as DataView;
			const expectedView = expected as DataView;
			return bytesEqual(
				new Uint8Array(actualView.buffer, actualView.byteOffset, actualView.byteLength),
				new Uint8Array(expectedView.buffer, expectedView.byteOffset, expectedView.byteLength)
			);
		}
		case '[object Error]':
			// Errors compare name & message (own props are compared below);
			// both are usually non-enumerable so the key walk misses them.
			if (
				(actual as Error).name !== (expected as Error).name ||
				(actual as Error).message !== (expected as Error).message
			) {
				return false;
			}
			break;
	}

	if (ArrayBuffer.isView(actual) && !(actual instanceof DataView)) {
		return typedArraysEqual(
			actual as unknown as ArrayLike<unknown>,
			expected as unknown as ArrayLike<unknown>
		);
	}

	if (Array.isArray(actual) && actual.length !== (expected as unknown[]).length) {
		// Sparse tails ([1] vs [1, empty]) have identical enumerable keys,
		// so length must be compared explicitly.
		return false;
	}

	const actualKeys = ownKeys(actual);
	const expectedKeys = ownKeys(expected);

	if (actualKeys.length !== expectedKeys.length) {
		return false;
	}

	const record = actual as Record<string | symbol, unknown>;
	const other = expected as Record<string | symbol, unknown>;

	for (const key of actualKeys) {
		if (!Object.prototype.hasOwnProperty.call(expected, key)) {
			return false;
		}

		if (!deepCompare(record[key], other[key], loose, seen)) {
			return false;
		}
	}

	return true;
}

function bytesEqual(actual: Uint8Array, expected: Uint8Array): boolean {
	if (actual.byteLength !== expected.byteLength) {
		return false;
	}

	for (let i = 0; i < actual.byteLength; i++) {
		if (actual[i] !== expected[i]) {
			return false;
		}
	}

	return true;
}

function typedArraysEqual(actual: ArrayLike<unknown>, expected: ArrayLike<unknown>): boolean {
	if (actual.length !== expected.length) {
		return false;
	}

	for (let i = 0; i < actual.length; i++) {
		if (!Object.is(actual[i], expected[i])) {
			return false;
		}
	}

	return true;
}

/**
 * Map equality: sizes match and every entry has a matching entry. Keys hit
 * directly via `has` when possible; remaining (object) keys fall back to a
 * pairwise deep search so `new Map([[{a: 1}, 2]])` matches an equivalent map.
 */
function mapsEqual(
	actual: Map<unknown, unknown>,
	expected: Map<unknown, unknown>,
	loose: boolean,
	seen: Map<object, object>
): boolean {
	if (actual.size !== expected.size) {
		return false;
	}

	const pending: unknown[] = [];

	for (const [key, value] of actual) {
		if (expected.has(key)) {
			if (!deepCompare(value, expected.get(key), loose, seen)) {
				return false;
			}
		} else {
			pending.push(key);
		}
	}

	if (!pending.length) {
		return true;
	}

	const candidates = Array.from(expected.keys()).filter((key) => !actual.has(key));
	const used = new Set<number>();

	for (const key of pending) {
		let found = false;

		for (let i = 0; i < candidates.length; i++) {
			if (used.has(i)) {
				continue;
			}

			if (
				deepCompare(key, candidates[i], loose, seen) &&
				deepCompare(actual.get(key), expected.get(candidates[i]), loose, seen)
			) {
				used.add(i);
				found = true;
				break;
			}
		}

		if (!found) {
			return false;
		}
	}

	return true;
}

/** Set equality: direct membership first, pairwise deep search for object members. */
function setsEqual(
	actual: Set<unknown>,
	expected: Set<unknown>,
	loose: boolean,
	seen: Map<object, object>
): boolean {
	if (actual.size !== expected.size) {
		return false;
	}

	const pending: unknown[] = [];

	for (const value of actual) {
		if (!expected.has(value)) {
			pending.push(value);
		}
	}

	if (!pending.length) {
		return true;
	}

	const candidates = Array.from(expected).filter((value) => !actual.has(value));
	const used = new Set<number>();

	for (const value of pending) {
		let found = false;

		for (let i = 0; i < candidates.length; i++) {
			if (used.has(i)) {
				continue;
			}

			if (deepCompare(value, candidates[i], loose, seen)) {
				used.add(i);
				found = true;
				break;
			}
		}

		if (!found) {
			return false;
		}
	}

	return true;
}

/** Whether a thrown/rejected value satisfies an `AssertMatcher`. */
function matcherPasses(thrown: unknown, matcher: AssertMatcher): boolean {
	if (matcher instanceof RegExp) {
		const text = thrown instanceof Error ? thrown.message : String(thrown);
		return matcher.test(text);
	}

	if (typeof matcher === 'function') {
		// Error subclasses are instanceof-checked; any other function is a
		// predicate. Arrow-function matcher types carry no `prototype`.
		const proto = (matcher as {prototype?: unknown}).prototype;
		if (matcher === Error || proto instanceof Error) {
			return thrown instanceof (matcher as new (...args: never[]) => Error);
		}

		return (matcher as (value: unknown) => boolean)(thrown) === true;
	}

	if (thrown === null || (typeof thrown !== 'object' && typeof thrown !== 'function')) {
		return false;
	}

	const record = thrown as Record<PropertyKey, unknown>;
	for (const key of ownKeys(matcher)) {
		if (!deepCompare(record[key], (matcher as Record<PropertyKey, unknown>)[key], false, new Map())) {
			return false;
		}
	}

	return true;
}

/**
 * `throws`/`rejects` allow the matcher argument to be skipped and a message
 * passed in its place. Normalizes `(matcher | message, message)` into a
 * `[matcher, message]` pair.
 */
function splitMatcherArgs(
	matcher?: AssertMatcher | string,
	message?: string
): [AssertMatcher | undefined, string | undefined] {
	if (typeof matcher === 'string') {
		return [undefined, matcher];
	}

	return [matcher, message];
}

/**
 * Assertion methods mirroring the `assert` package feature set. Every
 * failed assertion throws an `AssertError`. Equality methods are strict
 * by default (`Object.is` / deep-strict); `loose*` variants provide the
 * legacy `==`-style comparisons.
 *
 * @category Assert
 */
export interface Assert {
	/** Throws unless `value` is truthy. */
	ok(value: unknown, message?: string): asserts value;
	/** Throws unconditionally. */
	fail(message?: string): never;
	/** Throws unless `Object.is(actual, expected)`. */
	equal<ValueT>(actual: unknown, expected: ValueT, message?: string): asserts actual is ValueT;
	/** Throws when `Object.is(actual, expected)`. */
	notEqual(actual: unknown, expected: unknown, message?: string): void;
	/** Throws unless `actual == expected` (legacy loose equality). */
	looseEqual(actual: unknown, expected: unknown, message?: string): void;
	/** Throws when `actual == expected` (legacy loose equality). */
	looseNotEqual(actual: unknown, expected: unknown, message?: string): void;
	/**
	 * Throws unless the values are deep-strict equal: `Object.is` scalars,
	 * matching prototypes, and structural equality across plain objects,
	 * arrays, `Date`, `RegExp`, `Map`, `Set`, typed arrays, buffers, and
	 * `Error` name/message. Circular structures are supported.
	 */
	deepEqual<ValueT>(actual: unknown, expected: ValueT, message?: string): asserts actual is ValueT;
	/** Throws when the values are deep-strict equal. */
	notDeepEqual(actual: unknown, expected: unknown, message?: string): void;
	/** Deep equality with legacy `==` scalar comparison and no prototype checks. */
	looseDeepEqual(actual: unknown, expected: unknown, message?: string): void;
	/** Throws when the values are loosely deep equal. */
	looseNotDeepEqual(actual: unknown, expected: unknown, message?: string): void;
	/** Throws unless `value` is a string matching `pattern`. */
	match(value: string, pattern: RegExp, message?: string): void;
	/** Throws unless `value` is a string that does not match `pattern`. */
	doesNotMatch(value: string, pattern: RegExp, message?: string): void;
	/** Throws unless `fn` throws (a value matching `matcher`, when provided). */
	throws(fn: () => unknown, matcher?: AssertMatcher | string, message?: string): void;
	/** Throws when `fn` throws. */
	doesNotThrow(fn: () => unknown, message?: string): void;
	/** Resolves unless the promise (or promise-returning `fn`) rejects as expected. */
	rejects(
		target: Promise<unknown> | (() => Promise<unknown>),
		matcher?: AssertMatcher | string,
		message?: string
	): Promise<void>;
	/** Rejects (with `AssertError`) when the promise rejects. */
	doesNotReject(target: Promise<unknown> | (() => Promise<unknown>), message?: string): Promise<void>;
	/** Throws when `value` is anything other than `null` or `undefined`. */
	ifError(value: unknown): asserts value is null | undefined;
}

/**
 * @category Assert
 */
export const Assert: Assert = {
	ok(value: unknown, message?: string): asserts value {
		if (!value) {
			raise('ok', message, `Expected value to be truthy, got ${inspect(value)}.`, value, true);
		}
	},

	fail(message?: string): never {
		raise('fail', message, 'Failed.');
	},

	equal<ValueT>(actual: unknown, expected: ValueT, message?: string): asserts actual is ValueT {
		if (!Object.is(actual, expected)) {
			raise(
				'equal',
				message,
				`Expected values to be strictly equal: ${inspect(actual)} !== ${inspect(expected)}.`,
				actual,
				expected
			);
		}
	},

	notEqual(actual: unknown, expected: unknown, message?: string): void {
		if (Object.is(actual, expected)) {
			raise(
				'notEqual',
				message,
				`Expected values to differ, but both are ${inspect(actual)}.`,
				actual,
				expected
			);
		}
	},

	looseEqual(actual: unknown, expected: unknown, message?: string): void {
		if (!scalarEqual(actual, expected, true)) {
			raise(
				'looseEqual',
				message,
				`Expected values to be loosely equal: ${inspect(actual)} != ${inspect(expected)}.`,
				actual,
				expected
			);
		}
	},

	looseNotEqual(actual: unknown, expected: unknown, message?: string): void {
		if (scalarEqual(actual, expected, true)) {
			raise(
				'looseNotEqual',
				message,
				`Expected values to differ loosely, but ${inspect(actual)} == ${inspect(expected)}.`,
				actual,
				expected
			);
		}
	},

	deepEqual<ValueT>(actual: unknown, expected: ValueT, message?: string): asserts actual is ValueT {
		if (!deepCompare(actual, expected, false, new Map())) {
			raise(
				'deepEqual',
				message,
				`Expected values to be deep-strict equal: ${inspect(actual)} !== ${inspect(expected)}.`,
				actual,
				expected
			);
		}
	},

	notDeepEqual(actual: unknown, expected: unknown, message?: string): void {
		if (deepCompare(actual, expected, false, new Map())) {
			raise(
				'notDeepEqual',
				message,
				`Expected values not to be deep-strict equal: ${inspect(actual)}.`,
				actual,
				expected
			);
		}
	},

	looseDeepEqual(actual: unknown, expected: unknown, message?: string): void {
		if (!deepCompare(actual, expected, true, new Map())) {
			raise(
				'looseDeepEqual',
				message,
				`Expected values to be loosely deep equal: ${inspect(actual)} != ${inspect(expected)}.`,
				actual,
				expected
			);
		}
	},

	looseNotDeepEqual(actual: unknown, expected: unknown, message?: string): void {
		if (deepCompare(actual, expected, true, new Map())) {
			raise(
				'looseNotDeepEqual',
				message,
				`Expected values not to be loosely deep equal: ${inspect(actual)}.`,
				actual,
				expected
			);
		}
	},

	match(value: string, pattern: RegExp, message?: string): void {
		if (typeof value !== 'string') {
			raise('match', message, `Assert.match expects a string, got ${typeof value}.`, value, pattern);
		}

		if (!pattern.test(value)) {
			raise(
				'match',
				message,
				`Expected ${inspect(value)} to match ${String(pattern)}.`,
				value,
				pattern
			);
		}
	},

	doesNotMatch(value: string, pattern: RegExp, message?: string): void {
		if (typeof value !== 'string') {
			raise(
				'doesNotMatch',
				message,
				`Assert.doesNotMatch expects a string, got ${typeof value}.`,
				value,
				pattern
			);
		}

		if (pattern.test(value)) {
			raise(
				'doesNotMatch',
				message,
				`Expected ${inspect(value)} not to match ${String(pattern)}.`,
				value,
				pattern
			);
		}
	},

	throws(fn: () => unknown, matcher?: AssertMatcher | string, message?: string): void {
		const [expected, msg] = splitMatcherArgs(matcher, message);
		let thrown: unknown;
		let didThrow = false;

		try {
			fn();
		} catch (error) {
			thrown = error;
			didThrow = true;
		}

		if (!didThrow) {
			raise('throws', msg, 'Missing expected exception.');
		}

		if (expected !== undefined && !matcherPasses(thrown, expected)) {
			raise(
				'throws',
				msg,
				`Thrown value does not match the expected matcher: ${inspect(thrown)}.`,
				thrown,
				expected
			);
		}
	},

	doesNotThrow(fn: () => unknown, message?: string): void {
		try {
			fn();
		} catch (error) {
			raise('doesNotThrow', message, `Got unwanted exception: ${inspect(error)}.`, error);
		}
	},

	async rejects(
		target: Promise<unknown> | (() => Promise<unknown>),
		matcher?: AssertMatcher | string,
		message?: string
	): Promise<void> {
		const [expected, msg] = splitMatcherArgs(matcher, message);
		let reason: unknown;
		let didReject = false;

		try {
			await (typeof target === 'function' ? target() : target);
		} catch (error) {
			reason = error;
			didReject = true;
		}

		if (!didReject) {
			raise('rejects', msg, 'Missing expected rejection.');
		}

		if (expected !== undefined && !matcherPasses(reason, expected)) {
			raise(
				'rejects',
				msg,
				`Rejection reason does not match the expected matcher: ${inspect(reason)}.`,
				reason,
				expected
			);
		}
	},

	async doesNotReject(
		target: Promise<unknown> | (() => Promise<unknown>),
		message?: string
	): Promise<void> {
		try {
			await (typeof target === 'function' ? target() : target);
		} catch (error) {
			raise('doesNotReject', message, `Got unwanted rejection: ${inspect(error)}.`, error);
		}
	},

	ifError(value: unknown): asserts value is null | undefined {
		if (value !== null && value !== undefined) {
			raise('ifError', undefined, `ifError got unwanted value: ${inspect(value)}.`, value);
		}
	}
};
