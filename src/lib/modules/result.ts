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
}

// Helper constructors
export const ok = <T>(value: T): Ok<T> => new Ok(value);
export const err = <E>(error: E): Err<E> => new Err(error);

export function safeJsonParse(input: string) {
  try {
    return ok(JSON.parse(input) as unknown);
  } catch {
    return err("parse-error");
  }
}
