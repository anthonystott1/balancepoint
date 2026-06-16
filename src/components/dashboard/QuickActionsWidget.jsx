import React, { useState } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, DollarSign, HandCoins, Upload, Zap } from 'lucide-react';
import TransactionForm from '../transactions/TransactionForm';

export default function QuickActionsWidget() {
  const { canEdit } = useBusiness();
  const [showTransactionForm, setShowTransactionForm] = useState(false);

  if (!canEdit()) return null;

  const actions = [
    { 
      label: 'Record Transaction', 
      icon: Plus, 
      color: 'bg-indigo-600 hover:bg-indigo-700',
      onClick: () => setShowTransactionForm(true)
    },
    { 
      label: 'Create Invoice', 
      icon: FileText, 
      color: 'bg-blue-600 hover:bg-blue-700',
      page: 'Invoices'
    },
    { 
      label: 'Record Payment', 
      icon: DollarSign, 
      color: 'bg-green-600 hover:bg-green-700',
      page: 'Invoices'
    },
    { 
      label: 'Add Loan Payment', 
      icon: HandCoins, 
      color: 'bg-purple-600 hover:bg-purple-700',
      page: 'Loans'
    },
    { 
      label: 'Import CSV', 
      icon: Upload, 
      color: 'bg-amber-600 hover:bg-amber-700',
      page: 'Transactions'
    }
  ];

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actions.map((action) => (
              <Button
                key={action.label}
                onClick={action.onClick || (() => window.location.href = `/#${action.page}`)}
                className={`${action.color} text-white h-auto py-4 flex flex-col items-center gap-2`}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {showTransactionForm && (
        <TransactionForm
          open={showTransactionForm}
          onClose={() => setShowTransactionForm(false)}
        />
      )}
    </>
  );
}