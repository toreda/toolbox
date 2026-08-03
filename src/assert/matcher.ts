/**
 * Expected-error matcher accepted by `Assert.throws` and `Assert.rejects`:
 *
 * - `RegExp` — tested against the thrown error's `message` (or the
 *   stringified value for non-Error throws).
 * - Error class — the thrown value must be an `instanceof` the class.
 * - Predicate function — called with the thrown value; matches when it
 *   returns exactly `true`. Any function that is not an `Error` subclass
 *   is treated as a predicate.
 * - Plain object — every own enumerable key must deep-strict-equal the
 *   corresponding property on the thrown value (e.g.
 *   `{message: 'boom', code: 'E_BOOM'}`).
 *
 * @category Assert
 */
export type AssertMatcher =
	| RegExp
	| (new (...args: never[]) => Error)
	| ((thrown: unknown) => boolean)
	| Record<PropertyKey, unknown>;
