import { Router } from 'express';
import { Customer } from '../models';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find({});
    res.json(customers);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
