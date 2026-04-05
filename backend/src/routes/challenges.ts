import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { emailVerifiedMiddleware } from '../middleware/emailVerified';
import * as challengesService from '../services/challenges';
import * as settingsService from '../services/settings';

const router = Router();

// Public: get active challenge info
router.get('/challenges/active', async (_req, res, next) => {
  try {
    const enabled = await settingsService.getSetting('challenges_enabled');
    if (enabled === 'false') {
      return res.json({ challenge: null });
    }
    const info = await challengesService.getActiveChallengeInfo();
    res.json(info || { challenge: null });
  } catch (err) {
    next(err);
  }
});

// Get challenge leaderboard
router.get(
  '/challenges/:id/leaderboard',
  authMiddleware,
  emailVerifiedMiddleware,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid challenge ID' });
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const leaderboard = await challengesService.getChallengeLeaderboard(id, page, limit);
      res.json(leaderboard);
    } catch (err) {
      next(err);
    }
  },
);

// Get challenge history (past + current)
router.get(
  '/challenges/history',
  authMiddleware,
  emailVerifiedMiddleware,
  async (req, res, next) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const result = await challengesService.listChallenges(page, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
