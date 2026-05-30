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
import { Loader2, Info, DollarSign } from 'lucide-react';
import { calculatePaymentSplit, formatCurrency } from './loanCalculations';

export default function PaymentForm({ loan, isOpen, onClose, onSubmit, isSubmitting }) {
  const { currentBusiness } = useBusiness();
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount_received: loan?.payment_amount || '',
    payment_method: 'bank_transfer',
    reference_number: '',
    fee_portion: 0,
    notes: '',
    bank_account_id: ''
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

  // Calculate payment split
  const paymentAmount = parseFloat(formData.amount_received) || 0;
  const feePortion = parseFloat(formData.fee_portion) || 0;
  const amountForLoan = paymentAmount - feePortion;
  
  const split = loan && amountForLoan > 0 
    ? calculatePaymentSplit(loan, amountForLoan, formData.payment_date)
    : { interest_portion: 0, principal_portion: 0 };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount_received: paymentAmount,
      principal_portion: split.principal_portion,
      interest_portion: split.interest_portion,
      fee_portion: feePortion
    });
  };

  const handleClose = () => {
    setFormData({
      payment_date: new Date().toISOString().split('T')[0],
      amount_received: loan?.payment_amount || '',
      payment_method: 'bank_transfer',
      reference_number: '',
      fee_portion: 0,
      notes: '',
      bank_account_id: ''
    });
    onClose();
  };

  if (!loan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment - {loan.borrower_name}</DialogTitle>
          <DialogDescription>
            Current balance: {formatCurrency(loan.current_balance)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_date">
                Payment Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => handleChange('payment_date', e.target.value)}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="amount_received">
                Amount Received <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount_received"
                type="number"
                step="0.01"
                value={formData.amount_received}
                onChange={(e) => handleChange('amount_received', e.target.value)}
                placeholder={loan.payment_amount.toFixed(2)}
                className="mt-1.5"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Regular payment: {formatCurrency(loan.payment_amount)}
              </p>
            </div>
          </div>

          <div>
            <Label>
              Deposit To (Bank Account) <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.bank_account_id}
              onValueChange={(value) => handleChange('bank_account_id', value)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_number ? `${acc.account_number} - ` : ''}{acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">Where you received the payment</p>
          </div>

          {/* Payment Breakdown */}
          {paymentAmount > 0 && (
            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-indigo-900 mb-3">Payment Breakdown</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-700">Principal:</span>
                    <span className="font-semibold text-indigo-900">
                      {formatCurrency(split.principal_portion)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-700">Interest:</span>
                    <span className="font-semibold text-indigo-900">
                      {formatCurrency(split.interest_portion)}
                    </span>
                  </div>
                  {feePortion > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-700">Fees:</span>
                      <span className="font-semibold text-indigo-900">
                        {formatCurrency(feePortion)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-indigo-300">
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-700">New Balance:</span>
                      <span className="font-bold text-indigo-900">
                        {formatCurrency(loan.current_balance - split.principal_portion)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Payment Method</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => handleChange('payment_method', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => handleChange('reference_number', e.target.value)}
                placeholder="Check # or transaction ID"
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="fee_portion">Late Fee (if applicable)</Label>
            <Input
              id="fee_portion"
              type="number"
              step="0.01"
              value={formData.fee_portion}
              onChange={(e) => handleChange('fee_portion', e.target.value)}
              placeholder="0.00"
              className="mt-1.5"
            />
            <p className="text-xs text-gray-500 mt-1">
              {loan.late_fee_amount > 0 ? `Standard late fee: ${formatCurrency(loan.late_fee_amount)}` : 'No late fee configured'}
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional information..."
              className="mt-1.5 h-20"
            />
          </div>

          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium text-blue-900 mb-1">What happens next?</p>
                <p>
                  This payment will be recorded and accounting transactions will be created automatically 
                  for the principal, interest, and any fees collected.
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
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isSubmitting || !formData.bank_account_id}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
