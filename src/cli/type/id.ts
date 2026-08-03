/**
 * Base value types supported by CLI option schemas. Each option's `type`
 * string is built from these ids, an optional `[]` array suffix, and `|`
 * unions (e.g. `'string | string[]'`).
 *
 * - `posInt` / `negInt` follow `@toreda/verify` semantics where `0` is
 *   accepted by both (`isIntPos(0) === true`).
 * - `null` is never a standalone type — it only appears in unions and
 *   matches the literal value `null`.
 *
 * Content-validated primitives:
 * - `ipv4` / `ipv6` — strings that must contain a valid bare IP address
 *   of that version. Values with a netmask are rejected — use these for
 *   host fields where a mask is never meaningful.
 * - `ipv4WithNetmask` / `ipv6WithNetmask` — same address validation, but
 *   an optional CIDR netmask suffix is accepted (`10.0.0.0/24`,
 *   `2001:db8::/32`). Use these for network/range fields. All IP values
 *   parse as strings.
 * - `port` — a positive integer within the valid port range (0 - 65535).
 *   Parsed values are numbers; schema defaults may be authored as either
 *   a string or a number and pass through as authored.
 * - `hostname` — a valid Linux hostname: max 64 characters total,
 *   dot-separated alpha-numeric labels with non-edge hyphens.
 * - `fqdn` — a DNS fully qualified domain name: at least two labels,
 *   max 253 characters, each label 1-63 alpha-numeric characters with
 *   non-edge hyphens. An optional root dot (`example.com.`) is accepted.
 * - `url` — a valid URL. The scheme is not validated: any arbitrary
 *   scheme is allowed, as are scheme-less values (`example.com/path`)
 *   and protocol-relative values (`//cdn.example.com/lib.js`).
 *
 * @category CLI
 */
export type CliTypeId =
	| 'boolean'
	| 'string'
	| 'number'
	| 'posInt'
	| 'negInt'
	| 'ipv4'
	| 'ipv4WithNetmask'
	| 'ipv6'
	| 'ipv6WithNetmask'
	| 'port'
	| 'hostname'
	| 'fqdn'
	| 'url'
	| 'null';

/**
 * All valid `CliTypeId` values. Used for schema validation and to build
 * detailed error messages listing the accepted type ids.
 *
 * @category CLI
 */
export const cliTypeIds: readonly CliTypeId[] = [
	'boolean',
	'string',
	'number',
	'posInt',
	'negInt',
	'ipv4',
	'ipv4WithNetmask',
	'ipv6',
	'ipv6WithNetmask',
	'port',
	'hostname',
	'fqdn',
	'url',
	'null'
];
