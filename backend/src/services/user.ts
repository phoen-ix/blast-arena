import { query, execute } from '../db/connection';
import { AppError } from '../middleware/errorHandler';

export async function getUserProfile(userId: number) {
  const rows = await query(
    `SELECT u.id, u.username, u.email, u.display_name, u.role, u.email_verified, u.created_at,
            s.total_matches, s.total_wins, s.total_kills, s.total_deaths,
            s.total_bombs, s.total_powerups, s.total_playtime,
            s.win_streak, s.best_win_streak, s.elo_rating
     FROM users u
     LEFT JOIN user_stats s ON s.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );

  if (rows.length === 0) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const row = rows[0] as any;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    emailVerified: row.email_verified,
    createdAt: row.created_at,
    stats: {
      totalMatches: row.total_matches || 0,
      totalWins: row.total_wins || 0,
      totalKills: row.total_kills || 0,
      totalDeaths: row.total_deaths || 0,
      totalBombs: row.total_bombs || 0,
      totalPowerups: row.total_powerups || 0,
      totalPlaytime: row.total_playtime || 0,
      winStreak: row.win_streak || 0,
      bestWinStreak: row.best_win_streak || 0,
      eloRating: row.elo_rating || 1000,
    },
  };
}

export async function updateDisplayName(userId: number, displayName: string): Promise<void> {
  await execute('UPDATE users SET display_name = ? WHERE id = ?', [displayName, userId]);
}
