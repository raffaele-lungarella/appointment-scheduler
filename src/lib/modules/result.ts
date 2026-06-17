export type Result<T, E = Error> = Ok<T> | Err<E>;

export class Ok<T> {
	readonly kind = "ok" as const;

	constructor(public readonly value: T) {}

	isOk(): this is Ok<T> {
		return true;
	}

	isErr(): this is never {
		return false;
	}

	unwrap(): T {
		return this.value;
	}

	unwrapOr(_defaultValue: T): T {
		return this.value;
	}

	map<U>(fn: (value: T) => U): Result<U, never> {
		return ok(fn(this.value));
	}

	mapErr<F>(_fn: (error: never) => F): Result<T, F> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return this as any;
	}
}

export class Err<E> {
	readonly kind = "err" as const;

	constructor(public readonly error: E) {}

	isOk(): this is never {
		return false;
	}

	isErr(): this is Err<E> {
		return true;
	}

	unwrap(): never {
		throw new Error(`Called unwrap on Err: ${this.error}`);
	}

	unwrapOr<T>(defaultValue: T): T {
		return defaultValue;
	}

	map<U>(_fn: (value: never) => U): Result<U, E> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return this as any;
	}

	mapErr<F>(fn: (error: E) => F): Result<never, F> {
		return err(fn(this.error));
	}
}

// Helper constructors
export const ok = <T>(value: T): Ok<T> => new Ok(value);
export const err = <E>(error: E): Err<E> => new Err(error);
