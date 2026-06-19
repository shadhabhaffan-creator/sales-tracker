import { Schema, model, models } from 'mongoose';

const SaleSchema = new Schema({
  invoiceId: { type: String, unique: true, required: true },
  date: { type: Date, default: Date.now },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    variantId: { type: Schema.Types.ObjectId },
    name: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true }, // Added unitPrice
    costPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    unit: { type: String, default: 'UNIT' },
  }],
  totalAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['FLAT', 'PERCENT'], default: 'FLAT' },
  discountValue: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 }, // Added dueAmount
  paymentType: { type: String, enum: ['CASH', 'UPI', 'BANK', 'CREDIT'], required: true },
  transactionId: { type: String },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  profit: { type: Number, required: true },
  notes: { type: String },
  status: { type: String, enum: ['PAID', 'PARTIAL', 'DUE'], default: 'PAID' }, // Added status
}, { timestamps: true });

export const Sale = models.Sale || model('Sale', SaleSchema);
