import { Request, Response } from 'express';
import { Settlement, Customer, Sale } from '../../models';

export const createSettlement = async (req: Request, res: Response) => {
  try {
    const { customerId, saleId, amountPaid, paymentMethod, notes, handledBy, transactionId } = req.body;
    
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const settlement = await Settlement.create({
      customerId,
      saleId,
      amountPaid,
      paymentMethod,
      remainingBalance: Math.max(0, customer.totalDue - amountPaid),
      status: (customer.totalDue - amountPaid) <= 0 ? 'PAID' : 'PARTIAL',
      notes,
      handledBy,
      transactionId,
      date: new Date()
    });

    // Sync with Sales: Find all sales with dueAmount > 0 for this customer
    // We apply the payment to the oldest sales first (FIFO)
    let remainingPayment = amountPaid;
    const outstandingSales = await Sale.find({ 
      customerId, 
      dueAmount: { $gt: 0 } 
    }).sort({ date: 1 });

    for (const sale of outstandingSales) {
      if (remainingPayment <= 0) break;

      const amountToApply = Math.min(remainingPayment, sale.dueAmount);
      sale.dueAmount -= amountToApply;
      remainingPayment -= amountToApply;

      // Update sale status
      if (sale.dueAmount <= 0) {
        sale.status = 'PAID';
      } else {
        sale.status = 'PARTIAL';
      }

      await sale.save();
    }

    // Update customer totals
    await Customer.findByIdAndUpdate(customerId, {
      totalPaid: customer.totalPaid + amountPaid,
      totalDue: Math.max(0, customer.totalDue - amountPaid)
    });

    res.status(201).json(settlement);
  } catch (error: any) {
    console.error('Settlement Sync Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getSettlements = async (req: Request, res: Response) => {
  try {
    const { customerId, status, startDate, endDate, search } = req.query;
    let query: any = {};

    if (customerId) query.customerId = customerId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    let settlements = await Settlement.find(query)
      .populate('customerId', 'name')
      .sort({ createdAt: -1 });

    if (search) {
      settlements = settlements.filter((s: any) => 
        s.customerId?.name?.toLowerCase().includes((search as string).toLowerCase())
      );
    }

    res.json(settlements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSettlementAnalytics = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [allSettlements, allCustomers] = await Promise.all([
      Settlement.find({}),
      Customer.find({})
    ]);

    const dailyTotal = allSettlements
      .filter((s: any) => new Date(s.date) >= today)
      .reduce((sum: number, s: any) => sum + s.amountPaid, 0);

    const weeklyTotal = allSettlements
      .filter((s: any) => new Date(s.date) >= startOfWeek)
      .reduce((sum: number, s: any) => sum + s.amountPaid, 0);

    const monthlyTotal = allSettlements
      .filter((s: any) => new Date(s.date) >= startOfMonth)
      .reduce((sum: number, s: any) => sum + s.amountPaid, 0);

    const totalSpent = allCustomers.reduce((sum: number, c: any) => sum + c.totalSpent, 0);
    const totalRecovered = allCustomers.reduce((sum: number, c: any) => sum + c.totalPaid, 0);
    const totalPending = totalSpent - totalRecovered;

    // Overdue balances (simplified: any customer with balance > 0 and no activity in 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const overdue = await Customer.countDocuments({
      totalDue: { $gt: 0 },
      updatedAt: { $lt: thirtyDaysAgo }
    });

    res.json({
      daily: dailyTotal,
      weekly: weeklyTotal,
      monthly: monthlyTotal,
      totalDues: totalPending,
      totalRecovered: totalRecovered,
      overdueCount: overdue
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCustomerTimeline = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [sales, settlements] = await Promise.all([
      Sale.find({ customerId: id }).sort({ date: 1 }),
      Settlement.find({ customerId: id }).sort({ date: 1 })
    ]);

    const timeline = [
      ...sales.map((s: any) => ({ ...s, type: 'SALE' })),
      ...settlements.map((s: any) => ({ ...s, type: 'SETTLEMENT' }))
    ].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json(timeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteSettlement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const settlement = await Settlement.findById(id);

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    const customer = await Customer.findById(settlement.customerId);
    if (customer) {
      await Customer.findByIdAndUpdate(settlement.customerId, {
        totalPaid: Math.max(0, customer.totalPaid - settlement.amountPaid),
        totalDue: customer.totalDue + settlement.amountPaid
      });
    }

    await Settlement.findByIdAndDelete(id);

    res.json({ message: 'Settlement deleted and balance reversed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
