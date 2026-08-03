import type {Outcome} from '../outcome';
import {ParserCore} from '../parser/core';
import type {ParserOccurrence} from '../parser/occurrence';
import type {CliParserInit} from './parser/init';

/**
 * Small typed replacement for `yargs`. Parses `--key value` and
 * `--key=value` arguments against a schema provided at construction.
 * Keys are case-insensitive; values are case-sensitive. See `ParserOption`
 * for the supported type grammar. Everything except argv tokenization
 * lives in the shared `ParserCore` — `QueryParser` applies the same
 * schemas to URL query strings.
 *
 * `parse` returns an `Outcome` — on failure `outcome.errors` holds one
 * detailed, actionable message per problem (all problems are collected in
 * a single pass, not just the first).
 *
 * @category CLI
 */
export class CliParser<ArgsT = Record<string, unknown>> extends ParserCore<ArgsT> {
	constructor(init: CliParserInit<ArgsT>) {
		super(init);
	}

	/**
	 * Parse an argv array (typically `process.argv.slice(2)`) against the
	 * schema. On success `outcome.value` holds the fully formed result with
	 * defaults applied. On failure `outcome.errors` lists every problem
	 * found and `outcome.value` is unset.
	 */
	public parse(argv?: string[] | null): Outcome<ArgsT> {
		const bad = this.schemaFailure();
		if (bad) {
			return bad;
		}

		const errors: string[] = [];
		const occurrences = this.tokenize(Array.isArray(argv) ? argv : [], errors);
		return this.complete(occurrences, errors);
	}

	/**
	 * Group argv tokens into per-key raw value occurrences. Format errors
	 * (bad key names, stray positionals, unknown keys) are pushed to
	 * `errors` — parsing continues so every problem is reported at once.
	 */
	private tokenize(argv: string[], errors: string[]): Map<string, ParserOccurrence> {
		const occurrences = new Map<string, ParserOccurrence>();

		let i = 0;
		while (i < argv.length) {
			const token = argv[i];
			i++;

			if (typeof token !== 'string') {
				errors.push(`Argument #${i - 1} is not a string.`);
				continue;
			}

			if (!token.startsWith('--')) {
				if (token.startsWith('-')) {
					errors.push(
						`Invalid option '${token}'. Option keys start with '--' ` +
							`(e.g. '--${token.replace(/^-+/, '')}').`
					);
				} else {
					errors.push(
						`Unexpected value '${token}'. Values must follow an option key as ` +
							`'--key ${token}' or '--key=${token}'.`
					);
				}
				continue;
			}

			const body = token.slice(2);
			const eq = body.indexOf('=');
			const name = eq === -1 ? body : body.slice(0, eq);

			if (!ParserCore.KEY_PATTERN.test(name)) {
				errors.push(
					`Malformed argument '${token}'. Expected '--key value' or '--key=value' ` +
						`where key is alpha-numeric with no spaces.`
				);
				continue;
			}

			const entry = this.lookup.get(name.toLowerCase());
			if (!entry) {
				if (!this.allowUnknown) {
					errors.push(`Unknown option '--${name}'. Use one of: ${this.keyList()}.`);
				}

				// Consume the unknown key's separate-form value token too so
				// it isn't misreported as a stray positional.
				if (eq === -1 && i < argv.length && typeof argv[i] === 'string' && !argv[i].startsWith('--')) {
					i++;
				}
				continue;
			}

			let raw: string | null;
			if (eq !== -1) {
				raw = body.slice(eq + 1);
			} else if (i < argv.length && typeof argv[i] === 'string' && !argv[i].startsWith('--')) {
				raw = argv[i];
				i++;
			} else {
				// Flag form: valid for booleans, an error for other types
				// (reported during conversion).
				raw = null;
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
	 * Strip one pair of matching surrounding quotes. Shells normally strip
	 * quotes before argv, but values passed through npm scripts or Windows
	 * command lines can arrive still quoted.
	 */
	protected override prepareValue(raw: string): string {
		if (raw.length >= 2) {
			const first = raw[0];
			if ((first === '"' || first === "'") && raw[raw.length - 1] === first) {
				return raw.slice(1, -1);
			}
		}

		return raw;
	}

	protected keyNoun(): string {
		return 'option';
	}

	protected keyDisplay(key: string): string {
		return `--${key}`;
	}

	protected valueUsage(key: string): string {
		return `Provide it as '--${key} {value}' or '--${key}={value}'.`;
	}

	protected codePrefix(): string {
		return 'CliParser';
	}
}
