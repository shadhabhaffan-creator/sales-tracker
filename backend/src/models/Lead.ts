import { Schema, model, models } from 'mongoose';

const LeadSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  status: { type: String, enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'], default: 'NEW' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: [{
    content: { type: String, required: true },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  tasks: [{
    title: { type: String, required: true },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false }
  }],
  followUps: [{
    date: { type: Date, required: true },
    notes: { type: String },
    completed: { type: Boolean, default: false }
  }],
  revenueEstimate: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const Lead = models.Lead || model('Lead', LeadSchema);
