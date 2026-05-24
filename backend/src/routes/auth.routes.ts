import { Router } from 'express';
import { login, getMe, updateProfile } from '../controllers/auth/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { Supplier, Warehouse, Customer, Product, StockMovement, SupplierPayment, Purchase } from '../models';

const router = Router();

router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

router.post('/seed', async (req, res) => {
  try {
    // Clear existing data first
    await Promise.all([
      Supplier.deleteMany({}),
      Warehouse.deleteMany({}),
      Customer.deleteMany({}),
      Product.deleteMany({}),
      StockMovement.deleteMany({}),
      SupplierPayment.deleteMany({}),
      Purchase.deleteMany({})
    ]);

    // 1. Create Suppliers
    const suppliers = await Supplier.create([
      {
        name: 'Apex Distributors',
        companyName: 'Apex Corp',
        contactPerson: 'David Miller',
        phoneNumber: '9876543210',
        email: 'david@apex.com',
        address: '456 Business Rd',
        city: 'Metropolis',
        state: 'NY',
        country: 'USA',
        gstId: 'GST-APEX-99',
        paymentTerms: 'NET30',
        status: 'ACTIVE'
      },
      {
        name: 'Global Foods Co.',
        companyName: 'Global Foods Inc',
        contactPerson: 'Sarah Jenkins',
        phoneNumber: '9876543211',
        email: 'sarah@globalfoods.com',
        address: '789 Logistics Way',
        city: 'Boston',
        state: 'MA',
        country: 'USA',
        gstId: 'GST-GLOBAL-88',
        paymentTerms: 'COD',
        status: 'ACTIVE'
      }
    ]);

    // 2. Create Warehouses
    const warehouses = await Warehouse.create([
      {
        name: 'Main Warehouse',
        warehouseId: 'WH-MAIN',
        location: 'Downtown Hub',
        address: '100 Industrial Pkwy, Suite A',
        managerName: 'Alice Peterson',
        contactNumber: '555-0199',
        capacity: 10000,
        status: 'ACTIVE',
        products: []
      },
      {
        name: 'Sub Depot',
        warehouseId: 'WH-SUB',
        location: 'Northside Crossing',
        address: '200 Logistics Blvd',
        managerName: 'Bob Henderson',
        contactNumber: '555-0200',
        capacity: 5000,
        status: 'ACTIVE',
        products: []
      }
    ]);

    // 3. Create Customers
    const customers = await Customer.create([
      {
        name: 'Acme Corporates',
        email: 'billing@acme.com',
        phone: '123-456-7890',
        address: '123 Fictional Ln',
        totalSpent: 0,
        totalPaid: 0,
        totalDue: 0
      },
      {
        name: 'Jane Doe Retail',
        email: 'jane@gmail.com',
        phone: '321-654-0987',
        address: '789 Residential Blvd',
        totalSpent: 0,
        totalPaid: 0,
        totalDue: 0
      }
    ]);

    // 4. Create Standard Product (No variants)
    const standardProduct = await Product.create({
      name: 'Eco Dish Soap',
      sku: 'EDS-100',
      category: 'Home Care',
      stock: 50,
      costPrice: 2.00,
      sellingPrice: 4.50,
      unit: 'UNIT',
      status: 'IN_STOCK',
      supplierId: suppliers[0]._id,
      warehouseId: warehouses[0]._id
    });

    // Allocate standard product stock
    warehouses[0].products.push({
      productId: standardProduct._id,
      stock: 50
    });
    warehouses[0].currentStock = 50;
    await warehouses[0].save();

    await StockMovement.create({
      productId: standardProduct._id,
      warehouseId: warehouses[0]._id,
      type: 'INCOMING',
      quantity: 50,
      reference: 'Seed Initial Allocation',
      performedBy: 'System Seeder'
    });

    // 5. Create Product with Variants
    const variantProduct = await Product.create({
      name: 'Organic Energy Drink',
      category: 'Beverages',
      stock: 70, // 40 of 500ml + 30 of Bundle of 6
      costPrice: 1.50,
      sellingPrice: 3.00,
      unit: 'PIECE',
      status: 'IN_STOCK',
      variants: [
        {
          name: '500ml',
          sku: 'ED-500',
          costPrice: 1.50,
          sellingPrice: 3.00,
          stock: 40,
          unit: 'ML',
          supplierId: suppliers[0]._id
        },
        {
          name: 'Bundle of 6',
          sku: 'ED-B6',
          costPrice: 7.50,
          sellingPrice: 15.00,
          stock: 30,
          unit: 'PACK',
          supplierId: suppliers[1]._id
        }
      ]
    });

    // Allocate variant stocks to warehouses
    const v500 = variantProduct.variants[0];
    const vB6 = variantProduct.variants[1];

    warehouses[0].products.push({
      productId: variantProduct._id,
      variantId: v500._id,
      variantName: v500.name,
      stock: 25
    });
    warehouses[1].products.push({
      productId: variantProduct._id,
      variantId: v500._id,
      variantName: v500.name,
      stock: 15
    });

    // Allocate Bundle of 6 (30 units): 30 to Main Warehouse
    warehouses[0].products.push({
      productId: variantProduct._id,
      variantId: vB6._id,
      variantName: vB6.name,
      stock: 30
    });

    warehouses[0].currentStock = (warehouses[0].currentStock || 0) + 55;
    warehouses[1].currentStock = (warehouses[1].currentStock || 0) + 15;

    await warehouses[0].save();
    await warehouses[1].save();

    // Log Stock Movements for Variants
    await StockMovement.create([
      {
        productId: variantProduct._id,
        variantId: v500._id,
        variantName: v500.name,
        warehouseId: warehouses[0]._id,
        type: 'INCOMING',
        quantity: 25,
        reference: 'Seed Initial Allocation (Main)',
        performedBy: 'System Seeder'
      },
      {
        productId: variantProduct._id,
        variantId: v500._id,
        variantName: v500.name,
        warehouseId: warehouses[1]._id,
        type: 'INCOMING',
        quantity: 15,
        reference: 'Seed Initial Allocation (Sub)',
        performedBy: 'System Seeder'
      },
      {
        productId: variantProduct._id,
        variantId: vB6._id,
        variantName: vB6.name,
        warehouseId: warehouses[0]._id,
        type: 'INCOMING',
        quantity: 30,
        reference: 'Seed Initial Allocation (Main)',
        performedBy: 'System Seeder'
      }
    ]);

    const today = new Date();
    const fiveDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5);
    const tenDaysFromNow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10);

    // 6. Create Mock Purchase Invoices
    await Purchase.create([
      {
        purchaseId: 'PUR-0001',
        invoiceNumber: 'INV-APEX-101',
        purchaseDate: fiveDaysAgo,
        supplierId: suppliers[0]._id,
        productId: standardProduct._id,
        productName: standardProduct.name,
        quantity: 50,
        unit: 'UNIT',
        costPrice: 200,
        totalAmount: 10000,
        notes: 'Initial batch purchase for Eco Dish Soap.',
        amountPaid: 0,
        remainingBalance: 10000,
        paymentMethod: 'CASH',
        paymentStatus: 'DEBT',
        warehouseAllocations: [
          { warehouseId: warehouses[0]._id, quantity: 50 }
        ]
      },
      {
        purchaseId: 'PUR-0002',
        invoiceNumber: 'TXN-GLOBAL-101',
        purchaseDate: today,
        supplierId: suppliers[1]._id,
        productId: variantProduct._id,
        productName: variantProduct.name,
        variantName: '500ml',
        quantity: 40,
        unit: 'ML',
        costPrice: 1125,
        totalAmount: 45000,
        notes: 'Bulk beverage variant stock.',
        amountPaid: 15000,
        remainingBalance: 30000,
        paymentMethod: 'BANK_TRANSFER',
        paymentStatus: 'PARTIALLY_PAID',
        warehouseAllocations: [
          { warehouseId: warehouses[0]._id, quantity: 25 },
          { warehouseId: warehouses[1]._id, quantity: 15 }
        ]
      },
      {
        purchaseId: 'PUR-0003',
        invoiceNumber: 'TXN-APEX-202',
        purchaseDate: today,
        supplierId: suppliers[0]._id,
        productId: variantProduct._id,
        productName: variantProduct.name,
        variantName: 'Bundle of 6',
        quantity: 30,
        unit: 'PACK',
        costPrice: 500,
        totalAmount: 15000,
        notes: 'Beverage variant secondary batch.',
        amountPaid: 15000,
        remainingBalance: 0,
        paymentMethod: 'UPI',
        paymentStatus: 'PAID',
        warehouseAllocations: [
          { warehouseId: warehouses[0]._id, quantity: 30 }
        ]
      }
    ]);

    // 7. Create Mock Supplier Payments
    const supplierPaymentRecords = await SupplierPayment.create([
      {
        supplierId: suppliers[0]._id,
        productId: standardProduct._id,
        purchaseAmount: 10000,
        amountPaid: 0,
        remainingBalance: 10000,
        paymentDate: fiveDaysAgo,
        dueDate: fiveDaysAgo,
        transactionId: '',
        notes: 'Initial batch purchase for Eco Dish Soap.',
        paymentMethod: 'CASH',
        status: 'DEBT',
        paymentsHistory: []
      },
      {
        supplierId: suppliers[1]._id,
        productId: variantProduct._id,
        purchaseAmount: 45000,
        amountPaid: 15000,
        remainingBalance: 30000,
        paymentDate: today,
        dueDate: today,
        transactionId: 'TXN-GLOBAL-101',
        notes: 'Bulk beverage variant stock.',
        paymentMethod: 'BANK_TRANSFER',
        status: 'PARTIALLY_PAID',
        paymentsHistory: [
          {
            amount: 15000,
            paymentDate: today,
            paymentMethod: 'BANK_TRANSFER',
            transactionId: 'TXN-GLOBAL-101',
            notes: 'First installment payment.'
          }
        ]
      },
      {
        supplierId: suppliers[0]._id,
        productId: variantProduct._id,
        purchaseAmount: 15000,
        amountPaid: 15000,
        remainingBalance: 0,
        paymentDate: today,
        dueDate: tenDaysFromNow,
        transactionId: 'TXN-APEX-202',
        notes: 'Beverage variant secondary batch.',
        paymentMethod: 'UPI',
        status: 'PAID',
        paymentsHistory: [
          {
            amount: 15000,
            paymentDate: today,
            paymentMethod: 'UPI',
            transactionId: 'TXN-APEX-202',
            notes: 'Full payment cleared.'
          }
        ]
      }
    ]);

    res.json({ success: true, message: 'Sandbox database seeded successfully with mock data!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
