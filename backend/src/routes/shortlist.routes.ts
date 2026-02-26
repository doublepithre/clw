import { Router } from 'express';
import { z } from 'zod';
import * as shortlistController from '../controllers/shortlist.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = Router();

const createShortlistSchema = z.object({
  name: z.string().min(1).max(255),
  jobId: z.string().uuid().optional(),
});

const updateSharingSchema = z.object({
  shareEnabled: z.boolean(),
});

const updateCandidateSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'approved', 'rejected']).optional(),
  reviewerNotes: z.string().optional(),
});

// Public shared shortlist route (no auth)
router.get('/shared/:token', shortlistController.getShared);

// Protected routes
router.use(requireAuth);

router.post('/', validate(createShortlistSchema), shortlistController.create);
router.get('/', shortlistController.list);
router.get('/:id', shortlistController.getById);
router.patch('/:id/share', validate(updateSharingSchema), shortlistController.updateSharing);
router.patch('/:id/candidates/:cid', validate(updateCandidateSchema), shortlistController.updateCandidate);

export default router;
