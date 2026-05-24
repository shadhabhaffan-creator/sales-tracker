import { Schema, model, models } from 'mongoose';

const ExpenseSchema = new Schema({
  date: { type: Date, default: Date.now },
  title: { type: String, required: true },
  category: { type: String, required: true }, // rent, transport, marketing, salary, utilities, etc.
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['CASH', 'UPI', 'BANK'], default: 'CASH' },
  transactionId: { type: String },
  notes: { type: String },
  attachment: { type: String }, // URL or path to receipt image
  isRecurring: { type: Boolean, default: false },
  recurringInterval: { type: String, enum: ['NONE', 'WEEKLY', 'MONTHLY', 'YEARLY'], default: 'NONE' },
}, { timestamps: true });

export const Expense = models.Expense || model('Expense', ExpenseSchema);
