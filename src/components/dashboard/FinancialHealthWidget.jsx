import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '../../contexts/BusinessContext';
import { transactionsAPI, accountsAPI, invoicesAPI, bankAccountsAPI } from '../../api/index';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartPulse, CheckCircle2, AlertCircle } from 'lucide-react';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

export default function FinancialHealthWidget() {
  const { currentBusiness } = useBusiness();

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', currentBusiness?.id],
    queryFn: () => transactionsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => accountsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', currentBusiness?.id],
    queryFn: () => invoicesAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', currentBusiness?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('business_id', currentBusiness.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentBusiness
  });

  // Calculate health score
  let score = 0;
  const factors = [];

  // 1. Positive cash flow last month (25 points)
  // transactions now include transaction_lines via the API join
  const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
  const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

  const lastMonthTrans = transactions.filter(t => {
    const date = new Date(t.transaction_date);
    return date >= lastMonthStart && date <= lastMonthEnd;
  });

  let lastMonthIncome = 0;
  let lastMonthExpenses = 0;
  lastMonthTrans.forEach(t => {
    (t.transaction_lines || []).forEach(line => {
      const account = accounts.find(a => a.id === line.account_id);
      if (!account) return;
      // transaction_lines uses debit/credit columns (not debit_amount/credit_amount)
      if (account.type === 'income') lastMonthIncome += (line.credit || 0);
      if (account.type === 'expense') lastMonthExpenses += (line.debit || 0);
    });
  });

  const positiveCashFlow = lastMonthIncome > lastMonthExpenses;
  if (positiveCashFlow) {
    score += 25;
    factors.push({ label: 'Positive cash flow', met: true });
  } else {
    factors.push({ label: 'Positive cash flow', met: false });
  }

  // 2. Low debt ratio (25 points) - liabilities < 30% of assets
  const assetAccounts = accounts.filter(a => a.type === 'asset');
  const liabilityAccounts = accounts.filter(a => a.type === 'liability');

  let totalAssets = 0;
  let totalLiabilities = 0;
  transactions.forEach(t => {
    (t.transaction_lines || []).forEach(line => {
      if (assetAccounts.some(a => a.id === line.account_id)) {
        totalAssets += (line.debit || 0) - (line.credit || 0);
      }
      if (liabilityAccounts.some(a => a.id === line.account_id)) {
        totalLiabilities += (line.credit || 0) - (line.debit || 0);
      }
    });
  });

  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) : 0;
  if (debtRatio < 0.3) {
    score += 25;
    factors.push({ label: 'Healthy debt ratio', met: true });
  } else {
    factors.push({ label: 'Reduce debt', met: false });
  }

  // 3. Paid invoices (25 points) - at least 80% of invoices paid
  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  const totalInvoices = invoices.length;
  const paidRatio = totalInvoices > 0 ? (paidInvoices / totalInvoices) : 1;
  if (paidRatio >= 0.8) {
    score += 25;
    factors.push({ label: 'Invoices paid on time', met: true });
  } else {
    factors.push({ label: 'Collect overdue invoices', met: false });
  }

  // 4. Recent reconciliation (25 points) - any account reconciled in last 30 days
  const hasRecentReconciliation = bankAccounts.some(acc => {
    if (!acc.last_reconciled_date) return false;
    const daysSince = (new Date() - new Date(acc.last_reconciled_date)) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  });
  if (hasRecentReconciliation) {
    score += 25;
    factors.push({ label: 'Books reconciled regularly', met: true });
  } else {
    factors.push({ label: 'Reconcile your accounts', met: false });
  }

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 75) return 'from-green-50 to-emerald-50';
    if (score >= 50) return 'from-amber-50 to-yellow-50';
    return 'from-red-50 to-rose-50';
  };

  return (
    <Card className={`border-0 shadow-lg bg-gradient-to-br ${getScoreBgColor(score)}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
          <HeartPulse className="w-4 h-4" />
          Financial Health Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
            {score}
          </div>
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${
                  score >= 75 ? 'bg-green-500' :
                  score >= 50 ? 'bg-amber-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Improvement'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {factors.map((factor, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              {factor.met ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              <span className={factor.met ? 'text-gray-700' : 'text-gray-500'}>
                {factor.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}