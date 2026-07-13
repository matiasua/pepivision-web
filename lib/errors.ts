// Base error handling. Domain/module code should throw AppError (or a
// subclass) for expected failure cases, so API routes can map it to a
// sensible HTTP status instead of leaking a generic 500 + stack trace.
export class AppError extends Error {
  readonly statusCode: number;
  readonly expose: boolean;

  constructor(message: string, statusCode = 500, expose = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.expose = expose;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Datos inválidos') {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/** Maps any thrown value to a safe (status, message) pair for an API response. */
export function toErrorResponse(error: unknown): { statusCode: number; message: string } {
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, message: error.expose ? error.message : 'Error interno' };
  }
  return { statusCode: 500, message: 'Error interno' };
}
