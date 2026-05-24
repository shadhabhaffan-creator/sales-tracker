import { Router } from 'express';
import { getCustomers, createCustomer, deleteCustomer } from '../controllers/customers/customer.controller';
import { protect, admin } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

const customerSchema = {
  name: { required: true, type: 'string' },
  phone: { required: false, type: 'string' },
};

router.get('/', protect, getCustomers);
router.post('/', protect, admin, validateRequest(customerSchema), createCustomer);
router.delete('/:id', protect, deleteCustomer);

export default router;
