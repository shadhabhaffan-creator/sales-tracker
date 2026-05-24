import { Schema, model, models } from 'mongoose';

const WarehouseProductSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: Schema.Types.ObjectId }, // Reference to variant inside Product.variants
  variantName: { type: String }, // e.g., "500ml", "Red"
  stock: { type: Number, default: 0 }
});

const WarehouseSchema = new Schema({
  name: { type: String, required: true },
  warehouseId: { type: String, required: true, unique: true },
  location: { type: String },
  address: { type: String },
  managerName: { type: String },
  contactNumber: { type: String },
  capacity: { type: Number, default: 0 }, // max items capacity
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  products: [WarehouseProductSchema]
}, { timestamps: true });

export const Warehouse = models.Warehouse || model('Warehouse', WarehouseSchema);
