import { Schema, model, models } from 'mongoose';

const PermissionSchema = new Schema({
  viewAllLeads: { type: Boolean, default: false },
  viewAssignedLeadsOnly: { type: Boolean, default: false },
  createLeads: { type: Boolean, default: false },
  editLeads: { type: Boolean, default: false },
  deleteLeads: { type: Boolean, default: false },
  changeSalesStatus: { type: Boolean, default: false },
  addNotes: { type: Boolean, default: false },
  viewRevenue: { type: Boolean, default: false },
  exportData: { type: Boolean, default: false },
  manageTeamMembers: { type: Boolean, default: false },
  accessAnalytics: { type: Boolean, default: false },
  accessSettings: { type: Boolean, default: false },
  createEmployeeAccounts: { type: Boolean, default: false },
}, { _id: false });

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true, default: 'System User' },
  email: { type: String },
  phone: { type: String },
  role: { 
    type: String, 
    enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER', 'GUEST', 'CUSTOM'], 
    default: 'VIEWER' 
  },
  profilePhoto: { type: String }, // Base64 or URL (optional)
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  permissions: { type: PermissionSchema, default: () => ({}) },
  activityLog: [{
    action: { type: String, required: true },
    details: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  loginHistory: [{
    ip: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export const User = models.User || model('User', UserSchema);
