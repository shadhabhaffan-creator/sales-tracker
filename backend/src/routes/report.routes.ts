import { Router } from 'express';
import { getDailyReport } from '../controllers/reports/report.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/daily', protect, getDailyReport);

export default router;
