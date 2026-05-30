import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// base44 removed
import { useBusiness } from '../../contexts/BusinessContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, AlertCircle } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, addMonths, addQuarters, addYears } from 'date-fns';

export default function BudgetWizard({ open, onClose, budget }) {
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const isEditing = !!budget;

  const [formData, setFormData] = useState(budget || {
    account_id: '',
    period_type: 'monthly',
    period_start_date: startOfMonth(new Date()).toISOString().split('T')[0],
    budget_amount: '',
    adjustment_note: ''
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => base44.entities.Account.filter({
      business_id: currentBusiness.id,
      is_active: true
    }),
    enabled: !!currentBusiness
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let endDate;
      const startDate = new Date(data.period_start_date);

      if (data.period_type === 'monthly') {
        endDate = endOfMonth(startDate);
      } else if (data.period_type === 'quarterly') {
        endDate = endOfQuarter(startDate);
      } else {
        endDate = endOfYear(startDate);
      }

      const budgetData = {
        business_id: currentBusiness.id,
        account_id: data.account_id,
        period_type: data.period_type,
        period_start_date: data.period_start_date,
        period_end_date: endDate.toISOString().split('T')[0],
        budget_amount: parseFloat(data.budget_amount),
        original_budget_amount: isEditing ? budget.original_budget_amount : parseFloat(data.budget_amount),
        adjustment_note: data.adjustment_note || null,
        is_active: true
      };

      if (isEditing) {
        return base44.entities.Budget.update(budget.id, budgetData);
      } else {
        return base44.entities.Budget.create(budgetData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const selectedAccount = accounts.find(a => a.id === formData.account_id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            {isEditing ? 'Edit Budget' : 'Create Budget'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Account *</Label>
            <Select 
              value={formData.account_id} 
              onValueChange={(val) => setFormData({ ...formData, account_id: val })}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value={null} disabled>Select account</SelectItem>
                {accounts
                  .filter(a => ['income', 'expense'].includes(a.type))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_number} - {account.name} ({account.type})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAccount && selectedAccount.type === 'income' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Income budgets represent revenue targets
            </div>
          )}

          {selectedAccount && selectedAccount.type === 'expense' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Expense budgets represent spending limits
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Period Type *</Label>
              <Select 
                value={formData.period_type} 
                onValueChange={(val) => setFormData({ ...formData, period_type: val })}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={formData.period_start_date}
                onChange={(e) => setFormData({ ...formData, period_start_date: e.target.value })}
                disabled={isEditing}
                required
              />
            </div>
          </div>

          <div>
            <Label>Budget Amount *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.budget_amount}
              onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          {isEditing && budget.original_budget_amount !== parseFloat(formData.budget_amount || 0) && (
            <div>
              <Label>Adjustment Reason</Label>
              <Input
                value={formData.adjustment_note}
                onChange={(e) => setFormData({ ...formData, adjustment_note: e.target.value })}
                placeholder="Why are you adjusting this budget?"
              />
              <p className="text-xs text-gray-500 mt-1">
                Original budget: ${budget.original_budget_amount.toFixed(2)}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {isEditing ? 'Update Budget' : 'Create Budget'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
