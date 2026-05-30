// src/components/dashboard/ProfitThisMonthWidget.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '../../contexts/BusinessContext';
import { transactionsAPI } from '../../api/index';
import { Card, CardContent } from '../ui/card';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export default function ProfitThisMonthWidget() {
  const { currentBusiness } = useBusiness();

  const now = new Date();
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', currentBusiness?.id, 'month', startDate],
    queryFn: () => transactionsAPI.getAll(currentBusiness.id, { startDate, endDate }),
    enabled: !!currentBusiness,
  });

  // Sum income vs expense lines
  let income = 0;
  let expenses = 0;

  for (const tx of transactions) {
    for (const line of tx.transaction_lines ?? []) {
      const accountType = line.account?.type;
      if (accountType === 'income') {
        income += (line.credit_amount ?? line.credit ?? 0);
      }
      if (accountType === 'expense') {
        expenses += (line.debit_amount ?? line.debit ?? 0);
      }
    }
  }

  const profit = income - expenses;
  const isPositive = profit >= 0;

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-gray-500 mb-1">Profit This Month</p>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mt-2" />
        ) : (
          <>
            <div className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '' : '-'}${Math.abs(profit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              {isPositive
                ? <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              <span>${income.toLocaleString('en-US', { minimumFractionDigits: 2 })} income · ${expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })} expenses</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
