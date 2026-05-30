// src/components/budgets/BudgetStatusWidget.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '../../contexts/BusinessContext';
import { budgetsAPI, transactionsAPI } from '../../api/index';
import { Card, CardContent } from '../ui/card';
import { Target, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export default function BudgetStatusWidget() {
  const { currentBusiness } = useBusiness();
  const now = new Date();
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets', currentBusiness?.id, 'monthly'],
    queryFn: () => budgetsAPI.getAll(currentBusiness.id, { periodType: 'monthly' }),
    enabled: !!currentBusiness,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['transactions', currentBusiness?.id, 'month', startDate],
    queryFn: () => transactionsAPI.getAll(currentBusiness.id, { startDate, endDate }),
    enabled: !!currentBusiness,
  });

  const isLoading = budgetsLoading || txLoading;

  // Calculate actual spend per account from transaction lines
  const actualByAccount = {};
  for (const tx of transactions) {
    for (const line of tx.transaction_lines ?? []) {
      if (line.account?.type === 'expense') {
        const id = line.account_id;
        actualByAccount[id] = (actualByAccount[id] ?? 0) + (line.debit ?? line.debit_amount ?? 0);
      }
    }
  }

  const currentBudgets = budgets.filter(b =>
    b.period_start_date <= endDate && b.period_end_date >= startDate
  );

  const overBudget = currentBudgets.filter(b => {
    const actual = actualByAccount[b.account_id] ?? 0;
    return actual > b.budget_amount;
  });

  const totalBudgeted = currentBudgets.reduce((s, b) => s + b.budget_amount, 0);
  const totalSpent = currentBudgets.reduce((s, b) => s + (actualByAccount[b.account_id] ?? 0), 0);
  const pct = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-medium text-gray-500">Budget Status</p>
        </div>

        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mt-2" />
        ) : currentBudgets.length === 0 ? (
          <div>
            <p className="text-2xl font-bold text-gray-300 mt-1">—</p>
            <p className="text-xs text-gray-400 mt-2">
              <Link to="/budgets" className="text-indigo-500 hover:underline">Set up budgets</Link> to track spending.
            </p>
          </div>
        ) : (
          <div>
            <p className={`text-2xl font-bold mt-1 ${pct > 100 ? 'text-red-600' : pct > 80 ? 'text-amber-500' : 'text-gray-900'}`}>
              {pct}%
            </p>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
              <div
                className={`h-1.5 rounded-full ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-green-500'}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 0 })} of ${totalBudgeted.toLocaleString('en-US', { minimumFractionDigits: 0 })} spent
              {overBudget.length > 0 && <span className="text-red-500 ml-2">· {overBudget.length} over budget</span>}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
