import { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'GUEST'], default: 'GUEST' },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export const User = models.User || model('User', UserSchema);
