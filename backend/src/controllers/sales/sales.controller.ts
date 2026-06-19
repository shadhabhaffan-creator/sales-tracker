import { Request, Response } from 'express';
import { Sale, Product, Customer, SaleItem, StockMovement, Inventory } from '../../models';
import mongoose from 'mongoose';

export const getSales = async (req: Request, res: Response) => {
  try {
    const sales = await Sale.find({}).populate('customerId').sort({ date: -1 });
    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createSale = async (req: Request, res: Response) => {
  try {
    const { items, paymentType, customerId, notes, paidAmount = 0, transactionId, discountType = 'FLAT', discountValue = 0 } = req.body;

    let totalAmount = 0;
    let totalProfit = 0;
    const invoiceId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const processedItems = [];

    // Pass 1: Aggregate and Validate Stock Levels
    const parentDeductions: Record<string, number> = {};
    const productCache: Record<string, any> = {};

    for (const item of items) {
      let prod = productCache[item.productId];
      if (!prod) {
        prod = await Product.findById(item.productId);
        if (!prod) {
          throw new Error(`Product not found: ${item.name}`);
        }
        productCache[item.productId] = prod;
      }

      if (prod.type === 'CHILD') {
        const pId = prod.parent_id;
        if (!pId) {
          throw new Error(`Child product "${prod.name}" has no linked parent product.`);
        }
        const neededParentStock = item.quantity * prod.conversion_quantity;
        parentDeductions[pId] = (parentDeductions[pId] || 0) + neededParentStock;
      } else {
        // Standard/Parent product (or variant)
        if (item.variantId) {
          const variant = prod.variants.find((v: any) => String(v._id) === String(item.variantId));
          if (!variant) {
            throw new Error(`Variant not found for product "${prod.name}"`);
          }
          if (variant.stock < item.quantity) {
            throw new Error(`Insufficient stock for variant "${variant.name}" of "${prod.name}". Available: ${variant.stock}`);
          }
        } else {
          parentDeductions[prod.id || prod._id] = (parentDeductions[prod.id || prod._id] || 0) + item.quantity;
        }
      }
    }

    // Validate aggregated deductions against current stocks
    for (const [prodId, requiredQty] of Object.entries(parentDeductions)) {
      const parentProd = await Product.findById(prodId);
      if (!parentProd) {
        throw new Error(`Parent product not found for ID: ${prodId}`);
      }
      const availableStock = parentProd.variants && parentProd.variants.length > 0
        ? parentProd.variants.reduce((sum: number, vr: any) => sum + (vr.stock || 0), 0)
        : (parentProd.stock || 0);

      if (availableStock < requiredQty) {
        throw new Error(`Insufficient stock for product "${parentProd.name}". Required: ${requiredQty} ${parentProd.unit}, Available: ${availableStock} ${parentProd.unit}`);
      }
    }

    // Pass 2: Apply Deductions, Log Movements, Sync Inventory Table
    const prisma = require('../../models/prisma').prisma;

    for (const item of items) {
      const product = productCache[item.productId];
      const price = item.unitPrice || item.sellingPrice;
      const itemTotal = price * item.quantity;
      
      let costPrice = product.costPrice;
      let displayName = product.name;
      
      if (product.type === 'CHILD') {
        const parentId = product.parent_id;
        const parentProduct = await Product.findById(parentId);
        const requiredQty = item.quantity * product.conversion_quantity;

        // Deduct from parent's variants if any exist
        if (parentProduct.variants && parentProduct.variants.length > 0) {
          let remainingDeduction = requiredQty;
          for (let v of parentProduct.variants) {
            if (remainingDeduction <= 0) break;
            const deductQty = Math.min(v.stock || 0, remainingDeduction);
            if (deductQty > 0) {
              v.stock -= deductQty;
              remainingDeduction -= deductQty;
            }
          }
          if (remainingDeduction > 0) {
            parentProduct.variants[0].stock -= remainingDeduction;
          }
          // Recalculate parentProduct.stock
          parentProduct.stock = parentProduct.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
        } else {
          parentProduct.stock -= requiredQty;
        }
        await parentProduct.save();

        // Sync parent inventory record
        await prisma.inventory.upsert({
          where: { product_id: parentProduct.id },
          update: { stock_quantity: parentProduct.stock },
          create: { product_id: parentProduct.id, stock_quantity: parentProduct.stock }
        });

        // Log parent stock movement
        const parentMovement = new StockMovement({
          productId: parentProduct._id,
          type: 'OUTGOING',
          quantity: requiredQty,
          reference: `Conversion for child product "${product.name}" sale (${invoiceId})`,
          performedBy: (req as any).user?.fullName || 'System Sale'
        });
        await parentMovement.save();

        // Log child stock movement
        const childMovement = new StockMovement({
          productId: product._id,
          type: 'OUTGOING',
          quantity: item.quantity,
          reference: `Sale (Invoice: ${invoiceId})`,
          performedBy: (req as any).user?.fullName || 'System Sale'
        });
        await childMovement.save();

      } else {
        // Standard/Parent product (with or without variant)
        if (item.variantId) {
          const variant = product.variants.find((v: any) => String(v._id) === String(item.variantId));
          variant.stock -= item.quantity;
          product.stock = product.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
          await product.save();

          costPrice = variant.costPrice;
          displayName = `${product.name} (${variant.name})`;

          // Log stock movement for variant
          const movement = new StockMovement({
            productId: product._id,
            variantId: item.variantId,
            variantName: variant.name,
            type: 'OUTGOING',
            quantity: item.quantity,
            reference: `Sale (Invoice: ${invoiceId})`,
            performedBy: (req as any).user?.fullName || 'System Sale'
          });
          await movement.save();
        } else {
          product.stock -= item.quantity;
          await product.save();

          // Log stock movement
          const movement = new StockMovement({
            productId: product._id,
            type: 'OUTGOING',
            quantity: item.quantity,
            reference: `Sale (Invoice: ${invoiceId})`,
            performedBy: (req as any).user?.fullName || 'System Sale'
          });
          await movement.save();
        }

        // Sync inventory record
        await prisma.inventory.upsert({
          where: { product_id: product.id },
          update: { stock_quantity: product.stock },
          create: { product_id: product.id, stock_quantity: product.stock }
        });
      }

      const itemProfit = (price - costPrice) * item.quantity;
      totalAmount += itemTotal;
      totalProfit += itemProfit;

      processedItems.push({
        productId: product._id,
        variantId: item.variantId || null,
        name: displayName,
        quantity: item.quantity,
        unitPrice: price,
        costPrice: costPrice,
        totalPrice: itemTotal
      });
    }

    // Calculate discount amount
    const val = parseFloat(discountValue as any) || 0;
    const discountAmount = discountType === 'PERCENT' ? (totalAmount * (val / 100)) : val;
    const discountedTotal = Math.max(0, totalAmount - discountAmount);
    const discountedProfit = totalProfit - discountAmount;

    const dueAmount = paymentType === 'CREDIT' ? (discountedTotal - paidAmount) : 0;
    const status = paymentType === 'CREDIT' ? (dueAmount > 0 ? 'DUE' : 'PAID') : 'PAID';

    // Use standard create without session
    const saleArray = await Sale.create([{
      invoiceId,
      items: processedItems,
      totalAmount: discountedTotal,
      discount: discountAmount,
      discountType,
      discountValue: val,
      dueAmount,
      paymentType,
      customerId: customerId || null,
      profit: discountedProfit,
      notes,
      status,
      transactionId,
      date: new Date()
    }]);
    
    const sale = saleArray[0];

    // Create individual SaleItem records
    const saleItemsData = processedItems.map(item => ({
      ...item,
      saleId: sale._id
    }));
    await SaleItem.create(saleItemsData);

    if (customerId) {
      const customerUpdate: any = {
        $inc: { totalSpent: discountedTotal },
        $set: { lastPurchaseDate: new Date() }
      };
      
      if (paymentType === 'CREDIT') {
        customerUpdate.$inc.totalDue = dueAmount;
        customerUpdate.$inc.totalPaid = paidAmount;
      } else {
        customerUpdate.$inc.totalPaid = discountedTotal;
      }

      await Customer.findByIdAndUpdate(customerId, customerUpdate);
    }

    res.status(201).json(sale);
  } catch (error: any) {
    console.error('Sale Creation Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteSale = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id);

    if (!sale) {
      throw new Error('Sale not found');
    }

    // 1. Restore stock for each item
    const prisma = require('../../models/prisma').prisma;

    for (const item of sale.items) {
      let product = await Product.findById(item.productId);
      if (product) {
        if (product.type === 'CHILD') {
          const parentId = product.parent_id;
          if (parentId) {
            const parentProduct = await Product.findById(parentId);
            if (parentProduct) {
              const restoredQty = item.quantity * product.conversion_quantity;
              
              if (parentProduct.variants && parentProduct.variants.length > 0) {
                parentProduct.variants[0].stock += restoredQty;
                parentProduct.stock = parentProduct.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
              } else {
                parentProduct.stock += restoredQty;
              }
              await parentProduct.save();

              // Sync parent inventory record
              await prisma.inventory.upsert({
                where: { product_id: parentProduct.id },
                update: { stock_quantity: parentProduct.stock },
                create: { product_id: parentProduct.id, stock_quantity: parentProduct.stock }
              });

              // Log parent stock movement
              const parentMovement = new StockMovement({
                productId: parentProduct._id,
                type: 'INCOMING',
                quantity: restoredQty,
                reference: `Sale Reversal / Return (Invoice: ${sale.invoiceId})`,
                performedBy: (req as any).user?.fullName || 'System Sale'
              });
              await parentMovement.save();
            }
          }

          // Log child stock movement
          const childMovement = new StockMovement({
            productId: product._id,
            type: 'INCOMING',
            quantity: item.quantity,
            reference: `Sale Reversal / Return (Invoice: ${sale.invoiceId})`,
            performedBy: (req as any).user?.fullName || 'System Sale'
          });
          await childMovement.save();

        } else {
          // Standard or variant
          if (item.variantId) {
            const variant = product.variants.find((v: any) => String(v._id) === String(item.variantId));
            if (variant) {
              variant.stock += item.quantity;
              product.stock = product.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
              await product.save();

              // Log stock movement for variant
              const movement = new StockMovement({
                productId: product._id,
                variantId: item.variantId,
                variantName: variant.name,
                type: 'INCOMING',
                quantity: item.quantity,
                reference: `Sale Reversal / Return (Invoice: ${sale.invoiceId})`,
                performedBy: (req as any).user?.fullName || 'System Sale'
              });
              await movement.save();
            }
          } else {
            product.stock += item.quantity;
            await product.save();

            // Log stock movement
            const movement = new StockMovement({
              productId: product._id,
              type: 'INCOMING',
              quantity: item.quantity,
              reference: `Sale Reversal / Return (Invoice: ${sale.invoiceId})`,
              performedBy: (req as any).user?.fullName || 'System Sale'
            });
            await movement.save();
          }

          // Sync inventory record
          await prisma.inventory.upsert({
            where: { product_id: product.id },
            update: { stock_quantity: product.stock },
            create: { product_id: product.id, stock_quantity: product.stock }
          });
        }
      }
    }

    // 2. Revert customer balance and stats
    if (sale.customerId) {
      const customerUpdate: any = {
        $inc: { totalSpent: -sale.totalAmount }
      };

      if (sale.paymentType === 'CREDIT') {
        const paidUpfront = sale.totalAmount - sale.dueAmount;
        customerUpdate.$inc.totalDue = -sale.dueAmount;
        customerUpdate.$inc.totalPaid = -paidUpfront;
      } else {
        customerUpdate.$inc.totalPaid = -sale.totalAmount;
      }

      await Customer.findByIdAndUpdate(sale.customerId, customerUpdate);
    }

    // 3. Delete related SaleItems
    await SaleItem.deleteMany({ saleId: id });

    // 4. Delete the sale
    await Sale.findByIdAndDelete(id);

    res.json({ message: 'Sale deleted, stock restored, and records cleaned up' });
  } catch (error: any) {
    console.error('Sale Deletion Error:', error);
    res.status(500).json({ error: error.message });
  }
};
