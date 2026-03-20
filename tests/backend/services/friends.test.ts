import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type AnyFn = (...args: any[]) => any;

// Mock db/connection
const mockQuery = jest.fn<AnyFn>();
const mockExecute = jest.fn<AnyFn>();
const mockWithTransaction = jest.fn<AnyFn>();

jest.mock('../../../backend/src/db/connection', () => ({
  query: mockQuery,
  execute: mockExecute,
  withTransaction: mockWithTransaction,
}));

// Mock presence service
const mockGetPresenceBatch = jest.fn<AnyFn>();
jest.mock('../../../backend/src/services/presence', () => ({
  getPresenceBatch: mockGetPresenceBatch,
}));

import * as friendsService from '../../../backend/src/services/friends';

describe('Friends Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPresenceBatch.mockResolvedValue(new Map());
    mockWithTransaction.mockImplementation(async (fn: AnyFn) => {
      const conn = {
        query: jest.fn<AnyFn>(),
        execute: jest.fn<AnyFn>(),
      };
      return fn(conn);
    });
  });

  describe('sendFriendRequest', () => {
    it('should send a request when user exists and no blocks', async () => {
      // Target user lookup
      mockQuery
        .mockResolvedValueOnce([{ id: 2, username: 'bob' }]) // user lookup
        .mockResolvedValueOnce([]) // block check
        .mockResolvedValueOnce([]) // existing friendship check
        .mockResolvedValueOnce([]) // incoming check
        .mockResolvedValueOnce([{ total: 5 }]); // friend count

      mockExecute.mockResolvedValue({ affectedRows: 1, insertId: 1 });

      const result = await friendsService.sendFriendRequest(1, 'bob');
      expect(result).toBe(2);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO friendships'),
        [1, 2, 'pending'],
      );
    });

    it('should throw when user not found', async () => {
      mockQuery.mockResolvedValueOnce([]); // user not found

      await expect(friendsService.sendFriendRequest(1, 'ghost')).rejects.toThrow('User not found');
    });

    it('should throw when sending to self', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 1, username: 'alice' }]); // self

      await expect(friendsService.sendFriendRequest(1, 'alice')).rejects.toThrow(
        'Cannot send friend request to yourself',
      );
    });

    it('should throw when blocked', async () => {
      mockQuery
        .mockResolvedValueOnce([{ id: 2, username: 'bob' }]) // user lookup
        .mockResolvedValueOnce([{ id: 1 }]); // block exists

      await expect(friendsService.sendFriendRequest(1, 'bob')).rejects.toThrow(
        'Cannot send friend request to this user',
      );
    });

    it('should throw when already friends', async () => {
      mockQuery
        .mockResolvedValueOnce([{ id: 2, username: 'bob' }]) // user lookup
        .mockResolvedValueOnce([]) // no block
        .mockResolvedValueOnce([{ id: 1, status: 'accepted' }]); // already friends

      await expect(friendsService.sendFriendRequest(1, 'bob')).rejects.toThrow('Already friends');
    });

    it('should throw when max friends reached', async () => {
      mockQuery
        .mockResolvedValueOnce([{ id: 2, username: 'bob' }]) // user lookup
        .mockResolvedValueOnce([]) // no block
        .mockResolvedValueOnce([]) // no existing
        .mockResolvedValueOnce([]) // no incoming
        .mockResolvedValueOnce([{ total: 200 }]); // at max

      await expect(friendsService.sendFriendRequest(1, 'bob')).rejects.toThrow(
        'Friend list is full',
      );
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept and create reciprocal row', async () => {
      const connQuery = jest.fn<AnyFn>().mockResolvedValue([[{ id: 1 }]]);
      const connExecute = jest.fn<AnyFn>().mockResolvedValue([{ affectedRows: 1 }]);
      mockWithTransaction.mockImplementation(async (fn: AnyFn) =>
        fn({ query: connQuery, execute: connExecute }),
      );

      await friendsService.acceptFriendRequest(2, 1);

      expect(connQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM friendships'),
        [1, 2, 'pending'],
      );
      expect(connExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE friendships SET status'),
        ['accepted', 1, 2],
      );
      expect(connExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO friendships'),
        [2, 1, 'accepted', 'accepted'],
      );
    });

    it('should throw when no pending request', async () => {
      const connQuery = jest.fn<AnyFn>().mockResolvedValue([[]]);
      mockWithTransaction.mockImplementation(async (fn: AnyFn) =>
        fn({ query: connQuery, execute: jest.fn<AnyFn>() }),
      );

      await expect(friendsService.acceptFriendRequest(2, 1)).rejects.toThrow(
        'No pending friend request found',
      );
    });
  });

  describe('declineFriendRequest', () => {
    it('should delete the pending request', async () => {
      mockExecute.mockResolvedValue({ affectedRows: 1 });

      await friendsService.declineFriendRequest(2, 1);
      expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining('DELETE'), [1, 2, 'pending']);
    });

    it('should throw when no pending request', async () => {
      mockExecute.mockResolvedValue({ affectedRows: 0 });

      await expect(friendsService.declineFriendRequest(2, 1)).rejects.toThrow(
        'No pending friend request found',
      );
    });
  });

  describe('cancelFriendRequest', () => {
    it('should delete outgoing pending request', async () => {
      mockExecute.mockResolvedValue({ affectedRows: 1 });

      await friendsService.cancelFriendRequest(1, 2);
      expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining('DELETE'), [1, 2, 'pending']);
    });
  });

  describe('removeFriend', () => {
    it('should delete both reciprocal rows', async () => {
      const connExecute = jest.fn<AnyFn>().mockResolvedValue([{ affectedRows: 1 }]);
      mockWithTransaction.mockImplementation(async (fn: AnyFn) =>
        fn({ query: jest.fn<AnyFn>(), execute: connExecute }),
      );

      await friendsService.removeFriend(1, 2);

      expect(connExecute).toHaveBeenCalledTimes(2);
      expect(connExecute).toHaveBeenCalledWith(expect.stringContaining('DELETE'), [1, 2]);
      expect(connExecute).toHaveBeenCalledWith(expect.stringContaining('DELETE'), [2, 1]);
    });
  });

  describe('blockUser', () => {
    it('should remove friendship and insert block', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 2 }]); // user exists

      const connExecute = jest.fn<AnyFn>().mockResolvedValue([{ affectedRows: 1 }]);
      mockWithTransaction.mockImplementation(async (fn: AnyFn) =>
        fn({ query: jest.fn<AnyFn>(), execute: connExecute }),
      );

      await friendsService.blockUser(1, 2);

      expect(connExecute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM friendships'),
        [1, 2, 2, 1],
      );
      expect(connExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT IGNORE INTO user_blocks'),
        [1, 2],
      );
    });

    it('should throw when blocking self', async () => {
      await expect(friendsService.blockUser(1, 1)).rejects.toThrow('Cannot block yourself');
    });
  });

  describe('unblockUser', () => {
    it('should delete block row', async () => {
      mockExecute.mockResolvedValue({ affectedRows: 1 });

      await friendsService.unblockUser(1, 2);
      expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining('DELETE'), [1, 2]);
    });
  });

  describe('getFriends', () => {
    it('should return friends with presence data', async () => {
      mockQuery.mockResolvedValueOnce([
        { friend_id: 2, status: 'accepted', created_at: new Date('2026-01-01'), username: 'bob' },
        { friend_id: 3, status: 'accepted', created_at: new Date('2026-01-02'), username: 'carol' },
      ]);
      mockGetPresenceBatch.mockResolvedValue(
        new Map([
          [2, { status: 'in_lobby' }],
        ]),
      );

      const friends = await friendsService.getFriends(1);

      expect(friends).toHaveLength(2);
      expect(friends[0].userId).toBe(2);
      expect(friends[0].activity).toBe('in_lobby');
      expect(friends[1].activity).toBe('offline');
    });
  });

  describe('getFriendIds', () => {
    it('should return array of friend IDs', async () => {
      mockQuery.mockResolvedValueOnce([{ friend_id: 2 }, { friend_id: 3 }]);

      const ids = await friendsService.getFriendIds(1);
      expect(ids).toEqual([2, 3]);
    });
  });

  describe('getPendingRequests', () => {
    it('should return incoming and outgoing requests', async () => {
      mockQuery
        .mockResolvedValueOnce([
          { friend_id: 3, created_at: new Date('2026-01-01'), username: 'carol' },
        ]) // incoming
        .mockResolvedValueOnce([
          { friend_id: 4, created_at: new Date('2026-01-02'), username: 'dave' },
        ]); // outgoing

      const pending = await friendsService.getPendingRequests(1);

      expect(pending.incoming).toHaveLength(1);
      expect(pending.incoming[0].fromUsername).toBe('carol');
      expect(pending.outgoing).toHaveLength(1);
      expect(pending.outgoing[0].fromUsername).toBe('dave');
    });
  });

  describe('areFriends', () => {
    it('should return true when friendship exists', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 1 }]);
      expect(await friendsService.areFriends(1, 2)).toBe(true);
    });

    it('should return false when no friendship', async () => {
      mockQuery.mockResolvedValueOnce([]);
      expect(await friendsService.areFriends(1, 2)).toBe(false);
    });
  });

  describe('isBlocked', () => {
    it('should return true when block exists', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 1 }]);
      expect(await friendsService.isBlocked(1, 2)).toBe(true);
    });

    it('should return false when no block', async () => {
      mockQuery.mockResolvedValueOnce([]);
      expect(await friendsService.isBlocked(1, 2)).toBe(false);
    });
  });

  describe('getBlockedUsers', () => {
    it('should return blocked user list', async () => {
      mockQuery.mockResolvedValueOnce([
        { blocked_id: 5, username: 'eve' },
      ]);

      const blocked = await friendsService.getBlockedUsers(1);
      expect(blocked).toEqual([{ userId: 5, username: 'eve' }]);
    });
  });

  describe('searchUsers', () => {
    it('should return matching users', async () => {
      mockQuery.mockResolvedValueOnce([
        { id: 2, username: 'bob' },
        { id: 3, username: 'bobby' },
      ]);

      const results = await friendsService.searchUsers('bo', 1);
      expect(results).toHaveLength(2);
      expect(results[0].username).toBe('bob');
    });

    it('should return empty for short query', async () => {
      const results = await friendsService.searchUsers('b', 1);
      expect(results).toEqual([]);
    });
  });

  describe('getFriendCount', () => {
    it('should return count', async () => {
      mockQuery.mockResolvedValueOnce([{ total: 42 }]);
      expect(await friendsService.getFriendCount(1)).toBe(42);
    });
  });
});
