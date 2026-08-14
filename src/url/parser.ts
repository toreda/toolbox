/**
 * Spec: `_specs/url-parser-main.md` (and its `_specs/url/parser/` sub-
 * specs) is the authoritative definition of this parser's behavior —
 * functional divergence from it is a defect in this file, not the spec.
 * If this file fundamentally changes shape or function, update the spec
 * in the same change.
 */
import type {UrlParserResult} from './parser/result';

/**
 * Scheme prefix per RFC 3986: a letter followed by letters, digits, '+',
 * '-', or '.'. Dots mean `example.com:8080` matches too — the port
 * lookahead below rejects that case.
 */
const SCHEME_PATTERN = /^([A-Za-z][A-Za-z0-9+.-]*):([\s\S]*)$/;

/**
 * Looser scheme form for the unambiguous `name://` shape. App-bound
 * schemes are arbitrary per-app strings, so the letter-first rule of RFC
 * 3986 is relaxed here (digit-leading `1password://` is accepted) — but
 * the standard scheme character set (letters, digits, '+', '-', '.')
 * still applies; names with other characters never parse as schemes.
 */
const LOOSE_SCHEME_PATTERN = /^([A-Za-z0-9][A-Za-z0-9+.-]*):(\/\/[\s\S]*)$/;

/** A ':' followed by digits then a delimiter is host:port, not scheme:path. */
const PORT_LOOKAHEAD = /^\d+(?:[/?#]|$)/;

const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

const PORT_PATTERN = /^\d+$/;

/**
 * Schemes whose remainder stays opaque even when it contains '@'
 * (`mailto:someone@example.com`). For any other name, `name:text@host` is
 * read as userinfo — `user:pass@example.com` is a password, not a scheme.
 */
const OPAQUE_SCHEMES = new Set(['callto', 'data', 'geo', 'javascript', 'magnet', 'mailto', 'news', 'sms', 'tel', 'urn']);

/**
 * ccTLD second-level labels ('co' in 'co.uk'). When a host's last label
 * is a two-letter country code and the label before it is one of these,
 * the public suffix spans both (`co.uk`, `com.au`, `ac.jp`, ...). This is
 * a heuristic covering the common patterns — the full public suffix list
 * is far too large for a dependency-free utility.
 */
const SECOND_LEVEL_LABELS = new Set([
	'ac',
	'co',
	'com',
	'edu',
	'go',
	'gob',
	'gouv',
	'gov',
	'mil',
	'ne',
	'net',
	'nom',
	'or',
	'org',
	'sch'
]);

/**
 * Whether scheme-less input starts with an authority (host) rather than a
 * path: the first segment is bracketed IPv6, contains a dot, or is
 * `localhost` (with or without a port). Everything else — `/abs/path`,
 * `relative/path`, plain words — parses as a path.
 */
function looksLikeAuthority(text: string): boolean {
	const delim = text.search(/[/?#]/);
	const segment = delim === -1 ? text : text.slice(0, delim);

	if (!segment.length || segment.startsWith('.')) {
		return false;
	}

	// Userinfo doesn't affect host shape — check what follows the '@'.
	const at = segment.lastIndexOf('@');
	const hostport = at === -1 ? segment : segment.slice(at + 1);

	if (hostport.startsWith('[')) {
		return true;
	}

	if (hostport.includes('.')) {
		return true;
	}

	const colon = hostport.indexOf(':');
	const name = colon === -1 ? hostport : hostport.slice(0, colon);
	return name.toLowerCase() === 'localhost';
}

/** Whether text contains an '@' before the path/query/fragment starts. */
function hasUserinfo(text: string): boolean {
	const delim = text.search(/[/?#]/);
	const segment = delim === -1 ? text : text.slice(0, delim);
	return segment.includes('@');
}

/** Parse a `':{digits}'` suffix into `result.port`; anything else is ignored. */
function parsePort(text: string, result: UrlParserResult): void {
	if (!text.startsWith(':')) {
		return;
	}

	const digits = text.slice(1);
	if (!PORT_PATTERN.test(digits)) {
		return;
	}

	const port = parseInt(digits, 10);
	if (port <= 65535) {
		result.port = port;
	}
}

/** Split `userinfo@host:port` into username, password, host, and port. */
function parseAuthority(authority: string, result: UrlParserResult): void {
	let hostport = authority;

	const at = authority.lastIndexOf('@');
	if (at !== -1) {
		const userinfo = authority.slice(0, at);
		hostport = authority.slice(at + 1);

		const colon = userinfo.indexOf(':');
		const username = colon === -1 ? userinfo : userinfo.slice(0, colon);
		const password = colon === -1 ? '' : userinfo.slice(colon + 1);
		result.username = username.length ? username : null;
		result.password = password.length ? password : null;
	}

	let host = hostport;
	if (hostport.startsWith('[')) {
		const close = hostport.indexOf(']');
		if (close === -1) {
			host = hostport.slice(1);
		} else {
			host = hostport.slice(1, close);
			parsePort(hostport.slice(close + 1), result);
		}
	} else {
		const colon = hostport.lastIndexOf(':');
		if (colon !== -1) {
			host = hostport.slice(0, colon);
			parsePort(hostport.slice(colon), result);
		}
	}

	host = host.toLowerCase();
	// FQDN trailing-dot form ('example.com.') normalizes off.
	if (host.endsWith('.')) {
		host = host.slice(0, -1);
	}

	result.host = host.length ? host : null;
}

/** Derive subdomain / domain / tld from a named (non-IP) host. */
function splitHost(result: UrlParserResult): void {
	const host = result.host;
	if (host === null || host.includes(':') || IPV4_PATTERN.test(host)) {
		return;
	}

	const labels = host.split('.');
	if (labels.length < 2 || labels.some((label) => !label.length)) {
		return;
	}

	const last = labels[labels.length - 1];
	let tldSize = 1;
	if (labels.length >= 3 && last.length === 2 && SECOND_LEVEL_LABELS.has(labels[labels.length - 2])) {
		tldSize = 2;
	}

	result.tld = labels.slice(labels.length - tldSize).join('.');
	result.domain = labels.slice(labels.length - tldSize - 1).join('.');

	result.subdomains = labels.slice(0, labels.length - tldSize - 1);
	result.subdomain = result.subdomains.length ? result.subdomains[0] : null;
}

function parse(url?: string | null): UrlParserResult {
	const raw = typeof url === 'string' ? url : '';
	const result: UrlParserResult = {
		url: raw,
		scheme: null,
		username: null,
		password: null,
		host: null,
		port: null,
		path: null,
		query: null,
		fragment: null,
		subdomain: null,
		subdomains: [],
		domain: null,
		tld: null
	};

	let text = raw.trim();
	if (!text.length) {
		return result;
	}

	// A leading 'name:' is a scheme unless the rest shows it isn't: digits
	// then a delimiter is host:port ('example.com:8080'), and an '@' before
	// the path is userinfo ('user:pass@example.com') except for schemes
	// whose payload legitimately contains one ('mailto:someone@x.com').
	const scheme = SCHEME_PATTERN.exec(text) ?? LOOSE_SCHEME_PATTERN.exec(text);
	if (scheme && !PORT_LOOKAHEAD.test(scheme[2])) {
		const name = scheme[1].toLowerCase();
		if (scheme[2].startsWith('//') || OPAQUE_SCHEMES.has(name) || !hasUserinfo(scheme[2])) {
			result.scheme = name;
			text = scheme[2];
		}
	}

	// Authority is present after '//' ('https://x', protocol-relative
	// '//x'), or when scheme-less input leads with something host-shaped
	// ('example.com/path'). A scheme with no slashes (mailto:) is opaque —
	// its remainder is the path.
	let hasAuthority = false;
	if (text.startsWith('//')) {
		hasAuthority = true;
		text = text.slice(2);
	} else if (result.scheme === null) {
		hasAuthority = looksLikeAuthority(text);
	}

	// '#' and '?' terminate every earlier part, so the tail splits off
	// first regardless of form.
	const hash = text.indexOf('#');
	if (hash !== -1) {
		result.fragment = text.slice(hash + 1);
		text = text.slice(0, hash);
	}

	const question = text.indexOf('?');
	if (question !== -1) {
		result.query = text.slice(question + 1);
		text = text.slice(0, question);
	}

	if (hasAuthority) {
		const slash = text.indexOf('/');
		const authority = slash === -1 ? text : text.slice(0, slash);
		if (slash !== -1) {
			result.path = text.slice(slash);
		}

		parseAuthority(authority, result);
	} else if (text.length) {
		result.path = text;
	}

	splitHost(result);
	return result;
}

/**
 * Dependency-free URL parser. `parse` splits a full or partial URL —
 * scheme-less (`example.com/path`), protocol-relative (`//cdn.x.com`),
 * and `host:port` forms all work — into scheme, userinfo, host, port,
 * path, query, and fragment, and derives the root domain the way
 * `parse-domain` does (`domain`, `subdomain`, `subdomains`, `tld`).
 * Schemes are arbitrary, not a fixed list — app-bound schemes like
 * `myapp://` or `1password://` parse like any other. The `query` part
 * feeds directly into `QueryParser.parse`. Never throws; parts the input
 * doesn't contain are `null`. The per-part helpers parse just that slice.
 *
 * @category UrlParser
 */
export const UrlParser = {
	parse,
	scheme(url?: string | null): string | null {
		return parse(url).scheme;
	},
	host(url?: string | null): string | null {
		return parse(url).host;
	},
	domain(url?: string | null): string | null {
		return parse(url).domain;
	},
	query(url?: string | null): string | null {
		return parse(url).query;
	}
} as const;
