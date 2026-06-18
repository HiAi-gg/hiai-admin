/**
 * Centralised error handling for the hiai-admin API.
 *
 * Goals:
 *  - Never leak raw `error.message` from DB drivers, internal libraries, or
 *    unexpected exceptions to the client.
 *  - Return a stable, machine-readable `code` plus a user-friendly `message`.
 *  - Preserve the original error in server logs (caller responsibility).
 *
 * Usage:
 *  - Throw an `AppError` from services / route handlers when you want a
 *    specific status + code.
 *  - The global `onError` handler in `api/index.ts` catches `AppError`
 *    instances and renders them; everything else collapses to a generic
 *    500 with no internal details.
 */

export const ErrorCode = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  BAD_REQUEST: 'BAD_REQUEST',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  BAD_REQUEST: 400,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

/** User-friendly messages safe to return to API clients. */
const MESSAGE_BY_CODE: Record<ErrorCode, string> = {
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'The request payload is invalid.',
  UNAUTHORIZED: 'Authentication is required.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  CONFLICT: 'The request conflicts with the current state of the resource.',
  RATE_LIMITED: 'Too many requests. Please slow down and try again later.',
  BAD_REQUEST: 'The request is invalid.',
  UPSTREAM_ERROR: 'An upstream service is unavailable. Please try again later.',
  INTERNAL_ERROR: 'An unexpected internal error occurred. Please try again later.',
};

export interface AppErrorOptions {
  code?: ErrorCode;
  status?: number;
  message?: string;
  details?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details: unknown;

  constructor(opts: AppErrorOptions = {}) {
    const code = opts.code ?? ErrorCode.INTERNAL_ERROR;
    const status = opts.status ?? STATUS_BY_CODE[code];
    const message = opts.message ?? MESSAGE_BY_CODE[code];

    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = opts.details;
    if (opts.cause !== undefined) {
      // Standard ES2022 cause chain — keeps original error reachable for logs.
      (this as Error & { cause?: unknown }).cause = opts.cause;
    }
  }
}

export interface SanitizedErrorBody {
  error: string;
  code: ErrorCode;
  details?: unknown;
}

/**
 * Produce a JSON-safe error body for an unknown thrown value.
 *
 * - `AppError` instances keep their code, message, and details.
 * - Everything else collapses to a generic 500 with no internal info.
 */
export function toErrorResponse(err: unknown): {
  status: number;
  body: SanitizedErrorBody;
} {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        error: err.message,
        code: err.code,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    };
  }

  return {
    status: 500,
    body: {
      error: MESSAGE_BY_CODE[ErrorCode.INTERNAL_ERROR],
      code: ErrorCode.INTERNAL_ERROR,
    },
  };
}

/**
 * Convenience helper for `throw new AppError(...)` style usage in services.
 */
export function badRequest(message?: string, details?: unknown): AppError {
  return new AppError({ code: ErrorCode.BAD_REQUEST, message, details });
}

export function notFound(message?: string, details?: unknown): AppError {
  return new AppError({ code: ErrorCode.NOT_FOUND, message, details });
}

export function forbidden(message?: string, details?: unknown): AppError {
  return new AppError({ code: ErrorCode.FORBIDDEN, message, details });
}

export function unauthorized(message?: string, details?: unknown): AppError {
  return new AppError({ code: ErrorCode.UNAUTHORIZED, message, details });
}

export function conflict(message?: string, details?: unknown): AppError {
  return new AppError({ code: ErrorCode.CONFLICT, message, details });
}
