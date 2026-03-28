import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { localeMiddleware } from './middleware/locale';
import { getConfig } from './config';

export function createApp(): express.Express {
  const app = express();

  const allowedOrigin = new URL(getConfig().APP_URL).origin;
  app.use(
    cors({
      origin: allowedOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(localeMiddleware);

  // Trust proxy (behind nginx)
  app.set('trust proxy', 1);

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  registerRoutes(app);

  app.use(errorHandler);

  return app;
}
