/**
 * Local Request augmentation: `apiLogger` stamps a per-request start time
 * on the Request object so the after-handler can compute the elapsed
 * duration. This avoids threading a parallel WeakMap and stays scoped
 * to this directory so it doesn't leak into other parts of the app.
 */
declare global {
  interface Request {
    _startTime?: number;
  }
}

export {};
