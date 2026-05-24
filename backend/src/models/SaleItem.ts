import { Schema, model, models } from 'mongoose';

const SaleItemSchema = new Schema({
  saleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: Schema.Types.ObjectId },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  costPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
}, { timestamps: true });

export const SaleItem = models.SaleItem || model('SaleItem', SaleItemSchema);
