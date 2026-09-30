import type { Result } from "$lib/modules/result";

import type { Database } from "./client";

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Runs a Result-returning operation in a Drizzle transaction:
 * commits on Ok and rolls back on Err, returning the original result.
 *
 * Drizzle requires a thrown exception to trigger rollback, so Err results are
 * translated into an internal exception and restored after rollback completes.
 * Unexpected exceptions, including database failures, propagate to the caller.
 */
export async function transactionResult<T, E>(
  database: Database,
  operation: (tx: Transaction) => Promise<Result<T, E>>,
): Promise<Result<T, E>> {
  const rollback = new Error("Transaction returned an Err result");
  let rejected: Result<T, E> | undefined;

  try {
    return await database.transaction(async (tx) => {
      const result = await operation(tx);
      if (result.isErr()) {
        rejected = result;
        throw rollback;
      }
      return result;
    });
  } catch (error) {
    if (error === rollback && rejected) return rejected;
    throw error;
  }
}
