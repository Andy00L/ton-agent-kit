/**
 * Turn a caught value into a message without assuming it is an `Error`.
 *
 * `catch` binds `unknown`, and a thrown string, number or plain object is
 * common in JavaScript libraries. Every catch block in the kit goes through
 * this function rather than reaching for `error.message` on an untyped value.
 *
 * @param error - The value a catch block received.
 * @returns The error message, or the value rendered as a string.
 *
 * @since 1.3.0
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
