// src/pages/OwnerEquity.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../contexts/BusinessContext';
import RequireBusinessAccess from '../components/business/RequireBusinessAccess';
import { ownerEquityAPI, accountsAPI, bankAccountsAPI, transactionsAPI } from '../api/index';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
import { Users, Plus, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, Loader2, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// ---------- Owner Form ----------
function OwnerFormDialog({ open, onClose, onSubmit, owner, accounts, isPending }) {
  const [form, setForm] = useState(owner ? {
    owner_name: owner.owner_name,
    owner_email: owner.owner_email ?? '',
    ownership_percentage: owner.ownership_percentage,
    capital_account_id: owner.capital_account_id ?? '',
    draw_account_id: owner.draw_account_id ?? '',
  } : {
    owner_name: '', owner_email: '', ownership_percentage: '', capital_account_id: '', draw_account_id: '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const equityAccounts = accounts.filter(a => a.type === 'equity' && a.is_active);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{owner ? 'Edit Owner' : 'Add Owner'}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Owner Name *</Label>
            <Input value={form.owner_name} onChange={e => set('owner_name', e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Ownership % *</Label>
            <Input type="number" min="0" max="100" value={form.ownership_percentage} onChange={e => set('ownership_percentage', e.target.value)} className="mt-1.5" placeholder="100" />
          </div>
          <div>
            <Label>Capital Account</Label>
            <Select value={form.capital_account_id} onValueChange={v => set('capital_account_id', v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select equity account" /></SelectTrigger>
              <SelectContent>
                {equityAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Draw Account</Label>
            <Select value={form.draw_account_id} onValueChange={v => set('draw_account_id', v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select equity account" /></SelectTrigger>
              <SelectContent>
                {equityAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={() => onSubmit(form)}
              disabled={!form.owner_name || !form.ownership_percentage || isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : owner ? 'Save' : 'Add Owner'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Transaction Form ----------
function TransactionFormDialog({ open, onClose, onSubmit, owner, bankAccounts, accounts, isPending }) {
  const [form, setForm] = useState({
    transaction_type: 'draw',
    transaction_date: new Date().toISOString().split('T')[0],
    amount: '',
    bank_account_id: '',
    memo: '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Owner Transaction — {owner?.owner_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Transaction Type *</Label>
            <Select value={form.transaction_type} onValueChange={v => set('transaction_type', v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draw">Owner Draw (money out)</SelectItem>
                <SelectItem value="contribution">Capital Contribution (money in)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date *</Label>
            <Input type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Amount *</Label>
            <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} className="mt-1.5" placeholder="0.00" />
          </div>
          <div>
            <Label>Bank Account *</Label>
            <Select value={form.bank_account_id} onValueChange={v => set('bank_account_id', v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {bankAccounts.filter(a => a.is_active).map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Memo</Label>
            <Input value={form.memo} onChange={e => set('memo', e.target.value)} className="mt-1.5" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={() => onSubmit(form)}
              disabled={!form.amount || !form.bank_account_id || isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Main Page ----------
function OwnerEquityContent() {
  const { currentBusiness, canEdit } = useBusiness();
  const queryClient = useQueryClient();
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ['owner-equity', currentBusiness?.id],
    queryFn: () => ownerEquityAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const { data: ownerTransactions = [] } = useQuery({
    queryKey: ['owner-transactions', currentBusiness?.id],
    queryFn: () => ownerEquityAPI.getTransactions(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: () => accountsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', currentBusiness?.id],
    queryFn: () => bankAccountsAPI.getAll(currentBusiness.id),
    enabled: !!currentBusiness,
  });

  const createOwnerMutation = useMutation({
    mutationFn: (data) => ownerEquityAPI.create({
      ...data,
      business_id: currentBusiness.id,
      ownership_percentage: parseFloat(data.ownership_percentage),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['owner-equity'] }); setShowOwnerForm(false); },
  });

  const updateOwnerMutation = useMutation({
    mutationFn: ({ id, data }) => ownerEquityAPI.update(id, {
      ...data,
      ownership_percentage: parseFloat(data.ownership_percentage),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['owner-equity'] }); setShowOwnerForm(false); setEditingOwner(null); },
  });

  const txMutation = useMutation({
    mutationFn: async (form) => {
      const amount = parseFloat(form.amount);
      const owner = selectedOwner;
      const isDraw = form.transaction_type === 'draw';

      // Double-entry: draw debits equity (draw account), credits bank
      // contribution: debits bank, credits equity (capital account)
      const equityAccountId = isDraw ? owner.draw_account_id : owner.capital_account_id;
      const bankAccountId = form.bank_account_id;

      let lines = [];
      if (isDraw) {
        lines = [
          { account_id: equityAccountId, debit: amount, credit: 0, business_id: currentBusiness.id },
          { account_id: bankAccountId,   debit: 0, credit: amount, business_id: currentBusiness.id },
        ];
      } else {
        lines = [
          { account_id: bankAccountId,   debit: amount, credit: 0, business_id: currentBusiness.id },
          { account_id: equityAccountId, debit: 0, credit: amount, business_id: currentBusiness.id },
        ];
      }

      const tx = await transactionsAPI.create({
        business_id: currentBusiness.id,
        transaction_date: form.transaction_date,
        description: `Owner ${isDraw ? 'draw' : 'contribution'} — ${owner.owner_name}${form.memo ? ': ' + form.memo : ''}`,
        amount,
        source: 'manual',
      }, lines);

      return ownerEquityAPI.createTransaction({
        business_id: currentBusiness.id,
        owner_equity_id: owner.id,
        transaction_type: form.transaction_type,
        transaction_date: form.transaction_date,
        amount,
        bank_account_id: form.bank_account_id,
        accounting_transaction_id: tx.id,
        memo: form.memo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowTxForm(false);
      setSelectedOwner(null);
    },
  });

  const totalEquity = owners.reduce((s, o) => s + (o.current_equity_balance ?? 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-indigo-600" />
            Owner's Equity
          </h1>
          <p className="text-gray-500 mt-1">Track capital contributions and owner draws</p>
        </div>
        {canEdit() && (
          <Button onClick={() => { setEditingOwner(null); setShowOwnerForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />Add Owner
          </Button>
        )}
      </div>

      {owners.length > 0 && (
        <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border flex items-center justify-between">
          <p className="text-sm text-gray-500 font-medium">Total Owner's Equity</p>
          <p className="text-2xl font-bold text-gray-900">
            ${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      <Tabs defaultValue="owners">
        <TabsList className="mb-6">
          <TabsTrigger value="owners">Owners</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="owners">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
          ) : owners.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No owners added yet</p>
              {canEdit() && <Button onClick={() => setShowOwnerForm(true)} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Add Owner</Button>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {owners.map(owner => (
                <Card key={owner.id} className="border-0 shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{owner.owner_name}</h3>
                        {owner.owner_email && <p className="text-sm text-gray-500">{owner.owner_email}</p>}
                        <Badge variant="outline" className="mt-1">{owner.ownership_percentage}% ownership</Badge>
                      </div>
                      {canEdit() && (
                        <Button size="sm" variant="ghost" onClick={() => { setEditingOwner(owner); setShowOwnerForm(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Equity Balance</p>
                        <p className="font-bold text-gray-900">${(owner.current_equity_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">YTD Contributions</p>
                        <p className="font-bold text-green-700">${(owner.ytd_contributions ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">YTD Draws</p>
                        <p className="font-bold text-red-600">${(owner.ytd_draws ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    {canEdit() && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedOwner(owner); setShowTxForm(true); }}>
                          <ArrowDownCircle className="w-4 h-4 mr-1 text-red-500" />Draw
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedOwner(owner); setShowTxForm(true); }}>
                          <ArrowUpCircle className="w-4 h-4 mr-1 text-green-500" />Contribute
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {ownerTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No transactions recorded yet.</div>
          ) : (
            <Card className="border-0 shadow-md">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Owner</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Memo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ownerTransactions.map(tx => (
                      <tr key={tx.id}>
                        <td className="px-4 py-3 text-gray-600">{tx.transaction_date ? format(parseISO(tx.transaction_date), 'MMM d, yyyy') : '—'}</td>
                        <td className="px-4 py-3 font-medium">{tx.owner?.owner_name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <Badge className={tx.transaction_type === 'draw' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                            {tx.transaction_type === 'draw' ? 'Draw' : 'Contribution'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{tx.memo ?? '—'}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${tx.transaction_type === 'draw' ? 'text-red-600' : 'text-green-600'}`}>
                          {tx.transaction_type === 'draw' ? '-' : '+'}${(tx.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {showOwnerForm && (
        <OwnerFormDialog
          open={showOwnerForm}
          onClose={() => { setShowOwnerForm(false); setEditingOwner(null); }}
          onSubmit={data => editingOwner ? updateOwnerMutation.mutate({ id: editingOwner.id, data }) : createOwnerMutation.mutate(data)}
          owner={editingOwner}
          accounts={accounts}
          isPending={createOwnerMutation.isPending || updateOwnerMutation.isPending}
        />
      )}

      {showTxForm && selectedOwner && (
        <TransactionFormDialog
          open={showTxForm}
          onClose={() => { setShowTxForm(false); setSelectedOwner(null); }}
          onSubmit={data => txMutation.mutate(data)}
          owner={selectedOwner}
          bankAccounts={bankAccounts}
          accounts={accounts}
          isPending={txMutation.isPending}
        />
      )}
    </div>
  );
}

export default function OwnerEquity() {
  return (
    <RequireBusinessAccess requiredPermission="readonly">
      <OwnerEquityContent />
    </RequireBusinessAccess>
  );
}
