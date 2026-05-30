// import React from 'react';
// import { useQuery } from '@tanstack/react-query';
// import { base44 } from '@/api/base44Client';
// import { useBusiness } from '../business/BusinessContext';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { DollarSign, TrendingUp, CreditCard, Wallet } from 'lucide-react';

// export default function CashPositionWidget() {
//   const { currentBusiness } = useBusiness();

//   const { data: bankAccounts = [] } = useQuery({
//     queryKey: ['bank-accounts', currentBusiness?.id],
//     queryFn: () => base44.entities.BankAccount.filter({
//       business_id: currentBusiness.id,
//       is_active: true
//     }),
//     enabled: !!currentBusiness
//   });

//   const cashAccounts = bankAccounts.filter(a => 
//     ['checking', 'savings', 'cash', 'money_market'].includes(a.account_type)
//   );

//   const debtAccounts = bankAccounts.filter(a => 
//     ['credit_card', 'line_of_credit'].includes(a.account_type)
//   );

//   const totalCash = cashAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);
//   const totalDebt = debtAccounts.reduce((sum, acc) => sum + Math.abs(acc.current_balance), 0);

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//       <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
//         <CardHeader className="pb-2">
//           <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
//             <Wallet className="w-4 h-4" />
//             Total Cash Position
//           </CardTitle>
//         </CardHeader>
//         <CardContent>
//           <p className="text-3xl font-bold text-green-700">
//             ${totalCash.toFixed(2)}
//           </p>
//           <p className="text-xs text-gray-500 mt-1">
//             Across {cashAccounts.length} account{cashAccounts.length !== 1 ? 's' : ''}
//           </p>
//         </CardContent>
//       </Card>

//       <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
//         <CardHeader className="pb-2">
//           <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
//             <CreditCard className="w-4 h-4" />
//             Total Debt
//           </CardTitle>
//         </CardHeader>
//         <CardContent>
//           <p className="text-3xl font-bold text-purple-700">
//             ${totalDebt.toFixed(2)}
//           </p>
//           <p className="text-xs text-gray-500 mt-1">
//             Across {debtAccounts.length} account{debtAccounts.length !== 1 ? 's' : ''}
//           </p>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

// src/components/bank-accounts/CashPositionWidget.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '../../contexts/BusinessContext';
import { bankAccountsAPI } from '../../api/index';
import { Card, CardContent } from '../ui/card';
import { Building2, Loader2, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CashPositionWidget() {
  const { currentBusiness } = useBusiness();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['bank-accounts', currentBusiness?.id],
    queryFn: () => bankAccountsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const active = accounts.filter(a => a.is_active);
  const totalCash = active
    .filter(a => ['checking', 'savings', 'cash', 'money_market'].includes(a.account_type))
    .reduce((sum, a) => sum + (a.current_balance ?? 0), 0);
  const totalCredit = active
    .filter(a => ['credit_card', 'line_of_credit'].includes(a.account_type))
    .reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  return (
    <Card className="border-0 shadow-md h-full">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-medium text-gray-500">Cash Position</p>
        </div>

        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mt-2" />
        ) : active.length === 0 ? (
          <div>
            <p className="text-2xl font-bold text-gray-300 mt-1">—</p>
            <p className="text-xs text-gray-400 mt-2">
              <Link to="/bank-accounts" className="text-indigo-500 hover:underline">
                Add a bank account
              </Link>{' '}
              to track your cash position.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ${totalCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>{active.length} account{active.length !== 1 ? 's' : ''}</span>
              {totalCredit !== 0 && (
                <span className="text-red-500">
                  ${Math.abs(totalCredit).toLocaleString('en-US', { minimumFractionDigits: 2 })} credit used
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}