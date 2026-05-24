import { Schema, model, models } from 'mongoose';

const PaymentHistoryEntrySchema = new Schema({
  amount: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  paymentMethod: { 
    type: String, 
    enum: ['CASH', 'GPAY', 'BANK_TRANSFER', 'DEBIT_CARD', 'CREDIT_CARD', 'UPI', 'CHEQUE', 'OTHER'], 
    required: true 
  },
  transactionId: { type: String },
  notes: { type: String }
}, { timestamps: true });

const SupplierPaymentSchema = new Schema({
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  purchaseAmount: { type: Number, required: true },
  amountPaid: { type: Number, required: true, default: 0 },
  remainingBalance: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  transactionId: { type: String },
  purchaseId: { type: String },
  notes: { type: String },
  receiptImage: { type: String }, // Optional path/URL to uploaded receipt
  paymentMethod: { 
    type: String, 
    enum: ['CASH', 'GPAY', 'BANK_TRANSFER', 'DEBIT_CARD', 'CREDIT_CARD', 'UPI', 'CHEQUE', 'OTHER'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PAID', 'PARTIALLY_PAID', 'DEBT'], 
    default: 'DEBT' 
  },
  paymentsHistory: [PaymentHistoryEntrySchema]
}, { timestamps: true });

export const SupplierPayment = models.SupplierPayment || model('SupplierPayment', SupplierPaymentSchema);
export const PaymentHistoryEntry = models.PaymentHistoryEntry || model('PaymentHistoryEntry', PaymentHistoryEntrySchema);
