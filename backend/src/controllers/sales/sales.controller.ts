import { Request, Response } from 'express';
import { Sale, Product, Customer, SaleItem } from '../../models';
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
    const { items, paymentType, customerId, notes, paidAmount = 0, transactionId } = req.body;

    let totalAmount = 0;
    let totalProfit = 0;
    const invoiceId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const processedItems = [];

    for (const item of items) {
      let product;
      if (item.variantId) {
        product = await Product.findOneAndUpdate(
          { 
            _id: item.productId, 
            "variants._id": item.variantId, 
            "variants.stock": { $gte: item.quantity } 
          },
          { 
            $inc: { 
              stock: -item.quantity, 
              "variants.$.stock": -item.quantity 
            } 
          },
          { new: true }
        );
      } else {
        product = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
      }

      if (!product) {
        throw new Error(`Insufficient stock for ${item.name} or product not found`);
      }

      // Handle both unitPrice and sellingPrice for backward compatibility
      const price = item.unitPrice || item.sellingPrice;
      const itemTotal = price * item.quantity;
      
      let costPrice = product.costPrice;
      let displayName = product.name;
      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        if (variant) {
          costPrice = variant.costPrice;
          displayName = `${product.name} (${variant.name})`;
        }
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

    const dueAmount = paymentType === 'CREDIT' ? (totalAmount - paidAmount) : 0;
    const status = paymentType === 'CREDIT' ? (dueAmount > 0 ? 'DUE' : 'PAID') : 'PAID';

    // Use standard create without session
    const saleArray = await Sale.create([{
      invoiceId,
      items: processedItems,
      totalAmount,
      dueAmount,
      paymentType,
      customerId: customerId || null,
      profit: totalProfit,
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
        $inc: { totalSpent: totalAmount },
        $set: { lastPurchaseDate: new Date() }
      };
      
      if (paymentType === 'CREDIT') {
        customerUpdate.$inc.totalDue = dueAmount;
        customerUpdate.$inc.totalPaid = paidAmount;
      } else {
        customerUpdate.$inc.totalPaid = totalAmount;
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
    for (const item of sale.items) {
      if (item.variantId) {
        await Product.findOneAndUpdate(
          { _id: item.productId, "variants._id": item.variantId },
          { 
            $inc: { 
              stock: item.quantity, 
              "variants.$.stock": item.quantity 
            } 
          }
        );
      } else {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }
        });
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
