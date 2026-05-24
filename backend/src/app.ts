import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import customerRoutes from './routes/customer.routes';
import saleRoutes from './routes/sales.routes';
import expenseRoutes from './routes/expense.routes';
import reportRoutes from './routes/report.routes';
import settlementRoutes from './routes/settlement.routes';
import employeeRoutes from './routes/employee.routes';
import supplierRoutes from './routes/supplier.routes';
import warehouseRoutes from './routes/warehouse.routes';
import supplierPaymentRoutes from './routes/supplierPayment.routes';
import purchaseRoutes from './routes/purchase.routes';
import fixRoutes from './routes/fix.routes';
import checkRoutes from './routes/check.routes';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/supplier-payments', supplierPaymentRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/fix', fixRoutes);
app.use('/api/check', checkRoutes);

// Error Handling Middleware
import { errorHandler } from './middleware/error.middleware';
app.use(errorHandler);

// Root route
app.get('/', (req, res) => {
  res.send('AuraSales API is running...');
});

export default app;
