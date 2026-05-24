'use client';

import { useState } from 'react';
import { useCurrency } from '@/components/CurrencyContext';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  isSameMonth, 
  startOfWeek, 
  endOfWeek, 
  addMonths, 
  subMonths,
  isSameDay
} from 'date-fns';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Bell } from 'lucide-react';

export default function MiniCalendar({ reminders = [], alerts = [], sales = [] }: { reminders?: any[], alerts?: any[], sales?: any[] }) {
  const { formatPrice } = useCurrency();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const nextMonth = () => setViewDate(addMonths(viewDate, 1));
  const prevMonth = () => setViewDate(subMonths(viewDate, 1));

  const [showMonthView, setShowMonthView] = useState(false);

  const dailySales = sales.filter(s => isSameDay(new Date(s.date), selectedDate));
  const dailyTotal = dailySales.reduce((sum, s) => sum + s.totalAmount, 0);

  const monthSales = sales.filter(s => isSameMonth(new Date(s.date), monthStart));
  const monthTotal = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const monthProfit = monthSales.reduce((sum, s) => sum + (s.profit || 0), 0);

  // Find the best month
  const monthlyTotals: { [key: string]: number } = {};
  sales.forEach(s => {
    const monthKey = format(new Date(s.date), 'MMM yyyy');
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + s.totalAmount;
  });

  const bestMonthKey = Object.keys(monthlyTotals).reduce((a, b) => 
    monthlyTotals[a] > monthlyTotals[b] ? a : b, 
    format(new Date(), 'MMM yyyy')
  );
  const isBestMonth = format(viewDate, 'MMM yyyy') === bestMonthKey;

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Business Calendar</h3>
        <div className="flex gap-1">
          <button 
            onClick={prevMonth}
            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={nextMonth}
            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="text-center mb-4">
        <p className="text-sm font-bold text-cyan-400">{format(viewDate, 'MMMM yyyy')}</p>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={`${d}-${i}`} className="text-[10px] font-black text-gray-600">{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const currentMonth = isSameMonth(day, monthStart);
          const hasSales = sales.some(s => isSameDay(new Date(s.date), day));

          return (
            <button 
              key={day.toString()} 
              onClick={() => {
                if (currentMonth) {
                  setSelectedDate(day);
                  setShowMonthView(false);
                }
              }}
              disabled={!currentMonth}
              className={`
                aspect-square flex items-center justify-center text-xs rounded-lg transition-all relative
                ${isSelected ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50' : isTodayDate ? 'bg-white/10 text-cyan-400' : 'hover:bg-white/5 text-gray-400'}
                ${!currentMonth ? 'opacity-10 cursor-default' : 'cursor-pointer'}
              `}
            >
              {format(day, 'd')}
              {hasSales && !isSelected && (
                <div className="absolute top-1 right-1 w-1 h-1 bg-emerald-400 rounded-full" />
              )}
              {isTodayDate && !isSelected && (
                <div className="absolute bottom-1 w-1 h-1 bg-cyan-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Sales Summary Toggle/Display */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            {showMonthView ? 'Monthly Overview' : `Sales: ${format(selectedDate, 'MMM dd')}`}
          </p>
          <button 
            onClick={() => setShowMonthView(!showMonthView)}
            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-widest"
          >
            {showMonthView ? 'Show Daily' : 'Show All Month'}
          </button>
        </div>

        <div className="p-4 bg-gradient-to-br from-white/5 to-transparent rounded-2xl border border-white/5">
          {showMonthView ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Total Revenue</span>
                <span className="text-sm font-black text-cyan-400">{formatPrice(monthTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Estimated Profit</span>
                <span className="text-sm font-black text-emerald-400">{formatPrice(monthProfit)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Transaction Count</span>
                <span className="text-sm font-black text-white">{monthSales.length}</span>
              </div>
              {isBestMonth && monthTotal > 0 && (
                <div className="pt-2 mt-2 border-t border-emerald-500/20 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[9px] text-emerald-400 font-black uppercase tracking-tighter">🏆 Best Performing Month Ever</p>
                </div>
              )}
              {!isBestMonth && monthTotal > 0 && (
                <div className="pt-2 mt-2 border-t border-white/5">
                  <p className="text-[9px] text-gray-500 font-medium italic">Top Month: {bestMonthKey} ({formatPrice(monthlyTotals[bestMonthKey])})</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Daily Total</span>
                <span className="text-sm font-black text-cyan-400">{formatPrice(dailyTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Sales Count</span>
                <span className="text-sm font-black text-white">{dailySales.length}</span>
              </div>
              {dailySales.length > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[9px] text-gray-500 font-medium italic">Latest: {dailySales[0].invoiceId}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {reminders.length > 0 ? reminders.slice(0, 1).map((r, i) => (
          <div key={i} className="flex items-start gap-4 p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/10">
            <div className="mt-1 w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-indigo-400">Settlement Reminder</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{formatPrice(r.balance)} due from {r.name}</p>
            </div>
          </div>
        )) : (
          <div className="flex items-start gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
            <div className="mt-1 w-2 h-2 rounded-full bg-gray-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-gray-500">No Pending Dues</p>
              <p className="text-[10px] text-gray-600 mt-0.5">All accounts are settled</p>
            </div>
          </div>
        )}

        {alerts.length > 0 ? alerts.slice(0, 1).map((a, i) => (
          <div key={i} className="flex items-start gap-4 p-3 bg-rose-500/10 rounded-2xl border border-rose-500/10">
            <div className="mt-1 w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-rose-400">Low Stock Alert</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{a.name} ({a.stock} units left)</p>
            </div>
          </div>
        )) : (
          <div className="flex items-start gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
            <div className="mt-1 w-2 h-2 rounded-full bg-gray-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-gray-500">Inventory Healthy</p>
              <p className="text-[10px] text-gray-600 mt-0.5">All products well-stocked</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
