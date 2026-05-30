import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  CreditCard, 
  Wallet, 
  PiggyBank,
  TrendingUp,
  Edit,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function BankAccountCard({ account, onEdit, onClick }) {
  const accountTypeIcons = {
    checking: Building2,
    savings: PiggyBank,
    credit_card: CreditCard,
    cash: Wallet,
    money_market: TrendingUp,
    line_of_credit: CreditCard
  };

  const accountTypeColors = {
    checking: 'bg-blue-100 text-blue-700',
    savings: 'bg-green-100 text-green-700',
    credit_card: 'bg-purple-100 text-purple-700',
    cash: 'bg-amber-100 text-amber-700',
    money_market: 'bg-indigo-100 text-indigo-700',
    line_of_credit: 'bg-red-100 text-red-700'
  };

  const Icon = accountTypeIcons[account.account_type] || Building2;
  const isDebt = ['credit_card', 'line_of_credit'].includes(account.account_type);
  
  const utilization = account.credit_limit && account.current_balance
    ? (Math.abs(account.current_balance) / account.credit_limit) * 100
    : null;

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg ${accountTypeColors[account.account_type]} flex items-center justify-center`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{account.account_name}</h3>
              <p className="text-sm text-gray-500">
                {account.institution_name}
                {account.account_number_last4 && ` •••• ${account.account_number_last4}`}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(account);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-500">Current Balance</p>
            <p className={`text-2xl font-bold ${
              isDebt 
                ? account.current_balance < 0 ? 'text-red-600' : 'text-green-600'
                : account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${Math.abs(account.current_balance).toFixed(2)}
              {isDebt && account.current_balance < 0 && ' owed'}
            </p>
          </div>

          {utilization !== null && (
            <div>
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-gray-500">Utilization</span>
                <span className={`font-medium ${
                  utilization > 80 ? 'text-red-600' :
                  utilization > 50 ? 'text-amber-600' :
                  'text-green-600'
                }`}>
                  {utilization.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    utilization > 80 ? 'bg-red-500' :
                    utilization > 50 ? 'bg-amber-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Limit: ${account.credit_limit.toFixed(2)}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 pt-2 border-t text-sm">
            {account.last_reconciled_date ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Reconciled {format(new Date(account.last_reconciled_date), 'MMM d')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span>Not reconciled</span>
              </div>
            )}
          </div>
        </div>

        {!account.is_active && (
          <Badge variant="secondary" className="mt-3">Closed</Badge>
        )}
      </CardContent>
    </Card>
  );
}
