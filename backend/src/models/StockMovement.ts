import { Schema, model, models } from 'mongoose';

const StockMovementSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: Schema.Types.ObjectId }, // Reference to variant inside Product.variants
  variantName: { type: String }, // e.g., "500ml", "Red"
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' }, // current/destination warehouse
  type: { type: String, enum: ['INCOMING', 'OUTGOING', 'TRANSFER', 'ADJUSTMENT'], required: true },
  quantity: { type: Number, required: true },
  sourceWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' }, // for transfers
  destinationWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' }, // for transfers
  reference: { type: String }, // e.g. "PO-1002", "INVOICE-3304", "Manual adjustment"
  performedBy: { type: String } // User full name or username
}, { timestamps: true });

export const StockMovement = models.StockMovement || model('StockMovement', StockMovementSchema);
