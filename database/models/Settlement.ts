import { Schema, model, models } from 'mongoose';

const SettlementSchema = new Schema({
  date: { type: Date, default: Date.now },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['CASH', 'UPI', 'BANK'], required: true },
  transactionId: { type: String },
  notes: { type: String },
}, { timestamps: true });

export const Settlement = models.Settlement || model('Settlement', SettlementSchema);
