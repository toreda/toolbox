/**
 * Parsed URL breakdown returned by `UrlParser.parse`. Every part the URL
 * doesn't contain is `null` — no field is ever omitted, so results are
 * safe to destructure without existence checks. Parts are returned as
 * written in the input; nothing is percent-decoded.
 *
 * Spec: `_specs/url-parser-main.md` is the authoritative definition of
 * this shape and its field semantics — update it in the same change if
 * this interface fundamentally changes.
 *
 * @category UrlParser
 */
export interface UrlParserResult {
	/** The raw input the result was parsed from ('' when absent). */
	url: string;
	/** Lowercased scheme without the trailing ':', e.g. `'https'`. */
	scheme: string | null;
	/**
	 * Userinfo before the first ':', e.g. `'user'` in `user:pass@host`.
	 * Case is preserved exactly as written — unlike the host, credentials
	 * are case-sensitive and are never case-folded.
	 */
	username: string | null;
	/**
	 * Userinfo after the first ':', e.g. `'pass'` in `user:pass@host`.
	 * Case is preserved exactly as written, like `username`.
	 */
	password: string | null;
	/**
	 * Full lowercased hostname without the port, e.g.
	 * `'www.example.co.uk'`. IPv6 hosts are returned without brackets.
	 */
	host: string | null;
	/** Numeric port when present and valid (0–65535). */
	port: number | null;
	/** Path as written, including the leading '/' when present. */
	path: string | null;
	/**
	 * Query string without the leading '?', in the exact form
	 * `QueryParser.parse` accepts. Empty string when the URL ends at a
	 * bare '?'; `null` when there is no '?' at all.
	 */
	query: string | null;
	/** Fragment without the leading '#'. */
	fragment: string | null;
	/**
	 * Current-level (leftmost) subdomain label, e.g. `'one'` for
	 * `one.two.three.example.com`. `null` when the host has no subdomain.
	 */
	subdomain: string | null;
	/**
	 * Every subdomain label left of `domain`, current level first —
	 * `['one', 'two', 'three']` for `one.two.three.example.com`. Empty
	 * when the host has no subdomain.
	 */
	subdomains: string[];
	/**
	 * Root (registrable) domain — always the `example.com` part no matter
	 * how many subdomain levels sit above it, e.g. `'example.com'` or
	 * `'example.co.uk'`. `null` for IP hosts and single-label hosts like
	 * `'localhost'`.
	 */
	domain: string | null;
	/** Public suffix of `domain`, e.g. `'com'` or `'co.uk'`. */
	tld: string | null;
}
