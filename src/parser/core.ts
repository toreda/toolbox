import {Outcome} from '../outcome';
import type {ParserEntry} from './entry';
import type {ParserInit} from './init';
import type {ParserOccurrence} from './occurrence';
import type {ParserOption} from './option';
import {type ParserTypeId, parserTypeIds} from './type/id';
import {type ParserTypeInfo, parserTypeInfo} from './type/info';
import type {ParserTypeMember} from './type/member';

/** Highest valid network port. `port` values are integers in [0, MAX_PORT]. */
const MAX_PORT = 65535;

/** Strict dotted-quad IPv4: four 0-255 octets, no leading zeros. */
const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

/** One 16-bit IPv6 group: 1-4 hex digits. */
const IPV6_GROUP_PATTERN = /^[0-9a-fA-F]{1,4}$/;

/** CIDR prefix length digits: no sign, no leading zeros ('0' itself is valid). */
const CIDR_PREFIX_PATTERN = /^(0|[1-9]\d{0,2})$/;

/** Highest CIDR prefix length per IP version. */
const MAX_CIDR_IPV4 = 32;
const MAX_CIDR_IPV6 = 128;

/**
 * Split an optional `/prefix` CIDR suffix off an IP value. Returns the
 * bare address when the suffix is absent or valid for `maxPrefix`, or
 * `null` when the suffix is present but invalid (bad digits, out of
 * range, or multiple `/`).
 */
function cidrSplit(value: string, maxPrefix: number): string | null {
	const slash = value.indexOf('/');
	if (slash === -1) {
		return value;
	}

	const prefix = value.slice(slash + 1);
	if (prefix.includes('/') || !CIDR_PREFIX_PATTERN.test(prefix) || Number(prefix) > maxPrefix) {
		return null;
	}

	return value.slice(0, slash);
}

/** Bare dotted-quad IPv4 address. A CIDR suffix does not match. */
function ipv4AddressValid(value: string): boolean {
	return IPV4_PATTERN.test(value);
}

/** IPv4 address with optional CIDR subnet suffix (`10.0.0.0/24`). */
function ipv4CidrValid(value: string): boolean {
	const address = cidrSplit(value, MAX_CIDR_IPV4);
	return address !== null && ipv4AddressValid(address);
}

/**
 * Bare IPv6 address validation without a mega-regex: at most one `::`
 * compressing at least one zero group, 1-4 hex digit groups, 8 groups
 * total, and an optional embedded IPv4 tail (`::ffff:192.168.0.1`)
 * counting as two groups. A CIDR suffix does not match. Zone indexes
 * (`%eth0`) are not accepted.
 */
function ipv6AddressValid(value: string): boolean {
	const halves = value.split('::');
	if (halves.length > 2) {
		return false;
	}

	if (halves.length === 2) {
		const left = ipv6GroupCount(halves[0], false);
		const right = ipv6GroupCount(halves[1], true);
		if (left === null || right === null) {
			return false;
		}

		// '::' must compress at least one zero group.
		return left + right <= 7;
	}

	return ipv6GroupCount(value, true) === 8;
}

/** IPv6 address with optional CIDR subnet suffix (`2001:db8::/32`). */
function ipv6CidrValid(value: string): boolean {
	const address = cidrSplit(value, MAX_CIDR_IPV6);
	return address !== null && ipv6AddressValid(address);
}

/**
 * Count 16-bit groups in one side of an IPv6 address, or `null` when any
 * group is invalid. An empty side (a `::` edge) is zero groups. An
 * embedded IPv4 tail counts as two groups when `ipv4Tail` allows it —
 * IPv4 can only occupy the final 32 bits, so it's never valid left of `::`.
 */
function ipv6GroupCount(side: string, ipv4Tail: boolean): number | null {
	if (!side) {
		return 0;
	}

	const parts = side.split(':');
	let count = 0;

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];

		if (IPV6_GROUP_PATTERN.test(part)) {
			count++;
			continue;
		}

		if (ipv4Tail && i === parts.length - 1 && ipv4AddressValid(part)) {
			count += 2;
			continue;
		}

		return null;
	}

	return count;
}

/** Whether an already-numeric value is a valid port. */
function portNumber(value: number): boolean {
	return Number.isInteger(value) && value >= 0 && value <= MAX_PORT;
}

/** Max Linux hostname length (HOST_NAME_MAX). */
const MAX_HOSTNAME_LENGTH = 64;

/** Max textual FQDN length, excluding the optional root dot. */
const MAX_FQDN_LENGTH = 253;

/**
 * One hostname/DNS label: 1-63 alpha-numeric characters with hyphens
 * allowed only between them (RFC 1123). An empty string does not match,
 * so consecutive/leading/trailing dots fail via their empty label.
 */
const HOSTNAME_LABEL_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

/** RFC 3986 scheme prefix: letter followed by letters/digits/`+`/`-`/`.`, then `:`. */
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * Valid Linux hostname: 1-64 characters total, dot-separated labels each
 * matching the RFC 1123 label rules. No trailing dot.
 */
function hostnameValid(value: string): boolean {
	if (!value.length || value.length > MAX_HOSTNAME_LENGTH) {
		return false;
	}

	return value.split('.').every((label) => HOSTNAME_LABEL_PATTERN.test(label));
}

/**
 * DNS fully qualified domain name: at least two labels, max 253
 * characters, RFC 1123 label rules. The optional root dot form
 * (`example.com.`) is accepted and not counted toward the length limit.
 */
function fqdnValid(value: string): boolean {
	const bare = value.endsWith('.') ? value.slice(0, -1) : value;
	if (!bare.length || bare.length > MAX_FQDN_LENGTH) {
		return false;
	}

	const labels = bare.split('.');
	if (labels.length < 2) {
		return false;
	}

	return labels.every((label) => HOSTNAME_LABEL_PATTERN.test(label));
}

/**
 * URL validation via the WHATWG parser without scheme restrictions: any
 * scheme parses as-is, protocol-relative values (`//host/path`) and
 * scheme-less values (`host/path`) are grafted onto a placeholder scheme
 * so the same parser validates their structure. Whitespace anywhere
 * makes a value invalid.
 */
function urlValid(value: string): boolean {
	if (!value.length || /\s/.test(value)) {
		return false;
	}

	try {
		if (URL_SCHEME_PATTERN.test(value)) {
			new URL(value);
		} else if (value.startsWith('//')) {
			new URL(`http:${value}`);
		} else {
			new URL(`http://${value}`);
		}

		return true;
	} catch {
		return false;
	}
}

/** Single occurrence conversion result. */
type ParserConverted = {ok: true; value: unknown} | {ok: false; error: string};

/**
 * Shared engine behind `CliParser` and `QueryParser`. Owns everything
 * that's independent of the input format: schema validation, the option
 * type grammar, raw-string → typed value conversion, multi-occurrence
 * array building, defaults, required checks, choices, and `help()`.
 *
 * Subclasses own tokenization (argv vs query string) and the input-format
 * vocabulary used in messages (`option '--key'` vs `parameter 'key'`)
 * via the abstract hooks at the bottom of the class.
 *
 * @category Parser
 */
export abstract class ParserCore<ArgsT = Record<string, unknown>> {
	/** Valid option key: alpha-numeric, no spaces, no separators. */
	protected static readonly KEY_PATTERN = /^[a-zA-Z0-9]+$/;

	protected readonly entries: ParserEntry[];
	protected readonly lookup: Map<string, ParserEntry>;
	protected readonly schemaErrors: string[];
	protected readonly allowUnknown: boolean;

	constructor(init: ParserInit<ArgsT>) {
		this.entries = [];
		this.lookup = new Map<string, ParserEntry>();
		this.schemaErrors = [];
		this.allowUnknown = init?.allowUnknown === true;

		const schema = init?.schema;
		if (!schema || typeof schema !== 'object') {
			this.schemaErrors.push(`Schema must be an object mapping option keys to option configs.`);
			return;
		}

		for (const key of Object.keys(schema)) {
			this.addSchemaKey(key, (schema as Record<string, ParserOption<unknown>>)[key]);
		}
	}

	/**
	 * Validate one schema entry & register it for lookups. All problems
	 * are recorded in `schemaErrors`, which fail `parse` with code
	 * `{codePrefix}:BAD_SCHEMA`.
	 */
	private addSchemaKey(key: string, option: ParserOption<unknown>): void {
		if (!ParserCore.KEY_PATTERN.test(key)) {
			this.schemaErrors.push(
				`Schema key '${key}' is invalid. Option keys must be alpha-numeric with no spaces.`
			);
			return;
		}

		const lower = key.toLowerCase();
		const existing = this.lookup.get(lower);
		if (existing) {
			this.schemaErrors.push(
				`Schema keys '${existing.key}' and '${key}' collide — option keys are case-insensitive.`
			);
			return;
		}

		if (!option || typeof option !== 'object') {
			this.schemaErrors.push(`Schema option '${key}' must be a config object.`);
			return;
		}

		// `type` and `types` are equivalent, mutually exclusive forms
		// (matching @toreda/verify). Defining both is a fatal authoring
		// error with no resolvable intent, so it throws instead of
		// joining the recoverable schema errors.
		if (option.type !== undefined && option.types !== undefined) {
			throw new Error(
				`${this.codePrefix()} schema option '${key}' defines both 'type' and 'types'. ` +
					`They are mutually exclusive — define exactly one.`
			);
		}

		if (option.type === undefined && option.types === undefined) {
			this.schemaErrors.push(`Schema option '${key}' must define one of 'type' or 'types'.`);
			return;
		}

		let typeExpr = option.type;
		if (option.types !== undefined) {
			if (
				!Array.isArray(option.types) ||
				!option.types.length ||
				option.types.some((member) => typeof member !== 'string')
			) {
				this.schemaErrors.push(
					`Schema option '${key}' types must be a non-empty array of type id strings ` +
						`(e.g. ['string', 'string[]']).`
				);
				return;
			}

			typeExpr = option.types.join(' | ');
		}

		const info = parserTypeInfo(typeExpr);
		if (!info) {
			const given = option.types !== undefined ? JSON.stringify(option.types) : `'${option.type}'`;
			this.schemaErrors.push(
				`Schema option '${key}' has invalid type ${given}. Base types: ` +
					`${parserTypeIds.join(', ')}. Append '[]' for arrays. Combine members with '|' ` +
					`in 'type' or as elements of 'types'. 'null' is only valid alongside other members.`
			);
			return;
		}

		if (option.required === true && option.default !== undefined) {
			this.schemaErrors.push(
				`Schema option '${key}' cannot be both required and have a default — ` +
					`a defaulted option is never missing.`
			);
		}

		if (
			option.maxLength !== undefined &&
			(!Number.isInteger(option.maxLength) || option.maxLength <= 0)
		) {
			this.schemaErrors.push(
				`Schema option '${key}' maxLength must be an integer greater than 0 (got ${option.maxLength}).`
			);
		}

		if (option.overflow !== undefined && option.overflow !== 'reject' && option.overflow !== 'trunc') {
			this.schemaErrors.push(
				`Schema option '${key}' overflow must be 'reject' or 'trunc' (got '${option.overflow}').`
			);
		}

		if (option.choices !== undefined && (!Array.isArray(option.choices) || !option.choices.length)) {
			this.schemaErrors.push(`Schema option '${key}' choices must be a non-empty array.`);
		}

		if (option.default !== undefined && !this.matchesType(option.default, info, option)) {
			this.schemaErrors.push(
				`Schema option '${key}' default (${JSON.stringify(option.default)}) ` +
					`does not match type '${info.raw}'.`
			);
		}

		const entry: ParserEntry = {key: key, option: option, info: info};
		this.entries.push(entry);
		this.lookup.set(lower, entry);
	}

	/**
	 * Usage text generated from the schema: one line per option with its
	 * type, required/default markers, and describe text.
	 */
	public help(): string {
		const lines: string[] = ['Options:'];

		for (const entry of this.entries) {
			const parts = [`  ${this.keyDisplay(entry.key)}`, `(${entry.info.raw})`];

			if (entry.option.required === true) {
				parts.push('[required]');
			}

			if (entry.option.default !== undefined) {
				parts.push(`[default: ${JSON.stringify(entry.option.default)}]`);
			}

			const head = parts.join(' ');
			lines.push(entry.option.describe ? `${head} — ${entry.option.describe}` : head);
		}

		return lines.join('\n');
	}

	/**
	 * Failed `Outcome` carrying every schema error, or `null` when the
	 * schema is valid. Subclass `parse` implementations call this before
	 * tokenizing. Generic so `stringify`-style methods with a non-`ArgsT`
	 * result can reuse it.
	 */
	protected schemaFailure<ValueT = ArgsT>(): Outcome<ValueT> | null {
		if (!this.schemaErrors.length) {
			return null;
		}

		const outcome = new Outcome<ValueT>();
		for (const error of this.schemaErrors) {
			outcome.saveError(error);
		}

		return outcome.fail(`${this.codePrefix()}:BAD_SCHEMA`);
	}

	/**
	 * Turn tokenized occurrences into the final parse `Outcome`: convert
	 * every occurrence, apply defaults, check required options, and either
	 * pass with the fully formed result or fail with every collected error.
	 */
	protected complete(occurrences: Map<string, ParserOccurrence>, errors: string[]): Outcome<ArgsT> {
		const outcome = new Outcome<ArgsT>();
		const parsed: Record<string, unknown> = {};

		for (const occurrence of occurrences.values()) {
			this.applyOccurrence(occurrence, parsed, errors);
		}

		for (const entry of this.entries) {
			if (entry.key in parsed) {
				continue;
			}

			if (entry.option.default !== undefined) {
				// Copy array defaults so a caller mutating the result can't
				// corrupt the schema for later parses.
				const value = entry.option.default;
				parsed[entry.key] = Array.isArray(value) ? value.slice() : value;
				continue;
			}

			if (entry.option.required === true) {
				const describe = entry.option.describe ? ` — ${entry.option.describe}` : '';
				errors.push(
					`Missing required ${this.keyNoun()} '${this.keyDisplay(entry.key)}' ` +
						`(${entry.info.raw})${describe}.`
				);
			}
		}

		if (errors.length) {
			for (const error of errors) {
				outcome.saveError(error);
			}

			return outcome.fail(`${this.codePrefix()}:PARSE_FAILED`);
		}

		outcome.value = parsed as unknown as ArgsT;
		return outcome.pass();
	}

	/** Comma-separated key list for unknown-key errors. */
	protected keyList(): string {
		return this.entries.map((entry) => this.keyDisplay(entry.key)).join(', ');
	}

	/**
	 * Convert one key's occurrences into its final value and assign it,
	 * or push detailed errors. Multiple occurrences build an array when
	 * the type allows it; a single occurrence of an array-only type wraps
	 * into a one-element array.
	 */
	private applyOccurrence(
		occurrence: ParserOccurrence,
		parsed: Record<string, unknown>,
		errors: string[]
	): void {
		const entry = occurrence.entry;
		const values: unknown[] = [];
		let failed = false;

		for (const raw of occurrence.raws) {
			const converted = this.convertOccurrence(entry, raw);
			if (!converted.ok) {
				errors.push(converted.error);
				failed = true;
				continue;
			}

			values.push(converted.value);
		}

		if (failed) {
			return;
		}

		if (values.length > 1) {
			if (!entry.info.arrayOk) {
				errors.push(
					`${this.nounCap()} '${this.keyDisplay(entry.key)}' (${entry.info.raw}) does not ` +
						`accept multiple values, but was provided ${values.length} times.`
				);
				return;
			}

			if (values.some((value) => value === null)) {
				errors.push(
					`${this.nounCap()} '${this.keyDisplay(entry.key)}': 'null' cannot be combined ` +
						`with other values.`
				);
				return;
			}

			parsed[entry.key] = values;
			return;
		}

		const single = values[0];
		if (single !== null && !entry.info.singleOk) {
			// Array-only type given once: one-element array.
			parsed[entry.key] = [single];
			return;
		}

		parsed[entry.key] = single;
	}

	/**
	 * Convert one raw occurrence to a typed value. Union members are tried
	 * in declared order; the literal 'null' is checked first when the type
	 * allows null. Pure boolean options never fail conversion — they follow
	 * the strict/permissive coercion rules from `ParserOption.strict`.
	 */
	private convertOccurrence(entry: ParserEntry, raw: string | null): ParserConverted {
		const option = entry.option;
		const info = entry.info;
		const key = entry.key;
		const display = this.keyDisplay(key);

		if (raw === null) {
			// Flag form (key present with no value) means `true` for booleans.
			if (info.members.some((member) => member.typeId === 'boolean')) {
				return {ok: true, value: true};
			}

			return {
				ok: false,
				error: `${this.nounCap()} '${display}' (${info.raw}) expects a value. ${this.valueUsage(key)}`
			};
		}

		const value = this.prepareValue(raw);

		if (info.nullOk && value === 'null') {
			return {ok: true, value: null};
		}

		if (info.members.every((member) => member.typeId === 'boolean')) {
			if (option.strict === false) {
				return {ok: true, value: Boolean(value)};
			}

			// Strict (default): only the literal 'true' is true. Values are
			// case-sensitive, so 'True', '1', etc all parse to false.
			return {ok: true, value: value === 'true'};
		}

		let lengthError: string | null = null;
		const attempted: ParserTypeId[] = [];
		let matched = false;
		let result: unknown;

		for (const member of info.members) {
			if (attempted.includes(member.typeId)) {
				continue;
			}

			attempted.push(member.typeId);

			switch (member.typeId) {
				case 'boolean':
					// Inside a union only the literals match, so other
					// members still get a chance at values like '1'.
					if (value === 'true') {
						matched = true;
						result = true;
					} else if (value === 'false') {
						matched = true;
						result = false;
					}
					break;
				case 'string':
					if (typeof option.maxLength === 'number' && value.length > option.maxLength) {
						if (option.overflow === 'trunc') {
							matched = true;
							result = value.slice(0, option.maxLength);
						} else {
							lengthError =
								`${this.nounCap()} '${display}': value is ${value.length} characters, ` +
								`exceeding the ${option.maxLength} character limit.`;
						}
					} else {
						matched = true;
						result = value;
					}
					break;
				case 'number': {
					const num = this.numericValue(value);
					if (num !== null) {
						matched = true;
						result = num;
					}
					break;
				}
				case 'posInt': {
					const num = this.numericValue(value);
					if (num !== null && Number.isInteger(num) && num >= 0) {
						matched = true;
						result = num;
					}
					break;
				}
				case 'negInt': {
					const num = this.numericValue(value);
					if (num !== null && Number.isInteger(num) && num <= 0) {
						matched = true;
						result = num;
					}
					break;
				}
				case 'ipv4':
					if (ipv4AddressValid(value)) {
						matched = true;
						result = value;
					}
					break;
				case 'ipv4WithNetmask':
					if (ipv4CidrValid(value)) {
						matched = true;
						result = value;
					}
					break;
				case 'ipv6':
					if (ipv6AddressValid(value)) {
						matched = true;
						result = value;
					}
					break;
				case 'ipv6WithNetmask':
					if (ipv6CidrValid(value)) {
						matched = true;
						result = value;
					}
					break;
				case 'port': {
					const num = this.numericValue(value);
					if (num !== null && portNumber(num)) {
						matched = true;
						result = num;
					}
					break;
				}
				case 'hostname':
					if (hostnameValid(value)) {
						matched = true;
						result = value;
					}
					break;
				case 'fqdn':
					if (fqdnValid(value)) {
						matched = true;
						result = value;
					}
					break;
				case 'url':
					if (urlValid(value)) {
						matched = true;
						result = value;
					}
					break;
				case 'null':
					break;
			}

			if (matched) {
				break;
			}
		}

		if (!matched) {
			if (lengthError) {
				return {ok: false, error: lengthError};
			}

			const labels = attempted.map((typeId) => this.typeLabel(typeId));
			if (labels.length === 1) {
				const nullNote = info.nullOk ? ` or the literal 'null'` : '';
				return {
					ok: false,
					error: `${this.nounCap()} '${display}': '${value}' is not ${labels[0]}${nullNote}.`
				};
			}

			const nullNote = info.nullOk ? `, or the literal 'null'` : '';
			return {
				ok: false,
				error:
					`${this.nounCap()} '${display}': '${value}' does not match any allowed type: ` +
					`${labels.join(', ')}${nullNote}.`
			};
		}

		if (option.choices && result !== null && typeof result !== 'boolean') {
			if (!option.choices.some((choice) => choice === result)) {
				return {
					ok: false,
					error:
						`${this.nounCap()} '${display}': '${String(result)}' is not an allowed value. ` +
						`Allowed: ${option.choices.join(', ')}.`
				};
			}
		}

		return {ok: true, value: result};
	}

	/**
	 * Numeric grammar shared by number/posInt/negInt. Returns `null` for
	 * empty strings (`Number('')` is 0), NaN, and non-finite values.
	 */
	private numericValue(raw: string): number | null {
		const trimmed = raw.trim();
		if (!trimmed) {
			return null;
		}

		const value = Number(trimmed);
		return Number.isFinite(value) ? value : null;
	}

	/** Human-readable label for a type id, used in conversion errors. */
	private typeLabel(typeId: ParserTypeId): string {
		switch (typeId) {
			case 'boolean':
				return `a boolean ('true' or 'false')`;
			case 'string':
				return 'a string';
			case 'number':
				return 'a finite number';
			case 'posInt':
				return 'a positive integer (0 allowed)';
			case 'negInt':
				return 'a negative integer (0 allowed)';
			case 'ipv4':
				return `a valid IPv4 address without netmask (e.g. '192.168.0.1')`;
			case 'ipv4WithNetmask':
				return `a valid IPv4 address with optional CIDR netmask (e.g. '10.0.0.0/24')`;
			case 'ipv6':
				return `a valid IPv6 address without netmask (e.g. '::1' or 'fe80::1')`;
			case 'ipv6WithNetmask':
				return `a valid IPv6 address with optional CIDR netmask (e.g. '2001:db8::/32')`;
			case 'port':
				return `a port number (integer 0 - ${MAX_PORT})`;
			case 'hostname':
				return (
					`a valid hostname (max ${MAX_HOSTNAME_LENGTH} chars; alpha-numeric labels ` +
					`with non-edge hyphens, e.g. 'shard-01')`
				);
			case 'fqdn':
				return `a fully qualified domain name (e.g. 'node1.example.com')`;
			case 'url':
				return (
					`a valid URL (scheme optional, e.g. 'https://example.com', ` +
					`'//cdn.example.com/lib.js', or 'example.com/path')`
				);
			case 'null':
				return `the literal 'null'`;
		}
	}

	/** Whether a schema default value satisfies the option's parsed type. */
	protected matchesType(value: unknown, info: ParserTypeInfo, option: ParserOption<unknown>): boolean {
		if (value === null) {
			return info.nullOk;
		}

		if (Array.isArray(value)) {
			if (!info.arrayOk) {
				return false;
			}

			const members = info.members.filter((member) => member.array);
			return value.every((element) => this.matchesScalarType(element, members, option));
		}

		if (!info.singleOk) {
			return false;
		}

		const members = info.members.filter((member) => !member.array);
		return this.matchesScalarType(value, members, option);
	}

	/** Whether a runtime value matches any of the given scalar members. */
	private matchesScalarType(
		value: unknown,
		members: ParserTypeMember[],
		option: ParserOption<unknown>
	): boolean {
		for (const member of members) {
			switch (member.typeId) {
				case 'boolean':
					if (typeof value === 'boolean') {
						return true;
					}
					break;
				case 'string':
					if (typeof value === 'string') {
						if (typeof option.maxLength === 'number' && value.length > option.maxLength) {
							break;
						}

						return true;
					}
					break;
				case 'number':
					if (typeof value === 'number' && Number.isFinite(value)) {
						return true;
					}
					break;
				case 'posInt':
					if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
						return true;
					}
					break;
				case 'negInt':
					if (typeof value === 'number' && Number.isInteger(value) && value <= 0) {
						return true;
					}
					break;
				case 'ipv4':
					if (typeof value === 'string' && ipv4AddressValid(value)) {
						return true;
					}
					break;
				case 'ipv4WithNetmask':
					if (typeof value === 'string' && ipv4CidrValid(value)) {
						return true;
					}
					break;
				case 'ipv6':
					if (typeof value === 'string' && ipv6AddressValid(value)) {
						return true;
					}
					break;
				case 'ipv6WithNetmask':
					if (typeof value === 'string' && ipv6CidrValid(value)) {
						return true;
					}
					break;
				case 'port': {
					// Port defaults may be authored as a string or a number.
					if (typeof value === 'number' && portNumber(value)) {
						return true;
					}

					if (typeof value === 'string' && value.trim()) {
						const num = Number(value.trim());
						if (Number.isFinite(num) && portNumber(num)) {
							return true;
						}
					}
					break;
				}
				case 'hostname':
					if (typeof value === 'string' && hostnameValid(value)) {
						return true;
					}
					break;
				case 'fqdn':
					if (typeof value === 'string' && fqdnValid(value)) {
						return true;
					}
					break;
				case 'url':
					if (typeof value === 'string' && urlValid(value)) {
						return true;
					}
					break;
				case 'null':
					break;
			}
		}

		return false;
	}

	/** `keyNoun()` with its first letter capitalized, for sentence starts. */
	private nounCap(): string {
		const noun = this.keyNoun();
		return noun.charAt(0).toUpperCase() + noun.slice(1);
	}

	/**
	 * Pre-conversion cleanup applied to every raw value. The default is a
	 * pass-through; `CliParser` overrides it to strip shell quotes.
	 */
	protected prepareValue(raw: string): string {
		return raw;
	}

	/** What a key is called in messages: `'option'` (CLI) or `'parameter'` (query). */
	protected abstract keyNoun(): string;

	/** How a key is displayed in messages: `--key` (CLI) or bare `key` (query). */
	protected abstract keyDisplay(key: string): string;

	/** Input-format-specific "Provide it as ..." sentence for missing values. */
	protected abstract valueUsage(key: string): string;

	/** Error code prefix, e.g. `CliParser` → `CliParser:PARSE_FAILED`. */
	protected abstract codePrefix(): string;
}
