import React from 'react';
import { Wallet, CreditCard, PiggyBank, TrendingUp, TrendingDown } from 'lucide-react';

export default function AccountTypeIcon({ type, className = "w-5 h-5" }) {
  const icons = {
    asset: { Icon: Wallet, color: 'text-green-600', bg: 'bg-green-100' },
    liability: { Icon: CreditCard, color: 'text-red-600', bg: 'bg-red-100' },
    equity: { Icon: PiggyBank, color: 'text-purple-600', bg: 'bg-purple-100' },
    income: { Icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
    expense: { Icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-100' }
  };

  const { Icon, color, bg } = icons[type] || icons.asset;

  return (
    <div className={`${bg} rounded-lg p-2 flex items-center justify-center`}>
      <Icon className={`${className} ${color}`} />
    </div>
  );
}
