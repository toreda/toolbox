import {Outcome} from '../outcome';
import {ParserCore} from '../parser/core';
import type {ParserOccurrence} from '../parser/occurrence';
import type {QueryParserInit} from './parser/init';

/**
 * Typed URL query string parser — the `qs` replacement companion to
 * `CliParser`, sharing the same `ParserCore` engine, schemas, and type
 * grammar. Keys are case-insensitive; values are case-sensitive.
 *
 * Input format:
 * - Pairs are separated by `&`; empty pairs (`a=1&&b=2`) are skipped.
 * - A single leading `?` is stripped, and anything from the first `#` on
 *   is ignored, so `location.search` and full `path?query#hash` strings
 *   both work. `;` separators are not supported.
 * - Keys and values are percent-decoded after `+` → space form decoding.
 *   Malformed percent-encoding is a collected error, not an exception.
 * - Repeated keys build arrays when the option type allows it. The
 *   qs-style `key[]=a&key[]=b` array suffix is accepted and equivalent to
 *   repeating `key`. Deeper bracket nesting (`a[b]=c`) is not supported.
 * - A key with no `=` is the flag form: `true` for booleans, an error for
 *   other types — matching `--flag` in `CliParser`. `key=` is the empty
 *   string.
 *
 * `parse` returns an `Outcome` — on failure `outcome.errors` holds one
 * detailed, actionable message per problem (all problems are collected in
 * a single pass, not just the first).
 *
 * @category Query
 */
export class QueryParser<ArgsT = Record<string, unknown>> extends ParserCore<ArgsT> {
	constructor(init: QueryParserInit<ArgsT>) {
		super(init);
	}

	/**
	 * Parse a query string (e.g. `location.search` or `new URL(x).search`)
	 * against the schema. On success `outcome.value` holds the fully formed
	 * result with defaults applied. On failure `outcome.errors` lists every
	 * problem found and `outcome.value` is unset. Non-string input parses
	 * as an empty query — defaults & required checks still apply.
	 */
	public parse(query?: string | null): Outcome<ArgsT> {
		const bad = this.schemaFailure();
		if (bad) {
			return bad;
		}

		const errors: string[] = [];
		const occurrences = this.tokenize(typeof query === 'string' ? query : '', errors);
		return this.complete(occurrences, errors);
	}

	/**
	 * Serialize an args object into a query string (no leading `?`) that
	 * `parse` round-trips: arrays become repeated keys, `null` becomes the
	 * literal `null`, booleans become `true`/`false`, and keys & string
	 * values are percent-encoded. Keys with an `undefined` value and empty
	 * arrays are omitted entirely — a query string can't represent them.
	 *
	 * Schema-known values are checked against their option type so the
	 * output is guaranteed to parse back; unknown keys are errors unless
	 * the parser was built with `allowUnknown`, in which case they're
	 * serialized as given. Failures return every problem in
	 * `outcome.errors` with code `QueryParser:STRINGIFY_FAILED`.
	 */
	public stringify(args?: Partial<ArgsT> | null): Outcome<string> {
		const bad = this.schemaFailure<string>();
		if (bad) {
			return bad;
		}

		const outcome = new Outcome<string>();

		if (args === null || args === undefined) {
			outcome.value = '';
			return outcome.pass();
		}

		if (typeof args !== 'object' || Array.isArray(args)) {
			outcome.saveError(`Stringify input must be an object mapping parameter keys to values.`);
			return outcome.fail('QueryParser:STRINGIFY_FAILED');
		}

		const errors: string[] = [];
		const parts: string[] = [];

		for (const [key, value] of Object.entries(args)) {
			if (value === undefined) {
				continue;
			}

			const entry = this.lookup.get(key.toLowerCase());
			if (!entry && !this.allowUnknown) {
				errors.push(`Unknown parameter '${key}'. Use one of: ${this.keyList()}.`);
				continue;
			}

			if (entry && !this.matchesType(value, entry.info, entry.option)) {
				errors.push(
					`Parameter '${key}': value ${this.describeValue(value)} does not match ` +
						`type '${entry.info.raw}'.`
				);
				continue;
			}

			// Schema-known keys serialize with their canonical casing.
			const name = encodeURIComponent(entry ? entry.key : key);
			const scalars = Array.isArray(value) ? value : [value];

			for (const scalar of scalars) {
				const serialized = this.serializeScalar(entry ? entry.key : key, scalar, errors);
				if (serialized !== null) {
					parts.push(`${name}=${serialized}`);
				}
			}
		}

		if (errors.length) {
			for (const error of errors) {
				outcome.saveError(error);
			}

			return outcome.fail('QueryParser:STRINGIFY_FAILED');
		}

		outcome.value = parts.join('&');
		return outcome.pass();
	}

	/**
	 * Split a query string into per-key raw value occurrences. Format
	 * errors (malformed encoding, bracket nesting, unknown keys) are pushed
	 * to `errors` — parsing continues so every problem is reported at once.
	 */
	private tokenize(query: string, errors: string[]): Map<string, ParserOccurrence> {
		const occurrences = new Map<string, ParserOccurrence>();

		let text = query;
		const hash = text.indexOf('#');
		if (hash !== -1) {
			text = text.slice(0, hash);
		}

		if (text.startsWith('?')) {
			text = text.slice(1);
		}

		for (const pair of text.split('&')) {
			if (!pair) {
				continue;
			}

			const eq = pair.indexOf('=');
			const encodedKey = eq === -1 ? pair : pair.slice(0, eq);

			const decodedKey = this.decode(encodedKey);
			if (decodedKey === null) {
				errors.push(`Malformed parameter key '${encodedKey}': invalid percent-encoding.`);
				continue;
			}

			// qs-style array suffix: 'tag[]=a&tag[]=b' repeats 'tag'.
			const name = decodedKey.endsWith('[]') ? decodedKey.slice(0, -2) : decodedKey;
			if (!name.length) {
				errors.push(`Malformed query pair '${pair}' has no key.`);
				continue;
			}

			const entry = this.lookup.get(name.toLowerCase());
			if (!entry) {
				if (this.allowUnknown) {
					continue;
				}

				if (name.includes('[') || name.includes(']')) {
					errors.push(
						`Parameter '${name}' uses bracket nesting, which is not supported. ` +
							`Only flat keys and the 'key[]' array suffix are.`
					);
				} else {
					errors.push(`Unknown parameter '${name}'. Use one of: ${this.keyList()}.`);
				}
				continue;
			}

			// Flag form (no '='): valid for booleans, an error for other
			// types (reported during conversion).
			let raw: string | null = null;
			if (eq !== -1) {
				raw = this.decode(pair.slice(eq + 1));
				if (raw === null) {
					errors.push(`Parameter '${name}': value has invalid percent-encoding.`);
					continue;
				}
			}

			const existing = occurrences.get(entry.key);
			if (existing) {
				existing.raws.push(raw);
			} else {
				occurrences.set(entry.key, {entry: entry, raws: [raw]});
			}
		}

		return occurrences;
	}

	/**
	 * Form-decode one key or value: `+` → space, then percent-decoding.
	 * Returns `null` on malformed percent-encoding instead of throwing.
	 */
	private decode(text: string): string | null {
		try {
			return decodeURIComponent(text.replace(/\+/g, ' '));
		} catch {
			return null;
		}
	}

	/**
	 * Serialize one scalar for `stringify`, or `null` after pushing an
	 * error. Schema-known values were already type-checked; this guards the
	 * unknown-key (`allowUnknown`) path against non-scalar values.
	 */
	private serializeScalar(key: string, scalar: unknown, errors: string[]): string | null {
		if (scalar === null) {
			return 'null';
		}

		switch (typeof scalar) {
			case 'string':
				return encodeURIComponent(scalar);
			case 'boolean':
				return scalar ? 'true' : 'false';
			case 'number':
				if (Number.isFinite(scalar)) {
					return String(scalar);
				}
				break;
		}

		errors.push(
			`Parameter '${key}': ${this.describeValue(scalar)} cannot be serialized into a query string.`
		);
		return null;
	}

	/** Value description for stringify errors. Never throws (bigints, cycles). */
	private describeValue(value: unknown): string {
		try {
			const json = JSON.stringify(value);
			return json === undefined ? `of type ${typeof value}` : json;
		} catch {
			return `of type ${typeof value}`;
		}
	}

	protected keyNoun(): string {
		return 'parameter';
	}

	protected keyDisplay(key: string): string {
		return key;
	}

	protected valueUsage(key: string): string {
		return `Provide it as '${key}={value}' in the query string.`;
	}

	protected codePrefix(): string {
		return 'QueryParser';
	}
}
