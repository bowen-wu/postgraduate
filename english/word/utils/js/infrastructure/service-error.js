export class ServiceError extends Error {
  constructor(code, message, cause = null) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.cause = cause;
  }
}

export function toServiceError(code, message, cause = null) {
  if (cause instanceof ServiceError) return cause;
  return new ServiceError(code, message, cause);
}
