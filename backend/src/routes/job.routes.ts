import { Router } from 'express';
import { z } from 'zod';
import * as jobController from '../controllers/job.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = Router();

const createJobSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
});

const updateJobSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['active', 'draft', 'closed']).optional(),
});

router.use(requireAuth);

router.post('/', validate(createJobSchema), jobController.create);
router.get('/', jobController.list);
router.get('/:id', jobController.getById);
router.put('/:id', validate(updateJobSchema), jobController.update);
router.delete('/:id', jobController.remove);

export default router;
