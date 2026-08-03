import {AssertError} from 'src/assert/error';

describe('AssertError', () => {
	it('should default all fields when constructed without init', () => {
		const error = new AssertError();
		expect(error.message).toBe('Assertion failed');
		expect(error.name).toBe('AssertError');
		expect(error.actual).toBeUndefined();
		expect(error.expected).toBeUndefined();
		expect(error.operator).toBe('');
		expect(error.generatedMessage).toBe(false);
	});

	it('should honor init values', () => {
		const error = new AssertError({
			message: 'boom',
			actual: 1,
			expected: 2,
			operator: 'equal',
			generatedMessage: true
		});
		expect(error.message).toBe('boom');
		expect(error.actual).toBe(1);
		expect(error.expected).toBe(2);
		expect(error.operator).toBe('equal');
		expect(error.generatedMessage).toBe(true);
	});

	it('should be an Error instance', () => {
		expect(new AssertError()).toBeInstanceOf(Error);
	});
});
