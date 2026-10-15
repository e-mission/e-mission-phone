export type ServerCommError = Error & {
  status?: number;
  body?: { error?: string; code?: string } | string;
};

export function getServerErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const body = (error as { body?: { code?: unknown } | string }).body;
  return body && typeof body === 'object' && typeof body.code === 'string' ? body.code : undefined;
}

export function getServerErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const response = error as {
      status?: number;
      body?: { error?: string } | string;
      error?: string;
      message?: string;
    };
    const body = response.body;
    const detail = typeof body === 'object' && body !== null ? body.error : body;
    const serverMessage = detail || response.error;
    if (typeof serverMessage === 'string') {
      return (response.status ? `${response.status}: ` : '') + serverMessage;
    }
    if (typeof response.message === 'string') return response.message;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }
  return String(error);
}

export function withErrorContext(context: string, cause: unknown): Error & { cause: unknown } {
  const error = new Error(`${context}, ${getServerErrorMessage(cause)}`);
  Object.defineProperty(error, 'cause', { value: cause, configurable: true });
  return error as Error & { cause: unknown };
}
