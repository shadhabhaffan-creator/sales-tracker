import { Request, Response } from 'express';
import { Product, SaleItem, Warehouse, StockMovement, SupplierPayment } from '../../models';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({})
      .populate('supplierId')
      .populate('variants.supplierId')
      .sort({ createdAt: -1 });
      
    const productsWithDerivedStock = products.map((p: any) => {
      const doc = p.toObject ? p.toObject() : { ...p };
      if (doc.type === 'CHILD' && doc.parent_id) {
        const parentProduct = products.find((parent: any) => String(parent.id || parent._id) === String(doc.parent_id));
        if (parentProduct) {
          doc.stock = Math.floor((parentProduct.stock || 0) / (doc.conversion_quantity || 1));
        } else {
          doc.stock = 0;
        }
      }
      return doc;
    });

    res.json(productsWithDerivedStock);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProductHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await SaleItem.find({ productId: id })
      .populate({
        path: 'saleId',
        populate: { path: 'customerId', select: 'name' }
      })
      .sort({ createdAt: -1 })
      .limit(10);
    
    const formattedHistory = history.map((item: any) => ({
      customerName: (item.saleId as any)?.customerId?.name || 'Guest',
      quantity: item.quantity,
      price: item.unitPrice,
      date: item.createdAt
    }));

    res.json(formattedHistory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { allocations, variants, supplierPaymentInfo, ...productData } = req.body;
    if (!productData.sku || productData.sku === '') delete productData.sku;
    
    let processedVariants = [];
    if (variants && Array.isArray(variants) && variants.length > 0) {
      processedVariants = variants.map((v: any) => {
        const cleanV = { ...v };
        if (!cleanV.sku || cleanV.sku === '') delete cleanV.sku;
        if (!cleanV.supplierId || cleanV.supplierId === '') delete cleanV.supplierId;
        return cleanV;
      });
      // Sum stocks from variants
      productData.stock = processedVariants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
      // Fallback base values
      if (processedVariants.length > 0) {
        productData.costPrice = Number(processedVariants[0].costPrice) || 0;
        productData.sellingPrice = Number(processedVariants[0].sellingPrice) || 0;
        productData.unit = processedVariants[0].unit || 'UNIT';
        if (processedVariants[0].supplierId) {
          productData.supplierId = processedVariants[0].supplierId;
        }
      }
      productData.variants = processedVariants;
    }

    // 1. Create the product
    const product = await Product.create(productData);
    const performedBy = (req as any).user?.fullName || 'Admin System';

    // 2. Process Allocations
    if (product.variants && product.variants.length > 0) {
      for (let i = 0; i < product.variants.length; i++) {
        const variant = product.variants[i];
        const origVariant = variants[i];
        if (origVariant && origVariant.allocations && Array.isArray(origVariant.allocations)) {
          for (const alloc of origVariant.allocations) {
            const { warehouseId, quantity } = alloc;
            const qty = Number(quantity);
            if (qty > 0 && warehouseId) {
              const wh = await Warehouse.findById(warehouseId);
              if (wh) {
                const prodIndex = wh.products.findIndex((p: any) => 
                  p.productId.toString() === product._id.toString() && 
                  p.variantId?.toString() === variant._id.toString()
                );
                if (prodIndex > -1) {
                  wh.products[prodIndex].stock += qty;
                } else {
                  wh.products.push({ 
                    productId: product._id, 
                    variantId: variant._id, 
                    variantName: variant.name, 
                    stock: qty 
                  });
                }
                wh.currentStock = wh.products.reduce((sum: number, p: any) => sum + p.stock, 0);
                await wh.save();

                // Log movement
                const movement = new StockMovement({
                  productId: product._id,
                  variantId: variant._id,
                  variantName: variant.name,
                  warehouseId,
                  type: 'INCOMING',
                  quantity: qty,
                  reference: `Initial Allocation for variant "${variant.name}" of "${product.name}"`,
                  performedBy
                });
                await movement.save();
              }
            }
          }
        }
      }
    } else {
      // Standard allocations (no variants)
      if (product.stock > 0 && allocations && Array.isArray(allocations)) {
        for (const alloc of allocations) {
          const { warehouseId, quantity } = alloc;
          const qty = Number(quantity);
          if (qty > 0 && warehouseId) {
            const wh = await Warehouse.findById(warehouseId);
            if (wh) {
              const prodIndex = wh.products.findIndex((p: any) => 
                p.productId.toString() === product._id.toString() && !p.variantId
              );
              if (prodIndex > -1) {
                wh.products[prodIndex].stock += qty;
              } else {
                wh.products.push({ productId: product._id, stock: qty });
              }
              wh.currentStock = wh.products.reduce((sum: number, p: any) => sum + p.stock, 0);
              await wh.save();

              // Log movement
              const movement = new StockMovement({
                productId: product._id,
                warehouseId,
                type: 'INCOMING',
                quantity: qty,
                reference: `Initial Allocation for product "${product.name}"`,
                performedBy
              });
              await movement.save();
            }
          }
        }
      }
    }

    // 3. Create Supplier Payment record if provided
    if (supplierPaymentInfo && (Number(supplierPaymentInfo.purchaseAmount) > 0 || Number(supplierPaymentInfo.amountPaid) > 0)) {
      const parsedAmount = Number(supplierPaymentInfo.purchaseAmount) || 0;
      const parsedPaid = Number(supplierPaymentInfo.amountPaid) || 0;
      const remaining = parsedAmount - parsedPaid;
      
      let status = 'DEBT';
      if (parsedPaid === parsedAmount) status = 'PAID';
      else if (parsedPaid > 0) status = 'PARTIALLY_PAID';

      await SupplierPayment.create({
        supplierId: product.supplierId || supplierPaymentInfo.supplierId,
        productId: product._id,
        purchaseAmount: parsedAmount,
        amountPaid: parsedPaid,
        remainingBalance: Math.max(0, remaining),
        paymentDate: supplierPaymentInfo.paymentDate || new Date(),
        dueDate: supplierPaymentInfo.dueDate || new Date(),
        transactionId: supplierPaymentInfo.transactionId || '',
        notes: supplierPaymentInfo.notes || '',
        paymentMethod: supplierPaymentInfo.paymentMethod || 'CASH',
        status,
        paymentsHistory: parsedPaid > 0 ? [{
          amount: parsedPaid,
          paymentDate: supplierPaymentInfo.paymentDate || new Date(),
          paymentMethod: supplierPaymentInfo.paymentMethod || 'CASH',
          transactionId: supplierPaymentInfo.transactionId || '',
          notes: supplierPaymentInfo.notes || ''
        }] : []
      });
    }
    
    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id, allocations, variants, ...updateData } = req.body;
    if (!updateData.sku || updateData.sku === '') {
      updateData.sku = null;
    }
    
    const performedBy = (req as any).user?.fullName || 'Admin System';

    if (variants && Array.isArray(variants)) {
      const processedVariants = variants.map((v: any) => {
        const cleanV = { ...v };
        if (!cleanV.sku || cleanV.sku === '') delete cleanV.sku;
        if (!cleanV.supplierId || cleanV.supplierId === '') delete cleanV.supplierId;
        return cleanV;
      });
      // Sum stocks
      updateData.stock = processedVariants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
      if (processedVariants.length > 0) {
        updateData.costPrice = Number(processedVariants[0].costPrice) || 0;
        updateData.sellingPrice = Number(processedVariants[0].sellingPrice) || 0;
        updateData.unit = processedVariants[0].unit || 'UNIT';
        if (processedVariants[0].supplierId) {
          updateData.supplierId = processedVariants[0].supplierId;
        }
      }
      updateData.variants = processedVariants;
    }

    // 1. Update the product
    const product = await Product.findByIdAndUpdate(id, updateData, { new: true });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // 2. Update allocations
    if (product.variants && product.variants.length > 0) {
      for (let i = 0; i < product.variants.length; i++) {
        const variant = product.variants[i];
        const origVariant = variants[i];
        if (origVariant && origVariant.allocations && Array.isArray(origVariant.allocations)) {
          for (const alloc of origVariant.allocations) {
            const { warehouseId, quantity } = alloc;
            const targetQty = Number(quantity);
            const wh = await Warehouse.findById(warehouseId);
            
            if (wh) {
              const prodIndex = wh.products.findIndex((p: any) => 
                p.productId.toString() === id && 
                p.variantId?.toString() === variant._id.toString()
              );
              const currentWhStock = prodIndex > -1 ? wh.products[prodIndex].stock : 0;
              const difference = targetQty - currentWhStock;
              
              if (difference !== 0) {
                if (prodIndex > -1) {
                  wh.products[prodIndex].stock = targetQty;
                } else {
                  wh.products.push({ 
                    productId: id, 
                    variantId: variant._id, 
                    variantName: variant.name, 
                    stock: targetQty 
                  });
                }
                wh.currentStock = wh.products.reduce((sum: number, p: any) => sum + p.stock, 0);
                await wh.save();
                
                // Log movement
                const movement = new StockMovement({
                  productId: id,
                  variantId: variant._id,
                  variantName: variant.name,
                  warehouseId,
                  type: difference > 0 ? 'INCOMING' : 'OUTGOING',
                  quantity: Math.abs(difference),
                  reference: `Stock allocation adjustment for variant "${variant.name}" of "${product.name}"`,
                  performedBy
                });
                await movement.save();
              }
            }
          }
        }
      }
    } else {
      if (allocations && Array.isArray(allocations)) {
        for (const alloc of allocations) {
          const { warehouseId, quantity } = alloc;
          const targetQty = Number(quantity);
          const wh = await Warehouse.findById(warehouseId);
          
          if (wh) {
            const prodIndex = wh.products.findIndex((p: any) => 
              p.productId.toString() === id && !p.variantId
            );
            const currentWhStock = prodIndex > -1 ? wh.products[prodIndex].stock : 0;
            const difference = targetQty - currentWhStock;
            
            if (difference !== 0) {
              if (prodIndex > -1) {
                wh.products[prodIndex].stock = targetQty;
              } else {
                wh.products.push({ productId: id, stock: targetQty });
              }
              wh.currentStock = wh.products.reduce((sum: number, p: any) => sum + p.stock, 0);
              await wh.save();
              
              // Log movement
              const movement = new StockMovement({
                productId: id,
                warehouseId,
                type: difference > 0 ? 'INCOMING' : 'OUTGOING',
                quantity: Math.abs(difference),
                reference: `Stock allocation adjustment for product "${product.name}"`,
                performedBy
              });
              await movement.save();
            }
          }
        }
      }
    }
    
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    await Product.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
