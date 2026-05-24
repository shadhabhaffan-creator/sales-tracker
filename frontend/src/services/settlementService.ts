import { fetchWithAuth } from './api';

export interface SettlementInput {
  customerId: string;
  amountPaid: number;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
  handledBy: string;
}

export const settlementService = {
  async getSettlements(filters: Record<string, string> = {}) {
    const query = new URLSearchParams(filters).toString();
    const endpoint = `/settlements${query ? `?${query}` : ''}`;
    return await fetchWithAuth(endpoint);
  },

  async createSettlement(data: SettlementInput) {
    return await fetchWithAuth('/settlements', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getAnalytics() {
    return await fetchWithAuth('/settlements/analytics');
  },

  async getCustomerTimeline(customerId: string) {
    return await fetchWithAuth(`/settlements/customer/${customerId}`);
  }
};
