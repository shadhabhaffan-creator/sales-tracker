import { Request, Response } from 'express';
import { Customer, Sale, Settlement, SaleItem, Product } from '../../models';
import mongoose from 'mongoose';

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await Customer.find({}).sort({ name: 1 });
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // 1. Get all sales to restore stock
    const sales = await Sale.find({ customerId: id });
    for (const sale of sales) {
      for (const item of sale.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }
        });
      }
      // Delete associated sale items
      await SaleItem.deleteMany({ saleId: sale._id });
    }

    // 2. Delete all associated records
    await Sale.deleteMany({ customerId: id });
    await Settlement.deleteMany({ customerId: id });
    await Customer.findByIdAndDelete(id);

    res.json({ message: 'Customer and all associated transactions deleted successfully' });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
};
