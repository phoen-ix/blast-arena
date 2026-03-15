import { Request, Response, NextFunction } from 'express';

// Allows both admin and moderator roles
export function staffMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'moderator')) {
    res.status(403).json({ error: 'Staff access required', code: 'FORBIDDEN' });
    return;
  }
  next();
}

// Only allows admin role
export function adminOnlyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
    return;
  }
  next();
}

// Keep backward compat alias
export const adminMiddleware = staffMiddleware;
