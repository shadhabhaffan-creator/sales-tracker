import { Router } from 'express';
import { 
  getSuppliers, 
  createSupplier, 
  updateSupplier, 
  deleteSupplier, 
  recordPurchase 
} from '../controllers/suppliers/supplier.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);
router.post('/:id/purchase', recordPurchase);

export default router;
