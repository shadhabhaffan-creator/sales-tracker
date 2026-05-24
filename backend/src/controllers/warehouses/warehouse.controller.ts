import { Request, Response } from 'express';
import { Warehouse, Product, StockMovement } from '../../models';

// Get all warehouses
export const getWarehouses = async (req: Request, res: Response) => {
  try {
    const { search = '', status } = req.query;
    
    let query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { warehouseId: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { managerName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const warehouses = await Warehouse.find(query)
      .populate({
        path: 'products.productId',
        populate: { path: 'supplierId' }
      })
      .sort({ createdAt: -1 });

    res.json(warehouses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Create a warehouse
export const createWarehouse = async (req: Request, res: Response) => {
  try {
    const warehouse = new Warehouse(req.body);
    await warehouse.save();
    res.status(201).json(warehouse);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Update a warehouse
export const updateWarehouse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    res.json(warehouse);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a warehouse
export const deleteWarehouse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findByIdAndDelete(id);
    
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Handle inventory transfers, additions, adjustments, and movements
export const manageStockMovement = async (req: Request, res: Response) => {
  const { 
    productId, 
    variantId, // optional variant id
    type, // 'INCOMING', 'OUTGOING', 'TRANSFER', 'ADJUSTMENT'
    quantity, 
    sourceWarehouseId, 
    destinationWarehouseId, 
    warehouseId, // for simple incoming/outgoing/adjustments
    reference 
  } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let variant: any = null;
    if (variantId) {
      variant = product.variants.id(variantId);
      if (!variant) {
        return res.status(404).json({ error: 'Variant not found' });
      }
    }

    const qty = Number(quantity);
    if (isNaN(qty) || (type !== 'ADJUSTMENT' && qty <= 0)) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    const performedBy = (req as any).user?.fullName || 'Admin System';

    if (type === 'TRANSFER') {
      if (!sourceWarehouseId || !destinationWarehouseId) {
        return res.status(400).json({ error: 'Both source and destination warehouses are required for transfers' });
      }

      const source = await Warehouse.findById(sourceWarehouseId);
      const dest = await Warehouse.findById(destinationWarehouseId);

      if (!source || !dest) {
        return res.status(404).json({ error: 'Source or destination warehouse not found' });
      }

      // Check source stock
      const sourceProdIndex = source.products.findIndex((p: any) => 
        p.productId.toString() === productId && 
        (!variantId ? !p.variantId : p.variantId?.toString() === variantId)
      );

      if (sourceProdIndex === -1 || source.products[sourceProdIndex].stock < qty) {
        return res.status(400).json({ 
          error: `Insufficient stock in source warehouse "${source.name}". Available: ${sourceProdIndex === -1 ? 0 : source.products[sourceProdIndex].stock}` 
        });
      }

      // Decrement source
      source.products[sourceProdIndex].stock -= qty;
      source.currentStock = source.products.reduce((sum: number, p: any) => sum + p.stock, 0);
      await source.save();

      // Increment destination
      const destProdIndex = dest.products.findIndex((p: any) => 
        p.productId.toString() === productId && 
        (!variantId ? !p.variantId : p.variantId?.toString() === variantId)
      );

      if (destProdIndex > -1) {
        dest.products[destProdIndex].stock += qty;
      } else {
        dest.products.push({ 
          productId, 
          variantId: variant ? variant._id : undefined,
          variantName: variant ? variant.name : undefined,
          stock: qty 
        });
      }
      dest.currentStock = dest.products.reduce((sum: number, p: any) => sum + p.stock, 0);
      await dest.save();

      // Log movement
      const movement = new StockMovement({
        productId,
        variantId: variant ? variant._id : undefined,
        variantName: variant ? variant.name : undefined,
        type: 'TRANSFER',
        quantity: qty,
        sourceWarehouseId,
        destinationWarehouseId,
        reference: reference || `Transfer from ${source.name} to ${dest.name}`,
        performedBy
      });
      await movement.save();

      return res.json({ message: 'Stock transferred successfully', source, dest });
    }

    if (type === 'INCOMING') {
      const targetId = destinationWarehouseId || warehouseId;
      if (!targetId) {
        return res.status(400).json({ error: 'Target warehouse is required' });
      }

      const wh = await Warehouse.findById(targetId);
      if (!wh) {
        return res.status(404).json({ error: 'Warehouse not found' });
      }

      // Add to warehouse
      const prodIndex = wh.products.findIndex((p: any) => 
        p.productId.toString() === productId && 
        (!variantId ? !p.variantId : p.variantId?.toString() === variantId)
      );

      if (prodIndex > -1) {
        wh.products[prodIndex].stock += qty;
      } else {
        wh.products.push({ 
          productId, 
          variantId: variant ? variant._id : undefined,
          variantName: variant ? variant.name : undefined,
          stock: qty 
        });
      }
      wh.currentStock = wh.products.reduce((sum: number, p: any) => sum + p.stock, 0);
      await wh.save();

      // Increment global stock
      if (variant) {
        variant.stock = (variant.stock || 0) + qty;
        product.stock = product.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
      } else {
        product.stock = (product.stock || 0) + qty;
      }
      await product.save();

      // Log movement
      const movement = new StockMovement({
        productId,
        variantId: variant ? variant._id : undefined,
        variantName: variant ? variant.name : undefined,
        warehouseId: targetId,
        type: 'INCOMING',
        quantity: qty,
        reference: reference || 'Stock Ingested',
        performedBy
      });
      await movement.save();

      return res.json({ message: 'Stock ingested successfully', warehouse: wh });
    }

    if (type === 'OUTGOING') {
      const targetId = sourceWarehouseId || warehouseId;
      if (!targetId) {
        return res.status(400).json({ error: 'Source warehouse is required' });
      }

      const wh = await Warehouse.findById(targetId);
      if (!wh) {
        return res.status(404).json({ error: 'Warehouse not found' });
      }

      // Decrement from warehouse
      const prodIndex = wh.products.findIndex((p: any) => 
        p.productId.toString() === productId && 
        (!variantId ? !p.variantId : p.variantId?.toString() === variantId)
      );

      if (prodIndex === -1 || wh.products[prodIndex].stock < qty) {
        return res.status(400).json({ 
          error: `Insufficient stock. Available: ${prodIndex === -1 ? 0 : wh.products[prodIndex].stock}` 
        });
      }

      wh.products[prodIndex].stock -= qty;
      wh.currentStock = wh.products.reduce((sum: number, p: any) => sum + p.stock, 0);
      await wh.save();

      // Decrement global stock
      if (variant) {
        variant.stock = Math.max(0, (variant.stock || 0) - qty);
        product.stock = product.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
      } else {
        product.stock = Math.max(0, (product.stock || 0) - qty);
      }
      await product.save();

      // Log movement
      const movement = new StockMovement({
        productId,
        variantId: variant ? variant._id : undefined,
        variantName: variant ? variant.name : undefined,
        warehouseId: targetId,
        type: 'OUTGOING',
        quantity: qty,
        reference: reference || 'Stock Dispatched',
        performedBy
      });
      await movement.save();

      return res.json({ message: 'Stock dispatched successfully', warehouse: wh });
    }

    if (type === 'ADJUSTMENT') {
      const targetId = warehouseId;
      if (!targetId) {
        return res.status(400).json({ error: 'Warehouse ID is required for adjustments' });
      }

      const wh = await Warehouse.findById(targetId);
      if (!wh) {
        return res.status(404).json({ error: 'Warehouse not found' });
      }

      const prodIndex = wh.products.findIndex((p: any) => 
        p.productId.toString() === productId && 
        (!variantId ? !p.variantId : p.variantId?.toString() === variantId)
      );

      const currentWhStock = prodIndex > -1 ? wh.products[prodIndex].stock : 0;
      const difference = qty - currentWhStock; // new quantity minus old quantity

      if (prodIndex > -1) {
        wh.products[prodIndex].stock = qty;
      } else {
        wh.products.push({ 
          productId, 
          variantId: variant ? variant._id : undefined,
          variantName: variant ? variant.name : undefined,
          stock: qty 
        });
      }

      wh.currentStock = wh.products.reduce((sum: number, p: any) => sum + p.stock, 0);
      await wh.save();

      // Adjust global stock
      if (variant) {
        variant.stock = Math.max(0, (variant.stock || 0) + difference);
        product.stock = product.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
      } else {
        product.stock = Math.max(0, (product.stock || 0) + difference);
      }
      await product.save();

      // Log movement
      const movement = new StockMovement({
        productId,
        variantId: variant ? variant._id : undefined,
        variantName: variant ? variant.name : undefined,
        warehouseId: targetId,
        type: 'ADJUSTMENT',
        quantity: difference, // difference can be positive or negative
        reference: reference || `Manual adjustment. Set from ${currentWhStock} to ${qty}`,
        performedBy
      });
      await movement.save();

      return res.json({ message: 'Stock adjusted successfully', warehouse: wh });
    }

    res.status(400).json({ error: 'Invalid stock movement type' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get stock movement history for a product or warehouse
export const getStockMovements = async (req: Request, res: Response) => {
  const { productId, warehouseId } = req.query;

  try {
    let query: any = {};
    if (productId) query.productId = productId;
    if (warehouseId) {
      query.$or = [
        { warehouseId },
        { sourceWarehouseId: warehouseId },
        { destinationWarehouseId: warehouseId }
      ];
    }

    const movements = await StockMovement.find(query)
      .populate({
        path: 'productId',
        populate: { path: 'supplierId' }
      })
      .populate('sourceWarehouseId')
      .populate('destinationWarehouseId')
      .populate('warehouseId')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(movements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
