import { Router } from 'express';
import { Customer, Sale, Settlement } from '../models';

const router = Router();

router.get('/resync', async (req, res) => {
  try {
    const customers = await Customer.find();
    const results = [];

    for (const customer of customers) {
      // Get all sales for this customer
      const sales = await Sale.find({ customerId: customer._id });
      // Get all settlements for this customer
      const settlements = await Settlement.find({ customerId: customer._id });

      const totalSpent = sales.reduce((sum, s) => sum + s.totalAmount, 0);
      
      // totalPaid is upfront payments + later settlements
      const upfrontPaid = sales.reduce((sum, s) => {
        if (s.paymentType === 'CASH') return sum + s.totalAmount;
        return sum + (s.totalAmount - (s.dueAmount || 0));
      }, 0);
      const laterPaid = settlements.reduce((sum, s) => sum + s.amountPaid, 0);
      
      const totalPaid = upfrontPaid + laterPaid;
      const totalDue = totalSpent - totalPaid;

      // Update customer record
      customer.totalSpent = totalSpent;
      customer.totalPaid = totalPaid;
      customer.totalDue = Math.max(0, totalDue);
      await customer.save();

      results.push({
        name: customer.name,
        totalSpent,
        totalPaid,
        totalDue
      });
    }

    res.json({ message: 'Data Resynced Successfully', results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
