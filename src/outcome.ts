import type {OutcomeInit} from './outcome/init';

/**
 * @category Outcome
 */
export class Outcome<ValueT = unknown> {
	public value?: ValueT | null;
	public ok: boolean;
	public status: number | null;
	public errorCode: string | null;
	public readonly errors: Error[];

	constructor(init?: OutcomeInit<ValueT>) {
		this.ok = init?.ok === true ? true : false;
		this.value = init?.value !== undefined ? init.value : undefined;
		this.status = typeof init?.status === 'number' ? init.status : 0;
		this.errorCode = typeof init?.errorCode === 'string' ? init?.errorCode : null;
		this.errors = Array.isArray(init?.errors) ? init.errors : [];
	}

	public saveError(...errors: (Error | string)[]): this {
        // NOTE: In current model any non-Error, non-string element
        // provided in `errors` is ignored and not stored anywhere.
        for (const error of errors) {
            if (error instanceof Error) {
                this.errors.push(error);
            } else if (typeof error === 'string') {
                this.errors.push(new Error(error));
            }
        }

        return this;
	}

    public pass(status?: number): this {
        this.ok = true;
        if (typeof status === 'number') {
            this.status = status;
        }

        return this;
    }

    public fail(code: string, status?: number): this {
        if (typeof code !== 'string') {
            return this;
        }

        this.errorCode = code;

        if (typeof status === 'number') {
            this.status = status;
        }

        this.ok = false;

        return this;
    }

}
