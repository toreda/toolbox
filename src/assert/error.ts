import type {AssertErrorInit} from './error/init';

/**
 * Error thrown by every failed `Assert` method. Carries the compared
 * values and the assert method name so failures can be inspected
 * programmatically instead of parsing the message.
 *
 * @category Assert
 */
export class AssertError extends Error {
	public readonly actual: unknown;
	public readonly expected: unknown;
	public readonly operator: string;
	public readonly generatedMessage: boolean;

	constructor(init?: AssertErrorInit) {
		super(typeof init?.message === 'string' ? init.message : 'Assertion failed');
		this.name = 'AssertError';
		this.actual = init?.actual;
		this.expected = init?.expected;
		this.operator = typeof init?.operator === 'string' ? init.operator : '';
		this.generatedMessage = init?.generatedMessage === true;
	}
}
