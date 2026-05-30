import React, { useState } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
// base44 removed
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
import { Loader2, ChevronRight, ChevronLeft, Info } from 'lucide-react';
import { Term } from '@/components/accounting/AccountingTooltip';
import { calculateMonthlyPayment, formatCurrency, formatPercent } from './loanCalculations';

export default function LoanWizard({ isOpen, onClose, onSubmit, isSubmitting }) {
  const { currentBusiness } = useBusiness();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    borrower_name: '',
    borrower_email: '',
    borrower_phone: '',
    principal_amount: '',
    interest_rate: '',
    term_months: '',
    payment_frequency: 'monthly',
    interest_method: 'amortized',
    start_date: new Date().toISOString().split('T')[0],
    origination_fee: 0,
    late_fee_amount: 0,
    grace_period_days: 0,
    loan_receivable_account_id: '',
    interest_income_account_id: '',
    notes: ''
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => base44.entities.Account.filter({
      business_id: currentBusiness.id,
      is_active: true
    }),
    enabled: !!currentBusiness?.id && isOpen
  });

  const assetAccounts = accounts.filter(a => a.type === 'asset');
  const incomeAccounts = accounts.filter(a => a.type === 'income');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculatedPayment = formData.principal_amount && formData.interest_rate && formData.term_months
    ? calculateMonthlyPayment(
        parseFloat(formData.principal_amount),
        parseFloat(formData.interest_rate),
        parseInt(formData.term_months)
      )
    : 0;

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      principal_amount: parseFloat(formData.principal_amount),
      current_balance: parseFloat(formData.principal_amount),
      interest_rate: parseFloat(formData.interest_rate),
      term_months: parseInt(formData.term_months),
      payment_amount: calculatedPayment,
      origination_fee: parseFloat(formData.origination_fee) || 0,
      late_fee_amount: parseFloat(formData.late_fee_amount) || 0,
      grace_period_days: parseInt(formData.grace_period_days) || 0,
      status: 'active'
    });
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      borrower_name: '',
      borrower_email: '',
      borrower_phone: '',
      principal_amount: '',
      interest_rate: '',
      term_months: '',
      payment_frequency: 'monthly',
      interest_method: 'amortized',
      start_date: new Date().toISOString().split('T')[0],
      origination_fee: 0,
      late_fee_amount: 0,
      grace_period_days: 0,
      loan_receivable_account_id: '',
      interest_income_account_id: '',
      notes: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Loan</DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? 'Borrower Information' : step === 2 ? 'Loan Terms' : 'Accounts & Settings'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Step 1: Borrower Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="borrower_name">
                  Borrower Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="borrower_name"
                  value={formData.borrower_name}
                  onChange={(e) => handleChange('borrower_name', e.target.value)}
                  placeholder="Full name or business name"
                  className="mt-1.5"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="borrower_email">Email</Label>
                  <Input
                    id="borrower_email"
                    type="email"
                    value={formData.borrower_email}
                    onChange={(e) => handleChange('borrower_email', e.target.value)}
                    placeholder="email@example.com"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="borrower_phone">Phone</Label>
                  <Input
                    id="borrower_phone"
                    type="tel"
                    value={formData.borrower_phone}
                    onChange={(e) => handleChange('borrower_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Any additional information about this loan..."
                  className="mt-1.5 h-24"
                />
              </div>
            </div>
          )}

          {/* Step 2: Loan Terms */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="principal_amount">
                    <Term term="principal">Principal Amount</Term> <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="principal_amount"
                    type="number"
                    step="0.01"
                    value={formData.principal_amount}
                    onChange={(e) => handleChange('principal_amount', e.target.value)}
                    placeholder="10000.00"
                    className="mt-1.5"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Amount being loaned</p>
                </div>

                <div>
                  <Label htmlFor="interest_rate">
                    Interest Rate (Annual %) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="interest_rate"
                    type="number"
                    step="0.01"
                    value={formData.interest_rate}
                    onChange={(e) => handleChange('interest_rate', e.target.value)}
                    placeholder="5.00"
                    className="mt-1.5"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g., 5.5 for 5.5% per year</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="term_months">
                    Loan Term (Months) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="term_months"
                    type="number"
                    value={formData.term_months}
                    onChange={(e) => handleChange('term_months', e.target.value)}
                    placeholder="12"
                    className="mt-1.5"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of payments</p>
                </div>

                <div>
                  <Label htmlFor="start_date">
                    Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    className="mt-1.5"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment Frequency</Label>
                  <Select
                    value={formData.payment_frequency}
                    onValueChange={(value) => handleChange('payment_frequency', value)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Interest Calculation</Label>
                  <Select
                    value={formData.interest_method}
                    onValueChange={(value) => handleChange('interest_method', value)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amortized">
                        <div>
                          <p className="font-medium">Amortized</p>
                          <p className="text-xs text-gray-500">Standard mortgage-style</p>
                        </div>
                      </SelectItem>
                      <SelectItem value="simple">
                        <div>
                          <p className="font-medium">Simple Interest</p>
                          <p className="text-xs text-gray-500">Interest on principal only</p>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {calculatedPayment > 0 && (
                <Card className="bg-indigo-50 border-indigo-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-indigo-900 font-medium mb-1">
                      Calculated Payment Amount
                    </p>
                    <p className="text-2xl font-bold text-indigo-700">
                      {formatCurrency(calculatedPayment)}
                      <span className="text-sm font-normal text-indigo-600 ml-2">
                        per {formData.payment_frequency === 'monthly' ? 'month' : formData.payment_frequency === 'bi-weekly' ? 'two weeks' : 'week'}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Accounts & Settings */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>
                  <Term term="assets">Loan Receivable Account</Term> <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.loan_receivable_account_id}
                  onValueChange={(value) => handleChange('loan_receivable_account_id', value)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select asset account" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_number ? `${acc.account_number} - ` : ''}{acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Tracks money they still owe you</p>
              </div>

              <div>
                <Label>
                  Interest Income Account <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.interest_income_account_id}
                  onValueChange={(value) => handleChange('interest_income_account_id', value)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select income account" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_number ? `${acc.account_number} - ` : ''}{acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Tracks interest you earn</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="origination_fee">Origination Fee</Label>
                  <Input
                    id="origination_fee"
                    type="number"
                    step="0.01"
                    value={formData.origination_fee}
                    onChange={(e) => handleChange('origination_fee', e.target.value)}
                    placeholder="0.00"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="late_fee_amount">Late Fee</Label>
                  <Input
                    id="late_fee_amount"
                    type="number"
                    step="0.01"
                    value={formData.late_fee_amount}
                    onChange={(e) => handleChange('late_fee_amount', e.target.value)}
                    placeholder="0.00"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="grace_period_days">Grace Period (Days)</Label>
                  <Input
                    id="grace_period_days"
                    type="number"
                    value={formData.grace_period_days}
                    onChange={(e) => handleChange('grace_period_days', e.target.value)}
                    placeholder="0"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium text-blue-900 mb-1">Ready to create loan</p>
                    <p>Once created, you can record payments and view the amortization schedule.</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              
              {step < 3 ? (
                <Button type="button" onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700">
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={isSubmitting || !formData.loan_receivable_account_id || !formData.interest_income_account_id}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Loan'
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
