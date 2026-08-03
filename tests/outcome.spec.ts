import {Outcome} from 'src/outcome';

describe('Outcome', () => {
	it('should default to a non-ok outcome with no errors', () => {
		const outcome = new Outcome();
		expect(outcome.ok).toBe(false);
		expect(outcome.status).toBe(0);
		expect(outcome.errorCode).toBeNull();
		expect(outcome.errors).toEqual([]);
	});

	it('should honor init values', () => {
		const outcome = new Outcome({ok: true, value: 'v', status: 201, errorCode: 'X'});
		expect(outcome.ok).toBe(true);
		expect(outcome.value).toBe('v');
		expect(outcome.status).toBe(201);
		expect(outcome.errorCode).toBe('X');
	});

	it('should store the code and status on fail', () => {
		const outcome = new Outcome({ok: true}).fail('Thing:BROKE', 500);
		expect(outcome.ok).toBe(false);
		expect(outcome.errorCode).toBe('Thing:BROKE');
		expect(outcome.status).toBe(500);
	});

	it('should mark the outcome ok on pass', () => {
		const outcome = new Outcome().pass(200);
		expect(outcome.ok).toBe(true);
		expect(outcome.status).toBe(200);
	});

	it('should wrap string errors and keep Error instances in saveError', () => {
		const original = new Error('boom');
		const outcome = new Outcome().saveError('text', original);
		expect(outcome.errors).toHaveLength(2);
		expect(outcome.errors[0]).toBeInstanceOf(Error);
		expect(outcome.errors[0].message).toBe('text');
		expect(outcome.errors[1]).toBe(original);
	});
});
