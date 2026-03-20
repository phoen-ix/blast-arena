import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type AnyFn = (...args: any[]) => any;

const store = new Map<string, string>();

const mockRedis = {
  get: jest.fn<AnyFn>((key: string) => Promise.resolve(store.get(key) || null)),
  set: jest.fn<AnyFn>((...args: unknown[]) => {
    store.set(args[0] as string, args[1] as string);
    return Promise.resolve('OK');
  }),
  del: jest.fn<AnyFn>((key: string) => {
    store.delete(key);
    return Promise.resolve(1);
  }),
  eval: jest.fn<AnyFn>(),
  pipeline: jest.fn<AnyFn>(() => {
    const ops: Array<() => void> = [];
    const p = {
      set: jest.fn<AnyFn>((...args: unknown[]) => {
        ops.push(() => store.set(args[0] as string, args[1] as string));
        return p;
      }),
      del: jest.fn<AnyFn>((key: string) => {
        ops.push(() => store.delete(key));
        return p;
      }),
      exec: jest.fn<AnyFn>(() => {
        ops.forEach((op) => op());
        return Promise.resolve(ops.map(() => [null, 'OK']));
      }),
    };
    return p;
  }),
};

jest.mock('../../../backend/src/db/redis', () => ({
  getRedis: () => mockRedis,
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

import * as partyService from '../../../backend/src/services/party';

describe('Party Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.clear();
  });

  describe('createParty', () => {
    it('should create a party and store in Redis', async () => {
      const party = await partyService.createParty(1, 'alice');

      expect(party.id).toBe('test-uuid-1234');
      expect(party.leaderId).toBe(1);
      expect(party.members).toHaveLength(1);
      expect(party.members[0]).toEqual({ userId: 1, username: 'alice' });
      expect(store.has('party:test-uuid-1234')).toBe(true);
      expect(store.has('player:party:1')).toBe(true);
    });

    it('should throw when already in a party', async () => {
      store.set('player:party:1', 'existing-party');

      await expect(partyService.createParty(1, 'alice')).rejects.toThrow('Already in a party');
    });
  });

  describe('getParty', () => {
    it('should return parsed party', async () => {
      const party = { id: 'p1', leaderId: 1, members: [{ userId: 1, username: 'alice' }], createdAt: '2026-01-01' };
      store.set('party:p1', JSON.stringify(party));

      const result = await partyService.getParty('p1');
      expect(result).toEqual(party);
    });

    it('should return null when not found', async () => {
      const result = await partyService.getParty('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getPlayerParty', () => {
    it('should return party ID', async () => {
      store.set('player:party:1', 'p1');

      const result = await partyService.getPlayerParty(1);
      expect(result).toBe('p1');
    });

    it('should return null when not in party', async () => {
      const result = await partyService.getPlayerParty(999);
      expect(result).toBeNull();
    });
  });

  describe('joinParty', () => {
    it('should join via Lua script and return updated party', async () => {
      const party = {
        id: 'p1',
        leaderId: 1,
        members: [
          { userId: 1, username: 'alice' },
          { userId: 2, username: 'bob' },
        ],
        createdAt: '2026-01-01',
      };
      mockRedis.eval.mockResolvedValue(JSON.stringify(party));

      const result = await partyService.joinParty('p1', 2, 'bob');
      expect(result.members).toHaveLength(2);
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('should throw when already in another party', async () => {
      store.set('player:party:2', 'other-party');

      await expect(partyService.joinParty('p1', 2, 'bob')).rejects.toThrow(
        'Already in another party',
      );
    });

    it('should throw when Lua script fails', async () => {
      mockRedis.eval.mockResolvedValue(null);

      await expect(partyService.joinParty('p1', 2, 'bob')).rejects.toThrow(
        'Failed to join party',
      );
    });
  });

  describe('leaveParty', () => {
    it('should remove member and return left', async () => {
      const party = {
        id: 'p1',
        leaderId: 1,
        members: [
          { userId: 1, username: 'alice' },
          { userId: 2, username: 'bob' },
        ],
        createdAt: '2026-01-01',
      };
      store.set('party:p1', JSON.stringify(party));
      store.set('player:party:2', 'p1');

      const result = await partyService.leaveParty('p1', 2);
      expect(result).toBe('left');
    });

    it('should disband when leader leaves', async () => {
      const party = {
        id: 'p1',
        leaderId: 1,
        members: [
          { userId: 1, username: 'alice' },
          { userId: 2, username: 'bob' },
        ],
        createdAt: '2026-01-01',
      };
      store.set('party:p1', JSON.stringify(party));
      store.set('player:party:1', 'p1');

      const result = await partyService.leaveParty('p1', 1);
      expect(result).toBe('disbanded');
    });

    it('should disband when last member leaves', async () => {
      const party = {
        id: 'p1',
        leaderId: 1,
        members: [{ userId: 1, username: 'alice' }],
        createdAt: '2026-01-01',
      };
      store.set('party:p1', JSON.stringify(party));
      store.set('player:party:1', 'p1');

      const result = await partyService.leaveParty('p1', 1);
      expect(result).toBe('disbanded');
    });

    it('should return disbanded when party not found', async () => {
      store.set('player:party:1', 'nonexistent');

      const result = await partyService.leaveParty('nonexistent', 1);
      expect(result).toBe('disbanded');
    });
  });

  describe('kickFromParty', () => {
    it('should remove target member', async () => {
      const party = {
        id: 'p1',
        leaderId: 1,
        members: [
          { userId: 1, username: 'alice' },
          { userId: 2, username: 'bob' },
        ],
        createdAt: '2026-01-01',
      };
      store.set('party:p1', JSON.stringify(party));

      const result = await partyService.kickFromParty('p1', 1, 2);
      expect(result.members).toHaveLength(1);
      expect(result.members[0].userId).toBe(1);
    });

    it('should throw when not leader', async () => {
      const party = {
        id: 'p1',
        leaderId: 1,
        members: [
          { userId: 1, username: 'alice' },
          { userId: 2, username: 'bob' },
        ],
        createdAt: '2026-01-01',
      };
      store.set('party:p1', JSON.stringify(party));

      await expect(partyService.kickFromParty('p1', 2, 1)).rejects.toThrow(
        'Only the party leader can kick members',
      );
    });

    it('should throw when kicking self', async () => {
      const party = {
        id: 'p1',
        leaderId: 1,
        members: [{ userId: 1, username: 'alice' }],
        createdAt: '2026-01-01',
      };
      store.set('party:p1', JSON.stringify(party));

      await expect(partyService.kickFromParty('p1', 1, 1)).rejects.toThrow('Cannot kick yourself');
    });

    it('should throw when party not found', async () => {
      await expect(partyService.kickFromParty('nonexistent', 1, 2)).rejects.toThrow(
        'Party not found',
      );
    });

    it('should throw when target not in party', async () => {
      const party = {
        id: 'p1',
        leaderId: 1,
        members: [{ userId: 1, username: 'alice' }],
        createdAt: '2026-01-01',
      };
      store.set('party:p1', JSON.stringify(party));

      await expect(partyService.kickFromParty('p1', 1, 99)).rejects.toThrow(
        'User is not in the party',
      );
    });
  });

  describe('disbandParty', () => {
    it('should delete party and all player keys', async () => {
      const party = {
        id: 'p1',
        leaderId: 1,
        members: [
          { userId: 1, username: 'alice' },
          { userId: 2, username: 'bob' },
        ],
        createdAt: '2026-01-01',
      };
      store.set('party:p1', JSON.stringify(party));
      store.set('player:party:1', 'p1');
      store.set('player:party:2', 'p1');

      const memberIds = await partyService.disbandParty('p1');
      expect(memberIds).toEqual([1, 2]);
    });

    it('should return empty array when party not found', async () => {
      const memberIds = await partyService.disbandParty('nonexistent');
      expect(memberIds).toEqual([]);
    });
  });

  describe('invite management', () => {
    it('should create and retrieve invite', async () => {
      const inviteId = await partyService.createInvite(2, {
        type: 'party',
        fromUserId: 1,
        fromUsername: 'alice',
        partyId: 'p1',
      });

      expect(inviteId).toBe('test-uuid-1234');
      expect(store.has('invite:2:test-uuid-1234')).toBe(true);
    });

    it('should get invite by ID', async () => {
      const inviteData = {
        inviteId: 'inv1',
        type: 'party',
        fromUserId: 1,
        fromUsername: 'alice',
      };
      store.set('invite:2:inv1', JSON.stringify(inviteData));

      const result = await partyService.getInvite(2, 'inv1');
      expect(result.type).toBe('party');
    });

    it('should return null for expired/missing invite', async () => {
      const result = await partyService.getInvite(2, 'nonexistent');
      expect(result).toBeNull();
    });

    it('should remove invite', async () => {
      store.set('invite:2:inv1', JSON.stringify({ type: 'party' }));

      await partyService.removeInvite(2, 'inv1');
      expect(store.has('invite:2:inv1')).toBe(false);
    });
  });
});
