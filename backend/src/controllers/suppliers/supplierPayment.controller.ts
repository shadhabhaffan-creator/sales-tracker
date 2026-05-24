import { Request, Response } from 'express';
import { SupplierPayment, Product, Supplier, Purchase } from '../../models';

export const getSupplierPayments = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    let query: any = {};

    if (status && status !== 'ALL') {
      if (status === 'PENDING') {
        // Payments that have a remaining balance > 0
        query.remainingBalance = { $gt: 0 };
      } else if (status === 'PAID') {
        // Fully paid
        query.remainingBalance = 0;
      } else {
        query.status = status;
      }
    }

    let payments = await SupplierPayment.find(query)
      .populate('supplierId')
      .populate('productId')
      .sort({ dueDate: 1 });

    // Client-side filtering if search term is provided
    if (search) {
      const term = (search as string).toLowerCase();
      payments = payments.filter((payment: any) => {
        const supplierName = payment.supplierId?.name?.toLowerCase() || '';
        const companyName = payment.supplierId?.companyName?.toLowerCase() || '';
        const productName = payment.productId?.name?.toLowerCase() || '';
        const txId = payment.transactionId?.toLowerCase() || '';
        return (
          supplierName.includes(term) ||
          companyName.includes(term) ||
          productName.includes(term) ||
          txId.includes(term)
        );
      });
    }

    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSupplierPaymentDashboard = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const allPayments = await SupplierPayment.find({});

    let totalOutstanding = 0;
    const dueSuppliersSet = new Set<string>();
    let overdueCount = 0;
    let dueTodayCount = 0;
    let upcomingCount = 0;

    allPayments.forEach((p: any) => {
      if (p.remainingBalance > 0) {
        totalOutstanding += p.remainingBalance;
        if (p.supplierId) {
          dueSuppliersSet.add(p.supplierId.toString());
        }

        const dueDate = new Date(p.dueDate);
        if (dueDate < startOfToday) {
          overdueCount++;
        } else if (dueDate >= startOfToday && dueDate <= endOfToday) {
          dueTodayCount++;
        } else {
          upcomingCount++;
        }
      }
    });

    res.json({
      totalOutstandingAmount: totalOutstanding,
      totalDueSuppliers: dueSuppliersSet.size,
      overduePayments: overdueCount,
      paymentsDueToday: dueTodayCount,
      upcomingDueDates: upcomingCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const recordPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, transactionId, notes, paymentDate } = req.body;

    const payAmt = Number(amount);
    if (isNaN(payAmt) || payAmt <= 0) {
      return res.status(400).json({ error: 'Payment amount must be a positive number' });
    }

    const payment = await SupplierPayment.findById(id);
    if (!payment) {
      return res.status(404).json({ error: 'Supplier payment record not found' });
    }

    if (payAmt > payment.remainingBalance) {
      return res.status(400).json({ 
        error: `Payment amount (${payAmt}) exceeds remaining balance (${payment.remainingBalance})` 
      });
    }

    payment.amountPaid += payAmt;
    payment.remainingBalance = Math.max(0, payment.remainingBalance - payAmt);
    
    if (payment.remainingBalance === 0) {
      payment.status = 'PAID';
    } else {
      payment.status = 'PARTIALLY_PAID';
    }

    // Add entry to history
    payment.paymentsHistory.push({
      amount: payAmt,
      paymentDate: paymentDate || new Date(),
      paymentMethod,
      transactionId,
      notes
    });

    // Sync back to Purchase if purchaseId exists
    if (payment.purchaseId) {
      const purchase = await Purchase.findOne({ purchaseId: payment.purchaseId });
      if (purchase) {
        purchase.amountPaid += payAmt;
        purchase.remainingBalance = Math.max(0, purchase.remainingBalance - payAmt);
        if (purchase.remainingBalance === 0) {
          purchase.paymentStatus = 'PAID';
        } else {
          purchase.paymentStatus = 'PARTIALLY_PAID';
        }
        await purchase.save();
      }
    }

    await payment.save();
    res.json(payment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
