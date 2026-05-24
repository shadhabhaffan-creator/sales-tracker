import { Schema, model, models } from 'mongoose';

const PurchaseRecordSchema = new Schema({
  date: { type: Date, default: Date.now },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String },
  quantity: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  invoiceNumber: { type: String }
});

const SupplierSchema = new Schema({
  name: { type: String, required: true },
  companyName: { type: String },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  gstTaxId: { type: String },
  productsSupplied: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  paymentTerms: { type: String },
  notes: { type: String },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  purchaseHistory: [PurchaseRecordSchema]
}, { timestamps: true });

export const Supplier = models.Supplier || model('Supplier', SupplierSchema);
