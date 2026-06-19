import { Schema, model, models } from 'mongoose';

const VariantSchema = new Schema({
  name: { type: String, required: true }, // e.g., "500ml", "Red", "Large"
  sku: { type: String, unique: true, sparse: true },
  costPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  unit: { type: String, enum: ['ML', 'LITER', 'GRAM', 'KILOGRAM', 'PIECE', 'BOTTLE', 'BOX', 'PACK', 'CARTON', 'OTHER'], default: 'PIECE' },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' }
});

const ProductSchema = new Schema({
  name: { type: String, required: true },
  sku: { type: String, unique: true, sparse: true },
  category: { type: String },
  tags: [{ type: String }],
  stock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  costPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  unit: { type: String, enum: ['UNIT', 'KG', 'GRAM', 'LITER', 'ML', 'PIECE', 'BOTTLE', 'BOX', 'PACK', 'CARTON', 'OTHER'], default: 'UNIT' },
  image: { type: String },
  status: { type: String, enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'], default: 'IN_STOCK' },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  variants: [VariantSchema],
  type: { type: String, enum: ['PARENT', 'CHILD', 'STANDARD'], default: 'STANDARD' },
  parent_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  conversion_quantity: { type: Number }
}, { timestamps: true });

export const Product = models.Product || model('Product', ProductSchema);
export const Variant = models.Variant || model('Variant', VariantSchema);
