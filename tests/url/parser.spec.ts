/**
 * These tests verify the behavior defined in `_specs/url-parser-main.md`
 * and its `_specs/url/parser/` sub-specs — the authoritative reference.
 * A test contradicting the spec is a wrong test; update the spec in the
 * same change if the parser's function deliberately changes.
 */
import {UrlParser} from 'src/url/parser';

describe('UrlParser', () => {
	describe('parse', () => {
		it('should return all-null fields for empty or missing input', () => {
			for (const input of ['', '   ', null, undefined]) {
				const result = UrlParser.parse(input);
				expect(result.url).toBe(typeof input === 'string' ? input : '');
				expect(result.scheme).toBeNull();
				expect(result.username).toBeNull();
				expect(result.password).toBeNull();
				expect(result.host).toBeNull();
				expect(result.port).toBeNull();
				expect(result.path).toBeNull();
				expect(result.query).toBeNull();
				expect(result.fragment).toBeNull();
				expect(result.subdomain).toBeNull();
				expect(result.subdomains).toEqual([]);
				expect(result.domain).toBeNull();
				expect(result.tld).toBeNull();
			}
		});

		it('should match the reference example in _specs/url-parser-main.md exactly', () => {
			const url = 'HTTPS://UserName:PassWord@One.Two.Three.Example.CO.UK:8443/Some/Path?Key=Value#Frag';
			expect(UrlParser.parse(url)).toEqual({
				url: url,
				scheme: 'https',
				username: 'UserName',
				password: 'PassWord',
				host: 'one.two.three.example.co.uk',
				port: 8443,
				path: '/Some/Path',
				query: 'Key=Value',
				fragment: 'Frag',
				subdomain: 'one',
				subdomains: ['one', 'two', 'three'],
				domain: 'example.co.uk',
				tld: 'co.uk'
			});
		});

		it('should parse every part of a full URL', () => {
			const result = UrlParser.parse('https://user:pass@www.example.co.uk:8443/a/b?x=1&y=2#frag');
			expect(result.scheme).toBe('https');
			expect(result.username).toBe('user');
			expect(result.password).toBe('pass');
			expect(result.host).toBe('www.example.co.uk');
			expect(result.port).toBe(8443);
			expect(result.path).toBe('/a/b');
			expect(result.query).toBe('x=1&y=2');
			expect(result.fragment).toBe('frag');
			expect(result.subdomain).toBe('www');
			expect(result.subdomains).toEqual(['www']);
			expect(result.domain).toBe('example.co.uk');
			expect(result.tld).toBe('co.uk');
		});

		it('should parse a minimal URL with nulls for absent parts', () => {
			const result = UrlParser.parse('https://example.com');
			expect(result.scheme).toBe('https');
			expect(result.host).toBe('example.com');
			expect(result.port).toBeNull();
			expect(result.path).toBeNull();
			expect(result.query).toBeNull();
			expect(result.fragment).toBeNull();
			expect(result.domain).toBe('example.com');
			expect(result.subdomain).toBeNull();
			expect(result.subdomains).toEqual([]);
			expect(result.tld).toBe('com');
		});

		it('should parse scheme-less input starting with a host', () => {
			const result = UrlParser.parse('www.example.com/path?q=1');
			expect(result.scheme).toBeNull();
			expect(result.host).toBe('www.example.com');
			expect(result.path).toBe('/path');
			expect(result.query).toBe('q=1');
			expect(result.domain).toBe('example.com');
			expect(result.subdomain).toBe('www');
		});

		it('should parse protocol-relative input', () => {
			const result = UrlParser.parse('//cdn.example.com/lib.js');
			expect(result.scheme).toBeNull();
			expect(result.host).toBe('cdn.example.com');
			expect(result.path).toBe('/lib.js');
			expect(result.domain).toBe('example.com');
		});

		it('should treat host:port as an authority, not a scheme', () => {
			const result = UrlParser.parse('example.com:8080/api');
			expect(result.scheme).toBeNull();
			expect(result.host).toBe('example.com');
			expect(result.port).toBe(8080);
			expect(result.path).toBe('/api');
		});

		it('should recognize localhost with and without a port', () => {
			const bare = UrlParser.parse('localhost');
			expect(bare.host).toBe('localhost');
			expect(bare.domain).toBeNull();

			const withPort = UrlParser.parse('localhost:3000/health');
			expect(withPort.host).toBe('localhost');
			expect(withPort.port).toBe(3000);
			expect(withPort.path).toBe('/health');
			expect(withPort.domain).toBeNull();
		});

		it('should lowercase scheme, host, and domain parts but preserve path, query, and fragment case', () => {
			const result = UrlParser.parse('HTTPS://Inner.WWW.Example.COM/Some/Path?Key=Value#Frag');
			expect(result.scheme).toBe('https');
			expect(result.host).toBe('inner.www.example.com');
			expect(result.subdomain).toBe('inner');
			expect(result.subdomains).toEqual(['inner', 'www']);
			expect(result.domain).toBe('example.com');
			expect(result.tld).toBe('com');
			expect(result.path).toBe('/Some/Path');
			expect(result.query).toBe('Key=Value');
			expect(result.fragment).toBe('Frag');
		});

		it('should keep IPv4 hosts whole without domain parts', () => {
			const result = UrlParser.parse('http://192.168.1.10:3000/status');
			expect(result.host).toBe('192.168.1.10');
			expect(result.port).toBe(3000);
			expect(result.path).toBe('/status');
			expect(result.domain).toBeNull();
			expect(result.subdomain).toBeNull();
			expect(result.tld).toBeNull();
		});

		it('should parse bracketed IPv6 hosts without domain parts', () => {
			const result = UrlParser.parse('http://[::1]:8080/x');
			expect(result.host).toBe('::1');
			expect(result.port).toBe(8080);
			expect(result.path).toBe('/x');
			expect(result.domain).toBeNull();
		});

		it('should accept arbitrary app-bound schemes', () => {
			const result = UrlParser.parse('myapp://content/id/123?ref=share');
			expect(result.scheme).toBe('myapp');
			expect(result.host).toBe('content');
			expect(result.path).toBe('/id/123');
			expect(result.query).toBe('ref=share');
			expect(result.domain).toBeNull();
		});

		it('should accept non-RFC digit-leading schemes before //', () => {
			const result = UrlParser.parse('1password://open/vault?item=abc');
			expect(result.scheme).toBe('1password');
			expect(result.host).toBe('open');
			expect(result.path).toBe('/vault');
			expect(result.query).toBe('item=abc');
		});

		it('should reject scheme names with characters outside the standard scheme set', () => {
			const result = UrlParser.parse('my_app://open/x');
			expect(result.scheme).toBeNull();
			expect(result.host).toBeNull();
			expect(result.path).toBe('my_app://open/x');
		});

		it('should accept schemes using the full standard character set', () => {
			const result = UrlParser.parse('com.example.app-2+beta://callback');
			expect(result.scheme).toBe('com.example.app-2+beta');
			expect(result.host).toBe('callback');
		});

		it('should treat a slashless scheme as opaque with the remainder as path', () => {
			const result = UrlParser.parse('mailto:someone@example.com');
			expect(result.scheme).toBe('mailto');
			expect(result.host).toBeNull();
			expect(result.path).toBe('someone@example.com');
			expect(result.username).toBeNull();
		});

		it('should parse path-only input as a path', () => {
			const absolute = UrlParser.parse('/just/a/path');
			expect(absolute.host).toBeNull();
			expect(absolute.path).toBe('/just/a/path');

			const relative = UrlParser.parse('plainword');
			expect(relative.host).toBeNull();
			expect(relative.path).toBe('plainword');
		});

		it('should strip a trailing FQDN dot from the host', () => {
			const result = UrlParser.parse('https://example.com./x');
			expect(result.host).toBe('example.com');
			expect(result.domain).toBe('example.com');
		});

		it('should return an empty query for a bare trailing question mark', () => {
			const result = UrlParser.parse('https://example.com/path?');
			expect(result.query).toBe('');
			expect(result.fragment).toBeNull();
		});

		it('should ignore invalid and out-of-range ports', () => {
			expect(UrlParser.parse('https://example.com:abc/x').port).toBeNull();
			expect(UrlParser.parse('https://example.com:99999/x').port).toBeNull();
			expect(UrlParser.parse('https://example.com:/x').port).toBeNull();
		});

		it('should parse userinfo variants', () => {
			const userOnly = UrlParser.parse('ftp://user@example.com/f');
			expect(userOnly.username).toBe('user');
			expect(userOnly.password).toBeNull();

			const passOnly = UrlParser.parse('ftp://:secret@example.com/f');
			expect(passOnly.username).toBeNull();
			expect(passOnly.password).toBe('secret');
		});
	});

	describe('scheme × subdomain × port permutations', () => {
		const subdomains = [
			{prefix: '', current: null, all: []},
			{prefix: 'www.', current: 'www', all: ['www']},
			{prefix: 'inner.www.', current: 'inner', all: ['inner', 'www']},
			{prefix: 'deep.inner.www.', current: 'deep', all: ['deep', 'inner', 'www']}
		];

		for (const scheme of [null, 'https']) {
			for (const port of [null, 8000]) {
				for (const sub of subdomains) {
					const host = `${sub.prefix}example.com`;
					const url = `${scheme === null ? '' : `${scheme}://`}${host}${port === null ? '' : `:${port}`}`;

					it(`should parse '${url}'`, () => {
						const result = UrlParser.parse(url);
						expect(result.scheme).toBe(scheme);
						expect(result.host).toBe(host);
						expect(result.port).toBe(port);
						expect(result.subdomain).toBe(sub.current);
						expect(result.subdomains).toEqual(sub.all);
						expect(result.domain).toBe('example.com');
						expect(result.tld).toBe('com');
						expect(result.path).toBeNull();
						expect(result.username).toBeNull();
						expect(result.password).toBeNull();
					});
				}
			}
		}
	});

	describe('userinfo forms', () => {
		it('should parse scheme-less username-only userinfo', () => {
			const result = UrlParser.parse('user@www.domain.com');
			expect(result.scheme).toBeNull();
			expect(result.username).toBe('user');
			expect(result.password).toBeNull();
			expect(result.host).toBe('www.domain.com');
			expect(result.domain).toBe('domain.com');
			expect(result.subdomain).toBe('www');
		});

		it('should read scheme-less user:pass as userinfo, not a scheme', () => {
			const result = UrlParser.parse('user:pass@www.domain.com');
			expect(result.scheme).toBeNull();
			expect(result.username).toBe('user');
			expect(result.password).toBe('pass');
			expect(result.host).toBe('www.domain.com');
			expect(result.domain).toBe('domain.com');
		});

		it('should parse scheme-less user:pass with a port', () => {
			const result = UrlParser.parse('user:pass@www.domain.com:8000/path');
			expect(result.scheme).toBeNull();
			expect(result.username).toBe('user');
			expect(result.password).toBe('pass');
			expect(result.host).toBe('www.domain.com');
			expect(result.port).toBe(8000);
			expect(result.path).toBe('/path');
		});

		it('should parse scheme-less userinfo against localhost', () => {
			const result = UrlParser.parse('user:pass@localhost:8000');
			expect(result.username).toBe('user');
			expect(result.password).toBe('pass');
			expect(result.host).toBe('localhost');
			expect(result.port).toBe(8000);
		});

		it('should parse scheme + user:pass + port together', () => {
			const result = UrlParser.parse('https://user:pass@inner.www.example.com:8000/a?b=1#c');
			expect(result.scheme).toBe('https');
			expect(result.username).toBe('user');
			expect(result.password).toBe('pass');
			expect(result.host).toBe('inner.www.example.com');
			expect(result.port).toBe(8000);
			expect(result.path).toBe('/a');
			expect(result.query).toBe('b=1');
			expect(result.fragment).toBe('c');
			expect(result.subdomain).toBe('inner');
			expect(result.subdomains).toEqual(['inner', 'www']);
			expect(result.domain).toBe('example.com');
		});

		it('should preserve username and password case while lowercasing the host', () => {
			const result = UrlParser.parse('https://UserName:PassWord@WWW.Example.COM:8000/x');
			expect(result.username).toBe('UserName');
			expect(result.password).toBe('PassWord');
			expect(result.host).toBe('www.example.com');
			expect(result.domain).toBe('example.com');
		});

		it('should preserve userinfo case in scheme-less form too', () => {
			const result = UrlParser.parse('MixedCase:AlsoMixed@Example.COM');
			expect(result.username).toBe('MixedCase');
			expect(result.password).toBe('AlsoMixed');
			expect(result.host).toBe('example.com');
		});

		it('should still treat opaque schemes with an @ payload as schemes', () => {
			const result = UrlParser.parse('mailto:someone@example.com');
			expect(result.scheme).toBe('mailto');
			expect(result.username).toBeNull();
			expect(result.host).toBeNull();
			expect(result.path).toBe('someone@example.com');
		});
	});

	describe('domain extraction', () => {
		it('should split subdomain, domain, and tld for plain gTLD hosts', () => {
			const result = UrlParser.parse('https://a.b.example.com');
			expect(result.subdomain).toBe('a');
			expect(result.subdomains).toEqual(['a', 'b']);
			expect(result.domain).toBe('example.com');
			expect(result.tld).toBe('com');
		});

		it('should report the current-level subdomain and the full chain', () => {
			const result = UrlParser.parse('one.two.three.example.com');
			expect(result.subdomain).toBe('one');
			expect(result.subdomains).toEqual(['one', 'two', 'three']);
			expect(result.domain).toBe('example.com');
			expect(result.tld).toBe('com');
			expect(result.host).toBe('one.two.three.example.com');
		});

		it('should recognize two-part ccTLD suffixes', () => {
			for (const [url, domain, tld] of [
				['https://www.example.co.uk', 'example.co.uk', 'co.uk'],
				['https://shop.example.com.au', 'example.com.au', 'com.au'],
				['https://example.co.jp', 'example.co.jp', 'co.jp'],
				['https://www.example.gov.br', 'example.gov.br', 'gov.br']
			]) {
				const result = UrlParser.parse(url);
				expect(result.domain).toBe(domain);
				expect(result.tld).toBe(tld);
			}
		});

		it('should not extend the suffix when the second-level label is the domain itself', () => {
			const result = UrlParser.parse('https://example.io');
			expect(result.domain).toBe('example.io');
			expect(result.tld).toBe('io');
			expect(result.subdomain).toBeNull();
		});

		it('should leave domain parts null for single-label hosts', () => {
			const result = UrlParser.parse('http://intranet/page');
			expect(result.host).toBe('intranet');
			expect(result.domain).toBeNull();
			expect(result.tld).toBeNull();
		});
	});

	describe('per-part helpers', () => {
		it('should return just the requested part', () => {
			const url = 'https://www.example.co.uk/path?a=1#f';
			expect(UrlParser.scheme(url)).toBe('https');
			expect(UrlParser.host(url)).toBe('www.example.co.uk');
			expect(UrlParser.domain(url)).toBe('example.co.uk');
			expect(UrlParser.query(url)).toBe('a=1');
		});

		it('should extract the domain from scheme-less input', () => {
			expect(UrlParser.domain('www.example.com/path')).toBe('example.com');
			expect(UrlParser.domain('example.com')).toBe('example.com');
			expect(UrlParser.domain(null)).toBeNull();
		});
	});
});
