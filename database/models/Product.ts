import { Schema, model, models } from 'mongoose';

const ProductSchema = new Schema({
  name: { type: String, required: true },
  sku: { type: String, unique: true },
  category: { type: String },
  stock: { type: Number, default: 0 },
  costPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  image: { type: String },
}, { timestamps: true });

export const Product = models.Product || model('Product', ProductSchema);
