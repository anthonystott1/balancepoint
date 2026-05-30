import React, { useState } from 'react';
// base44 removed
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../contexts/BusinessContext';
import RequireBusinessAccess from '@/components/business/RequireBusinessAccess';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitCompare, Upload } from 'lucide-react';
import ReconciliationView from '@/components/reconciliation/ReconciliationView';
import CSVImportWizard from '@/components/import/CSVImportWizard';
import { Term } from '@/components/accounting/AccountingTooltip';

function ReconciliationContent() {
  const { currentBusiness, canEdit } = useBusiness();
  const queryClient = useQueryClient();
  const [selectedAccount, setSelectedAccount] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => base44.entities.Account.filter({
      business_id: currentBusiness.id,
      is_active: true,
      type: 'asset'
    }),
    enabled: !!currentBusiness?.id
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', currentBusiness?.id],
    queryFn: () => base44.entities.Transaction.filter({
      business_id: currentBusiness.id,
      is_deleted: false
    }),
    enabled: !!currentBusiness?.id
  });

  const { data: transactionLines = [] } = useQuery({
    queryKey: ['transactionLines', currentBusiness?.id],
    queryFn: () => base44.entities.TransactionLine.filter({
      business_id: currentBusiness.id
    }),
    enabled: !!currentBusiness?.id
  });

  const toggleClearedMutation = useMutation({
    mutationFn: (transaction) => base44.entities.Transaction.update(transaction.id, {
      is_cleared: !transaction.is_cleared
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', currentBusiness.id] });
    }
  });

  const selectedAccountObj = accounts.find(a => a.id === selectedAccount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <GitCompare className="w-8 h-8 text-indigo-600" />
              <Term term="reconciliation">Bank Reconciliation</Term>
            </h1>
            <p className="text-gray-500 mt-1">
              Match your records with bank statements
            </p>
          </div>

          {canEdit() && (
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Account to Reconcile</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a bank or asset account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                    {account.account_number && ` (${account.account_number})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedAccountObj && (
          <ReconciliationView
            account={selectedAccountObj}
            transactions={transactions}
            transactionLines={transactionLines}
            onToggleCleared={(txn) => toggleClearedMutation.mutate(txn)}
            canEdit={canEdit()}
          />
        )}

        <CSVImportWizard
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          accounts={accounts}
        />
      </div>
    </div>
  );
}

export default function Reconciliation() {
  return (
    <RequireBusinessAccess requiredPermission="readonly">
      <ReconciliationContent />
    </RequireBusinessAccess>
  );
}
