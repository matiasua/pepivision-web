import { describe, expect, it } from 'vitest';
import { AppError, NotFoundError, ValidationError, toErrorResponse } from '@/lib/errors';

describe('lib/errors', () => {
  it('maps a NotFoundError to a 404 with its own message', () => {
    const result = toErrorResponse(new NotFoundError('Producto no encontrado'));
    expect(result).toEqual({ statusCode: 404, message: 'Producto no encontrado' });
  });

  it('maps a ValidationError to a 400 with its own message', () => {
    const result = toErrorResponse(new ValidationError('Correo inválido'));
    expect(result).toEqual({ statusCode: 400, message: 'Correo inválido' });
  });

  it('hides the message of a non-exposed AppError', () => {
    const result = toErrorResponse(new AppError('detalle interno sensible', 500, false));
    expect(result).toEqual({ statusCode: 500, message: 'Error interno' });
  });

  it('maps an unknown thrown value to a generic 500', () => {
    const result = toErrorResponse(new Error('algo explotó'));
    expect(result).toEqual({ statusCode: 500, message: 'Error interno' });
  });
});
