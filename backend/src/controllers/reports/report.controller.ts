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

    const [sales, expenses, settlements, allCustomers, products, allSalesForTopProducts] = await Promise.all([
      Sale.find({ date: { $gte: startDate, $lte: endDate } }).populate('items.productId'),
      Expense.find({ date: { $gte: startDate, $lte: endDate } }),
      Settlement.find({ date: { $gte: startDate, $lte: endDate } }),
      Customer.find({}),
      Product.find(),
      Sale.find({ date: { $gte: startDate, $lte: endDate } })
    ]);

    // Calculate Customer Stats locally
    const customerStats = {
      totalDue: allCustomers.reduce((sum: number, c: any) => sum + (Number(c.totalDue) || 0), 0),
      totalSpent: allCustomers.reduce((sum: number, c: any) => sum + (Number(c.totalSpent) || 0), 0)
    };

    // Calculate Top Selling Products locally
    const productSalesMap: Record<string, { _id: string; name: string; salesCount: number; totalRevenue: number }> = {};
    for (const sale of allSalesForTopProducts) {
      if (sale.items) {
        for (const item of sale.items) {
          const prodId = String(item.productId?.id || item.productId || '');
          if (!prodId) continue;
          if (!productSalesMap[prodId]) {
            productSalesMap[prodId] = {
              _id: prodId,
              name: item.name || 'Unknown Product',
              salesCount: 0,
              totalRevenue: 0
            };
          }
          productSalesMap[prodId].salesCount += Number(item.quantity || 0);
          productSalesMap[prodId].totalRevenue += Number(item.totalPrice || 0);
        }
      }
    }
    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    const totalSales = sales.reduce((sum: number, s: any) => sum + s.totalAmount, 0);
    const totalProfit = sales.reduce((sum: number, s: any) => sum + (s.profit || 0), 0);
    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const totalSettlements = settlements.reduce((sum: number, s: any) => sum + (s.amountPaid || 0), 0);
    const totalPendingDues = customerStats.totalDue;
    const inventoryValue = products.reduce((sum: number, p: any) => sum + (p.stock * p.costPrice), 0);

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
        sales: daySales.reduce((sum: number, s: any) => sum + s.totalAmount, 0),
        profit: daySales.reduce((sum: number, s: any) => sum + (s.profit || 0), 0)
      });
    }

    const netCash = (totalSales - (sales.filter((s: any) => s.paymentType === 'CREDIT').reduce((sum: number, s: any) => sum + s.totalAmount, 0))) + totalSettlements - totalExpenses;

    res.json({
      summary: {
        totalSales,
        totalProfit,
        totalExpenses,
        totalSettlements,
        totalPendingDues,
        netProfit,
        inventoryValue,
        netCash
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
