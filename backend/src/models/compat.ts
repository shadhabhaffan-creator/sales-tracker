import { prisma } from './prisma';

function translateQuery(query: any) {
  if (!query) return {};
  const prismaQuery: any = {};
  
  if (query._id) {
    if (typeof query._id === 'object' && query._id.$in) {
      prismaQuery.id = { in: query._id.$in.map((id: any) => String(id)) };
    } else {
      prismaQuery.id = String(query._id);
    }
  }

  for (const [key, value] of Object.entries(query)) {
    if (key === '_id') continue;
    
    if (key === '$or' && Array.isArray(value)) {
      prismaQuery.OR = value.map(translateQuery);
      continue;
    }
    if (key === '$and' && Array.isArray(value)) {
      prismaQuery.AND = value.map(translateQuery);
      continue;
    }

    if (value && typeof value === 'object') {
      const valueKeys = Object.keys(value);
      if (valueKeys.includes('$regex')) {
        prismaQuery[key] = {
          contains: (value as any).$regex,
        };
      } else if (valueKeys.includes('$gte') || valueKeys.includes('$lte') || valueKeys.includes('$gt') || valueKeys.includes('$lt')) {
        prismaQuery[key] = {};
        if ((value as any).$gte) prismaQuery[key].gte = (value as any).$gte;
        if ((value as any).$lte) prismaQuery[key].lte = (value as any).$lte;
        if ((value as any).$gt) prismaQuery[key].gt = (value as any).$gt;
        if ((value as any).$lt) prismaQuery[key].lt = (value as any).$lt;
      } else if (valueKeys.includes('$in')) {
        prismaQuery[key] = {
          in: (value as any).$in.map((i: any) => String(i))
        };
      } else if (valueKeys.includes('$nin')) {
        prismaQuery[key] = {
          notIn: (value as any).$nin.map((i: any) => String(i))
        };
      } else {
        prismaQuery[key] = value;
      }
    } else {
      prismaQuery[key] = value;
    }
  }
  return prismaQuery;
}

const DEFAULT_POPULATE_PATHS: Record<string, string[]> = {
  User: ['permissions'],
  Product: ['variants'],
  Sale: ['items'],
  Supplier: ['purchaseHistory'],
  SupplierPayment: ['paymentsHistory'],
  Purchase: ['warehouseAllocations'],
  Lead: ['notes', 'tasks', 'followUps'],
  Warehouse: ['products.productId']
};

function getPrismaInclude(modelName: string, populatePaths: string[]) {
  const include: any = {};
  const defaults = DEFAULT_POPULATE_PATHS[modelName] || [];
  const mergedPaths = Array.from(new Set([...defaults, ...populatePaths]));
  
  for (const path of mergedPaths) {
    if (modelName === 'User') {
      if (path === 'permissions') include.permissions = true;
      if (path === 'activityLog') include.activityLogs = true;
      if (path === 'loginHistory') include.loginHistories = true;
    }
    if (modelName === 'Product') {
      if (path === 'supplierId') include.supplier = true;
      if (path === 'warehouseId') include.warehouse = true;
      if (path === 'variants') include.variants = true;
      if (path === 'parent_id' || path === 'parentProduct') include.parentProduct = true;
    }
    if (modelName === 'Sale') {
      if (path === 'customerId') include.customer = true;
      if (path === 'items' || path === 'items.productId') {
        include.items = {
          include: {
            product: true
          }
        };
      }
    }
    if (modelName === 'Settlement') {
      if (path === 'customerId') include.customer = true;
      if (path === 'saleId') include.sale = { include: { items: true } };
    }
    if (modelName === 'Supplier') {
      if (path === 'productsSupplied') include.products = true;
      if (path === 'purchaseHistory') include.purchaseHistory = true;
    }
    if (modelName === 'SupplierPayment') {
      if (path === 'supplierId') include.supplier = true;
      if (path === 'productId') include.product = true;
      if (path === 'paymentsHistory') include.paymentsHistory = true;
    }
    if (modelName === 'Purchase') {
      if (path === 'supplierId') include.supplier = true;
      if (path === 'productId') include.product = true;
      if (path === 'warehouseAllocations') include.warehouseAllocations = true;
    }
    if (modelName === 'Warehouse') {
      if (path === 'products' || path === 'products.productId') {
        include.products = {
          include: {
            product: true
          }
        };
      }
    }
    if (modelName === 'Lead') {
      if (path === 'assignedTo') include.assignedTo = true;
      if (path === 'createdBy') include.createdBy = true;
      if (path === 'notes') include.notes = true;
      if (path === 'tasks') include.tasks = true;
      if (path === 'followUps') include.followUps = true;
    }
  }
  return Object.keys(include).length > 0 ? include : undefined;
}

function makeMongooseArray(arr: any[]) {
  const mongooseArr = [...arr];
  Object.defineProperty(mongooseArr, 'id', {
    value: function(id: any) {
      const targetId = String(id);
      return this.find((item: any) => String(item.id || item._id) === targetId);
    },
    enumerable: false,
    writable: true,
    configurable: true
  });
  return mongooseArr;
}

function mapPrismaDocToMongoose(doc: any, modelName: string): any {
  if (!doc) return doc;
  if (doc._isMongooseWrapped) return doc;
  if (Array.isArray(doc)) {
    return doc.map(d => mapPrismaDocToMongoose(d, modelName));
  }
  
  const clone = { ...doc };
  
  Object.defineProperty(clone, '_id', {
    get() { return this.id; },
    set(val) { this.id = val; },
    enumerable: true,
    configurable: true
  });
  
  Object.defineProperty(clone, '_isMongooseWrapped', {
    value: true,
    enumerable: false,
    writable: false
  });
  
  clone.toString = function() { return this.id; };

  if (modelName === 'User') {
    if (clone.activityLogs) {
      clone.activityLog = makeMongooseArray(clone.activityLogs);
      delete clone.activityLogs;
    } else {
      clone.activityLog = makeMongooseArray([]);
    }
    if (clone.loginHistories) {
      clone.loginHistory = makeMongooseArray(clone.loginHistories);
      delete clone.loginHistories;
    } else {
      clone.loginHistory = makeMongooseArray([]);
    }
  }
  
  if (modelName === 'Product') {
    if (clone.supplier) {
      clone.supplierId = mapPrismaDocToMongoose(clone.supplier, 'Supplier');
      delete clone.supplier;
    }
    if (clone.warehouse) {
      clone.warehouseId = mapPrismaDocToMongoose(clone.warehouse, 'Warehouse');
      delete clone.warehouse;
    }
    if (clone.variants) {
      clone.variants = makeMongooseArray(clone.variants.map((v: any) => {
        const vClone = { ...v };
        Object.defineProperty(vClone, '_id', {
          get() { return this.id; },
          set(val) { this.id = val; },
          enumerable: true,
          configurable: true
        });
        return vClone;
      }));
    } else {
      clone.variants = makeMongooseArray([]);
    }
    if (clone.tags) {
      clone.tags = typeof clone.tags === 'string' ? clone.tags.split(',').filter(Boolean) : clone.tags;
    } else {
      clone.tags = [];
    }
  }
  
  if (modelName === 'Sale') {
    if (clone.customer) {
      clone.customerId = mapPrismaDocToMongoose(clone.customer, 'Customer');
      delete clone.customer;
    }
    if (clone.items) {
      clone.items = makeMongooseArray(clone.items.map((item: any) => {
        const itemClone = { ...item };
        Object.defineProperty(itemClone, '_id', {
          get() { return this.id; },
          set(val) { this.id = val; },
          enumerable: true,
          configurable: true
        });
        if (itemClone.product) {
          itemClone.productId = mapPrismaDocToMongoose(itemClone.product, 'Product');
          delete itemClone.product;
        }
        return itemClone;
      }));
    } else {
      clone.items = makeMongooseArray([]);
    }
  }
  
  if (modelName === 'Settlement') {
    if (clone.customer) {
      clone.customerId = mapPrismaDocToMongoose(clone.customer, 'Customer');
      delete clone.customer;
    }
    if (clone.sale) {
      clone.saleId = mapPrismaDocToMongoose(clone.sale, 'Sale');
      delete clone.sale;
    }
  }
  
  if (modelName === 'Supplier') {
    if (clone.products) {
      clone.productsSupplied = makeMongooseArray(mapPrismaDocToMongoose(clone.products, 'Product'));
      delete clone.products;
    } else {
      clone.productsSupplied = makeMongooseArray([]);
    }
    if (clone.purchaseHistory) {
      clone.purchaseHistory = makeMongooseArray(clone.purchaseHistory.map((h: any) => ({
        ...h,
        _id: h.id
      })));
    } else {
      clone.purchaseHistory = makeMongooseArray([]);
    }
  }
  
  if (modelName === 'SupplierPayment') {
    if (clone.supplier) {
      clone.supplierId = mapPrismaDocToMongoose(clone.supplier, 'Supplier');
      delete clone.supplier;
    }
    if (clone.product) {
      clone.productId = mapPrismaDocToMongoose(clone.product, 'Product');
      delete clone.product;
    }
    if (clone.paymentsHistory) {
      clone.paymentsHistory = makeMongooseArray(clone.paymentsHistory.map((h: any) => ({
        ...h,
        _id: h.id
      })));
    } else {
      clone.paymentsHistory = makeMongooseArray([]);
    }
  }
  
  if (modelName === 'Purchase') {
    if (clone.supplier) {
      clone.supplierId = mapPrismaDocToMongoose(clone.supplier, 'Supplier');
      delete clone.supplier;
    }
    if (clone.product) {
      clone.productId = mapPrismaDocToMongoose(clone.product, 'Product');
      delete clone.product;
    }
    if (clone.warehouseAllocations) {
      clone.warehouseAllocations = makeMongooseArray(clone.warehouseAllocations.map((a: any) => ({
        ...a,
        _id: a.id
      })));
    } else {
      clone.warehouseAllocations = makeMongooseArray([]);
    }
  }
  
  if (modelName === 'Warehouse') {
    if (clone.products) {
      clone.products = makeMongooseArray(clone.products.map((p: any) => {
        const pClone = { ...p };
        Object.defineProperty(pClone, '_id', {
          get() { return this.id; },
          set(val) { this.id = val; },
          enumerable: true,
          configurable: true
        });
        if (pClone.product) {
          pClone.productId = mapPrismaDocToMongoose(pClone.product, 'Product');
          delete pClone.product;
        }
        return pClone;
      }));
      clone.currentStock = clone.products.reduce((sum: number, p: any) => sum + (p.stock || 0), 0);
    } else {
      clone.products = makeMongooseArray([]);
      clone.currentStock = 0;
    }
  }
  
  if (modelName === 'Lead') {
    if (clone.assignedTo) {
      clone.assignedTo = mapPrismaDocToMongoose(clone.assignedTo, 'User');
    }
    if (clone.createdBy) {
      clone.createdBy = mapPrismaDocToMongoose(clone.createdBy, 'User');
    }
    if (clone.notes) {
      clone.notes = makeMongooseArray(clone.notes.map((n: any) => ({ ...n, _id: n.id })));
    } else {
      clone.notes = makeMongooseArray([]);
    }
    if (clone.tasks) {
      clone.tasks = makeMongooseArray(clone.tasks.map((t: any) => ({ ...t, _id: t.id })));
    } else {
      clone.tasks = makeMongooseArray([]);
    }
    if (clone.followUps) {
      clone.followUps = makeMongooseArray(clone.followUps.map((f: any) => ({ ...f, _id: f.id })));
    } else {
      clone.followUps = makeMongooseArray([]);
    }
  }
  
  clone.save = async function() {
    return saveMongooseDoc(this, modelName);
  };
  
  return clone;
}

async function saveMongooseDoc(instance: any, modelName: string) {
  const isNew = !instance.id && !instance._id;
  
  const data: any = {};
  for (const [key, val] of Object.entries(instance)) {
    if (typeof val === 'function') continue;
    if (key === '_id' || key === 'id') continue;
    
    if (['activityLog', 'loginHistory', 'variants', 'productsSupplied', 'purchaseHistory', 
         'products', 'paymentsHistory', 'warehouseAllocations', 'items', 'notes', 'tasks', 'followUps'].includes(key)) {
      continue;
    }
    
    data[key] = val;
  }
  
  delete data.currentStock;
  delete data.totalInventoryValue;
  
  if (modelName === 'Product' && Array.isArray(instance.tags)) {
    data.tags = instance.tags.join(',');
  }

  if (data.supplierId && typeof data.supplierId === 'object') {
    data.supplierId = data.supplierId.id || data.supplierId._id;
  }
  if (data.warehouseId && typeof data.warehouseId === 'object') {
    data.warehouseId = data.warehouseId.id || data.warehouseId._id;
  }
  if (data.customerId && typeof data.customerId === 'object') {
    data.customerId = data.customerId.id || data.customerId._id;
  }
  if (data.productId && typeof data.productId === 'object') {
    data.productId = data.productId.id || data.productId._id;
  }
  if (data.product_id && typeof data.product_id === 'object') {
    data.product_id = data.product_id.id || data.product_id._id;
  }
  if (data.parent_id && typeof data.parent_id === 'object') {
    data.parent_id = data.parent_id.id || data.parent_id._id;
  }
  if (data.assignedToId && typeof data.assignedToId === 'object') {
    data.assignedToId = data.assignedToId.id || data.assignedToId._id;
  }
  if (data.createdById && typeof data.createdById === 'object') {
    data.createdById = data.createdById.id || data.createdById._id;
  }

  let prismaModel: any = (prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
  if (modelName === 'SupplierPayment') prismaModel = prisma.supplierPayment;
  if (modelName === 'StockMovement') prismaModel = prisma.stockMovement;
  
  let savedDoc: any;
  if (isNew) {
    savedDoc = await prismaModel.create({ data });
  } else {
    const id = instance.id || instance._id;
    savedDoc = await prismaModel.update({
      where: { id },
      data
    });
  }
  
  const savedId = savedDoc.id;
  instance.id = savedId;
  
  if (modelName === 'Supplier') {
    if (Array.isArray(instance.purchaseHistory)) {
      for (const item of instance.purchaseHistory) {
        if (!item.id && !item._id) {
          await prisma.purchaseRecord.create({
            data: {
              supplierId: savedId,
              productId: item.productId ? String(item.productId) : null,
              productName: item.productName,
              quantity: Number(item.quantity),
              totalCost: Number(item.totalCost),
              invoiceNumber: item.invoiceNumber,
              date: item.date ? new Date(item.date) : new Date()
            }
          });
        }
      }
    }
    if (Array.isArray(instance.productsSupplied)) {
      for (const prodId of instance.productsSupplied) {
        const productId = typeof prodId === 'object' ? (prodId.id || prodId._id) : String(prodId);
        await prisma.product.update({
          where: { id: productId },
          data: { supplierId: savedId }
        });
      }
    }
  }

  if (modelName === 'Warehouse') {
    if (Array.isArray(instance.products)) {
      for (const wp of instance.products) {
        const prodId = typeof wp.productId === 'object' ? (wp.productId.id || wp.productId._id) : String(wp.productId);
        const wpi = wp.id || wp._id;
        if (!wpi) {
          await prisma.warehouseProduct.create({
            data: {
              warehouseId: savedId,
              productId: prodId,
              variantId: wp.variantId ? String(wp.variantId) : null,
              variantName: wp.variantName,
              stock: Number(wp.stock)
            }
          });
        } else {
          await prisma.warehouseProduct.update({
            where: { id: wpi },
            data: {
              stock: Number(wp.stock)
            }
          });
        }
      }
    }
  }

  if (modelName === 'Product') {
    if (Array.isArray(instance.variants)) {
      for (const v of instance.variants) {
        const vi = v.id || v._id;
        if (!vi) {
          await prisma.variant.create({
            data: {
              productId: savedId,
              name: v.name,
              sku: v.sku,
              costPrice: Number(v.costPrice),
              sellingPrice: Number(v.sellingPrice),
              stock: Number(v.stock),
              unit: v.unit || 'PIECE',
              supplierId: v.supplierId ? String(v.supplierId) : null
            }
          });
        } else {
          await prisma.variant.update({
            where: { id: vi },
            data: {
              name: v.name,
              sku: v.sku,
              costPrice: Number(v.costPrice),
              sellingPrice: Number(v.sellingPrice),
              stock: Number(v.stock),
              unit: v.unit || 'PIECE'
            }
          });
        }
      }
    }
  }

  if (modelName === 'Sale') {
    if (Array.isArray(instance.items)) {
      for (const item of instance.items) {
        const itemProdId = typeof item.productId === 'object' ? (item.productId.id || item.productId._id) : String(item.productId);
        const item_id = item.id || item._id;
        if (!item_id) {
          await prisma.saleItem.create({
            data: {
              saleId: savedId,
              productId: itemProdId,
              variantId: item.variantId ? String(item.variantId) : null,
              name: item.name,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              costPrice: Number(item.costPrice),
              totalPrice: Number(item.totalPrice),
              unit: item.unit || 'UNIT'
            }
          });
        }
      }
    }
  }

  if (modelName === 'SupplierPayment') {
    if (Array.isArray(instance.paymentsHistory)) {
      for (const entry of instance.paymentsHistory) {
        const entryId = entry.id || entry._id;
        if (!entryId) {
          await prisma.paymentHistoryEntry.create({
            data: {
              supplierPaymentId: savedId,
              amount: Number(entry.amount),
              paymentDate: entry.paymentDate ? new Date(entry.paymentDate) : new Date(),
              paymentMethod: entry.paymentMethod,
              transactionId: entry.transactionId,
              notes: entry.notes
            }
          });
        }
      }
    }
  }

  if (modelName === 'Purchase') {
    if (Array.isArray(instance.warehouseAllocations)) {
      for (const alloc of instance.warehouseAllocations) {
        const allocId = alloc.id || alloc._id;
        if (!allocId) {
          await prisma.warehouseAllocation.create({
            data: {
              purchaseId: savedId,
              warehouseId: String(alloc.warehouseId),
              quantity: Number(alloc.quantity)
            }
          });
        }
      }
    }
  }

  if (modelName === 'Lead') {
    if (Array.isArray(instance.notes)) {
      for (const note of instance.notes) {
        if (!note.id && !note._id) {
          await prisma.leadNote.create({
            data: {
              leadId: savedId,
              content: note.content,
              createdBy: note.createdBy
            }
          });
        }
      }
    }
    if (Array.isArray(instance.tasks)) {
      for (const task of instance.tasks) {
        const taskId = task.id || task._id;
        if (!taskId) {
          await prisma.leadTask.create({
            data: {
              leadId: savedId,
              title: task.title,
              dueDate: task.dueDate ? new Date(task.dueDate) : null,
              completed: !!task.completed
            }
          });
        } else {
          await prisma.leadTask.update({
            where: { id: taskId },
            data: { completed: !!task.completed }
          });
        }
      }
    }
    if (Array.isArray(instance.followUps)) {
      for (const f of instance.followUps) {
        const fId = f.id || f._id;
        if (!fId) {
          await prisma.leadFollowUp.create({
            data: {
              leadId: savedId,
              date: new Date(f.date),
              notes: f.notes,
              completed: !!f.completed
            }
          });
        } else {
          await prisma.leadFollowUp.update({
            where: { id: fId },
            data: { completed: !!f.completed }
          });
        }
      }
    }
  }

  const completeDoc = await prismaModel.findUnique({
    where: { id: savedId },
    include: getPrismaInclude(modelName, ['permissions', 'activityLog', 'loginHistory', 'variants', 'productsSupplied', 'paymentsHistory', 'warehouseAllocations', 'items', 'notes', 'tasks', 'followUps'])
  });

  return mapPrismaDocToMongoose(completeDoc, modelName);
}

async function handleUpdateQuery(id: string, updateData: any, modelName: string) {
  let prismaModel: any = (prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
  if (modelName === 'SupplierPayment') prismaModel = prisma.supplierPayment;
  if (modelName === 'StockMovement') prismaModel = prisma.stockMovement;
  
  if (updateData.$push) {
    const pushKeys = Object.keys(updateData.$push);
    for (const key of pushKeys) {
      const val = updateData.$push[key];
      if (modelName === 'User' && key === 'activityLog') {
        const logs = val.$each || [val];
        for (const log of logs) {
          await prisma.activityLog.create({
            data: {
              userId: id,
              action: log.action,
              details: log.details,
              ip: log.ip,
              userAgent: log.userAgent,
              timestamp: log.timestamp ? new Date(log.timestamp) : new Date()
            }
          });
        }
      }
      if (modelName === 'User' && key === 'loginHistory') {
        const logins = val.$each || [val];
        for (const login of logins) {
          await prisma.loginHistory.create({
            data: {
              userId: id,
              ip: login.ip,
              userAgent: login.userAgent,
              timestamp: login.timestamp ? new Date(login.timestamp) : new Date()
            }
          });
        }
      }
    }
  }
  
  const cleanData: any = {};
  
  if (updateData.$set) {
    Object.assign(cleanData, updateData.$set);
  }
  if (updateData.$unset) {
    for (const key of Object.keys(updateData.$unset)) {
      cleanData[key] = null;
    }
  }
  if (updateData.$inc) {
    for (const [key, val] of Object.entries(updateData.$inc)) {
      cleanData[key] = {
        increment: Number(val)
      };
    }
  }
  
  for (const [key, val] of Object.entries(updateData)) {
    if (key.startsWith('$')) continue;
    if (key === '_id' || key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
    
    if (['activityLog', 'loginHistory', 'variants', 'productsSupplied', 'purchaseHistory', 
         'products', 'paymentsHistory', 'warehouseAllocations', 'items', 'notes', 'tasks', 'followUps'].includes(key)) {
      continue;
    }
    
    cleanData[key] = val;
  }

  if (modelName === 'Product' && Array.isArray(cleanData.tags)) {
    cleanData.tags = cleanData.tags.join(',');
  }

  if (Object.keys(cleanData).length > 0) {
    if (cleanData.supplierId && typeof cleanData.supplierId === 'object') {
      cleanData.supplierId = cleanData.supplierId.id || cleanData.supplierId._id;
    }
    if (cleanData.warehouseId && typeof cleanData.warehouseId === 'object') {
      cleanData.warehouseId = cleanData.warehouseId.id || cleanData.warehouseId._id;
    }
    if (cleanData.customerId && typeof cleanData.customerId === 'object') {
      cleanData.customerId = cleanData.customerId.id || cleanData.customerId._id;
    }
    if (cleanData.productId && typeof cleanData.productId === 'object') {
      cleanData.productId = cleanData.productId.id || cleanData.productId._id;
    }
    if (cleanData.assignedToId && typeof cleanData.assignedToId === 'object') {
      cleanData.assignedToId = cleanData.assignedToId.id || cleanData.assignedToId._id;
    }
    if (cleanData.createdById && typeof cleanData.createdById === 'object') {
      cleanData.createdById = cleanData.createdById.id || cleanData.createdById._id;
    }

    await prismaModel.update({
      where: { id },
      data: cleanData
    });
  }

  const updatedDoc = await prismaModel.findUnique({
    where: { id },
    include: getPrismaInclude(modelName, ['permissions', 'activityLog', 'loginHistory', 'variants', 'productsSupplied', 'paymentsHistory', 'warehouseAllocations', 'items', 'notes', 'tasks', 'followUps'])
  });
  return mapPrismaDocToMongoose(updatedDoc, modelName);
}

async function updateMany(filter: any, update: any, modelName: string) {
  let prismaModel: any = (prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
  if (modelName === 'SupplierPayment') prismaModel = prisma.supplierPayment;
  if (modelName === 'StockMovement') prismaModel = prisma.stockMovement;
  
  const prismaFilter = translateQuery(filter);
  const cleanData: any = {};
  
  if (update.$set) {
    Object.assign(cleanData, update.$set);
  }
  if (update.$unset) {
    for (const key of Object.keys(update.$unset)) {
      cleanData[key] = null;
    }
  }
  if (update.$inc) {
    for (const [key, val] of Object.entries(update.$inc)) {
      cleanData[key] = {
        increment: Number(val)
      };
    }
  }
  
  for (const [key, val] of Object.entries(update)) {
    if (key.startsWith('$')) continue;
    if (key === 'id' || key === '_id') continue;
    cleanData[key] = val;
  }

  return prismaModel.updateMany({
    where: prismaFilter,
    data: cleanData
  });
}

export class MongooseModelWrapper {
  modelName: string;
  
  constructor(modelName: string) {
    this.modelName = modelName;
  }
  
  find(query: any = {}) {
    const self = this;
    const filter = translateQuery(query);
    const populatePaths: string[] = [];
    let sortOption: any = undefined;
    
    const chain = {
      populate(path: string) {
        populatePaths.push(path);
        return this;
      },
      sort(sortObj: any) {
        sortOption = sortObj;
        return this;
      },
      select(selectStr: string) {
        return this;
      },
      then(resolve: any, reject: any) {
        return self.executeFind(filter, populatePaths, sortOption).then(resolve, reject);
      },
      catch(cb: any) {
        return self.executeFind(filter, populatePaths, sortOption).catch(cb);
      }
    };
    
    Object.defineProperty(chain, 'then', {
      value: function(resolve: any, reject: any) {
        return self.executeFind(filter, populatePaths, sortOption).then(resolve, reject);
      },
      writable: true,
      configurable: true
    });
    
    return chain;
  }

  async executeFind(filter: any, populatePaths: string[], sortOption: any) {
    let prismaModel: any = (prisma as any)[this.modelName.charAt(0).toLowerCase() + this.modelName.slice(1)];
    if (this.modelName === 'SupplierPayment') prismaModel = prisma.supplierPayment;
    if (this.modelName === 'StockMovement') prismaModel = prisma.stockMovement;
    
    const include = getPrismaInclude(this.modelName, populatePaths);
    
    let orderBy: any = undefined;
    if (sortOption) {
      const keys = Object.keys(sortOption);
      if (keys.length > 0) {
        orderBy = {
          [keys[0]]: sortOption[keys[0]] === -1 || sortOption[keys[0]] === 'desc' ? 'desc' : 'asc'
        };
      }
    }
    
    const docs = await prismaModel.findMany({
      where: filter,
      include,
      orderBy
    });
    
    return mapPrismaDocToMongoose(docs, this.modelName);
  }

  findOne(query: any = {}) {
    const self = this;
    const filter = translateQuery(query);
    const populatePaths: string[] = [];
    
    const chain = {
      populate(path: string) {
        populatePaths.push(path);
        return this;
      },
      select(selectStr: string) {
        return this;
      },
      then(resolve: any, reject: any) {
        return self.executeFindOne(filter, populatePaths).then(resolve, reject);
      }
    };
    
    Object.defineProperty(chain, 'then', {
      value: function(resolve: any, reject: any) {
        return self.executeFindOne(filter, populatePaths).then(resolve, reject);
      },
      writable: true,
      configurable: true
    });
    
    return chain;
  }

  async executeFindOne(filter: any, populatePaths: string[]) {
    let prismaModel: any = (prisma as any)[this.modelName.charAt(0).toLowerCase() + this.modelName.slice(1)];
    if (this.modelName === 'SupplierPayment') prismaModel = prisma.supplierPayment;
    if (this.modelName === 'StockMovement') prismaModel = prisma.stockMovement;
    
    const include = getPrismaInclude(this.modelName, populatePaths);
    
    const doc = await prismaModel.findFirst({
      where: filter,
      include
    });
    
    return mapPrismaDocToMongoose(doc, this.modelName);
  }

  findById(id: string) {
    const self = this;
    const populatePaths: string[] = [];
    
    const chain = {
      populate(path: string) {
        populatePaths.push(path);
        return this;
      },
      select(selectStr: string) {
        return this;
      },
      then(resolve: any, reject: any) {
        return self.executeFindById(id, populatePaths).then(resolve, reject);
      }
    };
    
    Object.defineProperty(chain, 'then', {
      value: function(resolve: any, reject: any) {
        return self.executeFindById(id, populatePaths).then(resolve, reject);
      },
      writable: true,
      configurable: true
    });
    
    return chain;
  }

  async executeFindById(id: string, populatePaths: string[]) {
    if (!id) return null;
    let prismaModel: any = (prisma as any)[this.modelName.charAt(0).toLowerCase() + this.modelName.slice(1)];
    if (this.modelName === 'SupplierPayment') prismaModel = prisma.supplierPayment;
    if (this.modelName === 'StockMovement') prismaModel = prisma.stockMovement;
    
    const include = getPrismaInclude(this.modelName, populatePaths);
    
    const doc = await prismaModel.findUnique({
      where: { id: String(id) },
      include
    });
    
    return mapPrismaDocToMongoose(doc, this.modelName);
  }

  async findByIdAndUpdate(id: string, update: any, options: any = {}) {
    if (!id) return null;
    return handleUpdateQuery(String(id), update, this.modelName);
  }

  async findOneAndUpdate(filter: any, update: any, options: any = {}) {
    const cleanFilter: any = {};
    let variantId: string | null = null;
    let variantStockMin: number | null = null;
    
    for (const [key, val] of Object.entries(filter)) {
      if (key === '_id' || key === 'id') {
        cleanFilter.id = String(val);
      } else if (key === 'variants._id' || key === 'variants.id') {
        variantId = String(val);
      } else if (key === 'variants.stock') {
        if (val && typeof val === 'object' && '$gte' in val) {
          variantStockMin = Number((val as any).$gte);
        }
      } else {
        cleanFilter[key] = val;
      }
    }
    
    const doc = await this.executeFindOne(cleanFilter, []);
    if (!doc) return null;
    
    if (variantId) {
      const variant = await prisma.variant.findUnique({
        where: { id: variantId }
      });
      if (!variant || variant.productId !== doc.id) return null;
      if (variantStockMin !== null && variant.stock < variantStockMin) return null;
    }
    
    const incObj = update.$inc || {};
    const setObj = update.$set || {};
    
    let variantUpdateVal: number | null = null;
    for (const [key, val] of Object.entries(incObj)) {
      if (key.startsWith('variants.$.') || key.startsWith('variants.')) {
        if (key.endsWith('.stock')) {
          variantUpdateVal = Number(val);
        }
      }
    }
    
    if (variantId && variantUpdateVal !== null) {
      await prisma.variant.update({
        where: { id: variantId },
        data: {
          stock: {
            increment: variantUpdateVal
          }
        }
      });
    }
    
    const productUpdateData: any = {};
    for (const [key, val] of Object.entries(incObj)) {
      if (key.startsWith('variants.')) continue;
      productUpdateData[key] = {
        increment: Number(val)
      };
    }
    
    const allSets = { ...update, ...setObj };
    for (const [key, val] of Object.entries(allSets)) {
      if (key.startsWith('$')) continue;
      if (key.startsWith('variants.')) continue;
      if (key === 'id' || key === '_id') continue;
      productUpdateData[key] = val;
    }
    
    if (Object.keys(productUpdateData).length > 0) {
      let prismaModel: any = (prisma as any)[this.modelName.charAt(0).toLowerCase() + this.modelName.slice(1)];
      if (this.modelName === 'SupplierPayment') prismaModel = prisma.supplierPayment;
      if (this.modelName === 'StockMovement') prismaModel = prisma.stockMovement;
      
      await prismaModel.update({
        where: { id: doc.id },
        data: productUpdateData
      });
    }
    
    return await this.executeFindById(doc.id, []);
  }

  async findByIdAndDelete(id: string) {
    if (!id) return null;
    let prismaModel: any = (prisma as any)[this.modelName.charAt(0).toLowerCase() + this.modelName.slice(1)];
    if (this.modelName === 'SupplierPayment') prismaModel = prisma.supplierPayment;
    if (this.modelName === 'StockMovement') prismaModel = prisma.stockMovement;
    
    try {
      const deleted = await prismaModel.delete({
        where: { id: String(id) }
      });
      return mapPrismaDocToMongoose(deleted, this.modelName);
    } catch (e: any) {
      if (e.code === 'P2025' || e.message?.includes('Record to delete does not exist')) {
        return null;
      }
      throw e;
    }
  }

  async create(data: any): Promise<any> {
    if (Array.isArray(data)) {
      const results = [];
      for (const item of data) {
        results.push(await this.create(item));
      }
      return results;
    }
    
    const instance = this.instantiate(data);
    return instance.save();
  }

  async deleteMany(filter: any = {}) {
    let prismaModel: any = (prisma as any)[this.modelName.charAt(0).toLowerCase() + this.modelName.slice(1)];
    if (this.modelName === 'SupplierPayment') prismaModel = prisma.supplierPayment;
    if (this.modelName === 'StockMovement') prismaModel = prisma.stockMovement;
    
    const prismaFilter = translateQuery(filter);
    return prismaModel.deleteMany({
      where: prismaFilter
    });
  }

  async updateMany(filter: any, update: any) {
    return updateMany(filter, update, this.modelName);
  }

  async countDocuments(filter: any = {}) {
    let prismaModel: any = (prisma as any)[this.modelName.charAt(0).toLowerCase() + this.modelName.slice(1)];
    if (this.modelName === 'SupplierPayment') prismaModel = prisma.supplierPayment;
    if (this.modelName === 'StockMovement') prismaModel = prisma.stockMovement;
    
    const prismaFilter = translateQuery(filter);
    return prismaModel.count({
      where: prismaFilter
    });
  }

  instantiate(data: any) {
    const clone = { ...data };
    
    Object.defineProperty(clone, '_id', {
      get() { return this.id; },
      set(val) { this.id = val; },
      enumerable: true,
      configurable: true
    });
    
    clone.save = async function() {
      return saveMongooseDoc(this, this.__modelName);
    };
    
    Object.defineProperty(clone, '__modelName', {
      value: this.modelName,
      writable: false,
      enumerable: false
    });
    
    return clone;
  }
}

export function createModelMock(modelName: string) {
  const modelWrapper = new MongooseModelWrapper(modelName);
  
  function ModelConstructor(this: any, data: any) {
    if (!(this instanceof ModelConstructor)) {
      return modelWrapper.instantiate(data);
    }
    Object.assign(this, modelWrapper.instantiate(data));
  }
  
  Object.assign(ModelConstructor, {
    find: (query: any) => modelWrapper.find(query),
    findOne: (query: any) => modelWrapper.findOne(query),
    findById: (id: string) => modelWrapper.findById(id),
    findByIdAndUpdate: (id: string, update: any, options: any) => modelWrapper.findByIdAndUpdate(id, update, options),
    findOneAndUpdate: (filter: any, update: any, options: any) => modelWrapper.findOneAndUpdate(filter, update, options),
    findByIdAndDelete: (id: string) => modelWrapper.findByIdAndDelete(id),
    create: (data: any) => modelWrapper.create(data),
    deleteMany: (filter: any) => modelWrapper.deleteMany(filter),
    updateMany: (filter: any, update: any) => modelWrapper.updateMany(filter, update),
    countDocuments: (filter: any) => modelWrapper.countDocuments(filter),
    modelName
  });
  
  return ModelConstructor as any;
}
