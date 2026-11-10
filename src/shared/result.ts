/** Structured error returned to the model instead of thrown strings or stack traces. */
export interface ToolError<Code extends string = string> {
  code: Code;
  message: string;
  line?: number;
  hint?: string;
}

export type Ok<T> = { ok: true; value: T };
export type Fail<E> = { ok: false; error: E };
export type Result<T, E = ToolError> = Ok<T> | Fail<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function fail<E>(error: E): Fail<E> {
  return { ok: false, error };
}
