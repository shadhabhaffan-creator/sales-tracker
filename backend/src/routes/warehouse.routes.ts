import { Router } from 'express';
import { 
  getWarehouses, 
  createWarehouse, 
  updateWarehouse, 
  deleteWarehouse, 
  manageStockMovement, 
  getStockMovements 
} from '../controllers/warehouses/warehouse.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/', getWarehouses);
router.post('/', createWarehouse);
router.put('/:id', updateWarehouse);
router.delete('/:id', deleteWarehouse);
router.post('/movement', manageStockMovement);
router.get('/movements', getStockMovements);

export default router;
