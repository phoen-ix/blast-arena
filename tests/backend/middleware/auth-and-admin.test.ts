import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockVerify = jest.fn();
jest.mock('jsonwebtoken', () => ({
  verify: mockVerify,
}));

jest.mock('../../../backend/src/config', () => ({
  getConfig: () => ({
    JWT_SECRET: 'test-secret-key-min16',
  }),
}));

import { authMiddleware } from '../../../backend/src/middleware/auth';
import {
  staffMiddleware,
  adminOnlyMiddleware,
  adminMiddleware,
} from '../../../backend/src/middleware/admin';

function createMockRes() {
  const res = {
    status: jest.fn().mockReturnThis() as jest.Mock,
    json: jest.fn() as jest.Mock,
  };
  return res;
}

describe('Auth & Admin Middleware', () => {
  let mockReq: any;
  let mockRes: ReturnType<typeof createMockRes>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { headers: {} };
    mockRes = createMockRes();
    mockNext = jest.fn();
  });

  describe('authMiddleware', () => {
    it('should set req.user and call next() on valid Bearer token', () => {
      const payload = { userId: 1, username: 'admin', role: 'admin' };
      mockVerify.mockReturnValue(payload);
      mockReq.headers.authorization = 'Bearer valid-token';

      authMiddleware(mockReq, mockRes as any, mockNext);

      expect(mockReq.user).toEqual(payload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is missing', () => {
      authMiddleware(mockReq, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'UNAUTHORIZED' }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 on malformed token without Bearer prefix', () => {
      mockReq.headers.authorization = 'Basic some-token';

      authMiddleware(mockReq, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when jwt.verify throws (expired/invalid)', () => {
      mockReq.headers.authorization = 'Bearer expired-token';
      mockVerify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      authMiddleware(mockReq, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INVALID_TOKEN' }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() on success without sending a response', () => {
      const payload = { userId: 5, username: 'player', role: 'user' };
      mockVerify.mockReturnValue(payload);
      mockReq.headers.authorization = 'Bearer good-token';

      authMiddleware(mockReq, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('staffMiddleware', () => {
    it('should allow admin role and call next()', () => {
      mockReq.user = { userId: 1, username: 'admin', role: 'admin' };

      staffMiddleware(mockReq, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow moderator role and call next()', () => {
      mockReq.user = { userId: 2, username: 'mod', role: 'moderator' };

      staffMiddleware(mockReq, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 403 for user role', () => {
      mockReq.user = { userId: 3, username: 'player', role: 'user' };

      staffMiddleware(mockReq, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'FORBIDDEN' }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when req.user is undefined', () => {
      mockReq.user = undefined;

      staffMiddleware(mockReq, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('adminOnlyMiddleware', () => {
    it('should allow admin role and call next()', () => {
      mockReq.user = { userId: 1, username: 'admin', role: 'admin' };

      adminOnlyMiddleware(mockReq, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 403 for moderator role', () => {
      mockReq.user = { userId: 2, username: 'mod', role: 'moderator' };

      adminOnlyMiddleware(mockReq, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'FORBIDDEN' }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 for user role', () => {
      mockReq.user = { userId: 3, username: 'player', role: 'user' };

      adminOnlyMiddleware(mockReq, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('adminMiddleware', () => {
    it('should be the same function reference as staffMiddleware', () => {
      expect(adminMiddleware).toBe(staffMiddleware);
    });
  });
});
