import {QueryParser} from 'src/query/parser';

function messages(errors: Error[]): string[] {
	return errors.map((error) => error.message);
}

describe('QueryParser', () => {
	describe('parse', () => {
		it('should parse typed values from a basic query string', () => {
			const parser = new QueryParser({
				schema: {
					host: {type: 'string'},
					port: {type: 'port'},
					secure: {type: 'boolean'}
				}
			});

			const outcome = parser.parse('host=example.com&port=8080&secure=true');
			expect(messages(outcome.errors)).toEqual([]);
			expect(outcome.ok).toBe(true);
			expect(outcome.value).toEqual({host: 'example.com', port: 8080, secure: true});
		});

		it('should strip a leading ? and ignore the #fragment', () => {
			const parser = new QueryParser({schema: {q: {type: 'string'}}});

			const outcome = parser.parse('?q=search#section-2');
			expect(outcome.ok).toBe(true);
			expect(outcome.value).toEqual({q: 'search'});
		});

		it('should percent-decode keys and values and treat + as space', () => {
			const parser = new QueryParser({schema: {msg: {type: 'string'}}});

			const outcome = parser.parse('%6D%73%67=hello+big%20world%21');
			expect(outcome.ok).toBe(true);
			expect(outcome.value).toEqual({msg: 'hello big world!'});
		});

		it('should collect an error for malformed percent-encoding instead of throwing', () => {
			const parser = new QueryParser({schema: {msg: {type: 'string'}}});

			const outcome = parser.parse('msg=%E0%A4%A');
			expect(outcome.ok).toBe(false);
			expect(outcome.errorCode).toBe('QueryParser:PARSE_FAILED');
			expect(messages(outcome.errors)).toEqual([`Parameter 'msg': value has invalid percent-encoding.`]);
		});

		it('should treat a bare key as a boolean flag', () => {
			const parser = new QueryParser({schema: {verbose: {type: 'boolean'}}});

			const outcome = parser.parse('verbose');
			expect(outcome.ok).toBe(true);
			expect(outcome.value).toEqual({verbose: true});
		});

		it('should reject the flag form for non-boolean parameters', () => {
			const parser = new QueryParser({schema: {limit: {type: 'posInt'}}});

			const outcome = parser.parse('limit');
			expect(outcome.ok).toBe(false);
			expect(messages(outcome.errors)).toEqual([
				`Parameter 'limit' (posInt) expects a value. Provide it as 'limit={value}' in the query string.`
			]);
		});

		it('should parse key= as the empty string', () => {
			const parser = new QueryParser({schema: {tag: {type: 'string'}}});

			const outcome = parser.parse('tag=');
			expect(outcome.ok).toBe(true);
			expect(outcome.value).toEqual({tag: ''});
		});

		it('should build arrays from repeated keys', () => {
			const parser = new QueryParser({schema: {tag: {type: 'string[]'}}});

			const outcome = parser.parse('tag=a&tag=b&tag=c');
			expect(outcome.ok).toBe(true);
			expect(outcome.value).toEqual({tag: ['a', 'b', 'c']});
		});

		it('should accept the qs-style key[] array suffix', () => {
			const parser = new QueryParser({schema: {tag: {type: 'string[]'}}});

			const outcome = parser.parse('tag[]=a&tag%5B%5D=b');
			expect(outcome.ok).toBe(true);
			expect(outcome.value).toEqual({tag: ['a', 'b']});
		});

		it('should wrap a single occurrence of an array-only type', () => {
			const parser = new QueryParser({schema: {tag: {type: 'string[]'}}});

			const outcome = parser.parse('tag=solo');
			expect(outcome.ok).toBe(true);
			expect(outcome.value).toEqual({tag: ['solo']});
		});

		it('should reject repeated keys when the type is not an array', () => {
			const parser = new QueryParser({schema: {mode: {type: 'string'}}});

			const outcome = parser.parse('mode=a&mode=b');
			expect(outcome.ok).toBe(false);
			expect(messages(outcome.errors)).toEqual([
				`Parameter 'mode' (string) does not accept multiple values, but was provided 2 times.`
			]);
		});

		it('should reject unknown parameters by default', () => {
			const parser = new QueryParser({schema: {host: {type: 'string'}}});

			const outcome = parser.parse('host=a&utm=b');
			expect(outcome.ok).toBe(false);
			expect(messages(outcome.errors)).toEqual([`Unknown parameter 'utm'. Use one of: host.`]);
		});

		it('should ignore unknown parameters with allowUnknown', () => {
			const parser = new QueryParser({
				schema: {host: {type: 'string'}},
				allowUnknown: true
			});

			const outcome = parser.parse('host=a&utm_source=news&utm_medium=email');
			expect(outcome.ok).toBe(true);
			expect(outcome.value).toEqual({host: 'a'});
		});

		it('should reject bracket-nested keys with a dedicated error', () => {
			const parser = new QueryParser({schema: {filter: {type: 'string'}}});

			const outcome = parser.parse('filter[name]=a');
			expect(outcome.ok).toBe(false);
			expect(messages(outcome.errors)).toEqual([
				`Parameter 'filter[name]' uses bracket nesting, which is not supported. ` +
					`Only flat keys and the 'key[]' array suffix are.`
			]);
		});

		it('should apply defaults and report missing required parameters', () => {
			const parser = new QueryParser({
				schema: {
					host: {type: 'string', required: true, describe: 'Target host'},
					port: {type: 'port', default: 443}
				}
			});

			const outcome = parser.parse('');
			expect(outcome.ok).toBe(false);
			expect(messages(outcome.errors)).toEqual([
				`Missing required parameter 'host' (string) — Target host.`
			]);

			const passing = parser.parse('host=example.com');
			expect(passing.ok).toBe(true);
			expect(passing.value).toEqual({host: 'example.com', port: 443});
		});

		it('should match keys case-insensitively and use the schema casing in the result', () => {
			const parser = new QueryParser({schema: {maxRetries: {type: 'posInt'}}});

			const outcome = parser.parse('MAXRETRIES=3');
			expect(outcome.ok).toBe(true);
			expect(outcome.value).toEqual({maxRetries: 3});
		});

		it('should parse the literal null when the union allows it', () => {
			const parser = new QueryParser({schema: {parent: {type: 'string | null'}}});

			const outcome = parser.parse('parent=null');
			expect(outcome.ok).toBe(true);
			expect(outcome.value).toEqual({parent: null});
		});

		it('should enforce choices after conversion', () => {
			const parser = new QueryParser({
				schema: {env: {type: 'string', choices: ['dev', 'prod']}}
			});

			const outcome = parser.parse('env=staging');
			expect(outcome.ok).toBe(false);
			expect(messages(outcome.errors)).toEqual([
				`Parameter 'env': 'staging' is not an allowed value. Allowed: dev, prod.`
			]);
		});

		it('should report conversion failures with parameter wording', () => {
			const parser = new QueryParser({schema: {limit: {type: 'number'}}});

			const outcome = parser.parse('limit=abc');
			expect(outcome.ok).toBe(false);
			expect(messages(outcome.errors)).toEqual([`Parameter 'limit': 'abc' is not a finite number.`]);
		});

		it('should skip empty pairs and parse non-string input as an empty query', () => {
			const parser = new QueryParser({schema: {a: {type: 'string', default: 'x'}}});

			expect(parser.parse('&&&').value).toEqual({a: 'x'});
			expect(parser.parse(undefined).value).toEqual({a: 'x'});
			expect(parser.parse(null).value).toEqual({a: 'x'});
		});

		it('should collect every problem in a single pass', () => {
			const parser = new QueryParser({
				schema: {
					port: {type: 'port', required: true},
					mode: {type: 'string'}
				}
			});

			const outcome = parser.parse('mode=a&mode=b&bogus=1');
			expect(outcome.ok).toBe(false);
			expect(messages(outcome.errors)).toHaveLength(3);
		});

		it('should fail with BAD_SCHEMA before reading the query', () => {
			const parser = new QueryParser({schema: {bad: {type: 'nope'}}});

			const outcome = parser.parse('bad=1');
			expect(outcome.ok).toBe(false);
			expect(outcome.errorCode).toBe('QueryParser:BAD_SCHEMA');
		});
	});

	describe('stringify', () => {
		it('should serialize scalars, arrays, and null so parse round-trips', () => {
			const parser = new QueryParser({
				schema: {
					host: {type: 'string'},
					port: {type: 'port'},
					secure: {type: 'boolean'},
					tag: {type: 'string[]'},
					parent: {type: 'string | null'}
				}
			});

			const args = {host: 'example.com', port: 443, secure: false, tag: ['a', 'b'], parent: null};
			const outcome = parser.stringify(args);
			expect(messages(outcome.errors)).toEqual([]);
			expect(outcome.ok).toBe(true);
			expect(outcome.value).toBe('host=example.com&port=443&secure=false&tag=a&tag=b&parent=null');

			const roundTrip = parser.parse(outcome.value);
			expect(roundTrip.ok).toBe(true);
			expect(roundTrip.value).toEqual(args);
		});

		it('should percent-encode string values', () => {
			const parser = new QueryParser({schema: {msg: {type: 'string'}}});

			const outcome = parser.stringify({msg: 'hello world & more?'});
			expect(outcome.value).toBe('msg=hello%20world%20%26%20more%3F');

			const roundTrip = parser.parse(outcome.value);
			expect(roundTrip.value).toEqual({msg: 'hello world & more?'});
		});

		it('should omit undefined values and empty arrays', () => {
			const parser = new QueryParser({
				schema: {
					host: {type: 'string'},
					tag: {type: 'string[]'}
				}
			});

			const outcome = parser.stringify({host: undefined, tag: []});
			expect(outcome.ok).toBe(true);
			expect(outcome.value).toBe('');
		});

		it('should serialize an empty string for null or missing args', () => {
			const parser = new QueryParser({schema: {host: {type: 'string'}}});

			expect(parser.stringify(null).value).toBe('');
			expect(parser.stringify().value).toBe('');
		});

		it('should use canonical schema casing for known keys', () => {
			const parser = new QueryParser({schema: {maxRetries: {type: 'posInt'}}});

			const outcome = parser.stringify({MAXRETRIES: 3} as Record<string, unknown>);
			expect(outcome.value).toBe('maxRetries=3');
		});

		it('should reject values that do not match the schema type', () => {
			const parser = new QueryParser({schema: {port: {type: 'port'}}});

			const outcome = parser.stringify({port: 99999});
			expect(outcome.ok).toBe(false);
			expect(outcome.errorCode).toBe('QueryParser:STRINGIFY_FAILED');
			expect(messages(outcome.errors)).toEqual([
				`Parameter 'port': value 99999 does not match type 'port'.`
			]);
		});

		it('should reject unknown keys unless allowUnknown is set', () => {
			const strict = new QueryParser({schema: {host: {type: 'string'}}});
			const strictOutcome = strict.stringify({host: 'a', extra: 'b'} as Record<string, unknown>);
			expect(strictOutcome.ok).toBe(false);
			expect(messages(strictOutcome.errors)).toEqual([`Unknown parameter 'extra'. Use one of: host.`]);

			const loose = new QueryParser({schema: {host: {type: 'string'}}, allowUnknown: true});
			const looseOutcome = loose.stringify({host: 'a', extra: 'b c'} as Record<string, unknown>);
			expect(looseOutcome.ok).toBe(true);
			expect(looseOutcome.value).toBe('host=a&extra=b%20c');
		});

		it('should reject non-scalar values on the allowUnknown path', () => {
			const parser = new QueryParser({schema: {host: {type: 'string'}}, allowUnknown: true});

			const outcome = parser.stringify({nested: {a: 1}} as Record<string, unknown>);
			expect(outcome.ok).toBe(false);
			expect(messages(outcome.errors)).toEqual([
				`Parameter 'nested': {"a":1} cannot be serialized into a query string.`
			]);
		});

		it('should reject non-object input', () => {
			const parser = new QueryParser({schema: {host: {type: 'string'}}});

			const outcome = parser.stringify(['host'] as unknown as Record<string, unknown>);
			expect(outcome.ok).toBe(false);
			expect(outcome.errorCode).toBe('QueryParser:STRINGIFY_FAILED');
		});
	});

	describe('help', () => {
		it('should list parameters without the -- prefix', () => {
			const parser = new QueryParser({
				schema: {
					host: {type: 'string', required: true, describe: 'Target host'},
					port: {type: 'port', default: 443}
				}
			});

			expect(parser.help()).toBe(
				['Options:', '  host (string) [required] — Target host', '  port (port) [default: 443]'].join(
					'\n'
				)
			);
		});
	});
});
