import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { ReplayData, ReplayListItem, CampaignReplayListItem } from '@blast-arena/shared';
import { query, execute } from '../db/connection';
import { MatchRow, CountRow } from '../db/types';
import { RowDataPacket } from 'mysql2';
import { logger } from '../utils/logger';

const gunzip = promisify(zlib.gunzip);
const REPLAY_DIR = process.env.REPLAY_DIR || '/app/replays';

export async function listReplays(
  page: number = 1,
  limit: number = 20,
): Promise<{ replays: ReplayListItem[]; total: number }> {
  try {
    await fs.promises.access(REPLAY_DIR);
  } catch {
    return { replays: [], total: 0 };
  }

  const allFiles = await fs.promises.readdir(REPLAY_DIR);
  const files = allFiles.filter((f) => f.endsWith('.replay.json.gz'));

  // Parse match IDs from filenames
  const fileMap = new Map<number, { filename: string; sizeKB: number }>();
  const statPromises: Promise<void>[] = [];
  for (const file of files) {
    const match = file.match(/^(\d+)_/);
    if (match) {
      const matchId = parseInt(match[1]);
      statPromises.push(
        fs.promises.stat(path.join(REPLAY_DIR, file)).then((stat) => {
          fileMap.set(matchId, { filename: file, sizeKB: Math.round(stat.size / 1024) });
        }),
      );
    }
  }
  await Promise.all(statPromises);

  if (fileMap.size === 0) {
    return { replays: [], total: 0 };
  }

  const matchIds = Array.from(fileMap.keys());
  const placeholders = matchIds.map(() => '?').join(',');

  const rows = await query<MatchRow[]>(
    `SELECT m.id, m.room_code, m.game_mode, m.duration,
            (SELECT COUNT(*) FROM match_players mp WHERE mp.match_id = m.id) as player_count,
            u.username as winner_username, m.started_at
     FROM matches m
     LEFT JOIN users u ON m.winner_id = u.id
     WHERE m.id IN (${placeholders})
     ORDER BY m.started_at DESC`,
    matchIds,
  );

  const total = rows.length;
  const offset = (page - 1) * limit;
  const paged = rows.slice(offset, offset + limit);

  const replays: ReplayListItem[] = paged.map((row) => {
    const file = fileMap.get(row.id)!;
    return {
      matchId: row.id,
      roomCode: row.room_code,
      gameMode: row.game_mode,
      duration: row.duration || 0,
      playerCount: row.player_count,
      winnerName: row.winner_username,
      createdAt:
        row.started_at instanceof Date ? row.started_at.toISOString() : String(row.started_at),
      fileSizeKB: file.sizeKB,
    };
  });

  return { replays, total };
}

export async function getReplay(matchId: number): Promise<ReplayData | null> {
  const filePath = findReplayFile(matchId);
  if (!filePath) return null;

  try {
    const compressed = fs.readFileSync(filePath);
    const decompressed = await gunzip(compressed);
    return JSON.parse(decompressed.toString()) as ReplayData;
  } catch (err) {
    logger.error({ err, matchId }, 'Failed to read replay file');
    return null;
  }
}

export function deleteReplay(matchId: number): boolean {
  const filePath = findReplayFile(matchId);
  if (!filePath) return false;

  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    logger.error({ err, matchId }, 'Failed to delete replay file');
    return false;
  }
}

export function hasReplay(matchId: number): boolean {
  return findReplayFile(matchId) !== null;
}

/**
 * Get just the placements from a replay file (lightweight read for match detail).
 * Returns null if no replay exists.
 */
export async function getReplayPlacements(
  matchId: number,
): Promise<ReplayData['gameOver']['placements'] | null> {
  const filePath = findReplayFile(matchId);
  if (!filePath) return null;

  try {
    const compressed = fs.readFileSync(filePath);
    const decompressed = await gunzip(compressed);
    const data = JSON.parse(decompressed.toString()) as ReplayData;
    return data.gameOver?.placements || null;
  } catch (err) {
    logger.error({ err, matchId }, 'Failed to read replay placements');
    return null;
  }
}

function findReplayFile(matchId: number): string | null {
  if (!fs.existsSync(REPLAY_DIR)) return null;

  const files = fs.readdirSync(REPLAY_DIR);
  const prefix = `${matchId}_`;
  const file = files.find((f) => f.startsWith(prefix) && f.endsWith('.replay.json.gz'));
  if (!file) return null;

  return path.join(REPLAY_DIR, file);
}

// --- Campaign Replays ---

export async function saveCampaignReplayRecord(record: {
  sessionId: string;
  userId: number;
  levelId: number;
  duration: number;
  result: 'completed' | 'failed';
  stars: number;
  coopMode: boolean;
  buddyMode: boolean;
  filename: string;
}): Promise<void> {
  await execute(
    `INSERT INTO campaign_replays (session_id, user_id, level_id, duration, result, stars, coop_mode, buddy_mode, filename)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.sessionId,
      record.userId,
      record.levelId,
      record.duration,
      record.result,
      record.stars,
      record.coopMode,
      record.buddyMode,
      record.filename,
    ],
  );
}

interface CampaignReplayRow extends RowDataPacket {
  session_id: string;
  level_id: number;
  level_name: string;
  world_name: string;
  user_id: number;
  username: string;
  coop_mode: boolean | number;
  buddy_mode: boolean | number;
  duration: number;
  result: 'completed' | 'failed';
  stars: number;
  filename: string;
  created_at: Date | string;
}

export async function listCampaignReplays(
  page: number = 1,
  limit: number = 20,
  userId?: number,
  levelId?: number,
): Promise<{ replays: CampaignReplayListItem[]; total: number }> {
  const conditions: string[] = [];
  const params: (number | string)[] = [];

  if (userId) {
    conditions.push('cr.user_id = ?');
    params.push(userId);
  }
  if (levelId) {
    conditions.push('cr.level_id = ?');
    params.push(levelId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRows = await query<CountRow[]>(
    `SELECT COUNT(*) as total FROM campaign_replays cr ${where}`,
    params,
  );
  const total = countRows[0]?.total ?? 0;

  const offset = (page - 1) * limit;
  const rows = await query<CampaignReplayRow[]>(
    `SELECT cr.session_id, cr.level_id, cl.name as level_name, cw.name as world_name,
            cr.user_id, u.username, cr.coop_mode, cr.buddy_mode, cr.duration,
            cr.result, cr.stars, cr.filename, cr.created_at
     FROM campaign_replays cr
     JOIN campaign_levels cl ON cr.level_id = cl.id
     JOIN campaign_worlds cw ON cl.world_id = cw.id
     JOIN users u ON cr.user_id = u.id
     ${where}
     ORDER BY cr.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  // Look up file sizes
  const replays: CampaignReplayListItem[] = [];
  for (const row of rows) {
    let fileSizeKB = 0;
    try {
      const stat = await fs.promises.stat(path.join(REPLAY_DIR, row.filename));
      fileSizeKB = Math.round(stat.size / 1024);
    } catch {
      // File may have been deleted
    }
    replays.push({
      sessionId: row.session_id,
      levelId: row.level_id,
      levelName: row.level_name,
      worldName: row.world_name,
      userId: row.user_id,
      username: row.username,
      coopMode: !!row.coop_mode,
      buddyMode: !!row.buddy_mode,
      duration: row.duration,
      result: row.result,
      stars: row.stars,
      createdAt:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      fileSizeKB,
    });
  }

  return { replays, total };
}

export async function getCampaignReplay(sessionId: string): Promise<ReplayData | null> {
  const filePath = findCampaignReplayFile(sessionId);
  if (!filePath) return null;

  try {
    const compressed = await fs.promises.readFile(filePath);
    const decompressed = await gunzip(compressed);
    return JSON.parse(decompressed.toString()) as ReplayData;
  } catch (err) {
    logger.error({ err, sessionId }, 'Failed to read campaign replay file');
    return null;
  }
}

export async function deleteCampaignReplay(sessionId: string): Promise<boolean> {
  const filePath = findCampaignReplayFile(sessionId);
  if (filePath) {
    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      logger.error({ err, sessionId }, 'Failed to delete campaign replay file');
    }
  }
  await execute(`DELETE FROM campaign_replays WHERE session_id = ?`, [sessionId]);
  return true;
}

function findCampaignReplayFile(sessionId: string): string | null {
  if (!fs.existsSync(REPLAY_DIR)) return null;

  const files = fs.readdirSync(REPLAY_DIR);
  const target = `campaign_${sessionId}.replay.json.gz`;
  const file = files.find((f) => f === target);
  if (!file) return null;

  return path.join(REPLAY_DIR, file);
}
