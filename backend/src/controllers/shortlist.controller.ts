import type { Request, Response, NextFunction } from 'express';
import * as shortlistService from '../services/shortlist.service.js';
import { getAuthUser } from '../middleware/auth.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId, userId } = getAuthUser(req).session;
    const { name, jobId } = req.body;
    const shortlist = await shortlistService.createShortlist(orgId, userId, name, jobId);
    res.status(201).json(shortlist);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const shortlists = await shortlistService.listShortlists(orgId);
    res.json(shortlists);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const shortlist = await shortlistService.getShortlistById(req.params.id as string, orgId);
    res.json(shortlist);
  } catch (err) {
    next(err);
  }
}

export async function updateSharing(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const { shareEnabled } = req.body;
    const shortlist = await shortlistService.updateShortlistSharing(req.params.id as string, orgId, shareEnabled);
    res.json(shortlist);
  } catch (err) {
    next(err);
  }
}

export async function getShared(req: Request, res: Response, next: NextFunction) {
  try {
    const shortlist = await shortlistService.getSharedShortlist(req.params.token as string);
    if (!shortlist) {
      res.status(404).json({ message: 'Shortlist not found or sharing disabled' });
      return;
    }
    res.json(shortlist);
  } catch (err) {
    next(err);
  }
}

export async function updateCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const { status, reviewerNotes } = req.body;
    const result = await shortlistService.updateShortlistCandidate(
      req.params.id as string,
      req.params.cid as string,
      orgId,
      { status, reviewerNotes }
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
