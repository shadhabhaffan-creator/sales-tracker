import { Request, Response } from 'express';
import { Sale, Expense, Settlement, Customer, Product } from '../../models';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from 'date-fns';

export const getDailyReport = async (req: Request, res: Response) => {
  const { range = 'daily' } = req.query;
  
  try {
    let startDate: Date;
    let endDate = endOfDay(new Date());

    switch (range) {
      case 'weekly':
        startDate = startOfWeek(new Date());
        break;
      case 'monthly':
        startDate = startOfMonth(new Date());
        break;
      default:
        startDate = startOfDay(new Date());
    }

    const [sales, expenses, settlements, customerStats, products, topProductsData] = await Promise.all([
      Sale.find({ date: { $gte: startDate, $lte: endDate } }).populate('items.productId'),
      Expense.find({ date: { $gte: startDate, $lte: endDate } }),
      Settlement.find({ date: { $gte: startDate, $lte: endDate } }),
      Customer.aggregate([
        { $group: { _id: null, totalDue: { $sum: { $subtract: ['$totalSpent', '$totalPaid'] } }, totalSpent: { $sum: '$totalSpent' } } }
      ]),
      Product.find(),
      Sale.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        { $unwind: '$items' },
        { $group: { 
          _id: '$items.productId', 
          name: { $first: '$items.name' },
          salesCount: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' }
        }},
        { $sort: { salesCount: -1 } },
        { $limit: 5 }
      ])
    ]);

    const topSellingProducts = topProductsData || [];

    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSettlements = settlements.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    const totalPendingDues = customerStats[0]?.totalDue || 0;
    const inventoryValue = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);

    // Calculate net profit
    const netProfit = totalProfit - totalExpenses;

    // Daily trends for charts
    const dailyTrend = [];
    for (let i = 0; i < 7; i++) {
      const d = subDays(new Date(), i);
      const dayStart = startOfDay(d);
      const dayEnd = endOfDay(d);
      
      const daySales = await Sale.find({ date: { $gte: dayStart, $lte: dayEnd } });
      dailyTrend.push({
        date: format(d, 'MMM dd'),
        sales: daySales.reduce((sum, s) => sum + s.totalAmount, 0),
        profit: daySales.reduce((sum, s) => sum + (s.profit || 0), 0)
      });
    }

    res.json({
      summary: {
        totalSales,
        totalProfit,
        totalExpenses,
        totalSettlements,
        totalPendingDues,
        netProfit,
        inventoryValue,
        netCash: (totalSales - (sales.filter(s => s.paymentType === 'CREDIT').reduce((sum, s) => sum + s.totalAmount, 0))) + totalSettlements - totalExpenses
      },
      trends: dailyTrend.reverse(),
      topSellingProducts,
      details: {
        salesCount: sales.length,
        expensesCount: expenses.length,
        settlementsCount: settlements.length
      },
      date: startDate
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
