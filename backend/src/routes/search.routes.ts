import { Router } from 'express';
import { z } from 'zod';
import * as searchController from '../controllers/search.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { searchLimiter } from '../middleware/rate-limit.js';

const router = Router();

const searchSchema = z.object({
  query: z.string().min(1).max(2000),
  filters: z.record(z.unknown()).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

router.use(requireAuth);

router.post('/', searchLimiter, validate(searchSchema), searchController.search);

export default router;
