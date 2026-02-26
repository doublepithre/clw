import type { Request, Response, NextFunction } from 'express';
import * as searchService from '../services/search.service.js';
import { getAuthUser } from '../middleware/auth.js';

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId, userId } = getAuthUser(req).session;
    const { query: queryText, limit } = req.body;

    const results = await searchService.search(
      orgId,
      userId,
      queryText,
      limit || 20
    );

    res.json(results);
  } catch (err) {
    next(err);
  }
}
