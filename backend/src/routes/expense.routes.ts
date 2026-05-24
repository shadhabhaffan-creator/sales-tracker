import { Router } from 'express';
import { getExpenses, createExpense } from '../controllers/expenses/expense.controller';
import { protect, admin } from '../middleware/auth.middleware';

import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

const expenseSchema = {
  title: { required: true, type: 'string' },
  amount: { required: true, type: 'number' },
};

router.get('/', protect, getExpenses);
router.post('/', protect, admin, validateRequest(expenseSchema), createExpense);

export default router;
