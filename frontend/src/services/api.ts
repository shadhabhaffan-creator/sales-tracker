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
    if (method === 'GET') {
      const { data: products, error } = await supabase
        .from('Product')
        .select('*, variants:Variant(*)');

      if (error) throw new Error(error.message);
      return mapIds(products);
    }

    if (method === 'POST') {
      const newId = crypto.randomUUID();
      const { error: productErr } = await supabase
        .from('Product')
        .insert({
          id: newId,
          name: body.name,
          sku: body.sku || null,
          category: body.category || null,
          stock: body.stock || 0,
          costPrice: body.costPrice,
          sellingPrice: body.sellingPrice,
          unit: body.unit || 'UNIT',
          image: body.image || null,
          supplierId: body.supplierId || null
        });

      if (productErr) throw new Error(productErr.message);

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
      const { error: productErr } = await supabase
        .from('Product')
        .update({
          name: body.name,
          sku: body.sku || null,
          category: body.category || null,
          stock: body.stock || 0,
          costPrice: body.costPrice,
          sellingPrice: body.sellingPrice,
          unit: body.unit || 'UNIT',
          image: body.image || null,
          supplierId: body.supplierId || null
        })
        .eq('id', productId);

      if (productErr) throw new Error(productErr.message);

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
      
      let totalCost = 0;
      let totalAmount = 0;

      // Calculate cost and totals
      for (const item of body.items) {
        totalCost += (item.costPrice || 0) * (item.quantity || 1);
        totalAmount += (item.sellingPrice || 0) * (item.quantity || 1);
      }

      const profit = totalAmount - totalCost;

      const { error: saleErr } = await supabase.from('Sale').insert({
        id: saleId,
        invoiceId,
        totalAmount,
        dueAmount: body.paymentType === 'CREDIT' ? totalAmount : 0,
        paymentType: body.paymentType,
        transactionId: body.transactionId || null,
        customerId: body.customerId || null,
        profit,
        status: body.paymentType === 'CREDIT' ? 'UNPAID' : 'PAID'
      });

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

        // Decrement stock
        if (item.variantId) {
          const { data: v } = await supabase.from('Variant').select('stock').eq('id', item.variantId).single();
          if (v) {
            await supabase.from('Variant').update({ stock: Math.max(0, (v.stock || 0) - item.quantity) }).eq('id', item.variantId);
          }
        }
        const { data: p } = await supabase.from('Product').select('stock').eq('id', item.productId).single();
        if (p) {
          await supabase.from('Product').update({ stock: Math.max(0, (p.stock || 0) - item.quantity) }).eq('id', item.productId);
        }
      }

      // Update customer stats
      if (body.customerId) {
        const { data: cust } = await supabase.from('Customer').select('*').eq('id', body.customerId).single();
        if (cust) {
          const updates: any = {
            totalSpent: (cust.totalSpent || 0) + totalAmount,
            lastPurchaseDate: new Date().toISOString()
          };
          if (body.paymentType !== 'CREDIT') {
            updates.totalPaid = (cust.totalPaid || 0) + totalAmount;
          }
          await supabase.from('Customer').update(updates).eq('id', body.customerId);
        }
      }

      return { success: true };
    }

    if (method === 'DELETE') {
      const id = body?.id || parts[1];
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
    if (method === 'GET') {
      const { data, error } = await supabase.from('Warehouse').select('*');
      if (error) throw new Error(error.message);
      return mapIds(data);
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

          // Update/upsert warehouse product stock
          const { data: whp } = await supabase.from('WarehouseProduct')
            .select('*')
            .eq('warehouseId', alloc.warehouseId)
            .eq('productId', body.productId)
            .maybeSingle();

          if (whp) {
            await supabase.from('WarehouseProduct')
              .update({ stock: (whp.stock || 0) + alloc.quantity })
              .eq('id', whp.id);
          } else {
            await supabase.from('WarehouseProduct').insert({
              id: crypto.randomUUID(),
              warehouseId: alloc.warehouseId,
              productId: body.productId,
              stock: alloc.quantity
            });
          }
        }
      }

      // Update product inventory stock
      const { data: prod } = await supabase.from('Product').select('stock').eq('id', body.productId).single();
      if (prod) {
        await supabase.from('Product')
          .update({ stock: (prod.stock || 0) + body.quantity })
          .eq('id', body.productId);
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
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days fallback
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

  return [];
}