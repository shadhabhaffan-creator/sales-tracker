import { Request, Response } from 'express';
import { Settlement, Customer } from '../../models';

export const createSettlement = async (req: Request, res: Response) => {
  try {
    const { customerId, amount, paymentMethod, notes } = req.body;
    
    const settlement = await Settlement.create({
      customerId,
      amount,
      paymentMethod,
      notes
    });

    await Customer.findByIdAndUpdate(customerId, {
      $inc: { totalPaid: amount }
    });

    res.status(201).json(settlement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
