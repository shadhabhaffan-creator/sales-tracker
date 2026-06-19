import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Recursive utility to inject `_id` corresponding to `id` for frontend compatibility
function mapIds(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(mapIds);
  }
  const result: any = { ...obj };
  if (result.id && !result._id) {
    result._id = result.id;
  }
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'object') {
      result[key] = mapIds(result[key]);
    }
  }
  return result;
}

export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
) {
  // Parse body if it exists
  const body = options.body ? JSON.parse(options.body as string) : null;
  const method = options.method || 'GET';

  // Parse path segments: remove query params first
  const cleanUrl = endpoint.split('?')[0];
  const parts = cleanUrl.split('/').filter(Boolean);
  console.log("DEBUG fetchWithAuth endpoint:", endpoint, "method:", method, "parts:", parts);

  if (parts.length === 0) return [];

  const resource = parts[0];

  // 1. AUTH / EMPLOYEES / USERS
  if (resource === 'auth') {
    if (parts[1] === 'me') {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { user: null };
      
      const { data: profile } = await supabase
        .from('User')
        .select('*')
        .eq('id', session.user.id)
        .single();

      const { data: perms } = await supabase
        .from('Permission')
        .select('*')
        .eq('userId', session.user.id)
        .single();

      const permissionsMap: Record<string, boolean> = {};
      if (perms) {
        Object.keys(perms).forEach(k => {
          if (typeof perms[k] === 'boolean') permissionsMap[k] = perms[k];
        });
      }

      return {
        user: mapIds({
          id: session.user.id,
          username: profile?.username || session.user.email?.split('@')[0],
          fullName: profile?.fullName || 'System User',
          role: profile?.role || 'VIEWER',
          permissions: permissionsMap
        })
      };
    }
    
    if (parts[1] === 'profile' && method === 'PUT') {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthenticated');

      const updates: any = { username: body.username };
      if (body.password) {
        const hashed = await bcrypt.hash(body.password, 10);
        updates.password = hashed;
        // Also update Supabase Auth password
        await supabase.auth.updateUser({ password: body.password });
      }

      const { error } = await supabase
        .from('User')
        .update(updates)
        .eq('id', session.user.id);

      if (error) throw new Error(error.message);
      return { success: true };
    }
  }

  // 2. EMPLOYEES DIRECTORY
  if (resource === 'employees') {
    // GET /employees
    if (parts.length === 1 && method === 'GET') {
      const { data: users, error } = await supabase
        .from('User')
        .select('*, permissions:Permission(*)');

      if (error) throw new Error(error.message);

      return mapIds(users?.map(user => ({
        ...user,
        permissions: user.permissions?.[0] || user.permissions || {}
      })));
    }

    // POST /employees
    if (parts.length === 1 && method === 'POST') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      // Isolated Supabase Client to sign up the new user without clearing admin session
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });

      let email = body.email || '';
      if (!email || !email.includes('@')) {
        email = `${body.username}@aurasales.local`;
      }

      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email,
        password: body.temporaryPassword,
        options: {
          data: {
            fullName: body.fullName,
            username: body.username,
            role: body.role
          }
        }
      });

      if (signUpError) throw new Error(signUpError.message);

      const newUserId = signUpData.user?.id;
      if (!newUserId) throw new Error('Failed to retrieve signed-up user ID');

      const hashedPassword = await bcrypt.hash(body.temporaryPassword, 10);

      // Write user profile row
      const { error: userError } = await supabase
        .from('User')
        .upsert({
          id: newUserId,
          username: body.username,
          password: hashedPassword,
          fullName: body.fullName,
          email: email,
          phone: body.phone,
          role: body.role,
          profilePhoto: body.profilePhoto,
          status: 'ACTIVE'
        });

      if (userError) throw new Error(userError.message);

      // Write permissions row
      const { error: permError } = await supabase
        .from('Permission')
        .upsert({
          userId: newUserId,
          id: `perm_${newUserId}`,
          ...body.permissions
        });

      if (permError) throw new Error(permError.message);

      return { success: true };
    }

    const employeeId = parts[1];

    // GET /employees/:id/history
    if (parts.length === 3 && parts[2] === 'history' && method === 'GET') {
      const { data: activityLog } = await supabase
        .from('ActivityLog')
        .select('*')
        .eq('userId', employeeId)
        .order('timestamp', { ascending: false })
        .limit(50);

      const { data: loginHistory } = await supabase
        .from('LoginHistory')
        .select('*')
        .eq('userId', employeeId)
        .order('timestamp', { ascending: false })
        .limit(50);

      return {
        activityLog: activityLog || [],
        loginHistory: loginHistory || []
      };
    }

    // PUT /employees/:id/status
    if (parts.length === 3 && parts[2] === 'status' && method === 'PUT') {
      const { error } = await supabase
        .from('User')
        .update({ status: body.status })
        .eq('id', employeeId);

      if (error) throw new Error(error.message);
      return { success: true };
    }

    // PUT /employees/:id/password
    if (parts.length === 3 && parts[2] === 'password' && method === 'PUT') {
      const hashedPassword = await bcrypt.hash(body.newPassword, 10);
      const { error } = await supabase
        .from('User')
        .update({ password: hashedPassword })
        .eq('id', employeeId);

      if (error) throw new Error(error.message);
      return { success: true };
    }

    // PUT /employees/:id
    if (parts.length === 2 && method === 'PUT') {
      const { error: userError } = await supabase
        .from('User')
        .update({
          fullName: body.fullName,
          email: body.email,
          phone: body.phone,
          role: body.role,
          profilePhoto: body.profilePhoto
        })
        .eq('id', employeeId);

      if (userError) throw new Error(userError.message);

      const { error: permError } = await supabase
        .from('Permission')
        .update(body.permissions)
        .eq('userId', employeeId);

      if (permError) throw new Error(permError.message);

      return { success: true };
    }

    // DELETE /employees/:id
    if (parts.length === 2 && method === 'DELETE') {
      const { error } = await supabase
        .from('User')
        .delete()
        .eq('id', employeeId);

      if (error) throw new Error(error.message);
      return { success: true };
    }
  }

  // 3. PRODUCTS
  if (resource === 'products') {
    if (parts[2] === 'history' && method === 'GET') {
      const productId = parts[1];
      const { data: saleItems, error } = await supabase
        .from('SaleItem')
        .select('*, sale:Sale(*, customer:Customer(*))')
        .eq('productId', productId)
        .order('createdAt', { ascending: false })
        .limit(10);

      if (error) throw new Error(error.message);

      return mapIds((saleItems || []).map((item: any) => ({
        customerName: item.sale?.customer?.name || 'Guest',
        quantity: item.quantity,
        price: item.unitPrice,
        date: item.createdAt
      })));
    }

    if (method === 'GET') {
      const { data: products, error } = await supabase
        .from('Product')
        .select('*, variants:Variant(*)');

      if (error) throw new Error(error.message);

      // Dynamic stock calculation for CHILD products
      const productsWithDerivedStock = (products || []).map((p: any) => {
        if (p.type === 'CHILD' && p.parent_id) {
          const parentProduct = products.find((parent: any) => parent.id === p.parent_id);
          if (parentProduct) {
            p.stock = Math.floor((parentProduct.stock || 0) / (p.conversion_quantity || 1));
          } else {
            p.stock = 0;
          }
        }
        return p;
      });

      return mapIds(productsWithDerivedStock);
    }

    if (method === 'POST') {
      const newId = crypto.randomUUID();
      let calculatedStock = body.stock || 0;
      let calculatedCostPrice = body.costPrice || 0;
      let calculatedSellingPrice = body.sellingPrice || 0;

      if (body.variants && body.variants.length > 0) {
        calculatedStock = body.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
        calculatedCostPrice = Number(body.variants[0].costPrice) || 0;
        calculatedSellingPrice = Number(body.variants[0].sellingPrice) || 0;
      }

      const { error: productErr } = await supabase
        .from('Product')
        .insert({
          id: newId,
          name: body.name,
          sku: body.sku || null,
          category: body.category || null,
          stock: calculatedStock,
          costPrice: calculatedCostPrice,
          sellingPrice: calculatedSellingPrice,
          unit: body.unit || 'UNIT',
          image: body.image || null,
          supplierId: body.supplierId || null,
          type: body.type || 'STANDARD',
          parent_id: body.parent_id || null,
          conversion_quantity: body.conversion_quantity || null
        });

      if (productErr) throw new Error(productErr.message);

      // Sync Inventory Table
      if (body.type !== 'CHILD') {
        await supabase.from('Inventory').insert({
          id: crypto.randomUUID(),
          product_id: newId,
          stock_quantity: calculatedStock
        });
      }

      // Save allocations
      if (body.allocations && body.allocations.length > 0) {
        for (const alloc of body.allocations) {
          await supabase.from('WarehouseProduct').insert({
            id: crypto.randomUUID(),
            warehouseId: alloc.warehouseId,
            productId: newId,
            stock: alloc.quantity
          });
        }
      }

      // Save variants
      if (body.variants && body.variants.length > 0) {
        for (const v of body.variants) {
          const vId = crypto.randomUUID();
          await supabase.from('Variant').insert({
            id: vId,
            productId: newId,
            name: v.name,
            sku: v.sku || null,
            costPrice: v.costPrice,
            sellingPrice: v.sellingPrice,
            stock: v.stock || 0,
            unit: v.unit || 'PIECE',
            supplierId: v.supplierId || null
          });

          if (v.allocations && v.allocations.length > 0) {
            for (const alloc of v.allocations) {
              await supabase.from('WarehouseProduct').insert({
                id: crypto.randomUUID(),
                warehouseId: alloc.warehouseId,
                productId: newId,
                variantId: vId,
                variantName: v.name,
                stock: alloc.quantity
              });
            }
          }
        }
      }

      // Handle supplier payment info
      if (body.supplierPaymentInfo) {
        await supabase.from('SupplierPayment').insert({
          id: crypto.randomUUID(),
          supplierId: body.supplierPaymentInfo.supplierId,
          productId: newId,
          purchaseAmount: body.supplierPaymentInfo.purchaseAmount,
          amountPaid: body.supplierPaymentInfo.amountPaid,
          remainingBalance: body.supplierPaymentInfo.purchaseAmount - body.supplierPaymentInfo.amountPaid,
          paymentDate: new Date(body.supplierPaymentInfo.paymentDate).toISOString(),
          dueDate: new Date(body.supplierPaymentInfo.dueDate).toISOString(),
          transactionId: body.supplierPaymentInfo.transactionId || null,
          notes: body.supplierPaymentInfo.notes || null,
          receiptImage: body.supplierPaymentInfo.receiptImage || null,
          paymentMethod: body.supplierPaymentInfo.paymentMethod,
          status: (body.supplierPaymentInfo.purchaseAmount - body.supplierPaymentInfo.amountPaid) <= 0 ? 'PAID' : 'DEBT'
        });
      }

      return { id: newId, _id: newId };
    }

    if (method === 'PUT') {
      const productId = body.id || body._id;
      let calculatedStock = body.stock || 0;
      let calculatedCostPrice = body.costPrice || 0;
      let calculatedSellingPrice = body.sellingPrice || 0;

      if (body.variants && body.variants.length > 0) {
        calculatedStock = body.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
        calculatedCostPrice = Number(body.variants[0].costPrice) || 0;
        calculatedSellingPrice = Number(body.variants[0].sellingPrice) || 0;
      }

      const { error: productErr } = await supabase
        .from('Product')
        .update({
          name: body.name,
          sku: body.sku || null,
          category: body.category || null,
          stock: calculatedStock,
          costPrice: calculatedCostPrice,
          sellingPrice: calculatedSellingPrice,
          unit: body.unit || 'UNIT',
          image: body.image || null,
          supplierId: body.supplierId || null,
          type: body.type || 'STANDARD',
          parent_id: body.parent_id || null,
          conversion_quantity: body.conversion_quantity || null
        })
        .eq('id', productId);

      if (productErr) throw new Error(productErr.message);

      // Sync Inventory Table
      if (body.type !== 'CHILD') {
        const { data: inv } = await supabase.from('Inventory').select('*').eq('product_id', productId).maybeSingle();
        if (inv) {
          await supabase.from('Inventory').update({ stock_quantity: calculatedStock }).eq('id', inv.id);
        } else {
          await supabase.from('Inventory').insert({ id: crypto.randomUUID(), product_id: productId, stock_quantity: calculatedStock });
        }
      }

      // Replace allocations
      await supabase.from('WarehouseProduct').delete().eq('productId', productId);
      if (body.allocations && body.allocations.length > 0) {
        for (const alloc of body.allocations) {
          await supabase.from('WarehouseProduct').insert({
            id: crypto.randomUUID(),
            warehouseId: alloc.warehouseId,
            productId: productId,
            stock: alloc.quantity
          });
        }
      }

      // Replace variants
      await supabase.from('Variant').delete().eq('productId', productId);
      if (body.variants && body.variants.length > 0) {
        for (const v of body.variants) {
          const vId = crypto.randomUUID();
          await supabase.from('Variant').insert({
            id: vId,
            productId: productId,
            name: v.name,
            sku: v.sku || null,
            costPrice: v.costPrice,
            sellingPrice: v.sellingPrice,
            stock: v.stock || 0,
            unit: v.unit || 'PIECE',
            supplierId: v.supplierId || null
          });

          if (v.allocations && v.allocations.length > 0) {
            for (const alloc of v.allocations) {
              await supabase.from('WarehouseProduct').insert({
                id: crypto.randomUUID(),
                warehouseId: alloc.warehouseId,
                productId: productId,
                variantId: vId,
                variantName: v.name,
                stock: alloc.quantity
              });
            }
          }
        }
      }

      return { success: true };
    }

    if (method === 'DELETE') {
      const productId = body.id || body._id;
      const { error } = await supabase.from('Product').delete().eq('id', productId);
      if (error) throw new Error(error.message);
      return { success: true };
    }
  }

  // 4. CUSTOMERS
  if (resource === 'customers') {
    if (method === 'GET') {
      const { data, error } = await supabase.from('Customer').select('*');
      if (error) throw new Error(error.message);
      return mapIds(data);
    }
    if (method === 'POST') {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from('Customer').insert({
        id: newId,
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null
      });
      if (error) throw new Error(error.message);
      return { id: newId, _id: newId };
    }
    if (method === 'DELETE') {
      const id = body?.id || parts[1];
      const { error } = await supabase.from('Customer').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { success: true };
    }
  }

  // 5. SETTLEMENTS
  if (resource === 'settlements') {
    if (parts[1] === 'analytics') {
      const { data: settlements } = await supabase.from('Settlement').select('*');
      const { data: customers } = await supabase.from('Customer').select('*');

      const totalRecovered = settlements?.reduce((sum, s) => sum + (s.amountPaid || 0), 0) || 0;
      
      const todayStr = new Date().toISOString().split('T')[0];
      const daily = settlements?.filter(s => s.date && s.date.startsWith(todayStr))
        .reduce((sum, s) => sum + (s.amountPaid || 0), 0) || 0;

      const totalDues = customers?.reduce((sum, c) => sum + Math.max(0, (c.totalSpent || 0) - (c.totalPaid || 0)), 0) || 0;
      const overdueCount = customers?.filter(c => ((c.totalSpent || 0) - (c.totalPaid || 0)) > 0).length || 0;

      return {
        daily,
        totalRecovered,
        totalDues,
        overdueCount
      };
    }

    if (parts[1] === 'customer') {
      const customerId = parts[2];
      const { data, error } = await supabase.from('Settlement')
        .select('*')
        .eq('customerId', customerId)
        .order('date', { ascending: false });

      if (error) throw new Error(error.message);
      return mapIds(data);
    }

    if (method === 'GET') {
      const { data, error } = await supabase.from('Settlement').select('*, customer:Customer(*)');
      if (error) throw new Error(error.message);
      return mapIds(data?.map(s => ({ ...s, customerId: s.customer })));
    }

    if (method === 'POST') {
      const newId = crypto.randomUUID();
      const { error: insertErr } = await supabase.from('Settlement').insert({
        id: newId,
        customerId: body.customerId,
        amountPaid: body.amountPaid,
        paymentMethod: body.paymentMethod,
        notes: body.notes || null,
        handledBy: body.handledBy,
        remainingBalance: 0, // calculated client-side
        status: 'PAID'
      });

      if (insertErr) throw new Error(insertErr.message);

      // Increment customer's totalPaid
      const { data: cust } = await supabase.from('Customer').select('*').eq('id', body.customerId).single();
      if (cust) {
        await supabase.from('Customer').update({
          totalPaid: (cust.totalPaid || 0) + body.amountPaid
        }).eq('id', body.customerId);
      }

      return { success: true };
    }
  }

  // 6. SALES
  if (resource === 'sales') {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('Sale')
        .select('*, items:SaleItem(*), customer:Customer(*)');

      if (error) throw new Error(error.message);
      return mapIds(data?.map(sale => ({
        ...sale,
        customerId: sale.customer
      })));
    }

    if (method === 'POST') {
      const saleId = crypto.randomUUID();
      const invoiceId = `INV-${Date.now().toString().slice(-6)}`;
      
      // Pass 1: Aggregate and Validate Stock Levels
      const parentDeductions: Record<string, number> = {};
      const productCache: Record<string, any> = {};

      for (const item of body.items) {
        const { data: prod, error } = await supabase.from('Product').select('*').eq('id', item.productId).single();
        if (error || !prod) {
          throw new Error(`Product not found: ${item.name}`);
        }
        productCache[item.productId] = prod;

        if (prod.type === 'CHILD') {
          const pId = prod.parent_id;
          if (!pId) {
            throw new Error(`Child product "${prod.name}" has no linked parent product.`);
          }
          const neededParentStock = item.quantity * prod.conversion_quantity;
          parentDeductions[pId] = (parentDeductions[pId] || 0) + neededParentStock;
        } else {
          if (item.variantId) {
            const { data: variant } = await supabase.from('Variant').select('*').eq('id', item.variantId).single();
            if (!variant) {
              throw new Error(`Variant not found for product "${prod.name}"`);
            }
            if (variant.stock < item.quantity) {
              throw new Error(`Insufficient stock for variant "${variant.name}" of "${prod.name}". Available: ${variant.stock}`);
            }
          } else {
            parentDeductions[prod.id] = (parentDeductions[prod.id] || 0) + item.quantity;
          }
        }
      }

      // Validate aggregated deductions against current stocks
      for (const [prodId, requiredQty] of Object.entries(parentDeductions)) {
        const { data: parentProd } = await supabase.from('Product').select('*').eq('id', prodId).single();
        if (!parentProd) {
          throw new Error(`Parent product not found for ID: ${prodId}`);
        }
        if (parentProd.stock < requiredQty) {
          throw new Error(`Insufficient stock for product "${parentProd.name}". Required: ${requiredQty} ${parentProd.unit || 'LITER'}, Available: ${parentProd.stock} ${parentProd.unit || 'LITER'}`);
        }
      }

      let totalCost = 0;
      let totalAmount = 0;

      // Calculate cost and totals
      for (const item of body.items) {
        totalCost += (item.costPrice || 0) * (item.quantity || 1);
        totalAmount += (item.sellingPrice || 0) * (item.quantity || 1);
      }

      const val = parseFloat(body.discountValue) || 0;
      const discountAmount = body.discountType === 'PERCENT' ? (totalAmount * (val / 100)) : val;
      const discountedTotal = Math.max(0, totalAmount - discountAmount);
      const discountedProfit = discountedTotal - totalCost;
      const dueAmount = body.paymentType === 'CREDIT' ? discountedTotal : 0;

      let saleErr: any;
      try {
        const { error } = await supabase.from('Sale').insert({
          id: saleId,
          invoiceId,
          totalAmount: discountedTotal,
          discount: discountAmount,
          discountType: body.discountType || 'FLAT',
          discountValue: val,
          dueAmount,
          paymentType: body.paymentType,
          transactionId: body.transactionId || null,
          customerId: body.customerId || null,
          profit: discountedProfit,
          status: body.paymentType === 'CREDIT' ? 'UNPAID' : 'PAID',
          notes: body.notes || null
        });
        saleErr = error;
      } catch (err) {
        saleErr = err;
      }

      if (saleErr) {
        const errorMsg = saleErr.message || '';
        const isColumnError = errorMsg.includes('column') || errorMsg.includes('attribute') || errorMsg.includes('does not exist');
        
        if (isColumnError || !saleErr.message) {
          console.warn('Supabase discount columns missing, falling back to embedding discount in notes...');
          const discountLabel = body.discountType === 'PERCENT' ? `${val}%` : `${val}`;
          const fallbackNotes = body.notes 
            ? `${body.notes}\n[Applied Discount: ${discountLabel}]`
            : `[Applied Discount: ${discountLabel}]`;

          const { error: retryErr } = await supabase.from('Sale').insert({
            id: saleId,
            invoiceId,
            totalAmount: discountedTotal,
            dueAmount,
            paymentType: body.paymentType,
            transactionId: body.transactionId || null,
            customerId: body.customerId || null,
            profit: discountedProfit,
            status: body.paymentType === 'CREDIT' ? 'UNPAID' : 'PAID',
            notes: fallbackNotes
          });
          saleErr = retryErr;
        }
      }

      if (saleErr) throw new Error(saleErr.message);

      // Insert sale items and update product/variant stocks
      for (const item of body.items) {
        await supabase.from('SaleItem').insert({
          id: crypto.randomUUID(),
          saleId,
          productId: item.productId,
          variantId: item.variantId || null,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.sellingPrice,
          costPrice: item.costPrice,
          totalPrice: item.sellingPrice * item.quantity,
          unit: item.unit || 'UNIT'
        });

        const product = productCache[item.productId];

        if (product.type === 'CHILD') {
          const parentId = product.parent_id;
          const { data: parent } = await supabase.from('Product').select('*').eq('id', parentId).single();
          if (parent) {
            const requiredQty = item.quantity * product.conversion_quantity;
            const nextParentStock = Math.max(0, (parent.stock || 0) - requiredQty);
            
            // Deduct parent stock
            await supabase.from('Product').update({ stock: nextParentStock }).eq('id', parentId);

            // Sync parent inventory record
            const { data: inv } = await supabase.from('Inventory').select('*').eq('product_id', parentId).maybeSingle();
            if (inv) {
              await supabase.from('Inventory').update({ stock_quantity: nextParentStock }).eq('id', inv.id);
            } else {
              await supabase.from('Inventory').insert({ id: crypto.randomUUID(), product_id: parentId, stock_quantity: nextParentStock });
            }

            // Log parent stock movement
            await supabase.from('StockMovement').insert({
              id: crypto.randomUUID(),
              productId: parentId,
              type: 'OUTGOING',
              quantity: requiredQty,
              reference: `Conversion for child "${product.name}" sale (${invoiceId})`,
              performedBy: 'System Sale',
              createdAt: new Date().toISOString()
            });

            // Log child stock movement
            await supabase.from('StockMovement').insert({
              id: crypto.randomUUID(),
              productId: product.id,
              type: 'OUTGOING',
              quantity: item.quantity,
              reference: `Sale (Invoice: ${invoiceId})`,
              performedBy: 'System Sale',
              createdAt: new Date().toISOString()
            });
          }
        } else {
          // Standard / Variant product
          if (item.variantId) {
            const { data: v } = await supabase.from('Variant').select('*').eq('id', item.variantId).single();
            if (v) {
              const nextVarStock = Math.max(0, (v.stock || 0) - item.quantity);
              await supabase.from('Variant').update({ stock: nextVarStock }).eq('id', item.variantId);
              
              // Sum variant stocks for product total
              const { data: allVars } = await supabase.from('Variant').select('stock').eq('productId', product.id);
              const nextProdStock = (allVars || []).reduce((sum, vr) => sum + (vr.stock || 0), 0);
              await supabase.from('Product').update({ stock: nextProdStock }).eq('id', product.id);

              // Sync inventory record
              const { data: inv } = await supabase.from('Inventory').select('*').eq('product_id', product.id).maybeSingle();
              if (inv) {
                await supabase.from('Inventory').update({ stock_quantity: nextProdStock }).eq('id', inv.id);
              } else {
                await supabase.from('Inventory').insert({ id: crypto.randomUUID(), product_id: product.id, stock_quantity: nextProdStock });
              }

              // Log variant stock movement
              await supabase.from('StockMovement').insert({
                id: crypto.randomUUID(),
                productId: product.id,
                variantId: item.variantId,
                variantName: v.name,
                type: 'OUTGOING',
                quantity: item.quantity,
                reference: `Sale (Invoice: ${invoiceId})`,
                performedBy: 'System Sale',
                createdAt: new Date().toISOString()
              });
            }
          } else {
            const nextProdStock = Math.max(0, (product.stock || 0) - item.quantity);
            await supabase.from('Product').update({ stock: nextProdStock }).eq('id', product.id);

            // Sync inventory record
            const { data: inv } = await supabase.from('Inventory').select('*').eq('product_id', product.id).maybeSingle();
            if (inv) {
              await supabase.from('Inventory').update({ stock_quantity: nextProdStock }).eq('id', inv.id);
            } else {
              await supabase.from('Inventory').insert({ id: crypto.randomUUID(), product_id: product.id, stock_quantity: nextProdStock });
            }

            // Log stock movement
            await supabase.from('StockMovement').insert({
              id: crypto.randomUUID(),
              productId: product.id,
              type: 'OUTGOING',
              quantity: item.quantity,
              reference: `Sale (Invoice: ${invoiceId})`,
              performedBy: 'System Sale',
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // Update customer stats
      if (body.customerId) {
        const { data: cust } = await supabase.from('Customer').select('*').eq('id', body.customerId).single();
        if (cust) {
          const updates: any = {
            totalSpent: (cust.totalSpent || 0) + discountedTotal,
            lastPurchaseDate: new Date().toISOString()
          };
          if (body.paymentType !== 'CREDIT') {
            updates.totalPaid = (cust.totalPaid || 0) + discountedTotal;
          } else {
            updates.totalDue = (cust.totalDue || 0) + dueAmount;
            updates.totalPaid = (cust.totalPaid || 0) + (discountedTotal - dueAmount); // paidAmount
          }
          await supabase.from('Customer').update(updates).eq('id', body.customerId);
        }
      }

      return { success: true };
    }

    if (method === 'DELETE') {
      const id = body?.id || parts[1];

      // 1. Fetch sale items to restore stock
      const { data: saleItems } = await supabase.from('SaleItem').select('*').eq('saleId', id);
      const { data: sale } = await supabase.from('Sale').select('*').eq('id', id).single();
      
      if (saleItems && sale) {
        for (const item of saleItems) {
          const { data: p } = await supabase.from('Product').select('*').eq('id', item.productId).single();
          if (p) {
            if (p.type === 'CHILD') {
              const parentId = p.parent_id;
              const { data: parent } = await supabase.from('Product').select('*').eq('id', parentId).single();
              if (parent) {
                const restoredQty = item.quantity * p.conversion_quantity;
                const nextParentStock = (parent.stock || 0) + restoredQty;
                await supabase.from('Product').update({ stock: nextParentStock }).eq('id', parentId);

                // Sync inventory
                const { data: inv } = await supabase.from('Inventory').select('*').eq('product_id', parentId).maybeSingle();
                if (inv) {
                  await supabase.from('Inventory').update({ stock_quantity: nextParentStock }).eq('id', inv.id);
                } else {
                  await supabase.from('Inventory').insert({ id: crypto.randomUUID(), product_id: parentId, stock_quantity: nextParentStock });
                }

                // Log parent movement
                await supabase.from('StockMovement').insert({
                  id: crypto.randomUUID(),
                  productId: parentId,
                  type: 'INCOMING',
                  quantity: restoredQty,
                  reference: `Sale Reversal / Return (Invoice: ${sale.invoiceId})`,
                  performedBy: 'System Sale',
                  createdAt: new Date().toISOString()
                });
              }

              // Log child movement
              await supabase.from('StockMovement').insert({
                id: crypto.randomUUID(),
                productId: item.productId,
                type: 'INCOMING',
                quantity: item.quantity,
                reference: `Sale Reversal / Return (Invoice: ${sale.invoiceId})`,
                performedBy: 'System Sale',
                createdAt: new Date().toISOString()
              });
            } else {
              // Standard or variant
              if (item.variantId) {
                const { data: v } = await supabase.from('Variant').select('stock').eq('id', item.variantId).single();
                if (v) {
                  const nextVarStock = (v.stock || 0) + item.quantity;
                  await supabase.from('Variant').update({ stock: nextVarStock }).eq('id', item.variantId);
                }
                
                // Sum variant stocks for product total
                const { data: allVars } = await supabase.from('Variant').select('stock').eq('productId', p.id);
                const nextProdStock = (allVars || []).reduce((sum, vr) => sum + (vr.stock || 0), 0);
                await supabase.from('Product').update({ stock: nextProdStock }).eq('id', p.id);

                // Sync inventory
                const { data: inv } = await supabase.from('Inventory').select('*').eq('product_id', p.id).maybeSingle();
                if (inv) {
                  await supabase.from('Inventory').update({ stock_quantity: nextProdStock }).eq('id', inv.id);
                } else {
                  await supabase.from('Inventory').insert({ id: crypto.randomUUID(), product_id: p.id, stock_quantity: nextProdStock });
                }

                // Log variant stock movement
                await supabase.from('StockMovement').insert({
                  id: crypto.randomUUID(),
                  productId: p.id,
                  variantId: item.variantId,
                  variantName: item.variantName || null,
                  type: 'INCOMING',
                  quantity: item.quantity,
                  reference: `Sale Reversal / Return (Invoice: ${sale.invoiceId})`,
                  performedBy: 'System Sale',
                  createdAt: new Date().toISOString()
                });
              } else {
                const nextStock = (p.stock || 0) + item.quantity;
                await supabase.from('Product').update({ stock: nextStock }).eq('id', p.id);

                // Sync inventory
                const { data: inv } = await supabase.from('Inventory').select('*').eq('product_id', p.id).maybeSingle();
                if (inv) {
                  await supabase.from('Inventory').update({ stock_quantity: nextStock }).eq('id', inv.id);
                } else {
                  await supabase.from('Inventory').insert({ id: crypto.randomUUID(), product_id: p.id, stock_quantity: nextStock });
                }

                // Log movement
                await supabase.from('StockMovement').insert({
                  id: crypto.randomUUID(),
                  productId: p.id,
                  type: 'INCOMING',
                  quantity: item.quantity,
                  reference: `Sale Reversal / Return (Invoice: ${sale.invoiceId})`,
                  performedBy: 'System Sale',
                  createdAt: new Date().toISOString()
                });
              }
            }
          }
        }
      }

      // 2. Revert customer balance/stats if customer exists
      if (sale && sale.customerId) {
        const custId = sale.customerId.id || sale.customerId._id || sale.customerId;
        const { data: cust } = await supabase.from('Customer').select('*').eq('id', custId).single();
        if (cust) {
          const updates: any = {
            totalSpent: Math.max(0, (cust.totalSpent || 0) - sale.totalAmount)
          };
          if (sale.paymentType === 'CREDIT') {
            const paidUpfront = sale.totalAmount - (sale.dueAmount || 0);
            updates.totalDue = Math.max(0, (cust.totalDue || 0) - (sale.dueAmount || 0));
            updates.totalPaid = Math.max(0, (cust.totalPaid || 0) - paidUpfront);
          } else {
            updates.totalPaid = Math.max(0, (cust.totalPaid || 0) - sale.totalAmount);
          }
          await supabase.from('Customer').update(updates).eq('id', cust.id);
        }
      }

      // 3. Delete sale
      const { error } = await supabase.from('Sale').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { success: true };
    }
  }

  // 7. EXPENSES
  if (resource === 'expenses') {
    if (method === 'GET') {
      const { data, error } = await supabase.from('Expense').select('*');
      if (error) throw new Error(error.message);
      return mapIds(data);
    }
    if (method === 'POST') {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from('Expense').insert({
        id: newId,
        title: body.title,
        category: body.category,
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        transactionId: body.transactionId || null,
        notes: body.notes || null,
        attachment: body.attachment || null,
        isRecurring: body.isRecurring || false,
        recurringInterval: body.recurringInterval || 'NONE'
      });
      if (error) throw new Error(error.message);
      return { id: newId, _id: newId };
    }
    if (method === 'DELETE') {
      const id = body?.id || parts[1];
      const { error } = await supabase.from('Expense').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { success: true };
    }
  }

  // 8. WAREHOUSES
  if (resource === 'warehouses') {
    if (parts[1] === 'movements' && method === 'GET') {
      const { data, error } = await supabase
        .from('StockMovement')
        .select(`
          *,
          product:Product(*, supplier:Supplier(*)),
          warehouse:Warehouse(*),
          sourceWarehouse:Warehouse(*),
          destinationWarehouse:Warehouse(*)
        `)
        .order('createdAt', { ascending: false });

      if (error) throw new Error(error.message);
      return mapIds(data?.map(m => ({
        ...m,
        productId: m.product ? {
          ...m.product,
          supplierId: m.product.supplier
        } : null,
        warehouseId: m.warehouse || null,
        sourceWarehouseId: m.sourceWarehouse || null,
        destinationWarehouseId: m.destinationWarehouse || null
      })));
    }

    if (method === 'GET') {
      const { data: warehouses, error: whError } = await supabase.from('Warehouse').select('*');
      if (whError) throw new Error(whError.message);
      
      const { data: whProducts, error: whpError } = await supabase.from('WarehouseProduct').select('*');
      if (whpError) throw new Error(whpError.message);
      
      const { data: products, error: prodError } = await supabase.from('Product').select('*');
      if (prodError) throw new Error(prodError.message);
      
      const { data: suppliers, error: supError } = await supabase.from('Supplier').select('*');
      if (supError) throw new Error(supError.message);

      const warehousesWithProducts = warehouses.map(wh => {
        const whpList = (whProducts || [])
          .filter(wp => wp.warehouseId === wh.id)
          .map(wp => {
            const productDoc = (products || []).find(p => p.id === wp.productId);
            let populatedProduct = null;
            
            if (productDoc) {
              const supplierDoc = (suppliers || []).find(s => s.id === productDoc.supplierId);
              populatedProduct = {
                ...productDoc,
                supplierId: supplierDoc ? mapIds(supplierDoc) : null
              };
            }
            
            return {
              ...wp,
              productId: populatedProduct ? mapIds(populatedProduct) : null
            };
          });
          
        const currentStock = whpList.reduce((sum, wp) => sum + (wp.stock || 0), 0);
        
        return {
          ...wh,
          products: whpList,
          currentStock
        };
      });

      return mapIds(warehousesWithProducts);
    }
    if (method === 'POST') {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from('Warehouse').insert({
        id: newId,
        name: body.name,
        warehouseId: body.warehouseId || `WH-${Date.now().toString().slice(-4)}`,
        location: body.location || null,
        address: body.address || null,
        managerName: body.managerName || null,
        contactNumber: body.contactNumber || null,
        capacity: body.capacity || 0
      });
      if (error) throw new Error(error.message);
      return { id: newId, _id: newId };
    }
    if (method === 'PUT') {
      const id = parts[1] || body.id || body._id;
      const { error } = await supabase.from('Warehouse')
        .update({
          name: body.name,
          location: body.location || null,
          address: body.address || null,
          managerName: body.managerName || null,
          contactNumber: body.contactNumber || null,
          capacity: body.capacity || 0
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
      return { success: true };
    }
    if (method === 'DELETE') {
      const id = body?.id || parts[1];
      const { error } = await supabase.from('Warehouse').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { success: true };
    }
  }

  // 9. SUPPLIERS
  if (resource === 'suppliers') {
    if (method === 'GET') {
      const { data, error } = await supabase.from('Supplier').select('*');
      if (error) throw new Error(error.message);
      return mapIds(data);
    }
    if (method === 'POST') {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from('Supplier').insert({
        id: newId,
        name: body.name,
        companyName: body.companyName || null,
        contactPerson: body.contactPerson || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        country: body.country || null,
        gstTaxId: body.gstTaxId || null,
        paymentTerms: body.paymentTerms || null,
        notes: body.notes || null
      });
      if (error) throw new Error(error.message);
      return { id: newId, _id: newId };
    }
    if (method === 'PUT') {
      const id = parts[1] || body.id || body._id;
      const { error } = await supabase.from('Supplier')
        .update({
          name: body.name,
          companyName: body.companyName || null,
          contactPerson: body.contactPerson || null,
          phone: body.phone || null,
          email: body.email || null,
          address: body.address || null,
          city: body.city || null,
          state: body.state || null,
          country: body.country || null,
          gstTaxId: body.gstTaxId || null,
          paymentTerms: body.paymentTerms || null,
          notes: body.notes || null
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
      return { success: true };
    }
    if (method === 'DELETE') {
      const id = body?.id || parts[1];
      const { error } = await supabase.from('Supplier').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { success: true };
    }
  }

  // 10. PURCHASES & INTAKE
  if (resource === 'purchases') {
    if (parts[1] === 'dashboard') {
      const { data: purchases } = await supabase.from('Purchase').select('*');
      const { data: supplierPayments } = await supabase.from('SupplierPayment').select('*');

      const totalPurchases = purchases?.length || 0;
      const purchaseValue = purchases?.reduce((sum, p) => sum + (p.totalAmount || 0), 0) || 0;
      const outstandingAmount = supplierPayments?.reduce((sum, sp) => sum + (sp.remainingBalance || 0), 0) || 0;
      const pendingPayments = supplierPayments?.filter(sp => (sp.remainingBalance || 0) > 0).length || 0;

      return {
        totalPurchases,
        purchaseValue,
        outstandingAmount,
        pendingPayments
      };
    }

    if (parts[2] === 'pay' && method === 'POST') {
      const purchaseId = parts[1];
      const { data: p } = await supabase.from('Purchase').select('*').eq('id', purchaseId).single();
      if (!p) throw new Error('Purchase not found');

      const nextPaid = (p.amountPaid || 0) + body.amount;
      const nextRemaining = Math.max(0, (p.remainingBalance || 0) - body.amount);
      const nextStatus = nextRemaining <= 0 ? 'PAID' : 'PARTIAL';

      // Update Purchase record
      await supabase.from('Purchase')
        .update({
          amountPaid: nextPaid,
          remainingBalance: nextRemaining,
          paymentStatus: nextStatus
        })
        .eq('id', purchaseId);

      // Also update SupplierPayment if matching
      const { data: sp } = await supabase.from('SupplierPayment').select('*').eq('purchaseId', purchaseId).single();
      if (sp) {
        const nextSpPaid = (sp.amountPaid || 0) + body.amount;
        const nextSpRemaining = Math.max(0, (sp.remainingBalance || 0) - body.amount);
        const nextSpStatus = nextSpRemaining <= 0 ? 'PAID' : 'DEBT';

        await supabase.from('SupplierPayment')
          .update({
            amountPaid: nextSpPaid,
            remainingBalance: nextSpRemaining,
            status: nextSpStatus
          })
          .eq('id', sp.id);

        // Record payment history entry
        await supabase.from('PaymentHistoryEntry').insert({
          id: crypto.randomUUID(),
          supplierPaymentId: sp.id,
          amount: body.amount,
          paymentMethod: body.paymentMethod,
          transactionId: body.transactionId || null,
          notes: body.notes || null
        });
      }

      return { success: true };
    }

    if (method === 'GET') {
      const { data, error } = await supabase
        .from('Purchase')
        .select('*, supplier:Supplier(*), product:Product(*), warehouseAllocations:WarehouseAllocation(*)');

      if (error) throw new Error(error.message);
      return mapIds(data?.map(p => ({
        ...p,
        supplierId: p.supplier,
        productId: p.product
      })));
    }

    if (method === 'POST') {
      const newId = crypto.randomUUID();
      const purchaseId = `PUR-${Date.now().toString().slice(-6)}`;

      const { data: prod } = await supabase.from('Product').select('*').eq('id', body.productId).single();
      if (!prod) throw new Error('Product not found');

      const { error: purchaseErr } = await supabase.from('Purchase').insert({
        id: newId,
        purchaseId,
        invoiceNumber: body.invoiceNumber,
        supplierId: body.supplierId,
        productId: body.productId,
        productName: body.productName,
        variantName: body.variantName || null,
        quantity: body.quantity,
        unit: body.unit,
        costPrice: body.costPrice,
        totalAmount: body.totalAmount,
        notes: body.notes || null,
        amountPaid: body.amountPaid || 0,
        remainingBalance: body.remainingBalance,
        paymentMethod: body.paymentMethod,
        paymentStatus: body.paymentStatus
      });

      if (purchaseErr) throw new Error(purchaseErr.message);

      // Warehouse allocations
      if (body.allocations && body.allocations.length > 0) {
        for (const alloc of body.allocations) {
          await supabase.from('WarehouseAllocation').insert({
            id: crypto.randomUUID(),
            purchaseId: newId,
            warehouseId: alloc.warehouseId,
            quantity: alloc.quantity
          });

          // Determine target product for physical stock increment
          let targetProductId = body.productId;
          let targetAllocQty = alloc.quantity;

          if (prod.type === 'CHILD') {
            targetProductId = prod.parent_id;
            targetAllocQty = alloc.quantity * (prod.conversion_quantity || 1);
          }

          // Update/upsert warehouse product stock
          const { data: whp } = await supabase.from('WarehouseProduct')
            .select('*')
            .eq('warehouseId', alloc.warehouseId)
            .eq('productId', targetProductId)
            .maybeSingle();

          if (whp) {
            await supabase.from('WarehouseProduct')
              .update({ stock: (whp.stock || 0) + targetAllocQty })
              .eq('id', whp.id);
          } else {
            await supabase.from('WarehouseProduct').insert({
              id: crypto.randomUUID(),
              warehouseId: alloc.warehouseId,
              productId: targetProductId,
              stock: targetAllocQty
            });
          }
        }
      }

      // Update product inventory stock
      if (prod.type === 'CHILD') {
        const parentId = prod.parent_id;
        const { data: parent } = await supabase.from('Product').select('*').eq('id', parentId).single();
        if (parent) {
          const bulkQtyAdded = body.quantity * (prod.conversion_quantity || 1);
          const nextParentStock = (parent.stock || 0) + bulkQtyAdded;
          await supabase.from('Product').update({ stock: nextParentStock }).eq('id', parentId);

          // Sync parent inventory
          const { data: inv } = await supabase.from('Inventory').select('*').eq('product_id', parentId).maybeSingle();
          if (inv) {
            await supabase.from('Inventory').update({ stock_quantity: nextParentStock }).eq('id', inv.id);
          } else {
            await supabase.from('Inventory').insert({ id: crypto.randomUUID(), product_id: parentId, stock_quantity: nextParentStock });
          }

          // Log parent movement
          await supabase.from('StockMovement').insert({
            id: crypto.randomUUID(),
            productId: parentId,
            type: 'INCOMING',
            quantity: bulkQtyAdded,
            reference: `Bulk purchase of child "${prod.name}" (Invoice: ${body.invoiceNumber})`,
            performedBy: 'System Purchase',
            createdAt: new Date().toISOString()
          });

          // Log child movement
          await supabase.from('StockMovement').insert({
            id: crypto.randomUUID(),
            productId: prod.id,
            type: 'INCOMING',
            quantity: body.quantity,
            reference: `Purchase Invoice: ${body.invoiceNumber}`,
            performedBy: 'System Purchase',
            createdAt: new Date().toISOString()
          });
        }
      } else {
        const nextStock = (prod.stock || 0) + body.quantity;
        await supabase.from('Product').update({ stock: nextStock }).eq('id', body.productId);

        // Sync inventory
        const { data: inv } = await supabase.from('Inventory').select('*').eq('product_id', body.productId).maybeSingle();
        if (inv) {
          await supabase.from('Inventory').update({ stock_quantity: nextStock }).eq('id', inv.id);
        } else {
          await supabase.from('Inventory').insert({ id: crypto.randomUUID(), product_id: body.productId, stock_quantity: nextStock });
        }

        // Log movement
        await supabase.from('StockMovement').insert({
          id: crypto.randomUUID(),
          productId: body.productId,
          type: 'INCOMING',
          quantity: body.quantity,
          reference: `Purchase Invoice: ${body.invoiceNumber}`,
          performedBy: 'System Purchase',
          createdAt: new Date().toISOString()
        });
      }

      // Record outstanding debt payment
      if (body.remainingBalance > 0) {
        await supabase.from('SupplierPayment').insert({
          id: crypto.randomUUID(),
          supplierId: body.supplierId,
          productId: body.productId,
          purchaseAmount: body.totalAmount,
          amountPaid: body.amountPaid || 0,
          remainingBalance: body.remainingBalance,
          paymentDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          purchaseId: newId,
          notes: body.notes || null,
          paymentMethod: body.paymentMethod,
          status: 'DEBT'
        });
      }

      return { success: true };
    }
  }

  // 11. OUTSTANDING PAYMENTS / LIABILITY
  if (resource === 'supplier-payments') {
    if (parts[1] === 'dashboard') {
      const { data: payments } = await supabase.from('SupplierPayment').select('*');

      const totalOutstandingAmount = payments?.filter(p => p.status === 'DEBT')
        .reduce((sum, p) => sum + (p.remainingBalance || 0), 0) || 0;

      const totalDueSuppliers = new Set(payments?.filter(p => p.status === 'DEBT').map(p => p.supplierId)).size;

      const todayStr = new Date().toISOString().split('T')[0];
      const overduePayments = payments?.filter(p => p.status === 'DEBT' && p.dueDate && p.dueDate < todayStr).length || 0;
      const paymentsDueToday = payments?.filter(p => p.status === 'DEBT' && p.dueDate && p.dueDate.startsWith(todayStr)).length || 0;
      const upcomingDueDates = payments?.filter(p => p.status === 'DEBT' && p.dueDate && p.dueDate > todayStr).length || 0;

      return {
        totalOutstandingAmount,
        totalDueSuppliers,
        overduePayments,
        paymentsDueToday,
        upcomingDueDates
      };
    }

    if (parts[2] === 'pay' && method === 'POST') {
      const paymentId = parts[1];
      const { data: sp } = await supabase.from('SupplierPayment').select('*').eq('id', paymentId).single();
      if (!sp) throw new Error('Outstanding record not found');

      const nextPaid = (sp.amountPaid || 0) + body.amount;
      const nextRemaining = Math.max(0, (sp.remainingBalance || 0) - body.amount);
      const nextStatus = nextRemaining <= 0 ? 'PAID' : 'DEBT';

      await supabase.from('SupplierPayment')
        .update({
          amountPaid: nextPaid,
          remainingBalance: nextRemaining,
          status: nextStatus
        })
        .eq('id', paymentId);

      // Record history
      await supabase.from('PaymentHistoryEntry').insert({
        id: crypto.randomUUID(),
        supplierPaymentId: paymentId,
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        transactionId: body.transactionId || null,
        notes: body.notes || null
      });

      // Update matching purchase record if present
      if (sp.purchaseId) {
        const { data: p } = await supabase.from('Purchase').select('*').eq('id', sp.purchaseId).single();
        if (p) {
          const nextPPaid = (p.amountPaid || 0) + body.amount;
          const nextPRemaining = Math.max(0, (p.remainingBalance || 0) - body.amount);
          const nextPStatus = nextPRemaining <= 0 ? 'PAID' : 'PARTIAL';

          await supabase.from('Purchase')
            .update({
              amountPaid: nextPPaid,
              remainingBalance: nextPRemaining,
              paymentStatus: nextPStatus
            })
            .eq('id', sp.purchaseId);
        }
      }

      return { success: true };
    }

    if (method === 'GET') {
      const { data, error } = await supabase
        .from('SupplierPayment')
        .select('*, supplier:Supplier(*), product:Product(*), paymentsHistory:PaymentHistoryEntry(*)');

      if (error) throw new Error(error.message);
      return mapIds(data?.map(sp => ({
        ...sp,
        supplierId: sp.supplier,
        productId: sp.product,
        paymentsHistory: sp.paymentsHistory || []
      })));
    }
  }

  // 12. REPORTS
  if (resource === 'reports') {
    if (parts[1] === 'daily') {
      // Dynamic Business Intelligence calculations
      const { data: sales } = await supabase.from('Sale').select('*');
      const { data: expenses } = await supabase.from('Expense').select('*');
      const { data: settlements } = await supabase.from('Settlement').select('*');
      const { data: products } = await supabase.from('Product').select('*, variants:Variant(*)');

      const totalSales = sales?.reduce((sum, s) => sum + (s.totalAmount || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const totalProfit = sales?.reduce((sum, s) => sum + (s.profit || 0), 0) || 0;
      const netProfit = totalProfit - totalExpenses;

      let inventoryValue = 0;
      products?.forEach(p => {
        if (p.variants && p.variants.length > 0) {
          p.variants.forEach((v: any) => {
            inventoryValue += (v.stock || 0) * (v.costPrice || 0);
          });
        } else {
          inventoryValue += (p.stock || 0) * (p.costPrice || 0);
        }
      });

      // Daily trends for past 7 days
      const trends: any[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const daySales = sales?.filter(s => s.date && s.date.startsWith(dateStr)) || [];
        const daySalesSum = daySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const dayProfitSum = daySales.reduce((sum, s) => sum + (s.profit || 0), 0);

        trends.push({
          date: d.toLocaleDateString('en-US', { weekday: 'short' }),
          sales: daySalesSum,
          profit: dayProfitSum
        });
      }

      return {
        summary: {
          totalSales,
          totalExpenses,
          totalProfit,
          netProfit,
          inventoryValue
        },
        details: {
          salesCount: sales?.length || 0,
          settlementsCount: settlements?.length || 0,
          expensesCount: expenses?.length || 0
        },
        trends
      };
    }
  }

  // 13. STOCK MOVEMENTS
  if (resource === 'stock-movements' && method === 'GET') {
    const { data, error } = await supabase
      .from('StockMovement')
      .select(`
        *,
        product:Product(*, supplier:Supplier(*)),
        warehouse:Warehouse(*),
        sourceWarehouse:Warehouse(*),
        destinationWarehouse:Warehouse(*)
      `)
      .order('createdAt', { ascending: false });

    if (error) throw new Error(error.message);
    return mapIds(data?.map(m => ({
      ...m,
      productId: m.product ? {
        ...m.product,
        supplierId: m.product.supplier
      } : null,
      warehouseId: m.warehouse || null,
      sourceWarehouseId: m.sourceWarehouse || null,
      destinationWarehouseId: m.destinationWarehouse || null
    })));
  }

  // 14. INVENTORY DASHBOARD
  if (resource === 'inventory') {
    if (method === 'GET') {
      const { data: products, error: pError } = await supabase
        .from('Product')
        .select('*, variants:Variant(*)');
      if (pError) throw new Error(pError.message);

      const { data: movements, error: mError } = await supabase
        .from('StockMovement')
        .select(`
          *,
          product:Product(*)
        `)
        .order('createdAt', { ascending: false });
      if (mError) throw new Error(mError.message);

      // Compute statistics
      const parentProducts = products?.filter(p => p.type === 'PARENT') || [];
      const childProducts = products?.filter(p => p.type === 'CHILD') || [];
      
      const totalParentStock = parentProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
      const activeParentProducts = parentProducts.filter(p => (p.stock || 0) > 0).length;
      const totalLinkedChildren = childProducts.length;

      // Construct parent-child mappings
      const mappings = parentProducts.map(parent => {
        const children = childProducts
          .filter(child => child.parent_id === parent.id)
          .map(child => ({
            ...child,
            stock: Math.floor((parent.stock || 0) / (child.conversion_quantity || 1))
          }));

        return {
          parent: mapIds(parent),
          children: mapIds(children)
        };
      });

      // Filter conversion-related movements
      const conversionMovements = movements?.filter(m => {
        const prod = m.product;
        return prod && (prod.type === 'PARENT' || prod.type === 'CHILD');
      }).map(m => ({
        ...m,
        productId: m.product
      })) || [];

      return {
        stats: {
          totalParentStock,
          activeParentProducts,
          totalLinkedChildren
        },
        mappings,
        movements: mapIds(conversionMovements)
      };
    }
  }

  return [];
}