import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { validate } from '../middleware/validation';
import * as adminService from '../services/admin';

const router = Router();

const banSchema = z.object({
  banned: z.boolean(),
  reason: z.string().max(500).optional(),
});

const roleSchema = z.object({
  role: z.enum(['user', 'moderator', 'admin']),
});

router.use(authMiddleware, adminMiddleware);

router.get('/admin/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    const result = await adminService.listUsers(page, limit, search);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.put('/admin/users/:id/ban', validate(banSchema), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    await adminService.banUser(req.user!.userId, userId, req.body.banned, req.body.reason);
    res.json({ message: req.body.banned ? 'User banned' : 'User unbanned' });
  } catch (err) {
    next(err);
  }
});

router.put('/admin/users/:id/role', validate(roleSchema), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    await adminService.changeUserRole(req.user!.userId, userId, req.body.role);
    res.json({ message: 'Role updated' });
  } catch (err) {
    next(err);
  }
});

router.get('/admin/stats', async (_req, res, next) => {
  try {
    const stats = await adminService.getServerStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.get('/admin/matches', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await adminService.getMatchHistory(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
