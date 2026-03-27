import { CustomMap, CustomMapSummary, TileType, Position } from '@blast-arena/shared';
import { query, execute } from '../db/connection';
import { CustomMapRow } from '../db/types';

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return (value as T) ?? fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rowToMap(row: CustomMapRow): CustomMap {
  const tiles = safeJsonParse<TileType[][]>(row.tiles, []);
  const spawnPoints = safeJsonParse<Position[]>(row.spawn_points, []);
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    mapWidth: row.map_width,
    mapHeight: row.map_height,
    tiles,
    spawnPoints,
    isPublished: !!row.is_published,
    createdBy: row.created_by,
    creatorUsername: row.creator_username,
    playCount: row.play_count,
  };
}

function rowToSummary(row: CustomMapRow): CustomMapSummary {
  const spawnPoints = safeJsonParse<Position[]>(row.spawn_points, []);
  return {
    id: row.id,
    name: row.name,
    mapWidth: row.map_width,
    mapHeight: row.map_height,
    spawnCount: spawnPoints.length,
    isPublished: !!row.is_published,
    createdBy: row.created_by,
    creatorUsername: row.creator_username,
    playCount: row.play_count,
  };
}

export async function listMyMaps(userId: number): Promise<CustomMapSummary[]> {
  const rows = await query<CustomMapRow[]>(
    `SELECT m.*, u.username AS creator_username
     FROM custom_maps m
     JOIN users u ON u.id = m.created_by
     WHERE m.created_by = ?
     ORDER BY m.updated_at DESC`,
    [userId],
  );
  return rows.map(rowToSummary);
}

export async function listPublishedMaps(): Promise<CustomMapSummary[]> {
  const rows = await query<CustomMapRow[]>(
    `SELECT m.*, u.username AS creator_username
     FROM custom_maps m
     JOIN users u ON u.id = m.created_by
     WHERE m.is_published = TRUE
     ORDER BY m.play_count DESC, m.updated_at DESC`,
  );
  return rows.map(rowToSummary);
}

export async function getMap(id: number): Promise<CustomMap | null> {
  const rows = await query<CustomMapRow[]>(
    `SELECT m.*, u.username AS creator_username
     FROM custom_maps m
     JOIN users u ON u.id = m.created_by
     WHERE m.id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  return rowToMap(rows[0]);
}

export async function createMap(
  data: {
    name: string;
    description?: string;
    mapWidth: number;
    mapHeight: number;
    tiles: TileType[][];
    spawnPoints: Position[];
    isPublished?: boolean;
  },
  createdBy: number,
): Promise<number> {
  const result = await execute(
    `INSERT INTO custom_maps (name, description, map_width, map_height, tiles, spawn_points, is_published, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.description || '',
      data.mapWidth,
      data.mapHeight,
      JSON.stringify(data.tiles),
      JSON.stringify(data.spawnPoints),
      data.isPublished ?? false,
      createdBy,
    ],
  );
  return result.insertId;
}

export async function updateMap(
  id: number,
  data: {
    name: string;
    description?: string;
    mapWidth: number;
    mapHeight: number;
    tiles: TileType[][];
    spawnPoints: Position[];
    isPublished?: boolean;
  },
  userId: number,
): Promise<boolean> {
  const result = await execute(
    `UPDATE custom_maps
     SET name = ?, description = ?, map_width = ?, map_height = ?, tiles = ?, spawn_points = ?, is_published = ?
     WHERE id = ? AND created_by = ?`,
    [
      data.name,
      data.description || '',
      data.mapWidth,
      data.mapHeight,
      JSON.stringify(data.tiles),
      JSON.stringify(data.spawnPoints),
      data.isPublished ?? false,
      id,
      userId,
    ],
  );
  return result.affectedRows > 0;
}

export async function deleteMap(id: number, userId: number): Promise<boolean> {
  const result = await execute('DELETE FROM custom_maps WHERE id = ? AND created_by = ?', [
    id,
    userId,
  ]);
  return result.affectedRows > 0;
}

export async function incrementPlayCount(id: number): Promise<void> {
  await execute('UPDATE custom_maps SET play_count = play_count + 1 WHERE id = ?', [id]);
}

export async function getMapName(id: number): Promise<string | null> {
  const rows = await query<CustomMapRow[]>('SELECT name FROM custom_maps WHERE id = ?', [id]);
  return rows.length > 0 ? rows[0].name : null;
}
