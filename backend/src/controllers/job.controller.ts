import type { Request, Response, NextFunction } from 'express';
import * as jobService from '../services/job.service.js';
import { getAuthUser } from '../middleware/auth.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId, userId } = getAuthUser(req).session;
    const { title, description } = req.body;
    const job = await jobService.createJob(orgId, userId, title, description);
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const jobs = await jobService.listJobs(orgId);
    res.json(jobs);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const job = await jobService.getJobById(req.params.id as string, orgId);
    res.json(job);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const job = await jobService.updateJob(req.params.id as string, orgId, req.body);
    res.json(job);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    await jobService.deleteJob(req.params.id as string, orgId);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    next(err);
  }
}
