import { Schema, model, models } from 'mongoose';

const CustomerSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  avatar: { type: String }, // For custom images or colors
  notes: { type: String },
  totalDue: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastPurchaseDate: { type: Date },
}, { timestamps: true });

export const Customer = models.Customer || model('Customer', CustomerSchema);
