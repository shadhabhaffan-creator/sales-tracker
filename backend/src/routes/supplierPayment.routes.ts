import { Router } from 'express';
import { 
  getSupplierPayments, 
  getSupplierPaymentDashboard, 
  recordPayment 
} from '../controllers/suppliers/supplierPayment.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/', getSupplierPayments);
router.get('/dashboard', getSupplierPaymentDashboard);
router.post('/:id/pay', recordPayment);

export default router;
