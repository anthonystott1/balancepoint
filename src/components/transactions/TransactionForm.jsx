import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useBusiness } from '../../contexts/BusinessContext';
import { accountsAPI } from '../../api/index';
import { Term } from '@/components/accounting/AccountingTooltip';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Loader2, Info, ArrowRight, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import AccountTypeIcon from '../accounts/AccountTypeIcon';
import TagSelector from '../tags/TagSelector';
import ReceiptUpload from '../receipts/ReceiptUpload';
import ReceiptViewer from '../receipts/ReceiptViewer';
import TransactionComments from '../collaboration/TransactionComments';

export default function TransactionForm({
  transaction,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  accounts: accountsProp = [],  // accept accounts from parent to avoid double-fetch
}) {
  const { currentBusiness, canEdit, userAccess } = useBusiness();

  // canAdmin covers the "accountant can post to locked periods" use case for now
  const canMakeAdjustments = () =>
    userAccess?.permission_level === 'admin' ||
    userAccess?.permission_level === 'accountant';

  const [formData, setFormData] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    amount: '',
    from_account_id: '',
    to_account_id: '',
    reference_number: '',
    notes: '',
    is_cleared: false,
    tags: [],
  });

  // Use accounts passed from parent if available, otherwise fetch
  const { data: fetchedAccounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => accountsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness?.id && accountsProp.length === 0,
  });

  const accounts = accountsProp.length > 0 ? accountsProp : fetchedAccounts;

  // Receipts for existing transaction
  const { data: receipts = [] } = useQuery({
    queryKey: ['transaction-receipts', transaction?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('transaction_id', transaction.id)
        .eq('is_deleted', false);
      if (error) throw error;
      return data;
    },
    enabled: !!transaction?.id,
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        transaction_date: transaction.transaction_date || format(new Date(), 'yyyy-MM-dd'),
        description:      transaction.description      || '',
        amount:           transaction.amount           || '',
        from_account_id:  transaction.from_account_id  || '',
        to_account_id:    transaction.to_account_id    || '',
        reference_number: transaction.reference_number || '',
        notes:            transaction.memo             || transaction.notes || '',
        is_cleared:       transaction.is_cleared       || false,
        tags:             transaction.tags             || [],
      });
    } else {
      setFormData({
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        amount: '',
        from_account_id: '',
        to_account_id: '',
        reference_number: '',
        notes: '',
        is_cleared: false,
        tags: [],
      });
    }
  }, [transaction]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.from_account_id || !formData.to_account_id) {
      alert('Please select both accounts');
      return;
    }
    if (formData.from_account_id === formData.to_account_id) {
      alert('From and To accounts must be different');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Amount must be greater than zero');
      return;
    }

    onSubmit({ ...formData, amount: parseFloat(formData.amount) });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Group active accounts by type for the selects
  const activeAccounts = accounts.filter(a => a.is_active !== false);
  const accountsByType = {
    asset:     activeAccounts.filter(a => a.type === 'asset'),
    liability: activeAccounts.filter(a => a.type === 'liability'),
    equity:    activeAccounts.filter(a => a.type === 'equity'),
    income:    activeAccounts.filter(a => a.type === 'income'),
    expense:   activeAccounts.filter(a => a.type === 'expense'),
  };

  const renderAccountOption = (account) => (
    <div className="flex items-center gap-2">
      <AccountTypeIcon type={account.type} className="w-4 h-4" />
      <span>{account.name}</span>
      {account.account_number && (
        <span className="text-gray-400 text-xs ml-auto">{account.account_number}</span>
      )}
    </div>
  );

  const AccountSelect = ({ value, onChange, placeholder }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="mt-1.5 bg-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(accountsByType).map(([type, accs]) =>
          accs.length > 0 && (
            <React.Fragment key={type}>
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                {type}
              </div>
              {accs.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {renderAccountOption(account)}
                </SelectItem>
              ))}
            </React.Fragment>
          )
        )}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transaction ? 'Edit Transaction' : 'New Transaction'}
          </DialogTitle>
          <DialogDescription>
            Record money moving between accounts
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Info card */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Double-Entry Accounting</p>
                <p className="text-blue-700">
                  Every transaction affects two accounts. Think of it as moving money from one category to another.
                </p>
              </div>
            </div>
          </Card>

          {/* Date + Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="transaction_date">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => handleChange('transaction_date', e.target.value)}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="amount">
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                className="mt-1.5"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="e.g., Paid rent for January, Received payment from customer"
              className="mt-1.5"
              required
            />
          </div>

          {/* Account selection */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
              <div>
                <Label>
                  <span className="font-semibold text-indigo-700">From Account</span>
                </Label>
                <AccountSelect
                  value={formData.from_account_id}
                  onChange={(v) => handleChange('from_account_id', v)}
                  placeholder="Select account"
                />
                <p className="text-xs text-gray-500 mt-1">Account giving value (credit)</p>
              </div>

              <div className="hidden md:flex items-center justify-center pb-6">
                <ArrowRight className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="md:hidden flex items-center justify-center">
                <ChevronDown className="w-6 h-6 text-indigo-600" />
              </div>

              <div>
                <Label>
                  <span className="font-semibold text-green-700">To Account</span>
                </Label>
                <AccountSelect
                  value={formData.to_account_id}
                  onChange={(v) => handleChange('to_account_id', v)}
                  placeholder="Select account"
                />
                <p className="text-xs text-gray-500 mt-1">Account receiving value (debit)</p>
              </div>
            </div>
          </div>

          {/* Reference + cleared */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reference_number">Reference Number (Optional)</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => handleChange('reference_number', e.target.value)}
                placeholder="Check #, Invoice #, etc."
                className="mt-1.5"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_cleared}
                  onChange={(e) => handleChange('is_cleared', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Mark as cleared</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add any additional details..."
              className="mt-1.5 h-20"
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags (Optional)</Label>
            <div className="mt-1.5">
              <TagSelector
                selectedTags={formData.tags}
                onChange={(tags) => handleChange('tags', tags)}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Tag by project, client, department, etc.
            </p>
          </div>

          {/* Receipts */}
          <div>
            <Label>Receipts & Documents</Label>
            <div className="mt-1.5 space-y-3">
              {transaction && receipts.length > 0 && (
                <ReceiptViewer receipts={receipts} />
              )}
              {transaction && (
                <ReceiptUpload transactionId={transaction.id} />
              )}
              {!transaction && (
                <p className="text-sm text-gray-500 italic">
                  Save the transaction first to attach receipts
                </p>
              )}
            </div>
          </div>

          {/* Comments (edit mode only) */}
          {transaction && (
            <div>
              <TransactionComments transactionId={transaction.id} />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                transaction ? 'Update Transaction' : 'Record Transaction'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}