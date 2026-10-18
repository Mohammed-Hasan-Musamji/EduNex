export type ApiErrorKind =
  | "network"
  | "timeout"
  | "http"
  | "invalid_json"
  | "invalid_shape"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "not_implemented"
  | "conflict"
  | "service_unavailable"
  | "unknown";

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

/**
 * True when the backend simply isn't reachable, or the route itself isn't
 * implemented (an unmapped path, not a resource-not-found 404).
 *
 * False for real application-level failures (a missing resource, a
 * conflict, Gemini being unconfigured/unavailable, bad payloads, auth) —
 * those must be surfaced as real errors, never silently papered over with
 * fabricated data.
 */
export function isBackendUnavailable(error: ApiError): boolean {
  return error.kind === "not_implemented" || error.kind === "network" || error.kind === "timeout";
}
