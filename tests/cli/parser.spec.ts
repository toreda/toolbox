import {CliParser} from 'src/cli/parser';

function messages(errors: Error[]): string[] {
	return errors.map((error) => error.message);
}

describe('CliParser', () => {
	it('should parse --key value and --key=value forms', () => {
		const parser = new CliParser({
			schema: {
				host: {type: 'string'},
				port: {type: 'port'}
			}
		});

		const outcome = parser.parse(['--host', 'example.com', '--port=8080']);
		expect(messages(outcome.errors)).toEqual([]);
		expect(outcome.ok).toBe(true);
		expect(outcome.value).toEqual({host: 'example.com', port: 8080});
	});

	it('should treat the flag form as true for booleans', () => {
		const parser = new CliParser({schema: {verbose: {type: 'boolean'}}});

		const outcome = parser.parse(['--verbose']);
		expect(outcome.ok).toBe(true);
		expect(outcome.value).toEqual({verbose: true});
	});

	it('should reject the flag form for non-boolean options', () => {
		const parser = new CliParser({schema: {limit: {type: 'posInt'}}});

		const outcome = parser.parse(['--limit']);
		expect(outcome.ok).toBe(false);
		expect(messages(outcome.errors)).toEqual([
			`Option '--limit' (posInt) expects a value. Provide it as '--limit {value}' or '--limit={value}'.`
		]);
	});

	it('should only parse the literal true for strict booleans', () => {
		const parser = new CliParser({schema: {flag: {type: 'boolean'}}});

		expect(parser.parse(['--flag=true']).value).toEqual({flag: true});
		expect(parser.parse(['--flag=True']).value).toEqual({flag: false});
		expect(parser.parse(['--flag=1']).value).toEqual({flag: false});
	});

	it('should coerce non-strict booleans with Boolean()', () => {
		const parser = new CliParser({schema: {flag: {type: 'boolean', strict: false}}});

		expect(parser.parse(['--flag=false']).value).toEqual({flag: true});
		expect(parser.parse(['--flag=']).value).toEqual({flag: false});
	});

	it('should build arrays from repeated options', () => {
		const parser = new CliParser({schema: {tag: {type: 'string[]'}}});

		const outcome = parser.parse(['--tag', 'a', '--tag', 'b']);
		expect(outcome.ok).toBe(true);
		expect(outcome.value).toEqual({tag: ['a', 'b']});
	});

	it('should strip one pair of matching surrounding quotes', () => {
		const parser = new CliParser({schema: {msg: {type: 'string'}}});

		const outcome = parser.parse([`--msg="hello world"`]);
		expect(outcome.value).toEqual({msg: 'hello world'});
	});

	it('should apply defaults and report missing required options', () => {
		const parser = new CliParser({
			schema: {
				host: {type: 'string', required: true},
				port: {type: 'port', default: 443}
			}
		});

		const outcome = parser.parse([]);
		expect(outcome.ok).toBe(false);
		expect(outcome.errorCode).toBe('CliParser:PARSE_FAILED');
		expect(messages(outcome.errors)).toEqual([`Missing required option '--host' (string).`]);

		const passing = parser.parse(['--host', 'a']);
		expect(passing.ok).toBe(true);
		expect(passing.value).toEqual({host: 'a', port: 443});
	});

	it('should reject unknown options unless allowUnknown is set', () => {
		const strict = new CliParser({schema: {host: {type: 'string'}}});
		const strictOutcome = strict.parse(['--bogus', '1']);
		expect(strictOutcome.ok).toBe(false);
		expect(messages(strictOutcome.errors)).toEqual([`Unknown option '--bogus'. Use one of: --host.`]);

		const loose = new CliParser({schema: {host: {type: 'string'}}, allowUnknown: true});
		const looseOutcome = loose.parse(['--bogus', '1', '--host', 'a']);
		expect(looseOutcome.ok).toBe(true);
		expect(looseOutcome.value).toEqual({host: 'a'});
	});

	it('should report stray positionals and single-dash options', () => {
		const parser = new CliParser({schema: {host: {type: 'string'}}});

		const outcome = parser.parse(['stray', '-host', 'a']);
		expect(outcome.ok).toBe(false);
		expect(messages(outcome.errors)).toEqual([
			`Unexpected value 'stray'. Values must follow an option key as '--key stray' or '--key=stray'.`,
			`Invalid option '-host'. Option keys start with '--' (e.g. '--host').`,
			`Unexpected value 'a'. Values must follow an option key as '--key a' or '--key=a'.`
		]);
	});

	it('should try union members in declared order', () => {
		const parser = new CliParser({schema: {value: {type: 'posInt | string'}}});

		expect(parser.parse(['--value', '42']).value).toEqual({value: 42});
		expect(parser.parse(['--value', 'abc']).value).toEqual({value: 'abc'});
	});

	it('should validate content types', () => {
		const parser = new CliParser({
			schema: {
				ip: {type: 'ipv4'},
				net: {type: 'ipv6WithNetmask'},
				name: {type: 'hostname'},
				domain: {type: 'fqdn'},
				link: {type: 'url'}
			}
		});

		const outcome = parser.parse([
			'--ip=192.168.0.1',
			'--net=2001:db8::/32',
			'--name=shard-01',
			'--domain=node1.example.com',
			'--link=https://example.com/path'
		]);
		expect(messages(outcome.errors)).toEqual([]);
		expect(outcome.ok).toBe(true);

		const failing = parser.parse(['--ip=192.168.0.1/24']);
		expect(failing.ok).toBe(false);
		expect(messages(failing.errors)).toEqual([
			`Option '--ip': '192.168.0.1/24' is not a valid IPv4 address without netmask (e.g. '192.168.0.1').`
		]);
	});

	it('should enforce maxLength with reject and trunc overflow', () => {
		const reject = new CliParser({schema: {code: {type: 'string', maxLength: 3}}});
		const rejected = reject.parse(['--code', 'abcdef']);
		expect(rejected.ok).toBe(false);
		expect(messages(rejected.errors)).toEqual([
			`Option '--code': value is 6 characters, exceeding the 3 character limit.`
		]);

		const trunc = new CliParser({schema: {code: {type: 'string', maxLength: 3, overflow: 'trunc'}}});
		expect(trunc.parse(['--code', 'abcdef']).value).toEqual({code: 'abc'});
	});

	it('should fail with BAD_SCHEMA and every schema problem', () => {
		const parser = new CliParser({
			schema: {
				'bad key': {type: 'string'},
				missing: {},
				wrong: {type: 'mystery'}
			} as never
		});

		const outcome = parser.parse([]);
		expect(outcome.ok).toBe(false);
		expect(outcome.errorCode).toBe('CliParser:BAD_SCHEMA');
		expect(outcome.errors).toHaveLength(3);
	});

	it('should throw when an option defines both type and types', () => {
		expect(() => {
			new CliParser({schema: {dual: {type: 'string', types: ['string']}} as never});
		}).toThrow(
			`CliParser schema option 'dual' defines both 'type' and 'types'. ` +
				`They are mutually exclusive — define exactly one.`
		);
	});

	it('should treat type and types forms as equivalent', () => {
		const parser = new CliParser({schema: {value: {types: ['posInt', 'string']}}});

		expect(parser.parse(['--value', '42']).value).toEqual({value: 42});
		expect(parser.parse(['--value', 'abc']).value).toEqual({value: 'abc'});
	});

	it('should generate help text from the schema', () => {
		const parser = new CliParser({
			schema: {
				host: {type: 'string', required: true, describe: 'Target host'},
				port: {type: 'port', default: 443}
			}
		});

		expect(parser.help()).toBe(
			[
				'Options:',
				'  --host (string) [required] — Target host',
				'  --port (port) [default: 443]'
			].join('\n')
		);
	});
});
