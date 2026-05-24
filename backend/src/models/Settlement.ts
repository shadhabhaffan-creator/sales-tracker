import { Schema, model, models } from 'mongoose';

const SettlementSchema = new Schema({
  date: { type: Date, default: Date.now },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  saleId: { type: Schema.Types.ObjectId, ref: 'Sale' }, // Optional: link to a specific sale
  amountPaid: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['CASH', 'UPI', 'BANK'], required: true },
  remainingBalance: { type: Number, required: true },
  status: { type: String, enum: ['PAID', 'PARTIAL', 'PENDING', 'OVERDUE'], required: true },
  transactionId: { type: String },
  notes: { type: String },
  handledBy: { type: String, required: true },
}, { timestamps: true });

export const Settlement = models.Settlement || model('Settlement', SettlementSchema);
