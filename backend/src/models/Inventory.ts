import { Schema, model, models } from 'mongoose';

const InventorySchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  stock_quantity: { type: Number, default: 0 }
}, { timestamps: true });

export const Inventory = models.Inventory || model('Inventory', InventorySchema);
