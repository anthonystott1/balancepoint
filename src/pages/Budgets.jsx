// src/pages/Budgets.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../contexts/BusinessContext';
import RequireBusinessAccess from '../components/business/RequireBusinessAccess';
import { budgetsAPI, accountsAPI, transactionsAPI } from '../api/index';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Target, Plus, HelpCircle, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format } from 'date-fns';

function BudgetFormDialog({ open, onClose, onSubmit, accounts, isPending, budget }) {
  const [form, setForm] = useState(budget ? {
    account_id: budget.account_id,
    period_type: budget.period_type,
    budget_amount: budget.budget_amount,
    adjustment_note: budget.adjustment_note ?? '',
  } : {
    account_id: '', period_type: 'monthly', budget_amount: '', adjustment_note: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const expenseAccounts = accounts.filter(a => a.type === 'expense' && a.is_active);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{budget ? 'Edit Budget' : 'Create Budget'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Account *</Label>
            <Select value={form.account_id} onValueChange={v => set('account_id', v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select an expense account" /></SelectTrigger>
              <SelectContent>
                {expenseAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Period Type *</Label>
            <Select value={form.period_type} onValueChange={v => set('period_type', v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Budget Amount *</Label>
            <Input
              type="number"
              value={form.budget_amount}
              onChange={e => set('budget_amount', e.target.value)}
              className="mt-1.5"
              placeholder="0.00"
            />
          </div>
          {budget && (
            <div>
              <Label>Reason for Adjustment</Label>
              <Input value={form.adjustment_note} onChange={e => set('adjustment_note', e.target.value)} className="mt-1.5" />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={() => onSubmit(form)}
              disabled={!form.account_id || !form.budget_amount || isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : budget ? 'Save Changes' : 'Create Budget'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getPeriodDates(periodType) {
  const now = new Date();
  if (periodType === 'monthly')   return { start: startOfMonth(now), end: endOfMonth(now) };
  if (periodType === 'quarterly') return { start: startOfQuarter(now), end: endOfQuarter(now) };
  return { start: startOfYear(now), end: endOfYear(now) };
}

function BudgetsContent() {
  const { currentBusiness, canEdit } = useBusiness();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets', currentBusiness?.id],
    queryFn: () => budgetsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => accountsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const { start, end } = getPeriodDates(selectedPeriod);
  const startDate = format(start, 'yyyy-MM-dd');
  const endDate = format(end, 'yyyy-MM-dd');

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', currentBusiness?.id, startDate, endDate],
    queryFn: () => transactionsAPI.getAll(currentBusiness.id, { startDate, endDate }),
    enabled: !!currentBusiness,
  });

  const createMutation = useMutation({
    mutationFn: (form) => {
      const { start, end } = getPeriodDates(form.period_type);
      return budgetsAPI.create({
        business_id: currentBusiness.id,
        account_id: form.account_id,
        period_type: form.period_type,
        period_start_date: format(start, 'yyyy-MM-dd'),
        period_end_date: format(end, 'yyyy-MM-dd'),
        budget_amount: parseFloat(form.budget_amount),
        original_budget_amount: parseFloat(form.budget_amount),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budgets'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, form }) => budgetsAPI.update(id, {
      budget_amount: parseFloat(form.budget_amount),
      adjustment_note: form.adjustment_note,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budgets'] }); setShowForm(false); setEditingBudget(null); },
  });

  const handleSubmit = (form) => {
    if (editingBudget) updateMutation.mutate({ id: editingBudget.id, form });
    else createMutation.mutate(form);
  };

  // Calculate actual spend per account from transaction lines
  const actualByAccount = {};
  for (const tx of transactions) {
    for (const line of tx.transaction_lines ?? []) {
      if (line.account?.type === 'expense') {
        const id = line.account_id;
        actualByAccount[id] = (actualByAccount[id] ?? 0) + (line.debit ?? line.debit_amount ?? 0);
      }
    }
  }

  const periodBudgets = budgets.filter(b =>
    b.period_type === selectedPeriod &&
    b.period_start_date <= endDate &&
    b.period_end_date >= startDate
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-8 h-8 text-indigo-600" />
            Budget Tracking
          </h1>
          <p className="text-gray-500 mt-1">Plan spending and track budget vs actual</p>
        </div>
        {canEdit() && (
          <Button onClick={() => { setEditingBudget(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />Create Budget
          </Button>
        )}
      </div>

      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <HelpCircle className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          Budgets help you plan spending and catch overspending early. Set budgets on expense accounts you want to monitor closely.
        </AlertDescription>
      </Alert>

      <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <TabsList className="mb-6">
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>

        {['monthly', 'quarterly', 'yearly'].map(period => (
          <TabsContent key={period} value={period}>
            {budgetsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
            ) : periodBudgets.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No {period} budgets yet</p>
                {canEdit() && (
                  <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />Create Budget
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {periodBudgets.map(budget => {
                  const actual = actualByAccount[budget.account_id] ?? 0;
                  const pct = budget.budget_amount > 0 ? (actual / budget.budget_amount) * 100 : 0;
                  const isOver = pct > 100;
                  const accountName = accounts.find(a => a.id === budget.account_id)?.name ?? 'Unknown Account';

                  return (
                    <Card key={budget.id} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isOver && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            <span className="font-medium text-gray-900">{accountName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-semibold ${isOver ? 'text-red-600' : 'text-gray-700'}`}>
                              ${actual.toLocaleString('en-US', { minimumFractionDigits: 2 })} / ${budget.budget_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            {canEdit() && (
                              <Button size="sm" variant="ghost" onClick={() => { setEditingBudget(budget); setShowForm(true); }}>
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{Math.round(pct)}% used</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {showForm && (
        <BudgetFormDialog
          open={showForm}
          onClose={() => { setShowForm(false); setEditingBudget(null); }}
          onSubmit={handleSubmit}
          accounts={accounts}
          budget={editingBudget}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

export default function Budgets() {
  return (
    <RequireBusinessAccess requiredPermission="readonly">
      <BudgetsContent />
    </RequireBusinessAccess>
  );
}
