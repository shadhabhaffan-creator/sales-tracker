import { Schema, model, models } from 'mongoose';

const SaleSchema = new Schema({
  date: { type: Date, default: Date.now },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String },
    quantity: { type: Number, required: true },
    costPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
  }],
  totalAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['FLAT', 'PERCENT'], default: 'FLAT' },
  discountValue: { type: Number, default: 0 },
  paymentType: { type: String, enum: ['CASH', 'UPI', 'BANK', 'CREDIT'], required: true },
  transactionId: { type: String },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  profit: { type: Number, required: true },
  notes: { type: String },
}, { timestamps: true });

export const Sale = models.Sale || model('Sale', SaleSchema);
