// src/components/dashboard/LoanPortfolioWidget.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '../../contexts/BusinessContext';
import { loansAPI } from '../../api/index';
import { Card, CardContent } from '../ui/card';
import { HandCoins, Loader2 } from 'lucide-react';

export default function LoanPortfolioWidget() {
  const { currentBusiness } = useBusiness();

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['loans', currentBusiness?.id],
    queryFn: () => loansAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'late');
  const totalBalance = activeLoans.reduce((sum, l) => sum + (l.current_balance ?? l.principal_amount ?? 0), 0);
  const lateLoans = loans.filter(l => l.status === 'late');

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <HandCoins className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-medium text-gray-500">Loan Portfolio</p>
        </div>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mt-2" />
        ) : activeLoans.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">No active loans</p>
        ) : (
          <>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {activeLoans.length} active loan{activeLoans.length !== 1 ? 's' : ''}
              {lateLoans.length > 0 && (
                <span className="text-red-500 ml-2">· {lateLoans.length} late</span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
