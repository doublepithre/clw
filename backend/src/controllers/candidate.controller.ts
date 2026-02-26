import type { Request, Response, NextFunction } from 'express';
import * as candidateService from '../services/candidate.service.js';
import { getAuthUser } from '../middleware/auth.js';
import { resumeQueue } from '../workers/queues.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const result = await candidateService.listCandidates({
      orgId,
      page,
      pageSize,
      search,
      status,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const candidate = await candidateService.getCandidateById(req.params.id as string, orgId);
    res.json(candidate);
  } catch (err) {
    next(err);
  }
}

export async function upload(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const candidate = await candidateService.uploadResume(orgId, file);

    // Enqueue for processing
    await resumeQueue.add('parse', {
      candidateId: candidate.id,
      orgId,
      fileName: file.originalname,
      mimeType: file.mimetype,
    });

    res.status(201).json(candidate);
  } catch (err) {
    next(err);
  }
}

export async function uploadBulk(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    const results = [];
    for (const file of files) {
      try {
        const candidate = await candidateService.uploadResume(orgId, file);
        await resumeQueue.add('parse', {
          candidateId: candidate.id,
          orgId,
          fileName: file.originalname,
          mimeType: file.mimetype,
        });
        results.push({ fileName: file.originalname, status: 'queued', id: candidate.id });
      } catch (err) {
        results.push({
          fileName: file.originalname,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    }

    res.status(201).json({ results });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    await candidateService.deleteCandidate(req.params.id as string, orgId);
    res.json({ message: 'Candidate deleted' });
  } catch (err) {
    next(err);
  }
}

export async function updateTags(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = getAuthUser(req).session;
    const { tags } = req.body;
    const candidate = await candidateService.updateCandidateTags(req.params.id as string, orgId, tags);
    res.json(candidate);
  } catch (err) {
    next(err);
  }
}
