import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): express.Express {
  const app = express();

  app.use(cors({
    origin: process.env.APP_URL || 'http://localhost:8080',
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Trust proxy (behind nginx)
  app.set('trust proxy', 1);

  registerRoutes(app);

  app.use(errorHandler);

  return app;
}
