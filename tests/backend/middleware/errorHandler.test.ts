import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../../../backend/src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { AppError, errorHandler } from '../../../backend/src/middleware/errorHandler';
import { logger } from '../../../backend/src/utils/logger';
import { Request, Response, NextFunction } from 'express';

const mockLogger = logger as unknown as {
  error: jest.Mock;
  warn: jest.Mock;
  info: jest.Mock;
};

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    path: '/test',
    method: 'POST',
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn<(code: number) => Response>().mockReturnValue(res as Response);
  res.json = jest.fn<(body: unknown) => Response>().mockReturnValue(res as Response);
  return res as Response;
}

describe('errorHandler middleware', () => {
  const next = jest.fn() as unknown as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns custom statusCode and code for AppError', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      code: 'NOT_FOUND',
    });
  });

  it('does NOT log to logger.error for AppError', () => {
    const err = new AppError('Bad input', 400, 'BAD_REQUEST');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, next);

    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('returns 500 with INTERNAL_ERROR for generic Error', () => {
    const err = new Error('Something broke');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });

  it('logs generic Error to logger.error with path and method', () => {
    const err = new Error('Unexpected failure');
    const req = mockReq({ path: '/api/users', method: 'GET' });
    const res = mockRes();

    errorHandler(err, req, res, next);

    expect(mockLogger.error).toHaveBeenCalledWith(
      { err, path: '/api/users', method: 'GET' },
      'Unhandled error',
    );
  });

  it('AppError instanceof works correctly', () => {
    const err = new AppError('test');

    expect(err instanceof AppError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('AppError uses default statusCode=400 and code=BAD_REQUEST', () => {
    const err = new AppError('Default error');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, next);

    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Default error',
      code: 'BAD_REQUEST',
    });
  });
});
