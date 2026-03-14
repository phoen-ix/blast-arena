import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import * as userService from '../services/user';
import { DISPLAY_NAME_MAX_LENGTH } from '@blast-arena/shared';

const router = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(DISPLAY_NAME_MAX_LENGTH),
});

router.get('/user/profile', authMiddleware, async (req, res, next) => {
  try {
    const profile = await userService.getUserProfile(req.user!.userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.put('/user/profile', authMiddleware, validate(updateProfileSchema), async (req, res, next) => {
  try {
    await userService.updateDisplayName(req.user!.userId, req.body.displayName);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    next(err);
  }
});

export default router;
