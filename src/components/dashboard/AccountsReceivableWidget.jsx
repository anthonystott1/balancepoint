// src/components/dashboard/AccountsReceivableWidget.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '../../contexts/BusinessContext';
import { invoicesAPI } from '../../api/index';
import { Card, CardContent } from '../ui/card';
import { FileText, Loader2 } from 'lucide-react';

export default function AccountsReceivableWidget() {
  const { currentBusiness } = useBusiness();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', currentBusiness?.id, 'open'],
    queryFn: () => invoicesAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const open = invoices.filter(inv => ['sent', 'overdue'].includes(inv.status));
  const overdue = invoices.filter(inv => inv.status === 'overdue');
  const totalAR = open.reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0);

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-medium text-gray-500">Accounts Receivable</p>
        </div>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mt-2" />
        ) : (
          <>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              ${totalAR.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {open.length} open invoice{open.length !== 1 ? 's' : ''}
              {overdue.length > 0 && (
                <span className="text-red-500 ml-2">· {overdue.length} overdue</span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
