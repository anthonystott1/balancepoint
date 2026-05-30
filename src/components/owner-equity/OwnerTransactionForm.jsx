import React, { useState } from 'react';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { useQuery } from '@tanstack/react-query';
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
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Info, AlertTriangle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Term } from '@/components/accounting/AccountingTooltip';

export default function OwnerTransactionForm({ 
  owner, 
  transactionType, 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting 
}) {
  const { currentBusiness } = useBusiness();
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    amount: '',
    bank_account_id: '',
    memo: ''
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => base44.entities.Account.filter({
      business_id: currentBusiness.id,
      is_active: true,
      type: 'asset'
    }),
    enabled: !!currentBusiness?.id && isOpen
  });

  const bankAccounts = accounts.filter(a => 
    a.name.toLowerCase().includes('cash') || 
    a.name.toLowerCase().includes('bank') ||
    a.name.toLowerCase().includes('checking')
  );

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      transaction_type: transactionType
    });
  };

  const handleClose = () => {
    setFormData({
      transaction_date: new Date().toISOString().split('T')[0],
      amount: '',
      bank_account_id: '',
      memo: ''
    });
    onClose();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!owner) return null;

  const isDraw = transactionType === 'draw';
  const amount = parseFloat(formData.amount) || 0;
  const wouldExceedEquity = isDraw && amount > owner.current_equity_balance;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDraw ? (
              <>
                <ArrowDownCircle className="w-5 h-5 text-indigo-600" />
                Take Money Out
              </>
            ) : (
              <>
                <ArrowUpCircle className="w-5 h-5 text-green-600" />
                Put Money In
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isDraw 
              ? `Record money you're taking out of ${currentBusiness?.display_name || 'the business'}`
              : `Record money you're putting into ${currentBusiness?.display_name || 'the business'}`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Owner Info */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{owner.owner_name}</p>
                  <p className="text-xs text-gray-500">Current equity: {formatCurrency(owner.current_equity_balance)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Ownership</p>
                  <p className="text-sm font-semibold text-gray-900">{owner.ownership_percentage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning for draws exceeding equity */}
          {wouldExceedEquity && (
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-900">
                    <p className="font-semibold mb-1">Warning: Draw exceeds current equity</p>
                    <p className="text-orange-800">
                      You're taking out more than your current equity balance. This will result in a negative equity balance.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
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
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="0.00"
                className="mt-1.5"
                required
              />
            </div>
          </div>

          <div>
            <Label>
              {isDraw ? 'From' : 'To'} Bank Account <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.bank_account_id}
              onValueChange={(value) => handleChange('bank_account_id', value)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_number ? `${acc.account_number} - ` : ''}{acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {isDraw ? 'Money will be withdrawn from this account' : 'Money will be deposited to this account'}
            </p>
          </div>

          <div>
            <Label htmlFor="memo">Memo (Optional)</Label>
            <Textarea
              id="memo"
              value={formData.memo}
              onChange={(e) => handleChange('memo', e.target.value)}
              placeholder="Add a note about this transaction..."
              className="mt-1.5 h-20"
            />
          </div>

          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium text-blue-900 mb-1">
                  {isDraw ? 'About Owner Draws' : 'About Capital Contributions'}
                </p>
                <p>
                  {isDraw 
                    ? "Draws aren't expenses and don't affect your profit. They're distributions of profit you already earned. Important for estimated tax payments."
                    : "Contributions increase your equity in the business. This is money you're investing from personal funds."
                  }
                </p>
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className={isDraw ? "bg-indigo-600 hover:bg-indigo-700" : "bg-green-600 hover:bg-green-700"}
              disabled={isSubmitting || !formData.bank_account_id}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                isDraw ? 'Record Draw' : 'Record Contribution'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
