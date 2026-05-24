'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'USD' | 'INR' | 'AED' | 'QAR' | 'EUR';

interface CurrencyContextType {
  currency: Currency;
  symbol: string;
  setCurrency: (c: Currency) => void;
  formatPrice: (amount: number) => string;
}

const currencyMap: Record<Currency, string> = {
  USD: '$',
  INR: '₹',
  AED: 'د.إ',
  QAR: 'ر.ق',
  EUR: '€',
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD');

  useEffect(() => {
    const saved = localStorage.getItem('app_currency') as Currency;
    if (saved && currencyMap[saved]) {
      setCurrencyState(saved);
    }
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('app_currency', c);
  };

  const formatPrice = (amount: number) => {
    const sym = currencyMap[currency];
    return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, symbol: currencyMap[currency], setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
}
