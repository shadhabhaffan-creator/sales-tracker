'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { User, Shield, Bell, Globe, Database, Save, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCurrency } from '@/components/CurrencyContext';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/services/api';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const { currency, setCurrency } = useCurrency();

  const [isResyncing, setIsResyncing] = useState(false);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(e.target.value as any);
    toast.success(`Currency updated to ${e.target.value}`);
  };

  const handleResync = async () => {
    setIsResyncing(true);
    try {
      await fetchWithAuth('/fix/resync');
      toast.success('All customer balances have been re-calculated and synchronized!');
    } catch (error: any) {
      toast.error('Failed to re-sync: ' + error.message);
    } finally {
      setIsResyncing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase">Settings</h1>
          <p className="text-gray-400 font-medium">Manage your business profile and preferences</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">General</h3>
            <p className="text-sm text-gray-500">Configure basic business information and currency.</p>
          </div>
          <div className="md:col-span-2 glass-panel p-6 rounded-2xl space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Business Name</label>
                <input className="glass-input w-full" defaultValue="AuraSales Business" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Default Currency</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 z-10" />
                  <select 
                    className="glass-select w-full pl-10"
                    value={currency}
                    onChange={handleCurrencyChange}
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                    <option value="QAR">QAR (ر.ق) - Qatari Riyal</option>
                    <option value="EUR">EUR (€) - Euro</option>
                  </select>
                </div>
              </div>
            </div>
            <button className="btn-primary w-fit">
              <Save size={18} />
              <span>Save Changes</span>
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Security</h3>
            <p className="text-sm text-gray-500">Manage your password and session settings.</p>
          </div>
          <div className="md:col-span-2 glass-panel p-6 rounded-2xl space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-4">
                <Shield className="text-cyan-400" />
                <div>
                  <p className="font-medium">Password Protection</p>
                  <p className="text-xs text-gray-500">Last changed 2 months ago</p>
                </div>
              </div>
              <button className="text-sm text-cyan-400 hover:underline">Change</button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-amber-400">Data Integrity</h3>
            <p className="text-sm text-gray-500">Recalculate all customer balances based on real transaction history.</p>
          </div>
          <div className="md:col-span-2 glass-panel p-6 rounded-2xl space-y-6 border border-amber-500/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-bold text-white">Re-Sync Customer Balances</p>
                <p className="text-xs text-gray-500 mt-1">Use this if the "Pending Dues" are not matching the actual sales and payments.</p>
              </div>
              <button 
                onClick={handleResync}
                disabled={isResyncing}
                className="btn-secondary border-amber-500/20 text-amber-400 hover:bg-amber-500/10 flex items-center gap-2"
              >
                {isResyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                <span>{isResyncing ? 'Processing...' : 'Sync Now'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Database</h3>
            <p className="text-sm text-gray-500">Backup and restore your business data.</p>
          </div>
          <div className="md:col-span-2 glass-panel p-6 rounded-2xl space-y-6">
            <div className="flex items-center gap-4">
              <button className="btn-primary">
                <Database size={18} />
                <span>Backup Database</span>
              </button>
              <button className="btn-secondary">Export JSON</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
