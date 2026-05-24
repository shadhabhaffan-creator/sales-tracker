import { Router } from 'express';
import { 
  createSettlement, 
  getSettlements, 
  getSettlementAnalytics, 
  getCustomerTimeline,
  deleteSettlement
} from '../controllers/settlements/settlement.controller';
import { protect, admin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', protect, getSettlements);
router.post('/', protect, admin, createSettlement);
router.get('/analytics', protect, getSettlementAnalytics);
router.get('/customer/:id', protect, getCustomerTimeline);
router.delete('/:id', protect, admin, deleteSettlement);

export default router;
