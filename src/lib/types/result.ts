export type Ok<T> = { ok: true; value: T };
export type Err<E extends { message: string } = { message: string }> = { ok: false; error: E };
export type Result<T, E extends { message: string } = { message: string }> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E extends { message: string }>(error: E): Err<E> => ({ ok: false, error });
