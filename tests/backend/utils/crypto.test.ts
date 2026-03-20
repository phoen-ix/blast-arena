import { describe, it, expect, jest, beforeEach } from '@jest/globals';

let callCount = 0;

jest.mock('bcrypt', () => ({
  hash: jest.fn(async () => {
    callCount++;
    return `$2b$12$mocksalt${callCount}hashvalue${callCount}`;
  }),
  compare: jest.fn(async () => true),
}));

import bcrypt from 'bcrypt';
import { hashPassword, comparePassword, generateToken, hashToken } from '../../../backend/src/utils/crypto';

const mockHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
const mockCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

describe('Crypto Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callCount = 0;
    mockHash.mockImplementation(async () => {
      callCount++;
      return `$2b$12$mocksalt${callCount}hashvalue${callCount}`;
    });
    mockCompare.mockImplementation(async () => true);
  });

  describe('hashPassword', () => {
    it('should return a bcrypt hash with $2b$ prefix', async () => {
      const hash = await hashPassword('testpassword');
      expect(hash).toMatch(/^\$2b\$/);
      expect(mockHash).toHaveBeenCalledWith('testpassword', 12);
    });

    it('should return different hashes for the same input due to salt', async () => {
      const hash1 = await hashPassword('samepassword');
      const hash2 = await hashPassword('samepassword');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for a correct password', async () => {
      mockCompare.mockImplementation(async () => true);
      const result = await comparePassword('correcthorse', '$2b$12$somehash');
      expect(result).toBe(true);
      expect(mockCompare).toHaveBeenCalledWith('correcthorse', '$2b$12$somehash');
    });

    it('should return false for a wrong password', async () => {
      mockCompare.mockImplementation(async () => false);
      const result = await comparePassword('wrongpassword', '$2b$12$somehash');
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should return a 64-character hex string', () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should return unique values per call', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should return a consistent hash for the same input', () => {
      const token = 'some-token-value';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should return a different hash for different input', () => {
      const hash1 = hashToken('token-a');
      const hash2 = hashToken('token-b');
      expect(hash1).not.toBe(hash2);
    });
  });
});
