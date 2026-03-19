import { Express } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import userRouter from './user';
import lobbyRouter from './lobby';
import adminRouter from './admin';
import campaignRouter from './campaign';

export function registerRoutes(app: Express): void {
  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', userRouter);
  app.use('/api', lobbyRouter);
  app.use('/api', adminRouter);
  app.use('/api', campaignRouter);
}
