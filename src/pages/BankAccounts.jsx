// src/pages/BankAccounts.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../contexts/BusinessContext';
import RequireBusinessAccess from '../components/business/RequireBusinessAccess';
import { bankAccountsAPI } from '../api/index';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Building2, Plus, HelpCircle, CreditCard, Wallet, Landmark,
  Edit2, TrendingUp, TrendingDown, Loader2,
} from 'lucide-react';

const ACCOUNT_TYPE_LABELS = {
  checking:       'Checking',
  savings:        'Savings',
  credit_card:    'Credit Card',
  cash:           'Cash',
  money_market:   'Money Market',
  line_of_credit: 'Line of Credit',
};

const ACCOUNT_TYPE_ICONS = {
  checking:       Landmark,
  savings:        Landmark,
  credit_card:    CreditCard,
  cash:           Wallet,
  money_market:   Landmark,
  line_of_credit: CreditCard,
};

const EMPTY_FORM = {
  account_name: '', account_type: 'checking', institution_name: '',
  account_number_last4: '', starting_balance: 0, notes: '',
};

function AccountFormDialog({ open, onClose, account, onSubmit, isPending }) {
  const [form, setForm] = useState(account ? {
    account_name: account.account_name,
    account_type: account.account_type,
    institution_name: account.institution_name ?? '',
    account_number_last4: account.account_number_last4 ?? '',
    starting_balance: account.starting_balance ?? 0,
    notes: account.notes ?? '',
  } : EMPTY_FORM);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Account Name *</Label>
            <Input value={form.account_name} onChange={e => set('account_name', e.target.value)} className="mt-1.5" placeholder="Chase Business Checking" />
          </div>
          <div>
            <Label>Account Type *</Label>
            <Select value={form.account_type} onValueChange={v => set('account_type', v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Institution Name</Label>
            <Input value={form.institution_name} onChange={e => set('institution_name', e.target.value)} className="mt-1.5" placeholder="Chase" />
          </div>
          <div>
            <Label>Last 4 Digits</Label>
            <Input value={form.account_number_last4} onChange={e => set('account_number_last4', e.target.value)} className="mt-1.5" placeholder="1234" maxLength={4} />
          </div>
          {!account && (
            <div>
              <Label>Starting Balance</Label>
              <Input type="number" value={form.starting_balance} onChange={e => set('starting_balance', parseFloat(e.target.value) || 0)} className="mt-1.5" />
              <p className="text-xs text-gray-500 mt-1">Current balance when you added this account to BalancePoint</p>
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} className="mt-1.5" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={() => onSubmit(form)}
              disabled={!form.account_name || isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : account ? 'Save Changes' : 'Add Account'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BankAccountCard({ account, onEdit, onClick }) {
  const Icon = ACCOUNT_TYPE_ICONS[account.account_type] ?? Landmark;
  const isCredit = ['credit_card', 'line_of_credit'].includes(account.account_type);
  const balance = account.current_balance ?? 0;

  return (
    <Card
      className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Icon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{account.account_name}</p>
              {account.institution_name && (
                <p className="text-xs text-gray-500">{account.institution_name}{account.account_number_last4 ? ` ···${account.account_number_last4}` : ''}</p>
              )}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onEdit(account); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div>
          <p className={`text-xl font-bold ${isCredit && balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {isCredit && balance > 0 ? '-' : ''}${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{ACCOUNT_TYPE_LABELS[account.account_type]}</Badge>
            {account.last_reconciled_date && (
              <span className="text-xs text-gray-400">Reconciled {account.last_reconciled_date}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BankAccountsContent() {
  const { currentBusiness, canEdit } = useBusiness();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const { data: bankAccounts = [], isLoading } = useQuery({
    queryKey: ['bank-accounts', currentBusiness?.id],
    queryFn: () => bankAccountsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const createMutation = useMutation({
    mutationFn: (data) => bankAccountsAPI.create({
      ...data,
      business_id: currentBusiness.id,
      current_balance: data.starting_balance,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts', currentBusiness.id] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => bankAccountsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts', currentBusiness.id] });
      setShowForm(false);
      setEditingAccount(null);
    },
  });

  const handleSubmit = (form) => {
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (account) => { setEditingAccount(account); setShowForm(true); };
  const handleClose = () => { setShowForm(false); setEditingAccount(null); };

  const active = bankAccounts.filter(a => a.is_active);
  const closed = bankAccounts.filter(a => !a.is_active);

  const totalCash = active
    .filter(a => ['checking', 'savings', 'cash', 'money_market'].includes(a.account_type))
    .reduce((s, a) => s + (a.current_balance ?? 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-8 h-8 text-indigo-600" />
            Bank Accounts
          </h1>
          <p className="text-gray-500 mt-1">Track checking, savings, credit cards, and other financial accounts</p>
        </div>
        {canEdit() && (
          <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />Add Bank Account
          </Button>
        )}
      </div>

      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <HelpCircle className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          Each bank account links to your Chart of Accounts so your books stay in sync with your actual cash.
        </AlertDescription>
      </Alert>

      {active.length > 0 && (
        <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border flex items-center justify-between">
          <p className="text-sm text-gray-500 font-medium">Total Cash Position</p>
          <p className="text-2xl font-bold text-gray-900">
            ${totalCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Active Accounts</h2>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : active.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No bank accounts yet</p>
            {canEdit() && (
              <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />Add Your First Account
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map(account => (
              <BankAccountCard
                key={account.id}
                account={account}
                onEdit={handleEdit}
                onClick={() => navigate('/transactions')}
              />
            ))}
          </div>
        )}
      </div>

      {closed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Closed Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {closed.map(account => (
              <BankAccountCard key={account.id} account={account} onEdit={handleEdit} onClick={() => {}} />
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <AccountFormDialog
          open={showForm}
          onClose={handleClose}
          account={editingAccount}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

export default function BankAccounts() {
  return (
    <RequireBusinessAccess requiredPermission="readonly">
      <BankAccountsContent />
    </RequireBusinessAccess>
  );
}
