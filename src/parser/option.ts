/**
 * Schema config for a single parser option, shared by every `ParserCore`
 * subclass (`CliParser`, `QueryParser`). Options are optional unless
 * `required` is explicitly `true`.
 *
 * Each option declares its value type through exactly one of `type` or
 * `types` (matching the `@toreda/verify` convention). Defining both is a
 * fatal, unresolvable authoring error — the parser constructor throws.
 *
 * Type grammar (both forms):
 * - Base types: `boolean`, `string`, `number`, `posInt`, `negInt`,
 *   `ipv4`, `ipv4WithNetmask`, `ipv6`, `ipv6WithNetmask`, `port`,
 *   `hostname`, `fqdn`, `url`, `null`.
 * - Append `[]` for arrays (`'string[]'`).
 * - `type` combines members with `|` (`'string | string[]'`); `types`
 *   lists them as array elements (`['string', 'string[]']`). The two forms
 *   are equivalent.
 * - `null` only appears alongside other members and matches the literal
 *   value `null`.
 * - Members are tried in declared order during conversion. `string`
 *   matches any value, so place it last.
 *
 * @category Parser
 */
export interface ParserOption<ValueT = unknown> {
	/**
	 * Type expression string with `|` unions. Mutually exclusive with
	 * `types` — define exactly one.
	 */
	type?: string;
	/**
	 * Type members as an array of type id strings (each may carry the
	 * `[]` suffix). Mutually exclusive with `type` — define exactly one.
	 */
	types?: string[];
	/** Argument must be present or parsing fails. Default: `false`. */
	required?: boolean;
	/**
	 * Value used when the argument is absent. Must match `type` — a
	 * mismatch is a schema error reported by `parse`. Mutually exclusive
	 * with `required`.
	 */
	default?: ValueT;
	/** Help text included in `help()` output & missing-required errors. */
	describe?: string;
	/**
	 * Boolean options only. When `true` (the default), only the literal
	 * string `'true'` parses to `true` — anything else is `false`. When
	 * `false`, `Boolean(value)` coerces instead, so any non-empty string
	 * (including `'false'`) is `true`.
	 */
	strict?: boolean;
	/** String options only. Maximum accepted value length. */
	maxLength?: number;
	/**
	 * String options only. What to do with values longer than `maxLength`:
	 * `'reject'` fails the value (the default), `'trunc'` keeps the first
	 * `maxLength` characters.
	 */
	overflow?: 'reject' | 'trunc';
	/**
	 * Allowed values checked after type conversion. Applied per element
	 * for array values. `null` values are exempt.
	 */
	choices?: Array<string | number>;
}
