import { Request, Response } from 'express';
import { Supplier, Product, Warehouse, StockMovement } from '../../models';

// Get all suppliers
export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const { search = '', status } = req.query;
    
    let query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const suppliers = await Supplier.find(query)
      .populate('productsSupplied')
      .sort({ createdAt: -1 });

    res.json(suppliers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Create a supplier
export const createSupplier = async (req: Request, res: Response) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    
    // Link products to supplier if productsSupplied array is provided
    if (req.body.productsSupplied && req.body.productsSupplied.length > 0) {
      await Product.updateMany(
        { _id: { $in: req.body.productsSupplied } },
        { $set: { supplierId: supplier._id } }
      );
    }

    res.status(201).json(supplier);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Update a supplier
export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Update products mapping: unset old products, set new products supplierId
    await Product.updateMany({ supplierId: supplier._id }, { $unset: { supplierId: 1 } });
    if (req.body.productsSupplied && req.body.productsSupplied.length > 0) {
      await Product.updateMany(
        { _id: { $in: req.body.productsSupplied } },
        { $set: { supplierId: supplier._id } }
      );
    }

    res.json(supplier);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a supplier
export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByIdAndDelete(id);
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Unset supplierId on linked products
    await Product.updateMany({ supplierId: id }, { $unset: { supplierId: 1 } });

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Record a purchase / stock ingestion from a supplier
export const recordPurchase = async (req: Request, res: Response) => {
  const { id } = req.params; // Supplier ID
  const { productId, quantity, totalCost, invoiceNumber, warehouseId } = req.body;

  try {
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // 1. Update global product stock
    product.stock = (product.stock || 0) + Number(quantity);
    // Auto status check
    if (product.stock > product.lowStockThreshold) {
      product.status = 'IN_STOCK';
    } else if (product.stock > 0) {
      product.status = 'LOW_STOCK';
    } else {
      product.status = 'OUT_OF_STOCK';
    }
    await product.save();

    // 2. Optional: Add stock to specific warehouse
    if (warehouseId) {
      const warehouse = await Warehouse.findById(warehouseId);
      if (warehouse) {
        const prodIndex = warehouse.products.findIndex((p: any) => p.productId.toString() === productId);
        if (prodIndex > -1) {
          warehouse.products[prodIndex].stock += Number(quantity);
        } else {
          warehouse.products.push({ productId, stock: Number(quantity) });
        }
        
        // Update total warehouse stock
        warehouse.currentStock = warehouse.products.reduce((sum: number, p: any) => sum + p.stock, 0);
        await warehouse.save();
      }
    }

    // 3. Add to supplier history
    supplier.purchaseHistory.push({
      productId,
      productName: product.name,
      quantity,
      totalCost,
      invoiceNumber,
      date: new Date()
    });
    
    // Auto-link product to supplier if not already there
    if (!supplier.productsSupplied.includes(productId)) {
      supplier.productsSupplied.push(productId);
      product.supplierId = supplier._id;
      await product.save();
    }
    await supplier.save();

    // 4. Record stock movement
    const movement = new StockMovement({
      productId,
      warehouseId: warehouseId || null,
      type: 'INCOMING',
      quantity,
      reference: `Purchase: ${invoiceNumber || 'N/A'} (Supplier: ${supplier.name})`,
      performedBy: (req as any).user?.fullName || 'Admin System'
    });
    await movement.save();

    res.json({ message: 'Purchase recorded and inventory updated successfully', supplier });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
