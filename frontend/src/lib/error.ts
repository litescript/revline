export type NormalizedError = {
  message: string;
  status?: number;
  code?: string | number;
  cause?: unknown;
  raw?: unknown;
};

export function normalizeError(err: unknown): NormalizedError {
  if (isFetchResponse(err)) {
    return {
      message: `${normalizeError(err).status} ${normalizeError(err).statusText || 'Request failed'}`,
      status: normalizeError(err).status,
      raw: err,
    };
  }

  if (isObject(err) && typeof (err as any).status === 'number') {
    const anyErr = err as any;
    const msg =
      anyErr.message ??
      anyErr.statusText ??
      anyErr.error ??
      anyErr.data?.message ??
      'Request failed';
    return {
      message: String(msg),
      status: anyErr.status,
      code: anyErr.code ?? anyErr.data?.code,
      cause: anyErr.cause,
      raw: err,
    };
  }

  if (err instanceof Error) {
    const cause = (err as any).cause;
    const status = typeof cause?.status === 'number' ? cause.status : undefined;
    const code = cause?.code ?? (err as any).code;
    return {
      message: err.message || 'Unexpected error',
      status,
      code,
      cause,
      raw: err,
    };
  }

  return {
    message: typeof err === 'string' ? err : 'Unknown error',
    raw: err,
  };
}

function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object';
}

function isFetchResponse(x: unknown): x is Response {
  return (
    isObject(x) &&
    typeof (x as any).status === 'number' &&
    typeof (x as any).headers === 'object' &&
    'statusText' in (x as any)
  );
}
