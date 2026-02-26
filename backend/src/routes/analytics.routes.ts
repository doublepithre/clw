import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/stats', analyticsController.dashboardStats);
router.get('/search-history', analyticsController.searchHistory);
router.get('/recent-uploads', analyticsController.recentUploads);

export default router;
