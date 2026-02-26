import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.session.role!)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function getAuthUser(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}
