import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { 
  createPurchase, 
  getPurchases, 
  getPurchaseDashboard, 
  recordPurchasePayment 
} from '../controllers/suppliers/purchase.controller';

const router = Router();

router.use(protect);

router.post('/', createPurchase);
router.get('/', getPurchases);
router.get('/dashboard', getPurchaseDashboard);
router.post('/:id/pay', recordPurchasePayment);

export default router;
