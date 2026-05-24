import { Schema, model, models } from 'mongoose';

const ExpenseSchema = new Schema({
  date: { type: Date, default: Date.now },
  title: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['CASH', 'UPI', 'BANK'], default: 'CASH' },
  transactionId: { type: String },
  notes: { type: String },
}, { timestamps: true });

export const Expense = models.Expense || model('Expense', ExpenseSchema);
