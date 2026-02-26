import type { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analytics.service.js';
import { getAuthUser } from '../middleware/auth.js';

export async function dashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const stats = await analyticsService.getDashboardStats(orgId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function searchHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await analyticsService.getSearchHistory(orgId, limit);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

export async function recentUploads(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const uploads = await analyticsService.getRecentUploads(orgId);
    res.json(uploads);
  } catch (err) {
    next(err);
  }
}
