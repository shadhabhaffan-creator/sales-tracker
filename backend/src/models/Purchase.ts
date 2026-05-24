import { Schema, model, models } from 'mongoose';

const PurchaseSchema = new Schema({
  purchaseId: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true },
  purchaseDate: { type: Date, default: Date.now },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  variantName: { type: String },
  quantity: { type: Number, required: true },
  unit: { 
    type: String, 
    enum: ['UNIT', 'KG', 'GRAM', 'LITER', 'ML', 'PIECE', 'BOTTLE', 'BOX', 'PACK', 'CARTON', 'OTHER'], 
    required: true 
  },
  costPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  notes: { type: String },
  amountPaid: { type: Number, required: true, default: 0 },
  remainingBalance: { type: Number, required: true },
  paymentMethod: { 
    type: String, 
    enum: ['CASH', 'GPAY', 'BANK_TRANSFER', 'DEBIT_CARD', 'CREDIT_CARD', 'UPI', 'CHEQUE', 'OTHER'], 
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['PAID', 'PARTIALLY_PAID', 'DEBT'], 
    required: true 
  },
  warehouseAllocations: [{
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    quantity: { type: Number, required: true }
  }]
}, { timestamps: true });

export const Purchase = models.Purchase || model('Purchase', PurchaseSchema);
