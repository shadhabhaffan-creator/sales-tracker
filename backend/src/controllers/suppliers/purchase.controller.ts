import { Request, Response } from 'express';
import { Purchase, Product, Warehouse, StockMovement, SupplierPayment, Supplier, Inventory } from '../../models';

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const {
      invoiceNumber,
      purchaseDate,
      supplierId,
      productName,
      variantName,
      quantity,
      unit,
      costPrice,
      notes,
      amountPaid,
      paymentMethod,
      warehouseAllocations // Array of { warehouseId, quantity }
    } = req.body;

    const parsedQty = Number(quantity) || 0;
    const parsedCost = Number(costPrice) || 0;
    const totalAmount = parsedQty * parsedCost;
    const parsedPaid = Number(amountPaid) || 0;
    const remainingBalance = Math.max(0, totalAmount - parsedPaid);

    // Validate warehouse allocations sum equals quantity
    const allocationTotal = (warehouseAllocations || []).reduce((sum: number, a: any) => sum + (Number(a.quantity) || 0), 0);
    if (parsedQty > 0 && allocationTotal !== parsedQty) {
      return res.status(400).json({ 
        error: `Total allocated stock (${allocationTotal}) does not match purchased quantity (${parsedQty})` 
      });
    }

    // Auto-generate Purchase ID
    const count = await Purchase.countDocuments();
    const purchaseId = `PUR-${String(count + 1).padStart(4, '0')}`;

    // 1. Find or Auto-Create Product
    let product = await Product.findOne({ name: { $regex: new RegExp('^' + productName.trim() + '$', 'i') } });
    let isNewProduct = false;
    let message = '';

    if (!product) {
      isNewProduct = true;
      const productSku = `PROD-${productName.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      if (variantName && variantName.trim() !== '') {
        // Create product with nested variant
        product = await Product.create({
          name: productName.trim(),
          sku: productSku,
          category: 'General',
          stock: parsedQty,
          costPrice: parsedCost,
          sellingPrice: parsedCost * 1.5,
          unit: 'PIECE', // default fallback for main product container
          status: 'IN_STOCK',
          supplierId,
          variants: [{
            name: variantName.trim(),
            sku: `VAR-${variantName.trim().toUpperCase().replace(/\s+/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`,
            costPrice: parsedCost,
            sellingPrice: parsedCost * 1.5,
            stock: parsedQty,
            unit,
            supplierId
          }]
        });
      } else {
        // Create standard product
        product = await Product.create({
          name: productName.trim(),
          sku: productSku,
          category: 'General',
          stock: parsedQty,
          costPrice: parsedCost,
          sellingPrice: parsedCost * 1.5,
          unit,
          supplierId,
          status: 'IN_STOCK'
        });
      }
      message = 'New product created and added to inventory';
    } else {
      // Product exists - update stock levels
      if (product.type === 'CHILD') {
        const parentId = product.parent_id;
        const parentProduct = await Product.findById(parentId);
        if (parentProduct) {
          parentProduct.stock += parsedQty * product.conversion_quantity;
          await parentProduct.save();

          const prisma = require('../../models/prisma').prisma;
          await prisma.inventory.upsert({
            where: { product_id: parentProduct.id },
            update: { stock_quantity: parentProduct.stock },
            create: { product_id: parentProduct.id, stock_quantity: parentProduct.stock }
          });
        }
        
        if (!product.supplierId) {
          product.supplierId = supplierId;
          await product.save();
        }
        message = 'Parent bulk inventory updated successfully';
      } else {
        // Standard product - update stock levels
        if (variantName && variantName.trim() !== '') {
          const vNameTrim = variantName.trim();
          const existingVariantIdx = product.variants?.findIndex(
            (v: any) => v.name.toLowerCase() === vNameTrim.toLowerCase()
          );

          if (existingVariantIdx !== undefined && existingVariantIdx !== -1) {
            product.variants[existingVariantIdx].stock += parsedQty;
          } else {
            product.variants = product.variants || [];
            product.variants.push({
              name: vNameTrim,
              sku: `VAR-${vNameTrim.toUpperCase().replace(/\s+/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`,
              costPrice: parsedCost,
              sellingPrice: parsedCost * 1.5,
              stock: parsedQty,
              unit,
              supplierId
            });
          }
          product.stock += parsedQty;
        } else {
          product.stock += parsedQty;
        }
        
        if (!product.supplierId) {
          product.supplierId = supplierId;
        }
        
        await product.save();

        const prisma = require('../../models/prisma').prisma;
        await prisma.inventory.upsert({
          where: { product_id: product.id },
          update: { stock_quantity: product.stock },
          create: { product_id: product.id, stock_quantity: product.stock }
        });

        message = 'Existing inventory updated successfully';
      }
    }

    // Get Variant details if created/updated
    let variantId: any = undefined;
    let finalVariantName: string = '';
    if (variantName && variantName.trim() !== '') {
      const savedProduct = await Product.findById(product._id);
      const v = savedProduct.variants?.find((v: any) => v.name.toLowerCase() === variantName.trim().toLowerCase());
      if (v) {
        variantId = v._id;
        finalVariantName = v.name;
      }
    }

    // 2. Allocate Warehouses & Save Stock Movements
    for (const alloc of (warehouseAllocations || [])) {
      const warehouse = await Warehouse.findById(alloc.warehouseId);
      if (warehouse) {
        const allocQty = Number(alloc.quantity) || 0;
        
        if (product.type === 'CHILD') {
          const parentId = product.parent_id;
          const parentProduct = await Product.findById(parentId);
          if (parentProduct) {
            const parentAllocQty = allocQty * product.conversion_quantity;
            
            const wProdIdx = warehouse.products.findIndex(
              (p: any) => p.productId.toString() === parentProduct._id.toString() && !p.variantId
            );

            if (wProdIdx !== -1) {
              warehouse.products[wProdIdx].stock += parentAllocQty;
            } else {
              warehouse.products.push({
                productId: parentProduct._id,
                stock: parentAllocQty
              });
            }

            warehouse.currentStock = (warehouse.currentStock || 0) + parentAllocQty;
            await warehouse.save();

            // Log parent movement
            await StockMovement.create({
              productId: parentProduct._id,
              warehouseId: warehouse._id,
              type: 'INCOMING',
              quantity: parentAllocQty,
              reference: `Bulk purchase of child "${product.name}" (Invoice: ${invoiceNumber})`,
              performedBy: (req as any).user?.username || 'System Purchase'
            });

            // Log child movement
            await StockMovement.create({
              productId: product._id,
              warehouseId: warehouse._id,
              type: 'INCOMING',
              quantity: allocQty,
              reference: `Purchase Invoice: ${invoiceNumber}`,
              performedBy: (req as any).user?.username || 'System Purchase'
            });
          }
        } else {
          // Standard / Variant product allocation
          if (variantId) {
            const wProdIdx = warehouse.products.findIndex(
              (p: any) => p.productId.toString() === product._id.toString() && p.variantId?.toString() === variantId.toString()
            );

            if (wProdIdx !== -1) {
              warehouse.products[wProdIdx].stock += allocQty;
            } else {
              warehouse.products.push({
                productId: product._id,
                variantId,
                variantName: finalVariantName,
                stock: allocQty
              });
            }
          } else {
            const wProdIdx = warehouse.products.findIndex(
              (p: any) => p.productId.toString() === product._id.toString() && !p.variantId
            );

            if (wProdIdx !== -1) {
              warehouse.products[wProdIdx].stock += allocQty;
            } else {
              warehouse.products.push({
                productId: product._id,
                stock: allocQty
              });
            }
          }

          warehouse.currentStock = (warehouse.currentStock || 0) + allocQty;
          await warehouse.save();

          // Save Stock Movement record
          await StockMovement.create({
            productId: product._id,
            variantId,
            variantName: finalVariantName || undefined,
            warehouseId: warehouse._id,
            type: 'INCOMING',
            quantity: allocQty,
            reference: `Purchase Invoice: ${invoiceNumber}`,
            performedBy: (req as any).user?.username || 'System Purchase'
          });
        }
      }
    }

    // 3. Determine Payment Status
    let paymentStatus = 'DEBT';
    if (parsedPaid === totalAmount) paymentStatus = 'PAID';
    else if (parsedPaid > 0) paymentStatus = 'PARTIALLY_PAID';

    // 4. Create Purchase Record
    const purchase = await Purchase.create({
      purchaseId,
      invoiceNumber,
      purchaseDate: purchaseDate || new Date(),
      supplierId,
      productId: product._id,
      productName: productName.trim(),
      variantName: finalVariantName || undefined,
      quantity: parsedQty,
      unit,
      costPrice: parsedCost,
      totalAmount,
      notes,
      amountPaid: parsedPaid,
      remainingBalance,
      paymentMethod,
      paymentStatus,
      warehouseAllocations: (warehouseAllocations || []).map((a: any) => ({
        warehouseId: a.warehouseId,
        quantity: Number(a.quantity) || 0
      }))
    });

    // 5. Save Outstanding Payment if remaining balance > 0
    if (remainingBalance > 0) {
      await SupplierPayment.create({
        supplierId,
        productId: product._id,
        purchaseAmount: totalAmount,
        amountPaid: parsedPaid,
        remainingBalance,
        paymentDate: purchaseDate || new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days due
        transactionId: invoiceNumber,
        purchaseId,
        notes: `Generated from Purchase ${purchaseId}. ${notes || ''}`,
        paymentMethod,
        status: paymentStatus,
        paymentsHistory: parsedPaid > 0 ? [{
          amount: parsedPaid,
          paymentDate: purchaseDate || new Date(),
          paymentMethod,
          transactionId: invoiceNumber,
          notes: 'Initial purchase payment.'
        }] : []
      });
    }

    res.status(201).json({ purchase, message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPurchases = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    let query: any = {};

    let purchases = await Purchase.find(query)
      .populate('supplierId')
      .populate('productId')
      .sort({ purchaseDate: -1 });

    if (search) {
      const term = (search as string).toLowerCase();
      purchases = purchases.filter((p: any) => {
        const supplierName = p.supplierId?.name?.toLowerCase() || '';
        const prodName = p.productName?.toLowerCase() || '';
        const invoice = p.invoiceNumber?.toLowerCase() || '';
        const pId = p.purchaseId?.toLowerCase() || '';
        return (
          supplierName.includes(term) ||
          prodName.includes(term) ||
          invoice.includes(term) ||
          pId.includes(term)
        );
      });
    }

    res.json(purchases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPurchaseDashboard = async (req: Request, res: Response) => {
  try {
    const purchases = await Purchase.find({});
    
    let totalValue = 0;
    let totalOutstanding = 0;
    let pendingCount = 0;

    purchases.forEach((p: any) => {
      totalValue += p.totalAmount;
      totalOutstanding += p.remainingBalance;
      if (p.remainingBalance > 0) {
        pendingCount++;
      }
    });

    const recentPurchases = await Purchase.find({})
      .populate('supplierId')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalPurchases: purchases.length,
      purchaseValue: totalValue,
      outstandingAmount: totalOutstanding,
      pendingPayments: pendingCount,
      recentPurchases
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const recordPurchasePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, transactionId, notes } = req.body;
    const payAmt = Number(amount);

    if (isNaN(payAmt) || payAmt <= 0) {
      return res.status(400).json({ error: 'Payment amount must be a positive number' });
    }

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase record not found' });
    }

    if (payAmt > purchase.remainingBalance) {
      return res.status(400).json({ 
        error: `Payment amount (${payAmt}) exceeds remaining balance (${purchase.remainingBalance})` 
      });
    }

    purchase.amountPaid += payAmt;
    purchase.remainingBalance = Math.max(0, purchase.remainingBalance - payAmt);
    
    if (purchase.remainingBalance === 0) {
      purchase.paymentStatus = 'PAID';
    } else {
      purchase.paymentStatus = 'PARTIALLY_PAID';
    }

    await purchase.save();

    // Find and update SupplierPayment
    const supplierPayment = await SupplierPayment.findOne({ purchaseId: purchase.purchaseId });
    if (supplierPayment) {
      supplierPayment.amountPaid += payAmt;
      supplierPayment.remainingBalance = Math.max(0, supplierPayment.remainingBalance - payAmt);
      supplierPayment.status = supplierPayment.remainingBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';
      supplierPayment.paymentsHistory.push({
        amount: payAmt,
        paymentDate: new Date(),
        paymentMethod,
        transactionId,
        notes
      });
      await supplierPayment.save();
    }

    res.json(purchase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
