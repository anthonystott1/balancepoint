import React from 'react';
import { useQuery } from '@tanstack/react-query';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Edit, AlertCircle } from 'lucide-react';

export default function BudgetTracker({ budgets, onEdit }) {
  const { currentBusiness } = useBusiness();

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', currentBusiness?.id],
    queryFn: () => base44.entities.Transaction.filter({
      business_id: currentBusiness.id,
      is_deleted: false
    }),
    enabled: !!currentBusiness
  });

  const { data: transactionLines = [] } = useQuery({
    queryKey: ['transaction-lines', currentBusiness?.id],
    queryFn: () => base44.entities.TransactionLine.filter({
      business_id: currentBusiness.id
    }),
    enabled: !!currentBusiness
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => base44.entities.Account.filter({
      business_id: currentBusiness.id
    }),
    enabled: !!currentBusiness
  });

  const calculateActual = (budget) => {
    const periodTransactions = transactions.filter(t => {
      const date = new Date(t.transaction_date);
      const start = new Date(budget.period_start_date);
      const end = new Date(budget.period_end_date);
      return date >= start && date <= end;
    });

    const transactionIds = periodTransactions.map(t => t.id);
    const periodLines = transactionLines.filter(line => 
      transactionIds.includes(line.transaction_id) && line.account_id === budget.account_id
    );

    const account = accounts.find(a => a.id === budget.account_id);
    if (!account) return 0;

    if (account.type === 'income') {
      return periodLines.reduce((sum, line) => sum + line.credit_amount, 0);
    } else if (account.type === 'expense') {
      return periodLines.reduce((sum, line) => sum + line.debit_amount, 0);
    }
    return 0;
  };

  const getBudgetStatus = (actual, budgeted, accountType) => {
    const percentage = (actual / budgeted) * 100;
    
    if (accountType === 'income') {
      if (percentage >= 100) return { color: 'green', status: 'On Track', icon: TrendingUp };
      if (percentage >= 80) return { color: 'yellow', status: 'Below Target', icon: TrendingDown };
      return { color: 'red', status: 'Underperforming', icon: AlertCircle };
    } else {
      if (percentage <= 80) return { color: 'green', status: 'Under Budget', icon: TrendingUp };
      if (percentage <= 100) return { color: 'yellow', status: 'Near Limit', icon: AlertCircle };
      return { color: 'red', status: 'Over Budget', icon: TrendingDown };
    }
  };

  if (!budgets || budgets.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No budgets set for this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {budgets.map((budget) => {
        const account = accounts.find(a => a.id === budget.account_id);
        if (!account) return null;

        const actual = calculateActual(budget);
        const difference = budget.budget_amount - actual;
        const percentage = (actual / budget.budget_amount) * 100;
        const status = getBudgetStatus(actual, budget.budget_amount, account.type);
        const StatusIcon = status.icon;

        const colorClasses = {
          green: 'bg-green-50 border-green-200',
          yellow: 'bg-amber-50 border-amber-200',
          red: 'bg-red-50 border-red-200'
        };

        const progressColors = {
          green: 'bg-green-500',
          yellow: 'bg-amber-500',
          red: 'bg-red-500'
        };

        return (
          <Card key={budget.id} className={`border ${colorClasses[status.color]}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{account.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {account.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {budget.period_type.charAt(0).toUpperCase() + budget.period_type.slice(1)} Budget
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onEdit(budget)}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Budgeted</p>
                  <p className="text-lg font-bold">${budget.budget_amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Actual</p>
                  <p className="text-lg font-bold">${actual.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    {account.type === 'income' ? 'Below Target' : 'Remaining'}
                  </p>
                  <p className={`text-lg font-bold ${
                    difference >= 0 
                      ? account.type === 'income' ? 'text-red-600' : 'text-green-600'
                      : account.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${Math.abs(difference).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{percentage.toFixed(1)}% used</span>
                  <div className="flex items-center gap-1">
                    <StatusIcon className={`w-4 h-4 ${
                      status.color === 'green' ? 'text-green-600' :
                      status.color === 'yellow' ? 'text-amber-600' :
                      'text-red-600'
                    }`} />
                    <span className={`font-medium ${
                      status.color === 'green' ? 'text-green-600' :
                      status.color === 'yellow' ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {status.status}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full transition-all ${progressColors[status.color]}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>

              {budget.adjustment_note && (
                <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                  <span className="font-medium">Adjusted:</span> {budget.adjustment_note}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
