import { query, execute } from '../db/connection';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@blast-arena/shared';

export async function listUsers(page: number = 1, limit: number = 20, search?: string) {
  const offset = (page - 1) * limit;
  let sql = `
    SELECT u.id, u.username, u.email, u.display_name, u.role, u.email_verified,
           u.is_banned, u.ban_reason, u.last_login, u.created_at,
           COALESCE(s.total_matches, 0) as total_matches,
           COALESCE(s.total_wins, 0) as total_wins
    FROM users u
    LEFT JOIN user_stats s ON s.user_id = u.id
  `;
  const params: any[] = [];

  if (search) {
    sql += ' WHERE u.username LIKE ? OR u.email LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = await query(sql, params);

  let countSql = 'SELECT COUNT(*) as total FROM users';
  const countParams: any[] = [];
  if (search) {
    countSql += ' WHERE username LIKE ? OR email LIKE ?';
    countParams.push(`%${search}%`, `%${search}%`);
  }
  const countRows = await query(countSql, countParams);
  const total = (countRows[0] as any).total;

  return { users: rows, total, page, limit };
}

export async function banUser(adminId: number, userId: number, banned: boolean, reason?: string): Promise<void> {
  await execute(
    'UPDATE users SET is_banned = ?, ban_reason = ? WHERE id = ?',
    [banned, banned ? (reason || null) : null, userId]
  );

  await execute(
    'INSERT INTO admin_actions (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
    [adminId, banned ? 'ban' : 'unban', 'user', userId, reason || null]
  );

  if (banned) {
    // Revoke all refresh tokens
    await execute('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?', [userId]);
  }
}

export async function changeUserRole(adminId: number, userId: number, role: UserRole): Promise<void> {
  await execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

  await execute(
    'INSERT INTO admin_actions (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
    [adminId, 'role_change', 'user', userId, role]
  );
}

export async function getServerStats() {
  const [userCount] = await query('SELECT COUNT(*) as total FROM users');
  const [activeCount] = await query(
    'SELECT COUNT(*) as total FROM users WHERE last_login > DATE_SUB(NOW(), INTERVAL 24 HOUR)'
  );
  const [matchCount] = await query('SELECT COUNT(*) as total FROM matches');

  return {
    totalUsers: (userCount as any).total,
    activeUsers24h: (activeCount as any).total,
    totalMatches: (matchCount as any).total,
    activeRooms: 0, // Will be populated from Redis
    activePlayers: 0,
  };
}

export async function getMatchHistory(page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit;
  const rows = await query(
    `SELECT m.id, m.room_code, m.game_mode, m.status, m.duration,
            m.started_at, m.finished_at,
            u.username as winner_username,
            (SELECT COUNT(*) FROM match_players WHERE match_id = m.id) as player_count
     FROM matches m
     LEFT JOIN users u ON u.id = m.winner_id
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const [countRow] = await query('SELECT COUNT(*) as total FROM matches');
  return { matches: rows, total: (countRow as any).total, page, limit };
}
