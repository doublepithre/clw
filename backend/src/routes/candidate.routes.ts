import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import * as candidateController from '../controllers/candidate.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { uploadLimiter } from '../middleware/rate-limit.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'));
    }
  },
});

const tagsSchema = z.object({
  tags: z.array(z.string()),
});

router.use(requireAuth);

router.get('/', candidateController.list);
router.get('/:id', candidateController.getById);
router.post('/upload', uploadLimiter, upload.single('resume'), candidateController.upload);
router.post('/upload/bulk', uploadLimiter, upload.array('resumes', 50), candidateController.uploadBulk);
router.delete('/:id', candidateController.remove);
router.patch('/:id/tags', validate(tagsSchema), candidateController.updateTags);

export default router;
