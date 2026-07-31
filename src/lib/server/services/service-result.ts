import type { Result } from "$lib/modules/result";

export type ServiceError =
  | { type: "invalid-input"; reason?: string }
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "conflict"; reason?: string }
  | { type: "storage-error" };

export type ServiceResult<T, E extends ServiceError = ServiceError> = Result<T, E>;

export type AffectedRows = {
  affectedRows: number;
};
