// src/pages/RecurringTransactions.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../contexts/BusinessContext';
import RequireBusinessAccess from '../components/business/RequireBusinessAccess';
import { recurringTransactionsAPI, accountsAPI, transactionsAPI } from '../api/index';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { RefreshCw, Plus, Edit, Trash2, Loader2, Play, Pause } from 'lucide-react';
import { format, parseISO, addDays, addWeeks, addMonths, addQuarters, addYears } from 'date-fns';

const FREQUENCY_LABELS = {
  daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly',
  monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly',
};

function getNextDate(frequency, fromDate = new Date()) {
  const d = new Date(fromDate);
  switch (frequency) {
    case 'daily':     return addDays(d, 1);
    case 'weekly':    return addWeeks(d, 1);
    case 'biweekly':  return addWeeks(d, 2);
    case 'monthly':   return addMonths(d, 1);
    case 'quarterly': return addQuarters(d, 1);
    case 'yearly':    return addYears(d, 1);
    default:          return addMonths(d, 1);
  }
}

// ---------- Template Form ----------
function TemplateFormDialog({ open, onClose, onSubmit, template, accounts, isPending }) {
  const [form, setForm] = useState(template ? {
    template_name: template.template_name,
    description: template.description,
    frequency: template.frequency,
    start_date: template.start_date,
    from_account_id: template.from_account_id,
    to_account_id: template.to_account_id,
    amount: template.amount,
    require_review: template.require_review,
    skip_weekends: template.skip_weekends,
  } : {
    template_name: '', description: '', frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    from_account_id: '', to_account_id: '', amount: '',
    require_review: false, skip_weekends: false,
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const activeAccounts = accounts.filter(a => a.is_active);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{template ? 'Edit Template' : 'New Recurring Transaction'}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Template Name *</Label>
            <Input value={form.template_name} onChange={e => set('template_name', e.target.value)} className="mt-1.5" placeholder="e.g. Monthly Rent" />
          </div>
          <div>
            <Label>Description *</Label>
            <Input value={form.description} onChange={e => set('description', e.target.value)} className="mt-1.5" placeholder="Transaction description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Frequency *</Label>
              <Select value={form.frequency} onValueChange={v => set('frequency', v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date *</Label>
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Amount *</Label>
              <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} className="mt-1.5" placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label>Debit Account (From) *</Label>
            <Select value={form.from_account_id} onValueChange={v => set('from_account_id', v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {activeAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Credit Account (To) *</Label>
            <Select value={form.to_account_id} onValueChange={v => set('to_account_id', v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {activeAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.require_review} onChange={e => set('require_review', e.target.checked)} />
              Require review before posting
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.skip_weekends} onChange={e => set('skip_weekends', e.target.checked)} />
              Skip weekends
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={() => onSubmit(form)}
              disabled={!form.template_name || !form.description || !form.from_account_id || !form.to_account_id || !form.amount || isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : template ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Main Page ----------
function RecurringTransactionsContent() {
  const { currentBusiness, canEdit } = useBusiness();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deletingTemplate, setDeletingTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['recurring-transactions', currentBusiness?.id],
    queryFn: () => recurringTransactionsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => accountsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const createMutation = useMutation({
    mutationFn: (form) => recurringTransactionsAPI.create({
      ...form,
      business_id: currentBusiness.id,
      amount: parseFloat(form.amount),
      next_occurrence_date: form.start_date,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, form }) => recurringTransactionsAPI.update(id, {
      ...form,
      amount: parseFloat(form.amount),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] }); setShowForm(false); setEditingTemplate(null); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => recurringTransactionsAPI.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => recurringTransactionsAPI.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] }); setDeletingTemplate(null); },
  });

  // Generate (post) a single occurrence of a recurring transaction
  const generateMutation = useMutation({
    mutationFn: async (template) => {
      const tx = await transactionsAPI.create({
        business_id: currentBusiness.id,
        transaction_date: template.next_occurrence_date,
        description: template.description,
        amount: template.amount,
        source: 'manual',
      }, [
        { account_id: template.from_account_id, debit: template.amount, credit: 0, business_id: currentBusiness.id },
        { account_id: template.to_account_id,   debit: 0, credit: template.amount, business_id: currentBusiness.id },
      ]);

      const nextDate = format(getNextDate(template.frequency, template.next_occurrence_date), 'yyyy-MM-dd');
      await recurringTransactionsAPI.update(template.id, {
        last_generated_date: template.next_occurrence_date,
        next_occurrence_date: nextDate,
        occurrences_generated: (template.occurrences_generated ?? 0) + 1,
      });

      return tx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const getAccountName = (id) => accounts.find(a => a.id === id)?.name ?? '—';

  const active   = templates.filter(t => t.is_active);
  const inactive = templates.filter(t => !t.is_active);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-8 h-8 text-indigo-600" />
            Recurring Transactions
          </h1>
          <p className="text-gray-500 mt-1">Automate repeating journal entries</p>
        </div>
        {canEdit() && (
          <Button onClick={() => { setEditingTemplate(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />New Template
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No recurring transactions yet</p>
          {canEdit() && (
            <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />Create Your First Template
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Active ({active.length})</h2>
              <div className="space-y-3">
                {active.map(t => (
                  <Card key={t.id} className="border-0 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{t.template_name}</h3>
                            <Badge variant="outline" className="text-xs">{FREQUENCY_LABELS[t.frequency]}</Badge>
                            {t.require_review && <Badge className="bg-amber-100 text-amber-700 text-xs">Needs Review</Badge>}
                          </div>
                          <p className="text-sm text-gray-500 mb-2">{t.description}</p>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                            <span>From: <span className="text-gray-600">{getAccountName(t.from_account_id)}</span></span>
                            <span>To: <span className="text-gray-600">{getAccountName(t.to_account_id)}</span></span>
                            {t.next_occurrence_date && (
                              <span>Next: <span className="text-gray-600">{format(parseISO(t.next_occurrence_date), 'MMM d, yyyy')}</span></span>
                            )}
                            <span>Generated: <span className="text-gray-600">{t.occurrences_generated ?? 0}×</span></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <p className="font-bold text-gray-900 text-lg">
                            ${(t.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                          {canEdit() && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" title="Post now" onClick={() => generateMutation.mutate(t)} disabled={generateMutation.isPending}>
                                <Play className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditingTemplate(t); setShowForm(true); }}>
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: t.id, is_active: false })}>
                                <Pause className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-500" onClick={() => setDeletingTemplate(t)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-400 mb-3">Paused ({inactive.length})</h2>
              <div className="space-y-3">
                {inactive.map(t => (
                  <Card key={t.id} className="border-0 shadow-sm opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-700">{t.template_name}</p>
                          <p className="text-sm text-gray-400">{FREQUENCY_LABELS[t.frequency]} · ${(t.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                        {canEdit() && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: t.id, is_active: true })}>
                              <Play className="w-3.5 h-3.5 mr-1" />Resume
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-500" onClick={() => setDeletingTemplate(t)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <TemplateFormDialog
          open={showForm}
          onClose={() => { setShowForm(false); setEditingTemplate(null); }}
          onSubmit={form => editingTemplate ? updateMutation.mutate({ id: editingTemplate.id, form }) : createMutation.mutate(form)}
          template={editingTemplate}
          accounts={accounts}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingTemplate?.template_name}". Past transactions created from this template are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deletingTemplate.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function RecurringTransactions() {
  return (
    <RequireBusinessAccess requiredPermission="readonly">
      <RecurringTransactionsContent />
    </RequireBusinessAccess>
  );
}
