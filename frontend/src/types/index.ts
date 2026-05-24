export interface Product {
  _id: string;
  name: string;
  sku?: string;
  category?: string;
  stock: number;
  costPrice: number;
  sellingPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  totalDue: number;
  totalPaid: number;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
}

export interface Sale {
  _id: string;
  date: string;
  items: SaleItem[];
  totalAmount: number;
  paymentType: 'CASH' | 'UPI' | 'CREDIT';
  customerId?: Customer;
  profit: number;
  notes?: string;
}
