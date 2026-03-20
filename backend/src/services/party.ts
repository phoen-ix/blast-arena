import { getRedis } from '../db/redis';
import { Party, MAX_PARTY_SIZE } from '@blast-arena/shared';
import { v4 as uuidv4 } from 'uuid';

const PARTY_TTL = 3600; // 1 hour
const PARTY_KEY_PREFIX = 'party:';
const PLAYER_PARTY_PREFIX = 'player:party:';

// Lua script for atomic party join (prevents race conditions)
const JOIN_PARTY_LUA = `
  local partyKey = KEYS[1]
  local playerKey = KEYS[2]
  local maxSize = tonumber(ARGV[1])
  local userId = ARGV[2]
  local username = ARGV[3]
  local ttl = tonumber(ARGV[4])

  local partyData = redis.call('GET', partyKey)
  if not partyData then
    return {err = 'Party not found'}
  end

  local party = cjson.decode(partyData)
  if #party.members >= maxSize then
    return {err = 'Party is full'}
  end

  for _, m in ipairs(party.members) do
    if tostring(m.userId) == userId then
      return {err = 'Already in party'}
    end
  end

  table.insert(party.members, {userId = tonumber(userId), username = username})
  redis.call('SET', partyKey, cjson.encode(party), 'EX', ttl)
  redis.call('SET', playerKey, party.id, 'EX', ttl)
  return cjson.encode(party)
`;

export async function createParty(userId: number, username: string): Promise<Party> {
  const redis = getRedis();

  // Check not already in a party
  const existing = await redis.get(`${PLAYER_PARTY_PREFIX}${userId}`);
  if (existing) {
    throw new Error('Already in a party');
  }

  const partyId = uuidv4();
  const party: Party = {
    id: partyId,
    leaderId: userId,
    members: [{ userId, username }],
    createdAt: new Date().toISOString(),
  };

  const pipeline = redis.pipeline();
  pipeline.set(`${PARTY_KEY_PREFIX}${partyId}`, JSON.stringify(party), 'EX', PARTY_TTL);
  pipeline.set(`${PLAYER_PARTY_PREFIX}${userId}`, partyId, 'EX', PARTY_TTL);
  await pipeline.exec();

  return party;
}

export async function getParty(partyId: string): Promise<Party | null> {
  const redis = getRedis();
  const raw = await redis.get(`${PARTY_KEY_PREFIX}${partyId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Party;
  } catch {
    return null;
  }
}

export async function getPlayerParty(userId: number): Promise<string | null> {
  const redis = getRedis();
  return redis.get(`${PLAYER_PARTY_PREFIX}${userId}`);
}

export async function joinParty(
  partyId: string,
  userId: number,
  username: string,
): Promise<Party> {
  const redis = getRedis();

  // Check player not already in a different party
  const existingParty = await redis.get(`${PLAYER_PARTY_PREFIX}${userId}`);
  if (existingParty && existingParty !== partyId) {
    throw new Error('Already in another party');
  }

  const result = await redis.eval(
    JOIN_PARTY_LUA,
    2,
    `${PARTY_KEY_PREFIX}${partyId}`,
    `${PLAYER_PARTY_PREFIX}${userId}`,
    MAX_PARTY_SIZE,
    userId.toString(),
    username,
    PARTY_TTL,
  );

  if (typeof result === 'string') {
    return JSON.parse(result) as Party;
  }

  throw new Error('Failed to join party');
}

export async function leaveParty(partyId: string, userId: number): Promise<'left' | 'disbanded'> {
  const redis = getRedis();
  const party = await getParty(partyId);
  if (!party) {
    await redis.del(`${PLAYER_PARTY_PREFIX}${userId}`);
    return 'disbanded';
  }

  // Remove member
  party.members = party.members.filter((m) => m.userId !== userId);
  await redis.del(`${PLAYER_PARTY_PREFIX}${userId}`);

  // If leader left or no members remain, disband
  if (party.members.length === 0 || party.leaderId === userId) {
    await disbandParty(partyId);
    return 'disbanded';
  }

  // Update party
  await redis.set(`${PARTY_KEY_PREFIX}${partyId}`, JSON.stringify(party), 'EX', PARTY_TTL);
  return 'left';
}

export async function kickFromParty(
  partyId: string,
  leaderId: number,
  targetId: number,
): Promise<Party> {
  const party = await getParty(partyId);
  if (!party) throw new Error('Party not found');
  if (party.leaderId !== leaderId) throw new Error('Only the party leader can kick members');
  if (targetId === leaderId) throw new Error('Cannot kick yourself');

  const memberExists = party.members.some((m) => m.userId === targetId);
  if (!memberExists) throw new Error('User is not in the party');

  party.members = party.members.filter((m) => m.userId !== targetId);

  const redis = getRedis();
  await redis.del(`${PLAYER_PARTY_PREFIX}${targetId}`);
  await redis.set(`${PARTY_KEY_PREFIX}${partyId}`, JSON.stringify(party), 'EX', PARTY_TTL);

  return party;
}

export async function disbandParty(partyId: string): Promise<number[]> {
  const redis = getRedis();
  const party = await getParty(partyId);
  if (!party) return [];

  const memberIds = party.members.map((m) => m.userId);
  const pipeline = redis.pipeline();
  pipeline.del(`${PARTY_KEY_PREFIX}${partyId}`);
  for (const member of party.members) {
    pipeline.del(`${PLAYER_PARTY_PREFIX}${member.userId}`);
  }
  await pipeline.exec();

  return memberIds;
}

// Invite management via Redis with TTL
const INVITE_PREFIX = 'invite:';
const INVITE_TTL = 60; // 60 seconds

export async function createInvite(
  recipientId: number,
  invite: {
    type: 'party' | 'room';
    fromUserId: number;
    fromUsername: string;
    partyId?: string;
    roomCode?: string;
    roomName?: string;
  },
): Promise<string> {
  const redis = getRedis();
  const inviteId = uuidv4();
  const inviteData = {
    inviteId,
    ...invite,
    createdAt: new Date().toISOString(),
  };
  await redis.set(
    `${INVITE_PREFIX}${recipientId}:${inviteId}`,
    JSON.stringify(inviteData),
    'EX',
    INVITE_TTL,
  );
  return inviteId;
}

export async function getInvite(
  recipientId: number,
  inviteId: string,
): Promise<any | null> {
  const redis = getRedis();
  const raw = await redis.get(`${INVITE_PREFIX}${recipientId}:${inviteId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function removeInvite(recipientId: number, inviteId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`${INVITE_PREFIX}${recipientId}:${inviteId}`);
}
