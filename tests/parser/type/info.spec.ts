import {parserTypeInfo} from 'src/parser/type/info';

describe('parserTypeInfo', () => {
	it('should parse a single base type', () => {
		expect(parserTypeInfo('string')).toEqual({
			raw: 'string',
			members: [{typeId: 'string', array: false}],
			nullOk: false,
			arrayOk: false,
			singleOk: true
		});
	});

	it('should parse array and union forms', () => {
		expect(parserTypeInfo('string | posInt[] | null')).toEqual({
			raw: 'string | posInt[] | null',
			members: [
				{typeId: 'string', array: false},
				{typeId: 'posInt', array: true}
			],
			nullOk: true,
			arrayOk: true,
			singleOk: true
		});
	});

	it('should collapse duplicate members', () => {
		const info = parserTypeInfo('string | string | string[]');
		expect(info?.members).toEqual([
			{typeId: 'string', array: false},
			{typeId: 'string', array: true}
		]);
	});

	it('should return null for invalid type strings', () => {
		expect(parserTypeInfo(undefined)).toBeNull();
		expect(parserTypeInfo(null)).toBeNull();
		expect(parserTypeInfo('')).toBeNull();
		expect(parserTypeInfo('mystery')).toBeNull();
		expect(parserTypeInfo('string |')).toBeNull();
		expect(parserTypeInfo('null')).toBeNull();
		expect(parserTypeInfo('null[]')).toBeNull();
	});
});
