'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Shield, Loader2, X, Trash2, Edit2, 
  KeyRound, History, Search, ToggleLeft, ToggleRight,
  ShieldCheck, ShieldAlert, Mail, Phone, Lock, Calendar, Check, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/components/UserContext';
import { fetchWithAuth } from '@/services/api';
import AccessDenied from '@/components/AccessDenied';
import { format } from 'date-fns';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

const PERMISSION_LABELS: Record<string, string> = {
  viewAllLeads: 'View All Leads',
  viewAssignedLeadsOnly: 'View Assigned Leads Only',
  createLeads: 'Create Leads',
  editLeads: 'Edit Leads',
  deleteLeads: 'Delete Leads',
  changeSalesStatus: 'Change Sales Status',
  addNotes: 'Add Notes',
  viewRevenue: 'View Revenue',
  exportData: 'Export Data',
  manageTeamMembers: 'Manage Team',
  accessAnalytics: 'Access Analytics',
  accessSettings: 'Access Settings',
  createEmployeeAccounts: 'Create Employee Accounts',
};

const ROLE_PRESETS: Record<string, Record<string, boolean>> = {
  SUPER_ADMIN: {
    viewAllLeads: true,
    viewAssignedLeadsOnly: false,
    createLeads: true,
    editLeads: true,
    deleteLeads: true,
    changeSalesStatus: true,
    addNotes: true,
    viewRevenue: true,
    exportData: true,
    manageTeamMembers: true,
    accessAnalytics: true,
    accessSettings: true,
    createEmployeeAccounts: true,
  },
  MANAGER: {
    viewAllLeads: true,
    viewAssignedLeadsOnly: false,
    createLeads: true,
    editLeads: true,
    deleteLeads: true,
    changeSalesStatus: true,
    addNotes: true,
    viewRevenue: true,
    exportData: true,
    manageTeamMembers: true,
    accessAnalytics: true,
    accessSettings: true,
    createEmployeeAccounts: false,
  },
  SALES_AGENT: {
    viewAllLeads: false,
    viewAssignedLeadsOnly: true,
    createLeads: true,
    editLeads: true,
    deleteLeads: false,
    changeSalesStatus: true,
    addNotes: true,
    viewRevenue: false,
    exportData: false,
    manageTeamMembers: false,
    accessAnalytics: false,
    accessSettings: false,
    createEmployeeAccounts: false,
  },
  VIEWER: {
    viewAllLeads: true,
    viewAssignedLeadsOnly: false,
    createLeads: false,
    editLeads: false,
    deleteLeads: false,
    changeSalesStatus: false,
    addNotes: false,
    viewRevenue: false,
    exportData: false,
    manageTeamMembers: false,
    accessAnalytics: false,
    accessSettings: false,
    createEmployeeAccounts: false,
  },
  CUSTOM: {
    viewAllLeads: false,
    viewAssignedLeadsOnly: false,
    createLeads: false,
    editLeads: false,
    deleteLeads: false,
    changeSalesStatus: false,
    addNotes: false,
    viewRevenue: false,
    exportData: false,
    manageTeamMembers: false,
    accessAnalytics: false,
    accessSettings: false,
    createEmployeeAccounts: false,
  }
};

export default function EmployeesPage() {
  const { user, hasPermission } = useUser();

  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistoryEmployee, setSelectedHistoryEmployee] = useState<any>(null);
  const [historyLogs, setHistoryLogs] = useState<{ activityLog: any[], loginHistory: any[] }>({ activityLog: [], loginHistory: [] });
  const [historyLoading, setHistoryLoading] = useState(false);

  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [resetEmployee, setResetEmployee] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    temporaryPassword: '',
    role: 'VIEWER',
    profilePhoto: '',
    permissions: { ...ROLE_PRESETS.VIEWER }
  });

  const fetchEmployees = async () => {
    try {
      const data = await fetchWithAuth('/employees');
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (error: any) {
      toast.error('Failed to load employees: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission('manageTeamMembers') || hasPermission('createEmployeeAccounts')) {
      fetchEmployees();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredEmployees(
      employees.filter(emp => 
        emp.fullName?.toLowerCase().includes(term) ||
        emp.username?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.phone?.includes(term) ||
        emp.role?.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, employees]);

  if (!hasPermission('manageTeamMembers') && !hasPermission('createEmployeeAccounts')) {
    return (
      <DashboardLayout>
        <AccessDenied />
      </DashboardLayout>
    );
  }

  // Handle preset dropdown changes
  const handleRoleChange = (role: string) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: { ...(ROLE_PRESETS[role] || ROLE_PRESETS.CUSTOM) }
    }));
  };

  // Toggle specific permission switch
  const handlePermissionToggle = (permKey: string) => {
    setFormData(prev => {
      const updatedPerms = {
        ...prev.permissions,
        [permKey]: !prev.permissions[permKey as keyof typeof prev.permissions]
      };

      // Set to CUSTOM if toggles differ from the role preset
      let finalRole = prev.role;
      const matchesPreset = Object.keys(ROLE_PRESETS).find(r => {
        if (r === 'CUSTOM') return false;
        return Object.keys(ROLE_PRESETS[r]).every(key => ROLE_PRESETS[r][key] === updatedPerms[key as keyof typeof updatedPerms]);
      });

      if (!matchesPreset) {
        finalRole = 'CUSTOM';
      } else {
        finalRole = matchesPreset;
      }

      return {
        ...prev,
        role: finalRole,
        permissions: updatedPerms
      };
    });
  };

  // Open Add Form
  const openAddForm = () => {
    setEditingEmployee(null);
    setFormData({
      fullName: '',
      username: '',
      email: '',
      phone: '',
      temporaryPassword: '',
      role: 'VIEWER',
      profilePhoto: '',
      permissions: { ...ROLE_PRESETS.VIEWER }
    });
    setIsFormOpen(true);
  };

  // Open Edit Form
  const openEditForm = (emp: any) => {
    setEditingEmployee(emp);
    setFormData({
      fullName: emp.fullName || '',
      username: emp.username || '',
      email: emp.email || '',
      phone: emp.phone || '',
      temporaryPassword: '',
      role: emp.role || 'VIEWER',
      profilePhoto: emp.profilePhoto || '',
      permissions: {
        ...ROLE_PRESETS.CUSTOM,
        ...(emp.permissions || {})
      }
    });
    setIsFormOpen(true);
  };

  // Submit employee add/edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingEmployee) {
        // Edit flow
        await fetchWithAuth(`/employees/${editingEmployee._id}`, {
          method: 'PUT',
          body: JSON.stringify({
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
            permissions: formData.permissions,
            profilePhoto: formData.profilePhoto
          })
        });
        toast.success('Employee account updated successfully');
      } else {
        // Create flow
        await fetchWithAuth('/employees', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast.success('Employee account created successfully');
      }
      setIsFormOpen(false);
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle status (Active / Inactive)
  const handleToggleStatus = async (emp: any) => {
    const nextStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await fetchWithAuth(`/employees/${emp._id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      toast.success(`Account status for ${emp.username} set to ${nextStatus}`);
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Password cannot be empty');
      return;
    }
    setLoading(true);
    try {
      await fetchWithAuth(`/employees/${resetEmployee._id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword })
      });
      toast.success(`Password for ${resetEmployee.username} successfully updated`);
      setIsPasswordResetOpen(false);
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (emp: any) => {
    if (!confirm(`Are you absolutely sure you want to delete ${emp.fullName}'s account? This action is irreversible.`)) {
      return;
    }
    try {
      await fetchWithAuth(`/employees/${emp._id}`, {
        method: 'DELETE'
      });
      toast.success('Employee account deleted');
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Load activity / login logs
  const handleViewHistory = async (emp: any) => {
    setSelectedHistoryEmployee(emp);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await fetchWithAuth(`/employees/${emp._id}/history`);
      setHistoryLogs(data);
    } catch (error: any) {
      toast.error('Failed to load history: ' + error.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight uppercase">Employee Directory</h1>
            <p className="text-gray-400 font-medium">Manage corporate employee profiles and customize dynamic permission rules</p>
          </div>
          {hasPermission('createEmployeeAccounts') && (
            <button 
              onClick={openAddForm} 
              className="btn-primary"
            >
              <UserPlus size={16} />
              <span>CREATE ACCOUNT</span>
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="relative group max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search employees by name, email, role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input pl-12"
          />
        </div>

        {/* Employee Cards list */}
        {loading ? (
          <div className="h-60 flex items-center justify-center">
            <Loader2 className="animate-spin text-cyan-400 w-12 h-12" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="glass-panel p-20 text-center rounded-2xl border border-white/5">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-400">No Employees Found</h3>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or create a new employee.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((emp, i) => {
              const activePermissions = Object.keys(emp.permissions || {}).filter(k => emp.permissions[k]);
              const isSelf = user?.id === emp._id;
              
              return (
                <motion.div 
                  key={emp._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between hover:scale-[1.01] transition-all relative overflow-hidden"
                >
                  {/* Glowing tag based on status */}
                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    <span className={emp.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}>
                      {emp.status}
                    </span>
                  </div>

                  <div>
                    {/* User profile picture / placeholder */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-black text-2xl text-cyan-400 shadow-md">
                        {emp.fullName[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                          <span>{emp.fullName}</span>
                          {isSelf && <span className="text-[10px] text-cyan-500 bg-cyan-500/15 border border-cyan-500/25 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">YOU</span>}
                        </h3>
                        <p className="text-gray-500 text-xs tracking-wider">@{emp.username}</p>
                      </div>
                    </div>

                    {/* Role Pill */}
                    <div className="mb-6">
                      <span className="badge-primary">
                        {emp.role?.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Contact stats */}
                    <div className="space-y-2 mb-6">
                      {emp.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Mail size={12} className="text-gray-500" />
                          <span>{emp.email}</span>
                        </div>
                      )}
                      {emp.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Phone size={12} className="text-gray-500" />
                          <span>{emp.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar size={12} />
                        <span>Joined: {format(new Date(emp.createdAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>

                    {/* Permissions preview */}
                    <div className="p-4 bg-white/2 rounded-2xl border border-white/5 mb-6">
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">
                        Permissions ({activePermissions.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {activePermissions.length === 0 ? (
                          <span className="text-[10px] text-gray-600 font-bold">No access toggles enabled</span>
                        ) : activePermissions.slice(0, 3).map(p => (
                          <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded">
                            {PERMISSION_LABELS[p] || p}
                          </span>
                        ))}
                        {activePermissions.length > 3 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white/5 text-gray-400 rounded">
                            +{activePermissions.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                    <button 
                      onClick={() => openEditForm(emp)} 
                      title="Edit Profile & Permissions" 
                      className="btn-secondary btn-sm flex-1 hover:text-cyan-400"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(emp)} 
                      title={emp.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'} 
                      disabled={isSelf}
                      className={`btn-secondary btn-sm flex-1 ${isSelf ? 'opacity-40 cursor-not-allowed' : 'hover:text-amber-400'}`}
                    >
                      {emp.status === 'ACTIVE' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                    <button 
                      onClick={() => { setResetEmployee(emp); setIsPasswordResetOpen(true); }} 
                      title="Reset Password" 
                      className="btn-secondary btn-sm flex-1 hover:text-emerald-400"
                    >
                      <KeyRound size={14} />
                    </button>
                    <button 
                      onClick={() => handleViewHistory(emp)} 
                      title="View Activity Logs" 
                      className="btn-secondary btn-sm flex-1 hover:text-blue-400"
                    >
                      <History size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteEmployee(emp)} 
                      title="Delete Employee" 
                      disabled={isSelf}
                      className={`btn-danger btn-sm flex-1 ${isSelf ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Employee Form Modal */}
        <AnimatePresence>
          {isFormOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFormOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="glass-panel w-full max-w-4xl p-8 md:p-10 rounded-2xl relative z-10 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scroll"
              >
                <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight uppercase">
                      {editingEmployee ? 'Edit Profile & Access' : 'Create Employee Profile'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Configure profile details and fine-grained access levels</p>
                  </div>
                  <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmitForm} className="space-y-8">
                  
                  {/* Grid fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        placeholder="John Doe" 
                        required 
                        className="w-full glass-input" 
                        value={formData.fullName} 
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Username (login ID)</label>
                      <input 
                        placeholder="johndoe" 
                        required 
                        disabled={!!editingEmployee}
                        className="w-full glass-input disabled:opacity-55 disabled:cursor-not-allowed" 
                        value={formData.username} 
                        onChange={(e) => setFormData({...formData, username: e.target.value})} 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                      <input 
                        placeholder="john@company.com" 
                        type="email"
                        className="w-full glass-input" 
                        value={formData.email} 
                        onChange={(e) => setFormData({...formData, email: e.target.value})} 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                      <input 
                        placeholder="+1 234 5678" 
                        className="w-full glass-input" 
                        value={formData.phone} 
                        onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                      />
                    </div>

                    {!editingEmployee && (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Temporary Password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input 
                            placeholder="Must be at least 6 characters" 
                            required 
                            minLength={6}
                            type="text"
                            className="w-full glass-input pl-11" 
                            value={formData.temporaryPassword} 
                            onChange={(e) => setFormData({...formData, temporaryPassword: e.target.value})} 
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Role Preset</label>
                      <select 
                        className="w-full glass-select"
                        value={formData.role}
                        onChange={(e) => handleRoleChange(e.target.value)}
                      >
                        <option value="SUPER_ADMIN">SUPER ADMIN (Full Permissions)</option>
                        <option value="MANAGER">MANAGER (Full CRM access, no user management)</option>
                        <option value="SALES_AGENT">SALES AGENT (Assigned leads, edit/notes only)</option>
                        <option value="VIEWER">VIEWER (View-only leads and customers)</option>
                        <option value="CUSTOM">CUSTOM ROLE (Manual configuration)</option>
                      </select>
                    </div>
                  </div>

                  {/* Permissions toggles */}
                  <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">
                      FINE-GRAINED PERMISSION RULES
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.keys(formData.permissions).map((permKey) => {
                        const isChecked = formData.permissions[permKey as keyof typeof formData.permissions];
                        return (
                          <div 
                            key={permKey}
                            onClick={() => handlePermissionToggle(permKey)}
                            className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all select-none
                              ${isChecked 
                                ? 'bg-cyan-500/5 border-cyan-500/20 text-white' 
                                : 'bg-white/2 border-white/5 text-gray-500 hover:bg-white/5'}`}
                          >
                            <div>
                              <p className={`text-xs font-bold ${isChecked ? 'text-cyan-400' : 'text-gray-400'}`}>
                                {PERMISSION_LABELS[permKey] || permKey}
                              </p>
                              <p className="text-[9px] text-gray-500 mt-0.5">
                                {permKey.includes('Lead') ? 'CRM module permission rule' : 'System administrative rule'}
                              </p>
                            </div>
                            <div>
                              {isChecked ? (
                                <div className="w-5 h-5 bg-cyan-500 text-white rounded-md flex items-center justify-center shadow-md">
                                  <Check size={12} strokeWidth={4} />
                                </div>
                              ) : (
                                <div className="w-5 h-5 border border-white/20 rounded-md" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="btn-primary w-full"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : editingEmployee ? 'SAVE PROFILE CHANGES' : 'CREATE EMPLOYEE PROFILE'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Password Reset Modal */}
        <AnimatePresence>
          {isPasswordResetOpen && resetEmployee && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPasswordResetOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="glass-panel w-full max-w-md p-10 rounded-2xl relative z-10 border border-white/10 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                      <KeyRound className="text-cyan-400" />
                      <span>Reset Password</span>
                    </h2>
                    <p className="text-[10px] text-gray-500 mt-1">Set a new password for @{resetEmployee.username}</p>
                  </div>
                  <button onClick={() => setIsPasswordResetOpen(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={24} /></button>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">New Password</label>
                    <input 
                      type="text" 
                      required 
                      minLength={6} 
                      placeholder="Minimum 6 characters" 
                      className="w-full glass-input text-center text-lg font-bold" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                    />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : 'CONFIRM PASSWORD RESET'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* History Logs Modal */}
        <AnimatePresence>
          {isHistoryOpen && selectedHistoryEmployee && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsHistoryOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="glass-panel w-full max-w-3xl p-8 md:p-10 rounded-2xl relative z-10 border border-white/10 shadow-2xl max-h-[85vh] flex flex-col"
              >
                <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <History className="text-cyan-400" />
                      <span>Security & Activity Audit</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Audit logs and login records for {selectedHistoryEmployee.fullName} (@{selectedHistoryEmployee.username})</p>
                  </div>
                  <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-8 scrollbar-hide">
                  {historyLoading ? (
                    <div className="h-60 flex items-center justify-center"><Loader2 className="animate-spin text-cyan-400 w-12 h-12" /></div>
                  ) : (
                    <>
                      {/* Login History */}
                      <div>
                        <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest mb-4">
                          RECENT LOGIN SESSIONS (Max 50)
                        </h3>
                        {historyLogs.loginHistory.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">No login records found for this account.</p>
                        ) : (
                          <div className="w-full">
                            <Table>
                              <TableHeader>
                                <TableHead>Login Time</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Device / User Agent</TableHead>
                              </TableHeader>
                              <TableBody>
                                {historyLogs.loginHistory.map((lh, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="text-gray-300 font-medium">
                                      {format(new Date(lh.timestamp), 'MMM dd, yyyy - hh:mm a')}
                                    </TableCell>
                                    <TableCell className="text-cyan-400 font-mono font-bold">
                                      {lh.ip || 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-gray-500 font-medium truncate max-w-xs">
                                      <span title={lh.userAgent}>{lh.userAgent || 'Unknown Device'}</span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>

                      {/* Action Activity Log */}
                      <div>
                        <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-4">
                          ACTION SECURITY HISTORY (Max 200)
                        </h3>
                        {historyLogs.activityLog.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">No admin/lead actions logged for this account.</p>
                        ) : (
                          <div className="space-y-4">
                            {historyLogs.activityLog.map((log, index) => (
                              <div key={index} className="p-4 bg-white/2 border border-white/5 rounded-2xl flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="badge-warning text-[10px] py-0.5 px-2">
                                      {log.action}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                      {format(new Date(log.timestamp), 'MMM dd, yyyy - hh:mm a')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-300 font-medium">
                                    {log.details}
                                  </p>
                                </div>
                                {log.ip && (
                                  <span className="text-[10px] text-gray-500 font-mono">
                                    IP: {log.ip}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
