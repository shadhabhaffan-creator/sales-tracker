import { Router } from 'express';
import { getSales, createSale, deleteSale } from '../controllers/sales/sales.controller';
import { protect, admin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', protect, getSales);
router.post('/', protect, admin, createSale);
router.delete('/:id', protect, admin, deleteSale);

export default router;
